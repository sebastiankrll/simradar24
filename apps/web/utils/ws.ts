// lib/wsClient.ts

import type { WsDelta } from "@sr24/types/vatsim";
import Pako from "pako";

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3002";
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

type Listener = (msg: WsDelta) => void;
type StatusListener = (status: "connected" | "disconnected" | "connecting" | "error") => void;

interface WsClientConfig {
	autoReconnect?: boolean;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
	pauseWhenHidden?: boolean;
}

class WsClient {
	private ws: WebSocket | null = null;
	private listeners: Set<Listener> = new Set();
	private statusListeners: Set<StatusListener> = new Set();
	private reconnectAttempts = 0;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private heartbeatTimeout: NodeJS.Timeout | null = null;
	private isManualClose = false;
	private messageBuffer: WsDelta[] = [];
	private config: Required<WsClientConfig>;
	private isConnecting = false;
	private isPageHidden = false;
	private wasHiddenDisconnect = false;

	constructor(config: WsClientConfig = {}) {
		this.config = {
			autoReconnect: config.autoReconnect ?? true,
			reconnectDelay: config.reconnectDelay ?? RECONNECT_DELAY,
			maxReconnectAttempts: config.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS,
			pauseWhenHidden: config.pauseWhenHidden ?? true,
		};

		if (this.config.pauseWhenHidden) {
			this.setupVisibilityListener();
		}

		this.connect();
	}

	private setupVisibilityListener(): void {
		if (typeof document === "undefined") return;

		document.addEventListener("visibilitychange", () => {
			this.isPageHidden = document.hidden;

			if (document.hidden) {
				// console.log("📱 Page hidden, pausing WebSocket...");
				this.wasHiddenDisconnect = true;
				this.disconnect();
			} else {
				// console.log("📱 Page visible, resuming WebSocket...");
				if (!this.isConnected() && !this.isConnecting) {
					this.reconnect();
				}
			}
		});
	}

	private connect(): void {
		if (this.isPageHidden && this.config.pauseWhenHidden) {
			console.warn("Page is hidden, skipping connection");
			return;
		}

		if (this.isConnecting) {
			console.warn("Connection already in progress");
			return;
		}

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			console.warn("Already connected");
			return;
		}

