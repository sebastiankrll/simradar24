import 'dotenv/config'
import express from "express";
import cors from "cors";
import { pgGetTrackPointsByUid } from '@sk/db/pg';
import { rdsGetSingle } from '@sk/db/redis';

const app = express()
app.use(cors())
app.use(express.json())

app.get("/api/static/versions", async (req, res) => {
    try {
        const airportsVersion = await rdsGetSingle("static_airports:version")
        const firsVersion = await rdsGetSingle("static_firs:version")
        const traconsVersion = await rdsGetSingle("static_tracons:version")

        res.json({
            airportsVersion,
            firsVersion,
            traconsVersion
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/pilot/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params
        console.log("Requested pilot:", callsign)

        const pilot = await rdsGetSingle(`pilot:${callsign}`)
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

        const airport = await rdsGetSingle(`airport:${icao}`)
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

        const controller = await rdsGetSingle(`controller:${callsign}`)
        if (!controller) return res.status(404).json({ error: "Controller not found" })

        res.json(controller)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/track/:uid", async (req, res) => {
    try {
        const { uid } = req.params
        console.log("Requested track:", uid)

        const trackPoints = await pgGetTrackPointsByUid(uid)

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