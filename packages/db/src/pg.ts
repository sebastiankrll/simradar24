import { OurAirportsCsv, PGAirport } from '@sk/types/db';
import { TrackPoint } from '@sk/types/vatsim';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT || 5432),
})

async function pgInitAirportsTable() {
    const client = await pool.connect()

    try {
        await client.query("BEGIN")

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
        wikipedia_link TEXT
      );
    `
        await client.query(createTableQuery)
        await client.query("COMMIT")
        // console.log('airports table is ready ✅')
    } finally {
        client.release()
    }
}

export async function pgUpsertAirports(airports: OurAirportsCsv[]): Promise<void> {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        await client.query('TRUNCATE airports RESTART IDENTITY')

        const insertQuery = `
      INSERT INTO airports (
        size, name, latitude, longitude, elevation,
        continent, iso_country, iso_region, municipality, scheduled_service,
        icao, iata, home_link, wikipedia_link
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
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

export async function pgGetAirportsByICAO(icaos: string[]): Promise<Map<string, PGAirport>> {
    if (icaos.length === 0) return new Map()
    const client = await pool.connect()

    try {
        const placeholders = icaos.map((_, i) => `$${i + 1}`).join(", ")
        const sql = `
            SELECT *
            FROM airports
            WHERE icao IN (${placeholders})
        `

        const res = await client.query(sql, icaos)

        const airportMap = new Map<string, PGAirport>()
        for (const row of res.rows) {
            airportMap.set(row.icao, row)
        }

        return airportMap
    } finally {
        client.release()
    }
}

async function pgInitTrackPointsTable() {
    const client = await pool.connect()

    try {
        await client.query("BEGIN")
        await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`)

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS track_points (
        cid INT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        altitude_agl DOUBLE PRECISION,
        altitude_ms DOUBLE PRECISION,
        groundspeed DOUBLE PRECISION,
        vertical_speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        PRIMARY KEY (cid, timestamp)
      );
    `
        await client.query(createTableQuery)
        await client.query(`SELECT create_hypertable('track_points', 'timestamp', if_not_exists => TRUE);`)
        await client.query("COMMIT")

        console.log('airports table is ready ✅')
    } finally {
        client.release()
    }
}

export async function pgInsertTrackPoints(trackPoints: TrackPoint[]) {
    if (trackPoints.length === 0) return

    const values: any[] = []
    const placeholders: string[] = []

    trackPoints.forEach((tp, i) => {
        const idx = i * 9
        placeholders.push(
            `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9})`
        )
        values.push(
            tp.cid,
            tp.latitude,
            tp.longitude,
            tp.altitude_agl,
            tp.altitude_ms,
            tp.groundspeed,
            tp.vertical_speed,
            tp.heading,
            tp.timestamp
        )
    })

    const query = `
    INSERT INTO track_points (cid, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading, timestamp)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (cid, timestamp) DO NOTHING
  `

    try {
        await pool.query(query, values)
        // console.log(`✅ Inserted ${trackPoints.length} track points`)
    } catch (err) {
        console.error("Error inserting track points:", err)
    }
}

export async function pgGetTrackPointsByCID(cid: string): Promise<TrackPoint[]> {
    const values: string[] = [cid]
    const query = `
    SELECT cid, timestamp, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading
    FROM track_points
    WHERE cid = $1
    ORDER BY timestamp ASC
  `

    try {
        const { rows } = await pool.query(query, values)
        return rows.map((r: any) => ({
            _id: "",
            cid: r.cid,
            timestamp: r.timestamp,
            latitude: r.latitude,
            longitude: r.longitude,
            altitude_agl: r.altitude_agl,
            altitude_ms: r.altitude_ms,
            groundspeed: r.groundspeed,
            vertical_speed: r.vertical_speed,
            heading: r.heading,
        }))
    } catch (err) {
        console.error(`Error fetching track points for ${cid}:`, err)
        return []
    }
}

(async () => {
    await pgInitAirportsTable()
    await pgInitTrackPointsTable()
})()

// export async function pgGetAirportsDistance(batch: [string, string][]): Promise<Map<string, number>> {
//     if (batch.length === 0) return new Map()

//     const client = await pool.connect()
//     try {
//         const valuesSql = batch.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ")
//         const values = batch.flat()

//         const sql = `
//             WITH pairs(dep_icao, arr_icao) AS (
//                 VALUES ${valuesSql}
//             )
//             SELECT p.dep_icao, p.arr_icao,
//                    ST_Distance(dep.geom, arr.geom)/1000 AS distance_km
//             FROM pairs p
//             JOIN airports dep ON dep.icao = p.dep_icao
//             JOIN airports arr ON arr.icao = p.arr_icao;
//         `

//         const res = await client.query(sql, values)
//         const distanceMap = new Map<string, number>()

//         for (const row of res.rows) {
//             distanceMap.set(`${row.dep_icao}_${row.arr_icao}`, Number(row.distance_km))
//         }

//         return distanceMap
//     } finally {
//         client.release()
//     }
// }