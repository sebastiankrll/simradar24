import axios from "axios"
import { VatsimData, VatsimTransceivers } from "./types/vatsim.js";
import { mapPilots } from "./pilot.js";
import { mapControllers } from "./controller.js";
import { mapAirports } from "./airport.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json"
const VATSIM_TRANSCEIVERS_URL = "https://data.vatsim.net/v3/transceivers-data.json"
const FETCH_INTERVAL = 5_000

let updating = false
let lastUpdateTimestamp = "2000-01-01T00:00:00.00000Z"

async function fetchVatsimData(): Promise<void> {
    if (updating) return

    updating = true
    try {
        const vatsimResponse = await axios.get<VatsimData>(VATSIM_DATA_URL)
        const vatsimData = vatsimResponse.data

        if (new Date(vatsimData.general.update_timestamp) > new Date(lastUpdateTimestamp)) {
            lastUpdateTimestamp = vatsimData.general.update_timestamp

            const transceiversResponse = await axios.get<VatsimTransceivers[]>(VATSIM_TRANSCEIVERS_URL)
            vatsimData.transceivers = transceiversResponse.data

            mapPilots(vatsimData)
            mapControllers(vatsimData)
            mapAirports(vatsimData)

            // TODO: Do something with the data (save to DB, process, etc.)
            console.log(`✅ Retrieved ${vatsimData.pilots.length} pilots and ${vatsimData.controllers.length} controllers.`)
        } else {
            console.log("Nothing changed.")
        }

    } catch (error) {
        console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error)
    }
    updating = false
}

fetchVatsimData()
setInterval(fetchVatsimData, FETCH_INTERVAL)