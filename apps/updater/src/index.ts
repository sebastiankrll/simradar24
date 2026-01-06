import "dotenv/config";
import { CronJob } from "cron";
import { updateAircrafts } from "./aircrafts.js";
import { updateAirlines } from "./airlines.js";
import { updateAirports } from "./airports.js";
import { updateFirs } from "./fir.js";
import { updateFleets } from "./fleet.js";
import { updateR2Storage } from "./s3.js";
import { updateTracons } from "./tracon.js";

CronJob.from({
	cronTime: "0 6 * * *",
	onTick: async () => {
		await updateAirlines();
		await updateAircrafts();
		await updateAirports();
		await updateFirs();
		await updateTracons();
		await updateFleets();

		await updateR2Storage();

		console.log("✅ Static data update completed!");
	},
	start: true,
	runOnInit: true,
	timeZone: "UTC",
});
