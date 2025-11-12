import axios from "axios"
import { VatsimData } from "./types/vatsim.js";

const VATSIM_DATA_URL = "https://data.vatsim.net/v3/vatsim-data.json"
const FETCH_INTERVAL = 5_000

async function fetchVatsimData(): Promise<void> {
    try {
        const response = await axios.get<VatsimData>(VATSIM_DATA_URL)
        const data = response.data

        console.log(`✅ Retrieved ${data.pilots.length} pilots and ${data.controllers.length} controllers.`)

        // TODO: Do something with the data (save to DB, process, etc.)

    } catch (error) {
        console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error)
    }
}

fetchVatsimData()
setInterval(fetchVatsimData, FETCH_INTERVAL)