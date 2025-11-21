import "dotenv/config";
import { CronJob } from "cron";
import { updateAirlines } from "./airlines.js";
import { updateAirports } from "./airports.js";
import { updateFirs } from "./fir.js";
import { updateTracons } from "./tracon.js";

CronJob.from({
	cronTime: "0 6 * * *",
	onTick: async () => {
		await updateAirports();
		await updateFirs();
		await updateTracons();
	},
	start: true,
	runOnInit: true,
	timeZone: "UTC",
});

updateAirlines();
