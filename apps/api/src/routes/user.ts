import type { FastifyPluginAsync } from "fastify";
import { getUserSettings, setUserSettings } from "../services/db.js";

const userRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/settings",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = BigInt(request.user?.cid || 0);
			const user = await getUserSettings(cid);
			if (!user) {
				throw app.httpErrors.notFound({ error: "User not found" });
			}
			return { settings: user.settings || {} };
		},
	);

	app.post(
		"/settings",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = BigInt(request.user?.cid || 0);
			const settings = request.body;

			if (!settings || typeof settings !== "object") {
				throw app.httpErrors.badRequest({ error: "Invalid settings data." });
			}

			const user = await setUserSettings(cid, settings);
			return user;
		},
	);
};

export default userRoutes;
