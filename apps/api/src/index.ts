import express from "express";
import cors from "cors";

const app = express()
app.use(cors())
app.use(express.json())

app.get("/api/data/pilot/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params
        // console.log("Requested pilot:", callsign)

        // TODO: fetch pilot from DB
        const pilot = "await getPilotByCallsign(callsign);"

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
        // console.log("Requested airport:", icao)

        // TODO: fetch airport from DB
        const airport = "await getAirportByIcao(icao);"

        if (!airport) return res.status(404).json({ error: "Airport not found" })

        res.json(airport)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

app.get("/api/data/track/:callsign", async (req, res) => {
    try {
        const { callsign } = req.params
        // console.log("Requested track:", callsign)

        // TODO: fetch track from DB
        const track = "await getTrackByCallsign(callsign);"

        if (!track) return res.status(404).json({ error: "Track not found" })

        res.json(track)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Internal server error" })
    }
})

const PORT = process.env.PORT || 5000
const server = app.listen(PORT, () => {
    console.log(`Express API listening on port ${PORT}`)
})