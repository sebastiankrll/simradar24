// lib/wsClient.ts

import type { WsShort } from "@sk/types/vatsim";
import Pako from "pako";

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:5001";

type Listener = (msg: WsShort) => void;

class WsClient {
	private ws: WebSocket;
	private listeners: Listener[] = [];

	constructor() {
		this.ws = new WebSocket(WS_URL);
		this.ws.binaryType = "arraybuffer";

		this.ws.onopen = () => console.log("WebSocket connected");
		this.ws.onerror = (err) => console.error("WebSocket error", err);
		this.ws.onclose = () => console.log("WebSocket disconnected");

		this.ws.onmessage = (e) => {
			try {
				const compressed = new Uint8Array(e.data);
				const decompressed = Pako.ungzip(compressed, { to: "string" });
				const parsed = JSON.parse(decompressed);
				const data: WsShort = parsed.data;

				this.listeners.forEach((fn) => {
					fn(data);
				});
			} catch (err) {
				console.error("Failed to parse message", err);
			}
		};
	}

	addListener(fn: Listener) {
		this.listeners.push(fn);
	}

	removeListener(fn: Listener) {
		this.listeners = this.listeners.filter((l) => l !== fn);
	}
}

export const wsClient = new WsClient();
