import { rdsGetSingle } from "@sr24/db/redis";
import type { FastifyPluginAsync } from "fastify";
import { getFlightsByCallsign, getFlightsByRegistration, getPilotReplay } from "../services/db.js";
import { getDataVersions } from "../stores/static.js";
import { bookingsStore } from "../stores/bookings.js";

const dataRoutes: FastifyPluginAsync = async (app) => {
	app.get("/static/versions", async () => {
		return await getDataVersions();
	});

	app.get(
		"/flights/callsign/:callsign",
		{
			schema: {
				params: {
					type: "object",
					properties: { callsign: { type: "string", minLength: 3 } },
					required: ["callsign"],
				},
				querystring: {
					type: "object",
					properties: {
						limit: { type: "string", pattern: "^[0-9]+$" },
						cursor: { type: "string" },
					},
				},
			},
		},
		async (request) => {
			const { callsign } = request.params as { callsign: string };
			const { limit, cursor } = request.query as { limit?: string; cursor?: string };

			return await getFlightsByCallsign(callsign, limit, cursor);
		},
	);

	app.get(
		"/flights/registration/:registration",
		{
			schema: {
				params: {
					type: "object",
					properties: { registration: { type: "string", minLength: 3 } },
					required: ["registration"],
				},
				querystring: {
					type: "object",
					properties: {
						limit: { type: "string", pattern: "^[0-9]+$" },
						cursor: { type: "string" },
					},
				},
			},
		},
		async (request) => {
			const { registration } = request.params as { registration: string };
			const { limit, cursor } = request.query as { limit?: string; cursor?: string };

			return await getFlightsByRegistration(registration, limit, cursor);
		},
	);

	app.get(
		"/pilot/:id",
		{
			schema: {
				params: {
					type: "object",
					properties: { id: { type: "string", minLength: 10, maxLength: 10 } },
					required: ["id"],
				},
			},
		},
		async (request) => {
			const { id } = request.params as { id: string };
			const pilotReplay = await getPilotReplay(id);
			if (!pilotReplay) {
				throw app.httpErrors.notFound({ error: "Pilot not found" });
			}
			return pilotReplay;
		},
	);

	app.get(
		"/aircraft/:reg",
		{
			schema: {
				params: {
					type: "object",
					properties: { reg: { type: "string", minLength: 4, maxLength: 8 } },
					required: ["reg"],
				},
			},
		},
		async (request) => {
			const { reg } = request.params as { reg: string };
			const aircraft = await rdsGetSingle(`static_fleet:${reg.toUpperCase()}`);
			if (!aircraft) {
				throw app.httpErrors.notFound({ error: "Aircraft not found" });
			}
			return aircraft;
		},
	);

	app.get("/bookings", async () => {
		return bookingsStore.bookings;
	});
};

export default dataRoutes;
