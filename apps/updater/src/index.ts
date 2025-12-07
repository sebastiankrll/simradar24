import "dotenv/config";
import { CronJob } from "cron";
import { updateAirlines } from "./airlines.js";
import { updateAirports } from "./airports.js";
import { updateFirs } from "./fir.js";
import { updateFleets } from "./fleet.js";
import { updateTracons } from "./tracon.js";
import { rdsConnect } from "@sr24/db/redis";

let dbsInitialized = false;

CronJob.from({
	cronTime: "0 6 * * *",
	onTick: async () => {
		if (!dbsInitialized) {
			await rdsConnect();
			dbsInitialized = true;
		}

		await updateAirlines();
		await updateAirports();
		await updateFirs();
		await updateTracons();
		await updateFleets();

		console.log("✅ Static data update completed!");
	},
	start: true,
	runOnInit: true,
	timeZone: "UTC",
});
