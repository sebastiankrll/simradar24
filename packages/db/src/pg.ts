import { OurAirportsCsv } from '@sk/types';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || 5432),
})

async function pgInitAirports() {
    const client = await pool.connect()

    try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS postgis;`)

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS airports (
        id SERIAL PRIMARY KEY,
        size TEXT,
        name TEXT,
        latitude FLOAT,
        longitude FLOAT,
        elevation INT NULL,
        continent TEXT,
        iso_country TEXT,
        iso_region TEXT,
        municipality TEXT,
        scheduled_service BOOLEAN,
        icao TEXT,
        iata TEXT,
        home_link TEXT,
        wikipedia_link TEXT,
        geom GEOGRAPHY(Point, 4326)
      );
    `
        await client.query(createTableQuery)
        console.log('airports table is ready ✅')
    } finally {
        client.release()
    }
}

export async function pgUpsertAirports(airports: OurAirportsCsv[]): Promise<void> {
    await pgInitAirports()
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        await client.query('TRUNCATE airports RESTART IDENTITY')

        const insertQuery = `
      INSERT INTO airports (
        size, name, latitude, longitude, elevation,
        continent, iso_country, iso_region, municipality, scheduled_service,
        icao, iata, home_link, wikipedia_link, geom
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
        ST_SetSRID(ST_MakePoint($4, $3), 4326)
      )
    `

        for (const airport of airports) {
            await client.query(insertQuery, [
                airport.type,
                airport.name,
                airport.latitude_deg,
                airport.longitude_deg,
                airport.elevation_ft ? Number(airport.elevation_ft) : null,
                airport.continent,
                airport.iso_country,
                airport.iso_region,
                airport.municipality,
                airport.scheduled_service === "yes",
                airport.icao_code,
                airport.iata_code,
                airport.home_link,
                airport.wikipedia_link
            ])
        }

        await client.query('COMMIT')
    } catch (err) {
        await client.query('ROLLBACK')
        throw err
    } finally {
        client.release()
    }
}

export async function pgGetAirportsDistance(batch: [string, string][]): Promise<Map<string, number>> {
    if (batch.length === 0) return new Map()

    const client = await pool.connect()
    try {
        const valuesSql = batch.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ")
        const values = batch.flat()

        const sql = `
            WITH pairs(dep_icao, arr_icao) AS (
                VALUES ${valuesSql}
            )
            SELECT p.dep_icao, p.arr_icao,
                   ST_Distance(dep.geom, arr.geom)/1000 AS distance_km
            FROM pairs p
            JOIN airports dep ON dep.icao = p.dep_icao
            JOIN airports arr ON arr.icao = p.arr_icao;
        `

        const res = await client.query(sql, values)
        const distanceMap = new Map<string, number>()

        for (const row of res.rows) {
            distanceMap.set(`${row.dep_icao}_${row.arr_icao}`, Number(row.distance_km))
        }

        return distanceMap
    } finally {
        client.release()
    }
}