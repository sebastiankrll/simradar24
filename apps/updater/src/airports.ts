import { OurAirportsCsv, StaticAirport } from "@sk/types/db";
import axios from "axios";
import csvParser from "csv-parser";
import { rdsSetMultiple, rdsSetSingle } from "@sk/db/redis";

const CSV_URL = 'https://ourairports.com/data/airports.csv'

export async function updateAirports(): Promise<void> {
    const response = await axios.get(CSV_URL, { responseType: 'stream' })
    const airports: OurAirportsCsv[] = []

    await new Promise((resolve, reject) => {
        response.data
            .pipe(csvParser())
            .on('data', (row: OurAirportsCsv) => airports.push(row))
            .on('end', () => resolve(airports))
            .on('error', (err: Error) => reject(err))
    })

    const filteredAirports: StaticAirport[] = airports
        .filter(a => a.icao_code && a.icao_code.trim() !== "")
        .map(a => ({
            id: a.icao_code,
            iata: a.iata_code,
            size: a.type,
            name: a.name,
            country: a.iso_country,
            latitude: Number(a.latitude_deg),
            longitude: Number(a.longitude_deg)
        }))

    await rdsSetMultiple(filteredAirports, "static_airport", a => a.id, "airports:static")
    await rdsSetSingle("static_airports:all", filteredAirports)
    await rdsSetSingle("static_airports:version", "1.0.0")
}