import { createGzip } from "node:zlib";
import { rdsSubWsDelta } from "@sk/db/redis";
import type { WsDelta } from "@sk/types/vatsim";
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({
	port: 5001,
	perMessageDeflate: false,
});

wss.on("connection", function connection(ws) {
	console.log("A new client connected!");
	ws.on("error", console.error);
	ws.on("message", async (msg) => {
		console.log(msg);
	});
});

function sendWsDelta(data: WsDelta): void {
	const gzip = createGzip();

	gzip.write(
		JSON.stringify({
			event: "ws:delta",
			data: data,
		}),
	);
	gzip.end();

	const chunks: Buffer[] = [];
	gzip.on("data", (chunk) => {
		chunks.push(chunk);
	});

	gzip.on("end", () => {
		const zip = Buffer.concat(chunks);

		wss.clients.forEach(function each(client) {
			if (client.readyState === WebSocket.OPEN && zip) {
				client.send(zip);
			}
		});
	});
}

rdsSubWsDelta((data: WsDelta) => sendWsDelta(data));
