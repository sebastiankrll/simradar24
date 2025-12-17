import type express from "express";

export const errorHandler =
	(fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void> | Promise<any>) =>
	(req: express.Request, res: express.Response, next: express.NextFunction) => {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
