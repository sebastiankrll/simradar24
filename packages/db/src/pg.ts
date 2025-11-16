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
    await pool.query(createTableQuery)
    console.log("airports table is ready ✅")
}

const BATCH_SIZE = 500

export async function pgUpsertAirports(airports: OurAirportsCsv[]): Promise<void> {
    try {
        await pool.query('TRUNCATE airports RESTART IDENTITY')
        if (airports.length === 0) return

        for (let i = 0; i < airports.length; i += BATCH_SIZE) {
            const batch = airports.slice(i, i + BATCH_SIZE)

            const values: any[] = []
            const placeholders: string[] = []

            batch.forEach((airport, j) => {
                const idx = j * 14
                placeholders.push(
                    `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9}, $${idx + 10}, $${idx + 11}, $${idx + 12}, $${idx + 13}, $${idx + 14})`
                )

                values.push(
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
                )
            })

            const query = `
        INSERT INTO airports (
          size, name, latitude, longitude, elevation,
          continent, iso_country, iso_region, municipality, scheduled_service,
          icao, iata, home_link, wikipedia_link
        ) VALUES ${placeholders.join(", ")}
      `

            await pool.query(query, values);
            // console.log(`✅ Inserted batch of ${batch.length} airports`)
        }

        console.log(`✅ Inserted total ${airports.length} airports`)
    } catch (err) {
        console.error("Error inserting airports:", err)
        throw err
    }
}

export async function pgGetAirportsByICAO(icaos: string[]): Promise<Map<string, PGAirport>> {
    if (icaos.length === 0) return new Map()

    const placeholders = icaos.map((_, i) => `$${i + 1}`).join(", ")
    const sql = `
    SELECT *
    FROM airports
    WHERE icao IN (${placeholders})
  `

    const res = await pool.query(sql, icaos)

    const airportMap = new Map<string, PGAirport>()
    for (const row of res.rows) {
        airportMap.set(row.icao, row)
    }

    return airportMap
}

async function pgInitTrackPointsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS track_points (
        uid TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        altitude_agl DOUBLE PRECISION,
        altitude_ms DOUBLE PRECISION,
        groundspeed DOUBLE PRECISION,
        vertical_speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        PRIMARY KEY (uid, timestamp)
      );
    `
    await pool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`)
    await pool.query(createTableQuery)
    await pool.query(`SELECT create_hypertable('track_points', 'timestamp', if_not_exists => TRUE);`)

    const res = await pool.query(`
  SELECT job_id
  FROM timescaledb_information.jobs
  WHERE hypertable_name = 'track_points'
    AND proc_name = 'policy_retention'
`
    )
    if (res.rows.length === 0) {
        await pool.query(`SELECT add_retention_policy('track_points', INTERVAL '2 days')`)
    }

    console.log('track_points table is ready ✅')
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
            tp.uid,
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
    INSERT INTO track_points (uid, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading, timestamp)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (uid, timestamp) DO NOTHING
  `

    try {
        await pool.query(query, values)
        // console.log(`✅ Inserted ${trackPoints.length} track points`)
    } catch (err) {
        console.error("Error inserting track points:", err)
    }
}

export async function pgGetTrackPointsByUid(uid: string): Promise<TrackPoint[]> {
    const values: string[] = [uid]
    const query = `
    SELECT uid, timestamp, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading
    FROM track_points
    WHERE uid = $1
    ORDER BY timestamp ASC
  `

    try {
        const { rows } = await pool.query(query, values)
        return rows.map((r: any) => ({
            uid: r.uid,
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
        console.error(`Error fetching track points for ${uid}:`, err)
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