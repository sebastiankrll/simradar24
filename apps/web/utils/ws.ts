import type { WsDelta } from "@sr24/types/interface";
import { inflate } from "pako";

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3002";

const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export type WsPresence = {
	t: "presence";
	c: number;
};
export type WsData = {
	t: "delta";
	s: number;
	c: number;
	data: WsDelta;
};

type Listener = (msg: WsData | WsPresence) => void;

interface WsClientConfig {
	autoReconnect?: boolean;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
}

class WsClient {
	private ws: WebSocket | null = null;
	private listeners: Set<Listener> = new Set();
	private reconnectAttempts = 0;
	private reconnectTimeout: NodeJS.Timeout | null = null;
	private heartbeatTimeout: NodeJS.Timeout | null = null;
	private messageBuffer: (WsData | WsPresence)[] = [];
	private config: Required<WsClientConfig>;
	private isConnecting = false;

	constructor(config: WsClientConfig = {}) {
		this.config = {
			autoReconnect: config.autoReconnect ?? true,
			reconnectDelay: config.reconnectDelay ?? RECONNECT_DELAY,
			maxReconnectAttempts: config.maxReconnectAttempts ?? MAX_RECONNECT_ATTEMPTS,
		};

		this.connect();
	}

	private connect(): void {
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
			this.ws = new WebSocket(WS_URL);
			this.ws.binaryType = "arraybuffer";

			this.ws.onopen = () => this.handleOpen();
			this.ws.onerror = (err) => this.handleError(err);
			this.ws.onclose = () => this.handleClose();
			this.ws.onmessage = (e) => this.handleMessage(e);
		} catch (err) {
			console.error("Failed to create WebSocket:", err);
			this.isConnecting = false;
			this.scheduleReconnect();
		}
	}

	private handleOpen(): void {
		console.log("✅ WebSocket connected");
		this.isConnecting = false;
		this.reconnectAttempts = 0;
		this.startHeartbeat();
		this.flushMessageBuffer();
	}

	private handleError(err: Event): void {
		console.error("❌ WebSocket error:", err);
		this.isConnecting = false;
	}

	private handleClose(): void {
		console.log("WebSocket disconnected");
		this.isConnecting = false;
		this.stopHeartbeat();
	}

	private handleMessage(event: MessageEvent) {
		try {
			const buffer = new Uint8Array(event.data);
			const decompressed = inflate(buffer, { to: "string", raw: true });

			const msg: WsData | WsPresence = JSON.parse(decompressed);

			this.listeners.forEach((listener) => {
				try {
					listener(msg);
				} catch (err) {
					console.error("Error in listener:", err);
				}
			});

			this.resetHeartbeatTimeout();
		} catch (err) {
			console.error("Failed to parse/decompress message:", err);
		}
	}

	private scheduleReconnect(): void {
		if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
			console.error(`❌ Max reconnection attempts reached (${this.config.maxReconnectAttempts}). Stopping reconnection.`);
			return;
		}

		this.reconnectAttempts++;

		const delay = Math.min(this.config.reconnectDelay * 2 ** (this.reconnectAttempts - 1), MAX_RECONNECT_DELAY);
		const jitter = delay * 0.1 * Math.random();
		const totalDelay = delay + jitter;

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
			this.messageBuffer = [];
		}
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

	public disconnect(): void {
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
		this.connect();
	}

	public requestLatestData(): void {
		if (!this.isConnected()) {
			console.warn("Cannot request latest data: WebSocket not connected");
			return;
		}

		try {
			this.ws?.send(JSON.stringify({ type: "request-latest" }));
		} catch (err) {
			console.error("Failed to request latest data:", err);
		}
	}
}

export const wsClient = new WsClient({
	autoReconnect: true,
	reconnectDelay: RECONNECT_DELAY,
	maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
});
