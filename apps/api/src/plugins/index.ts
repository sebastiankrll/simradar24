import fastifyCors from "@fastify/cors";
import fastifyHelmet from "@fastify/helmet";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifySensible from "@fastify/sensible";
import fastifyPlugin from "fastify-plugin";
import { authPlugin } from "./auth.js";

export default fastifyPlugin(async (app) => {
	app.register(fastifyHelmet);
	app.register(fastifyCors);
	app.register(fastifyRateLimit);
	app.register(fastifySensible);
	app.register(authPlugin);
});
