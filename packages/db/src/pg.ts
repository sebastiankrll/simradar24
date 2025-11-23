import type { TrackPoint } from "@sk/types/vatsim";
import { Pool } from "pg";

const pool = new Pool({
	user: process.env.POSTGRES_USER,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DB,
	password: process.env.POSTGRES_PASSWORD,
	port: Number(process.env.POSTGRES_PORT || 5432),
});

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
    `;
	await pool.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);
	await pool.query(createTableQuery);
	await pool.query(`SELECT create_hypertable('track_points', 'timestamp', if_not_exists => TRUE);`);

	const res = await pool.query(`
  SELECT job_id
  FROM timescaledb_information.jobs
  WHERE hypertable_name = 'track_points'
    AND proc_name = 'policy_retention'
`);
	if (res.rows.length === 0) {
		await pool.query(`SELECT add_retention_policy('track_points', INTERVAL '2 days')`);
	}

	console.log("track_points table is ready ✅");
}

export async function pgInsertTrackPoints(trackPoints: TrackPoint[]) {
	if (trackPoints.length === 0) return;

	const values: any[] = [];
	const placeholders: string[] = [];

	trackPoints.forEach((tp, i) => {
		const idx = i * 9;
		placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9})`);
		values.push(tp.uid, tp.latitude, tp.longitude, tp.altitude_agl, tp.altitude_ms, tp.groundspeed, tp.vertical_speed, tp.heading, tp.timestamp);
	});

	const query = `
    INSERT INTO track_points (uid, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading, timestamp)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (uid, timestamp) DO NOTHING
  `;

	try {
		await pool.query(query, values);
		// console.log(`✅ Inserted ${trackPoints.length} track points`)
	} catch (err) {
		console.error("Error inserting track points:", err);
	}
}

export async function pgGetTrackPointsByUid(uid: string): Promise<TrackPoint[]> {
	const values: string[] = [uid];
	const query = `
    SELECT uid, timestamp, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading
    FROM track_points
    WHERE uid = $1
    ORDER BY timestamp ASC
  `;

	try {
		const { rows } = await pool.query(query, values);
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
		}));
	} catch (err) {
		console.error(`Error fetching track points for ${uid}:`, err);
		return [];
	}
}

(async () => {
	await pgInitTrackPointsTable();
})();
