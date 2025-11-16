import 'dotenv/config'
import express from "express";
import cors from "cors";
import { rdsGetAirport, rdsGetController, rdsGetPilot } from "@sk/db/redis";
import { pgGetTrackPointsByCID } from "@sk/db/pg";

const app = express()
app.use(cors())
app.use(express.json())

app.get("/api/data/pilot/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params
        console.log("Requested pilot:", callsign)

        const pilot = await rdsGetPilot(callsign)
        if (!pilot) return res.status(404).json({ error: "Pilot not found" })

        res.json(pilot)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/airport/:icao", async (req, res) => {
    try {
        const { icao } = req.params
        console.log("Requested airport:", icao)

        const airport = await rdsGetAirport(icao)
        if (!airport) return res.status(404).json({ error: "Airport not found" })

        res.json(airport)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/controller/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params
        console.log("Requested controller:", callsign)

        const controller = await rdsGetController(callsign)
        if (!controller) return res.status(404).json({ error: "Controller not found" })

        res.json(controller)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/track/:cid", async (req, res) => {
    try {
        const { cid } = req.params
        console.log("Requested track:", cid)

        const trackPoints = await pgGetTrackPointsByCID(cid)

        res.json(trackPoints)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Express API listening on port ${PORT}`)
})