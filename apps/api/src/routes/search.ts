import type { FastifyPluginAsync } from "fastify";
import { searchPilotsByAirline, searchPilotsByAll, searchPilotsByRoute } from "../services/db.js";

const searchRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/",
		{
			schema: {
				querystring: {
					type: "object",
					properties: { q: { type: "string", minLength: 3 } },
					required: ["q"],
				},
			},
		},
		async (request) => {
			const { q: query } = request.query as { q?: string };
			if (!query || query.length < 1) {
				throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
			}

			return searchPilotsByAll(query);
		},
	);

	app.get(
		"/airline",
		{
			schema: {
				querystring: {
					type: "object",
					properties: { q: { type: "string", minLength: 3 } },
					required: ["q"],
				},
			},
		},
		async (request) => {
			const { q: query } = request.query as { q?: string };
			if (!query || query.length < 1) {
				throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
			}

			return searchPilotsByAirline(query);
		},
	);

	app.get(
		"/route",
		{
			schema: {
				querystring: {
					type: "object",
					properties: { q: { type: "string", minLength: 3 } },
					required: ["q"],
				},
			},
		},
		async (request) => {
			const { q: query } = request.query as { q?: string };
			if (!query || query.length < 1) {
				throw app.httpErrors.badRequest({ error: "Query parameter 'q' is required" });
			}

			const icaos = query.split("-");
			if (icaos.length !== 2) {
				throw app.httpErrors.badRequest({ error: "Query parameter 'q' must be in the format DEP-ARR" });
			}

			return searchPilotsByRoute(icaos[0], icaos[1]);
		},
	);
};

export default searchRoutes;
