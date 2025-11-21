import { createGzip } from "node:zlib";
import { rdsSubWsShort } from "@sk/db/redis";
import type { WsShort } from "@sk/types/vatsim";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
	port: 5001,
	perMessageDeflate: false,
});

let compressedData: Buffer<ArrayBuffer> | null = null;

wss.on("connection", function connection(ws) {
	console.log("A new client connected!");
	ws.on("error", console.error);
	ws.on("message", async (msg) => {
		console.log(msg);
	});
	if (ws.readyState === WebSocket.OPEN && compressedData) {
		ws.send(compressedData);
	}
});

function sendWsShort(data: WsShort) {
	const gzip = createGzip();

	gzip.write(
		JSON.stringify({
			event: "ws:short",
			data: data,
		}),
	);
	gzip.end();

	const chunks: Buffer[] = [];
	gzip.on("data", (chunk) => {
		chunks.push(chunk);
	});

	gzip.on("end", () => {
		compressedData = Buffer.concat(chunks);

		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN && compressedData) {
				client.send(compressedData);
			}
		});
	});
}

rdsSubWsShort((data: WsShort) => sendWsShort(data));
