import axios from "axios"
import { PilotFlightPlan, PilotLong, PilotTimes, VatsimData, VatsimPilot, VatsimPilotFlightPlan, VatsimTransceivers } from "./types/vatsim.js";

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

function mapPilots(vatsimData: VatsimData): void {
    const pilotsLong: PilotLong[] = vatsimData.pilots.map(pilot => {
        const transceiverData = vatsimData.transceivers.find(transceiver => transceiver.callsign === pilot.callsign)
        const transceiver = transceiverData?.transceivers[0]

        return {
            // v TrackPoint v
            _id: `${pilot.cid}_${pilot.callsign}_${pilot.logon_time}`, // TODO: check, when flight disconnects and maybe reconnects
            latitude: pilot.latitude,
            longitude: pilot.longitude,
            altitude_agl: transceiver?.heightAglM ? Math.round(transceiver.heightAglM * 3.28084) : pilot.altitude,
            altitude_ms: transceiver?.heightMslM ? Math.round(transceiver.heightMslM * 3.28084) : pilot.altitude,
            groundspeed: pilot.groundspeed,
            vertical_speed: 0, // TODO: v/s calculation
            heading: pilot.heading,
            connected: true, // TODO: check if connected or disconnected flight
            timestamp: new Date(pilot.last_updated),
            // v PilotShort v
            callsign: pilot.callsign,
            aircraft: pilot.flight_plan?.aircraft_short || "A320",
            transponder: pilot.flight_plan?.assigned_transponder ? Number(pilot.flight_plan?.assigned_transponder) : 2000,
            frequency: transceiver?.frequency || 122800000,
            // v PilotLong v
            cid: pilot.cid,
            name: pilot.name,
            server: pilot.server,
            pilot_rating: pilot.pilot_rating,
            military_rating: pilot.military_rating,
            qnh_i_hg: pilot.qnh_i_hg,
            qnh_mb: pilot.qnh_mb,
            flight_plan: mapPilotFlightPlan(pilot.flight_plan),
            logon_time: new Date(pilot.logon_time),
            times: mapPilotTimes(pilot.flight_plan)
        }
    })

    console.log(pilotsLong[0])
}

function mapPilotFlightPlan(fp?: VatsimPilotFlightPlan): PilotFlightPlan | null {
    if (!fp) return null
    return {
        flight_rules: fp.flight_rules === "I" ? "IFR" : "VFR",
        ac_reg: "D-ABON", // TODO: Assign random, individual aircraft from database
        departure: fp.departure,
        arrival: fp.arrival,
        alternate: fp.alternate,
        filed_tas: Number(fp.cruise_tas),
        filed_altitude: Number(fp.altitude),
        enroute_time: parseTimeToSeconds(fp.enroute_time),
        fuel_time: parseTimeToSeconds(fp.fuel_time),
        enroute_dist: 0, // TODO: Calculate distance
        remarks: fp.remarks,
        route: fp.route,
        revision_id: fp.revision_id
    }
}

function mapPilotTimes(fp?: VatsimPilotFlightPlan): PilotTimes { // TODO: Calculate times
    return {
        off_block: fp ? parseTimeToDate(fp.deptime) : new Date(),
        scheduled_dep: new Date(),
        actual_dep: new Date(),
        scheduled_arr: new Date(),
        actual_arr: new Date(),
        on_block: new Date()
    }
}

// "0325" -> 12,300 seconds
function parseTimeToSeconds(time: string): number {
    const hours = Number(time.slice(0, 2))
    const minutes = Number(time.slice(2, 4))

    return hours * 3600 + minutes * 60
}

// "0020" -> 2025-11-14T00:20:00.000Z (next day)
function parseTimeToDate(time: string): Date {
    const hours = Number(time.slice(0, 2))
    const minutes = Number(time.slice(2, 4))
    const now = new Date()

    const target = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hours,
        minutes,
        0,
        0
    ))

    // If target time has already passed today, assume next day
    // TODO: Revise
    // if (target.getTime() < now.getTime()) {
    //     target.setUTCDate(target.getUTCDate() + 1)
    // }

    return target
}

fetchVatsimData()
setInterval(fetchVatsimData, FETCH_INTERVAL)