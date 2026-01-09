import "dotenv/config";
import { pgShutdown } from "@sr24/db/pg";
import { rdsConnectBufferClient, rdsShutdown } from "@sr24/db/redis";
import fastify from "fastify";
import plugins from "./plugins/index.js";
import routes from "./routes/index.js";

await rdsConnectBufferClient();

const app = fastify({ logger: true });

await app.register(plugins);
await app.register(routes);

const PORT = Number(process.env.API_PORT || 3001);

await app
	.listen({ port: PORT, host: "0.0.0.0" })
	.then(() => console.log(`Fastify API listening on port ${PORT}`))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});

const gracefulShutdown = async (signal: string) => {
	console.log(`\n${signal} signal received: closing HTTP server`);
	await app.close();
	try {
		await rdsShutdown();
	} catch {}
	try {
		await pgShutdown();
	} catch {}
	process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
