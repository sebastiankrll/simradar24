import uWS from "uWebSockets.js";
import { deflateRawSync } from "node:zlib";
import { rdsShutdown, rdsSub } from "@sr24/db/redis";

const PORT = Number(process.env.WS_PORT) || 3002;
const MAX_BACKPRESSURE = 2 * 1024 * 1024;

const clients = new Set<uWS.WebSocket<unknown>>();
let connectedClients = 0;
let globalSeq = 0;

const app = uWS.App();

app.ws("/*", {
	compression: uWS.DISABLED,
	maxPayloadLength: 16 * 1024 * 1024,
	idleTimeout: 30,

	open: (ws) => {
		clients.add(ws);
		const presence = {
			t: "presence",
			c: ++connectedClients,
		};
		const compressedPresence = deflateRawSync(Buffer.from(JSON.stringify(presence)));
		ws.send(compressedPresence, true);
	},

	message: () => {
		// No-op: This server only broadcasts messages from Redis
	},

	drain: (ws) => {
		console.log(`WebSocket backpressure: ${ws.getBufferedAmount()}`);
	},

	close: (ws) => {
		clients.delete(ws);
		connectedClients--;
	},
});

function broadcastDelta(data: Buffer) {
	for (const ws of clients) {
		if (ws.getBufferedAmount() > MAX_BACKPRESSURE) {
			console.warn(`Client too slow, disconnecting (backpressure: ${ws.getBufferedAmount()})`);
			ws.end(1009, "Too slow");
			continue;
		}
		ws.send(data, true);
	}
}

rdsSub("ws:delta", (message: string) => {
	const payload = JSON.stringify({
		t: "delta",
		s: globalSeq++,
		c: connectedClients,
		data: JSON.parse(message),
	});
	const compressed = deflateRawSync(Buffer.from(payload));
	broadcastDelta(compressed);
});

app.listen(PORT, (token) => {
	if (token) {
		console.log(`✅ WebSockets listening on :${PORT}`);
	} else {
		console.error("❌ Failed to listen");
	}
});

// Graceful shutdown
process.on("SIGINT", async () => {
	console.log("Shutting down WebSocket server...");

	for (const ws of clients) {
		ws.end(1001, "Server shutting down");
	}

	clients.clear();
	connectedClients = 0;

	await rdsShutdown();
	process.exit(0);
});
