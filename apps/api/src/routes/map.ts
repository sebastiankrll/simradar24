import { rdsGetTrackPoints } from "@sr24/db/redis";
import type { FastifyPluginAsync } from "fastify";
import { getPilotsByAirport } from "../services/db.js";
import { getMetar, getTaf } from "../services/weather.js";
import { mapStore } from "../stores/vatsim.js";

const mapRoutes: FastifyPluginAsync = async (app) => {
	app.get("/init", async () => {
		const initialData = mapStore.init;
		if (!initialData) {
			throw app.httpErrors.serviceUnavailable({ error: "Initial data not available" });
		}
		return initialData;
	});

	app.get("/dashboard", async () => {
		const dashboardData = mapStore.dashboard;
		if (!dashboardData) {
			throw app.httpErrors.notFound({ error: "Dashboard data not available" });
		}
		return dashboardData;
	});

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
			const pilot = mapStore.pilots.get(id);
			if (!pilot) {
				throw app.httpErrors.notFound({ error: "Pilot not found" });
			}
			return pilot;
		},
	);

	app.get(
		"/pilot/:id/track",
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
			const trackPoints = await rdsGetTrackPoints(id);
			if (!trackPoints) {
				throw app.httpErrors.notFound({ error: "Track not found" });
			}
			return trackPoints;
		},
	);

	app.get(
		"/airport/:icao",
		{
			schema: {
				params: {
					type: "object",
					properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
					required: ["icao"],
				},
			},
		},
		async (request) => {
			const { icao } = request.params as { icao: string };
			const airport = mapStore.airports.get(icao.toUpperCase());
			if (!airport) {
				throw app.httpErrors.notFound({ error: "Airport not found" });
			}
			return airport;
		},
	);

	app.get(
		"/airport/:icao/weather",
		{
			schema: {
				params: {
					type: "object",
					properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
					required: ["icao"],
				},
			},
		},
		async (request) => {
			const { icao } = request.params as { icao: string };
			const metar = getMetar(icao.toUpperCase());
			const taf = getTaf(icao.toUpperCase());
			return { metar, taf };
		},
	);

	app.get(
		"/airport/:icao/pilots",
		{
			schema: {
				params: {
					type: "object",
					properties: { icao: { type: "string", minLength: 4, maxLength: 4 } },
					required: ["icao"],
				},
				querystring: {
					type: "object",
					properties: {
						direction: { type: "string", enum: ["arr", "dep"] },
						limit: { type: "string", pattern: "^[0-9]+$" },
						cursor: { type: "string" },
						backwards: { type: "string", enum: ["true", "false"] },
					},
				},
			},
		},
		async (request) => {
			const { icao } = request.params as { icao: string };
			const { direction, limit, cursor, backwards } = request.query as { direction?: string; limit?: string; cursor?: string; backwards?: string };
			return await getPilotsByAirport(icao, direction, limit, cursor, backwards);
		},
	);

	app.get(
		"/controller/:callsigns",
		{
			schema: {
				params: {
					type: "object",
					properties: { callsigns: { type: "string", minLength: 4 } },
					required: ["callsigns"],
				},
			},
		},
		async (request) => {
			const { callsigns } = request.params as { callsigns: string };
			const callsignArray = callsigns.split(",");

			if (callsignArray.length === 0) {
				throw app.httpErrors.badRequest({ error: "At least one callsign is required" });
			}

			return callsignArray.map((callsign) => mapStore.controllers.get(callsign) || null).filter((controller) => controller !== null);
		},
	);
};

export default mapRoutes;