		try {
			this.isConnecting = true;
			this.notifyStatusListeners("connecting");
			this.ws = new WebSocket(WS_URL);
			this.ws.binaryType = "arraybuffer";

			this.ws.onopen = () => this.handleOpen();
			this.ws.onerror = (err) => this.handleError(err);
			this.ws.onclose = () => this.handleClose();
			this.ws.onmessage = (e) => this.handleMessage(e);
		} catch (err) {
			console.error("Failed to create WebSocket:", err);
			this.isConnecting = false;
			this.notifyStatusListeners("error");
			this.scheduleReconnect();
		}
	}

	private handleOpen(): void {
		console.log("✅ WebSocket connected");
		this.isConnecting = false;
		this.reconnectAttempts = 0;
		this.isManualClose = false;
		this.notifyStatusListeners("connected");
		this.startHeartbeat();
		this.flushMessageBuffer();

		// Request latest data after reconnecting from visibility change
		if (this.wasHiddenDisconnect) {
			this.wasHiddenDisconnect = false;
			console.log("🔄 Page returned to focus, requesting latest data via WebSocket");
			this.requestLatestData();
		}
	}

	private handleError(err: Event): void {
		console.error("❌ WebSocket error:", err);
		this.isConnecting = false;
		this.notifyStatusListeners("error");
	}

	private handleClose(): void {
		console.log("WebSocket disconnected");
		this.isConnecting = false;
		this.stopHeartbeat();
		this.notifyStatusListeners("disconnected");

		if (!this.isManualClose && this.config.autoReconnect && !this.isPageHidden) {
			this.scheduleReconnect();
		}
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const compressed = new Uint8Array(event.data);
			const decompressed = Pako.ungzip(compressed, { to: "string" });
			const data = JSON.parse(decompressed);

			this.listeners.forEach((listener) => {
				try {
					listener(data);
				} catch (err) {
					console.error("Error in listener:", err);
				}
			});

			this.resetHeartbeatTimeout();
		} catch (err) {
			console.error("Failed to parse message:", err);
		}
	}

	private scheduleReconnect(): void {
		if (this.isPageHidden && this.config.pauseWhenHidden) {
			// console.log("Page is hidden, not scheduling reconnect");
			return;
		}

		if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
			console.error(`❌ Max reconnection attempts reached (${this.config.maxReconnectAttempts}). Stopping reconnection.`);
			this.notifyStatusListeners("error");
			return;
		}

		this.reconnectAttempts++;

		const delay = Math.min(this.config.reconnectDelay * 2 ** (this.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
		const jitter = delay * 0.1 * Math.random();
		const totalDelay = delay + jitter;

		// console.log(`⏳ Scheduling reconnect in ${totalDelay.toFixed(0)}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}

		this.reconnectTimeout = setTimeout(() => {
			this.connect();
		}, totalDelay);
	}

	private startHeartbeat(): void {
		this.resetHeartbeatTimeout();
	}

	private resetHeartbeatTimeout(): void {
		if (this.heartbeatTimeout) {
			clearTimeout(this.heartbeatTimeout);
		}

		this.heartbeatTimeout = setTimeout(() => {
			if (this.isConnected()) {
				console.warn("⚠️  No messages received in 60 seconds, reconnecting...");
				this.disconnect();
				this.scheduleReconnect();
			}
		}, 60000);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimeout) {
			clearTimeout(this.heartbeatTimeout);
			this.heartbeatTimeout = null;
		}
	}

	private flushMessageBuffer(): void {
		if (this.messageBuffer.length > 0) {
			// console.log(`Flushing ${this.messageBuffer.length} buffered messages`);
			this.messageBuffer = [];
		}
	}

	private notifyStatusListeners(status: "connected" | "disconnected" | "connecting" | "error"): void {
		this.statusListeners.forEach((listener) => {
			try {
				listener(status);
			} catch (err) {
				console.error("Error in status listener:", err);
			}
		});
	}

	public isConnected(): boolean {
		return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
	}

	public addListener(listener: Listener): void {
		this.listeners.add(listener);
	}

	public removeListener(listener: Listener): void {
		this.listeners.delete(listener);
	}

	public addStatusListener(listener: StatusListener): void {
		this.statusListeners.add(listener);
	}

	public removeStatusListener(listener: StatusListener): void {
		this.statusListeners.delete(listener);
	}

	public disconnect(): void {
		this.isManualClose = true;
		this.isConnecting = false;
		this.stopHeartbeat();

		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	public reconnect(): void {
		this.reconnectAttempts = 0;
		this.disconnect();
		this.isManualClose = false;
		this.connect();
	}

	public requestLatestData(): void {
		if (!this.isConnected()) {
			console.warn("Cannot request latest data: WebSocket not connected");
			return;
		}

		try {
			this.ws?.send(JSON.stringify({ type: "request-latest" }));
			console.log("📤 Requested latest data via WebSocket");
		} catch (err) {
			console.error("Failed to request latest data:", err);
		}
	}

	public getMetrics(): {
		connected: boolean;
		connecting: boolean;
		hidden: boolean;
		listeners: number;
		reconnectAttempts: number;
		url: string;
	} {
		return {
			connected: this.isConnected(),
			connecting: this.isConnecting,
			hidden: this.isPageHidden,
			listeners: this.listeners.size,
			reconnectAttempts: this.reconnectAttempts,
			url: WS_URL,
		};
	}
}

export const wsClient = new WsClient({
	autoReconnect: true,
	reconnectDelay: RECONNECT_DELAY,
	maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
	pauseWhenHidden: true,
});
