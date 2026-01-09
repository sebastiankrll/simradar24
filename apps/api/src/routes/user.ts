import type { FastifyPluginAsync } from "fastify";
import { deleteUser, ensureUser, patchUser } from "../services/db.js";

const userRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = request.user?.cid;
			const user = await ensureUser(cid);
			return { id: user.id };
		},
	);

	app.delete(
		"/",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = request.user?.cid;
			const user = await deleteUser(cid);
			return { id: user.id };
		},
	);

	app.patch(
		"/",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = request.user?.cid;
			const data = request.body as Partial<{ settings: any; filters: any; bookmarks: any }>;

			const user = await patchUser(cid, data);
			if (!user) {
				throw app.httpErrors.notFound({ error: "User not found" });
			}
			return { settings: user.settings };
		},
	);

	app.get(
		"/data",
		{
			preHandler: app.authenticate,
		},
		async (request) => {
			const cid = request.user?.cid;
			const user = await ensureUser(cid);
			return { settings: user.settings, filters: user.filters, bookmarks: user.bookmarks };
		},
	);
};

export default userRoutes;
