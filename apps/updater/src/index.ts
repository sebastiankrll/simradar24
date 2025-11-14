import { CronJob } from "cron"
import { updateAirports } from "./airports.js"

CronJob.from({
    cronTime: '0 6 * * *',
    onTick: async () => {
        await updateAirports()
    },
    start: true,
    runOnInit: true,
    timeZone: 'UTC',
})