import 'dotenv/config'
import axios from "axios"
import { mapPilots } from "./pilot.js";
import { mapControllers } from "./controller.js";
import { mapAirports } from "./airport.js";
import { AirportLong, ControllerLong, PilotLong, TrackPoint, VatsimData, VatsimTransceivers, WsShort } from "@sk/types/vatsim";
import { rdsPubWsShort, rdsSetItems } from "@sk/db/redis";
import { pgInsertTrackPoints } from "@sk/db/pg";

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

            const pilotsLong = await mapPilots(vatsimData)
            const controllersLong = mapControllers(vatsimData, pilotsLong)
            const airportsLong = mapAirports(pilotsLong)

            // Publish minimal websocket data on redis ws:short
            publishWsShort(pilotsLong, controllersLong, airportsLong)
            // Set pilots, controllers and airports data in redis
            await rdsSetItems(pilotsLong, "pilot", p => p.callsign, "pilots:active", 120)
            await rdsSetItems(controllersLong, "controller", c => c.callsign, "controllers:active", 120)
            await rdsSetItems(airportsLong, "airport", a => a.icao, "airports:active", 120)
            // Insert trackpoints in TimescaleDB
            insertTrackPoints(pilotsLong)

            console.log(`✅ Retrieved ${vatsimData.pilots.length} pilots and ${vatsimData.controllers.length} controllers.`)
        } else {
            // console.log("Nothing changed.")
        }

    } catch (error) {
        console.error("❌ Error fetching VATSIM data:", error instanceof Error ? error.message : error)
    }
    updating = false
}

function publishWsShort(pilotsLong: PilotLong[], controllersLong: ControllerLong[], airportsLong: AirportLong[]): void {
    const wsShort = {
        pilots: pilotsLong.map((
            {
                uid,
                cid,
                latitude,
                longitude,
                altitude_agl,
                altitude_ms,
                groundspeed,
                vertical_speed,
                heading,
                timestamp,
                callsign,
                aircraft,
                transponder,
                frequency
            }) => ({
                uid,
                cid,
                latitude,
                longitude,
                altitude_agl,
                altitude_ms,
                groundspeed,
                vertical_speed,
                heading,
                timestamp,
                callsign,
                aircraft,
                transponder,
                frequency
            })),
        controllers: controllersLong.map((
            {
                callsign,
                frequency,
                facility,
                atis,
                connections
            }) => ({
                callsign,
                frequency,
                facility,
                atis,
                connections
            })),
        airports: airportsLong.map((
            {
                icao,
                dep_traffic,
                arr_traffic
            }) => ({
                icao,
                dep_traffic,
                arr_traffic
            }))
    }
    rdsPubWsShort(wsShort)
}

function insertTrackPoints(pilotsLong: PilotLong[]): void {
    const trackPoints: TrackPoint[] = pilotsLong.map(p => ({
        uid: p.uid,
        cid: p.cid,
        latitude: p.latitude,
        longitude: p.longitude,
        altitude_agl: p.altitude_agl,
        altitude_ms: p.altitude_ms,
        groundspeed: p.groundspeed,
        vertical_speed: p.vertical_speed,
        heading: p.heading,
        timestamp: p.timestamp
    }))

    // console.log(trackPoints[0])
    pgInsertTrackPoints(trackPoints)
}

fetchVatsimData()
setInterval(fetchVatsimData, FETCH_INTERVAL)