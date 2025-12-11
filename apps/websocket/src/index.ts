import { createServer } from "node:http";
import { rdsHealthCheck, rdsShutdown, rdsSub } from "@sr24/db/redis";
import { WebSocket, WebSocketServer } from "ws";

interface ClientContext {
	id: string;
	connectedAt: Date;
	isAlive: boolean;
	messagesSent: number;
	lastMessageTime: Date | null;
	messagesInWindow: number;
	windowStartTime: number;
	isRateLimited: boolean;
}

const clientContextMap = new Map<WebSocket, ClientContext>();

const CLIENT_RATE_LIMIT = 100;
const RATE_LIMIT_WINDOW = 60000;

function generateClientId(): string {
	return `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function checkRateLimit(clientContext: ClientContext): boolean {
	const now = Date.now();
	const timeSinceWindowStart = now - clientContext.windowStartTime;

	if (timeSinceWindowStart >= RATE_LIMIT_WINDOW) {
		clientContext.messagesInWindow = 0;
		clientContext.windowStartTime = now;
		clientContext.isRateLimited = false;
		return true;
	}

	clientContext.messagesInWindow++;

	if (clientContext.messagesInWindow > CLIENT_RATE_LIMIT) {
		clientContext.isRateLimited = true;
		return false;
	}

	return true;
}

const PORT = Number(process.env.WS_PORT) || 3002;
const HOST = process.env.WS_HOST || "localhost";

// Create HTTP server first
const server = createServer((req: any, res: any) => {
	if (req.url === "/health" && req.method === "GET") {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
	} else if (req.url === "/health/ready" && req.method === "GET") {
		rdsHealthCheck()
			.then((isHealthy) => {
				const status = isHealthy ? 200 : 503;
				res.writeHead(status, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						status: isHealthy ? "ready" : "not-ready",
						clients: clientContextMap.size,
						timestamp: new Date().toISOString(),
					}),
				);
			})
			.catch((err) => {
				console.error("Health check error:", err);
				res.writeHead(503, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ status: "error", timestamp: new Date().toISOString() }));
			});
	} else if (req.url === "/metrics" && req.method === "GET") {
		const rateLimitedClients = Array.from(clientContextMap.values()).filter((ctx) => ctx.isRateLimited).length;
		const metrics = {
			connectedClients: clientContextMap.size,
			rateLimitedClients,
			totalMessages: Array.from(clientContextMap.values()).reduce((sum, ctx) => sum + ctx.messagesSent, 0),
			avgMessagesPerClient:
				clientContextMap.size > 0
					? (Array.from(clientContextMap.values()).reduce((sum, ctx) => sum + ctx.messagesSent, 0) / clientContextMap.size).toFixed(2)
					: 0,
			timestamp: new Date().toISOString(),
		};
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify(metrics));
	} else {
		res.writeHead(404);
		res.end();
	}
});

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({
	server,
	perMessageDeflate: false,
	maxPayload: 1024 * 64,
});

wss.on("connection", (ws: WebSocket, _req: any) => {
	const clientId = generateClientId();
	// const clientIp = req.socket.remoteAddress;

	const clientContext: ClientContext = {
		id: clientId,
		connectedAt: new Date(),
		isAlive: true,
		messagesSent: 0,
		lastMessageTime: null,
		messagesInWindow: 0,
		windowStartTime: Date.now(),
		isRateLimited: false,
	};

	clientContextMap.set(ws, clientContext);
	// console.log(`✅ Client connected: ${clientId} from ${clientIp} (Total: ${clientContextMap.size})`);

	ws.on("pong", () => {
		clientContext.isAlive = true;
	});

	ws.on("error", (error) => {
		console.error(`❌ WebSocket error for client ${clientId}:`, error.message);
	});

	ws.on("message", (msg: Buffer) => {
		try {
			if (!checkRateLimit(clientContext)) {
				console.warn(`⚠️  Rate limit exceeded for client ${clientId} (${clientContext.messagesInWindow} messages in window)`);
				ws.close(1008, "Rate limit exceeded");
				return;
			}

			if (msg.length > 1024 * 64) {
				console.warn(`Message too large from ${clientId}: ${msg.length} bytes`);
				ws.close(1009, "Message too large");
				return;
			}

			try {
				const message = JSON.parse(msg.toString());
				if (message.type === "request-latest") {
					console.log(`📥 Client ${clientId} requested latest data`);
					sendLatestDelta(ws, clientContext);
				}
			} catch (_err) {
				// Not JSON, ignore
			}

			if (process.env.NODE_ENV === "development") {
				// console.log(`📨 Message from ${clientId}:`, msg.toString().substring(0, 100));
			}
		} catch (err) {
			console.error(`Error processing message from ${clientId}:`, err);
		}
	});

	ws.on("close", () => {
		clientContextMap.delete(ws);
		// const duration = Date.now() - clientContext.connectedAt.getTime();
		// console.log(
		// 	`❌ Client disconnected: ${clientId} (connected for ${duration}ms, sent ${clientContext.messagesSent} messages, Total: ${clientContextMap.size})`,
		// );
	});
});

const heartbeatInterval = setInterval(() => {
	wss.clients.forEach((ws) => {
		const clientContext = clientContextMap.get(ws);
		if (!clientContext) return;

		if (!clientContext.isAlive) {
			console.warn(`⏱️  Terminating inactive client: ${clientContext.id}`);
			ws.terminate();
			return;
		}

		clientContext.isAlive = false;
		ws.ping();
	});
}, 30000);

let latestDeltaCache: Buffer | null = null;

function sendLatestDelta(ws: WebSocket, clientContext: ClientContext): void {
	if (!latestDeltaCache) {
		console.log(`No cached delta available for ${clientContext.id}`);
		return;
	}

	if (ws.readyState !== WebSocket.OPEN) return;

	try {
		ws.send(latestDeltaCache, (err) => {
			if (err) {
				console.error(`Failed to send latest delta to ${clientContext.id}:`, err.message);
			} else {
				clientContext.messagesSent++;
				clientContext.lastMessageTime = new Date();
				console.log(`✅ Sent latest delta to ${clientContext.id}`);
			}
		});
	} catch (err) {
		console.error(`Error sending latest delta to ${clientContext.id}:`, err);
	}
}

function sendWsDelta(compressedData: Buffer): void {
	latestDeltaCache = compressedData;

	wss.clients.forEach((client) => {
		if (client.readyState !== WebSocket.OPEN) return;

		const clientContext = clientContextMap.get(client);
		if (!clientContext) return;

		try {
			client.send(compressedData, (err) => {
				if (err) {
					console.error(`Failed to send to client ${clientContext.id}:`, err.message);
				} else {
					clientContext.messagesSent++;
					clientContext.lastMessageTime = new Date();
				}
			});
		} catch (err) {
			console.error(`Error sending to client ${clientContext.id}:`, err);
		}
	});
}

rdsSub("ws:delta", (message: string) => {
	try {
		const compressedData = Buffer.from(message, "base64");
		sendWsDelta(compressedData);
	} catch (err) {
		console.error("Error in rdsSubWsDelta callback:", err);
	}
});

// Error handler for server
server.on("error", (err: any) => {
	if (err.code === "EADDRINUSE") {
		console.error(`❌ Port ${PORT} is already in use`);
		console.log(`Find and kill the process:`);
		console.log(`  Windows: netstat -ano | findstr :${PORT}`);
		console.log(`  Then: taskkill /PID <PID> /F`);
		process.exit(1);
	}
	throw err;
});

// Start server
server.listen(PORT, HOST, () => {
	console.log(`✅ WebSocket server listening on ws://${HOST}:${PORT}`);
});

const gracefulShutdown = async (signal: string) => {
	console.log(`\n${signal} signal received: closing WebSocket server`);

	clearInterval(heartbeatInterval);

	wss.clients.forEach((client) => {
		const clientContext = clientContextMap.get(client);
		if (clientContext) {
			console.log(`Closing connection for ${clientContext.id}`);
		}
		client.close(1000, "Server shutting down");
	});

	wss.close(async () => {
		console.log("WebSocket server closed");
		try {
			await rdsShutdown();
		} catch (err) {
			console.error("Error shutting down Redis:", err);
		}
		server.close(() => {
			console.log("HTTP server closed");
			process.exit(0);
		});
	});

	setTimeout(() => {
		console.error("Forced shutdown after timeout");
		process.exit(1);
	}, 10000);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
	process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
	console.error("Unhandled rejection at:", promise, "reason:", reason);
	process.exit(1);
});
