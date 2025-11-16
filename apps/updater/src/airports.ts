import { OurAirportsCsv } from "@sk/types/db";
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

    await rdsSetMultiple(airports, "static_airport", a => a.icao_code, "airports:static")
    await rdsSetSingle("static_airports:all", JSON.stringify(airports))
    await rdsSetSingle("static_airports:version", "1.0.0")
}