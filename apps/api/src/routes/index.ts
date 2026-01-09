import fp from "fastify-plugin";
import dataRoutes from "./data.js";
import mapRoutes from "./map.js";
import searchRoutes from "./search.js";
import systemRoutes from "./system.js";
import userRoutes from "./user.js";

export default fp(async (app) => {
	app.register(systemRoutes);
	app.register(mapRoutes, { prefix: "/map" });
	app.register(searchRoutes, { prefix: "/search" });
	app.register(dataRoutes, { prefix: "/data" });
	app.register(userRoutes, { prefix: "/user" });
});
