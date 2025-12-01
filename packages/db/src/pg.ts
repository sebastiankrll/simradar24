import type { PilotLong, TrackPoint } from "@sk/types/vatsim";
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
        id TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        altitude_agl DOUBLE PRECISION,
        altitude_ms DOUBLE PRECISION,
        groundspeed DOUBLE PRECISION,
        vertical_speed DOUBLE PRECISION,
        heading DOUBLE PRECISION,
        PRIMARY KEY (id, timestamp)
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

export async function pgUpsertTrackPoints(trackPoints: TrackPoint[]) {
	if (trackPoints.length === 0) return;

	const values: any[] = [];
	const placeholders: string[] = [];

	trackPoints.forEach((tp, i) => {
		const idx = i * 9;
		placeholders.push(`($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9})`);
		values.push(tp.id, tp.latitude, tp.longitude, tp.altitude_agl, tp.altitude_ms, tp.groundspeed, tp.vertical_speed, tp.heading, tp.timestamp);
	});

	const query = `
    INSERT INTO track_points (id, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading, timestamp)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (id, timestamp) DO NOTHING
  `;

	try {
		await pool.query(query, values);
		// console.log(`✅ Inserted ${trackPoints.length} track points`)
	} catch (err) {
		console.error("Error inserting track points:", err);
	}
}

export async function pgGetTrackPointsByid(id: string): Promise<TrackPoint[]> {
	const values: string[] = [id];
	const query = `
    SELECT id, timestamp, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading
    FROM track_points
    WHERE id = $1
    ORDER BY timestamp ASC
  `;

	try {
		const { rows } = await pool.query(query, values);
		return rows.map((r: any) => ({
			id: r.id,
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
		console.error(`Error fetching track points for ${id}:`, err);
		return [];
	}
}

async function pgInitPilotsTable() {
	const createTableQuery = `
    CREATE TABLE IF NOT EXISTS pilots (
      id TEXT PRIMARY KEY,
      -- Basic info
      cid INTEGER NOT NULL,
      callsign TEXT NOT NULL,
      name TEXT NOT NULL,
      aircraft TEXT NOT NULL,
      server TEXT NOT NULL,
      pilot_rating TEXT NOT NULL,
      military_rating TEXT NOT NULL,
      
      -- Position data
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      altitude_agl DOUBLE PRECISION NOT NULL,
      altitude_ms DOUBLE PRECISION NOT NULL,
      groundspeed DOUBLE PRECISION NOT NULL,
      vertical_speed DOUBLE PRECISION NOT NULL,
      heading DOUBLE PRECISION NOT NULL,
      transponder INTEGER NOT NULL,
      frequency INTEGER NOT NULL,
      qnh_i_hg DOUBLE PRECISION NOT NULL,
      qnh_mb DOUBLE PRECISION NOT NULL,
      
      -- Flight plan (stored as JSONB)
      flight_plan JSONB,
      route TEXT NOT NULL,
      
      -- Airports (indexed for queries)
      dep_icao TEXT,
      arr_icao TEXT,
      
      -- Times (stored as JSONB for flexibility)
      times JSONB,
      
      -- Extracted scheduled times for efficient sorting
      sched_off_block TIMESTAMPTZ,
      sched_on_block TIMESTAMPTZ,
      
      -- Timestamps
      logon_time TIMESTAMPTZ NOT NULL,
      last_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
	await pool.query(createTableQuery);
	await pool.query(`CREATE INDEX IF NOT EXISTS pilots_dep_idx ON pilots (dep_icao, sched_off_block DESC, id DESC)`);
	await pool.query(`CREATE INDEX IF NOT EXISTS pilots_arr_idx ON pilots (arr_icao, sched_on_block DESC, id DESC)`);
	await pool.query(`CREATE INDEX IF NOT EXISTS pilots_callsign_idx ON pilots (callsign, last_update DESC)`);
	await pool.query(`CREATE INDEX IF NOT EXISTS pilots_last_update_idx ON pilots (last_update)`);
	console.log("pilots table is ready ✅");
}

export async function pgUpsertPilots(pilots: PilotLong[]): Promise<void> {
	if (!pilots.length) return;

	const cols = `(
        id, cid, callsign, name, aircraft, server, pilot_rating, military_rating,
        latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed,
        heading, transponder, frequency, qnh_i_hg, qnh_mb,
        flight_plan, route, dep_icao, arr_icao, times, sched_off_block, sched_on_block,
        logon_time, last_update
    )`;

	const values: any[] = [];
	const placeholders: string[] = [];

	pilots.forEach((p, i) => {
		const idx = i * 28;
		const params = Array.from({ length: 28 }, (_, j) => `$${idx + j + 1}`);
		placeholders.push(`(${params.join(", ")})`);

		values.push(
			p.id,
			p.cid,
			p.callsign,
			p.name,
			p.aircraft,
			p.server,
			p.pilot_rating,
			p.military_rating,
			p.latitude,
			p.longitude,
			p.altitude_agl,
			p.altitude_ms,
			p.groundspeed,
			p.vertical_speed,
			p.heading,
			p.transponder,
			p.frequency,
			p.qnh_i_hg,
			p.qnh_mb,
			p.flight_plan ? JSON.stringify(p.flight_plan) : null,
			p.route,
			p.flight_plan?.departure?.icao || null,
			p.flight_plan?.arrival?.icao || null,
			p.times ? JSON.stringify(p.times) : null,
			p.times?.sched_off_block || null,
			p.times?.sched_on_block || null,
			p.logon_time,
			p.timestamp,
		);
	});

	const query = `
        INSERT INTO pilots ${cols}
        VALUES ${placeholders.join(",")}
        ON CONFLICT (id) DO UPDATE SET
            cid = EXCLUDED.cid,
            callsign = EXCLUDED.callsign,
            name = EXCLUDED.name,
            aircraft = EXCLUDED.aircraft,
            server = EXCLUDED.server,
            pilot_rating = EXCLUDED.pilot_rating,
            military_rating = EXCLUDED.military_rating,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            altitude_agl = EXCLUDED.altitude_agl,
            altitude_ms = EXCLUDED.altitude_ms,
            groundspeed = EXCLUDED.groundspeed,
            vertical_speed = EXCLUDED.vertical_speed,
            heading = EXCLUDED.heading,
            transponder = EXCLUDED.transponder,
            frequency = EXCLUDED.frequency,
            qnh_i_hg = EXCLUDED.qnh_i_hg,
            qnh_mb = EXCLUDED.qnh_mb,
            flight_plan = EXCLUDED.flight_plan,
            route = EXCLUDED.route,
            dep_icao = EXCLUDED.dep_icao,
            arr_icao = EXCLUDED.arr_icao,
            times = EXCLUDED.times,
            sched_off_block = EXCLUDED.sched_off_block,
            sched_on_block = EXCLUDED.sched_on_block,
            logon_time = EXCLUDED.logon_time,
            last_update = EXCLUDED.last_update
    `;

	await pool.query(query, values);
}

export async function pgGetAirportPilots(
	icao: string,
	direction: "dep" | "arr",
	limit: number,
	cursor?: string,
): Promise<{ items: PilotLong[]; nextCursor: string | null }> {
	let whereCursor = "";
	const params: any[] = [icao];
	let paramIdx = 2;

	const dirCol = direction === "dep" ? "dep_icao" : "arr_icao";
	const timeCol = direction === "dep" ? "sched_off_block" : "sched_on_block";

	if (cursor) {
		const [tsStr, id] = Buffer.from(cursor, "base64").toString("utf8").split("|");
		whereCursor = `AND (${timeCol}, id) < ($${paramIdx++}, $${paramIdx++})`;
		params.push(new Date(tsStr), id);
	}

	const q = `
        SELECT *
        FROM pilots
        WHERE ${dirCol} = $1
        AND ${timeCol} IS NOT NULL
        ${whereCursor}
        ORDER BY ${timeCol} DESC, id DESC
        LIMIT $${paramIdx}
    `;
	params.push(limit + 1);

	const { rows } = await pool.query(q, params);

	let nextCursor: string | null = null;
	const items = rows;
	if (items.length > limit) {
		const tail = items.pop();
		const tailTime = tail[timeCol];
		nextCursor = Buffer.from(`${new Date(tailTime).toISOString()}|${tail.id}`).toString("base64");
	}

	// Parse JSON fields back to objects
	const pilots: PilotLong[] = items.map((r: any) => ({
		id: r.id,
		cid: r.cid,
		callsign: r.callsign,
		name: r.name,
		aircraft: r.aircraft,
		server: r.server,
		pilot_rating: r.pilot_rating,
		military_rating: r.military_rating,
		latitude: r.latitude,
		longitude: r.longitude,
		altitude_agl: r.altitude_agl,
		altitude_ms: r.altitude_ms,
		groundspeed: r.groundspeed,
		vertical_speed: r.vertical_speed,
		heading: r.heading,
		transponder: r.transponder,
		frequency: r.frequency,
		qnh_i_hg: r.qnh_i_hg,
		qnh_mb: r.qnh_mb,
		flight_plan: r.flight_plan,
		route: r.route,
		times: r.times,
		logon_time: new Date(r.logon_time),
		timestamp: new Date(r.last_update),
	}));

	return { items: pilots, nextCursor };
}

export async function pgCleanupStalePilots(): Promise<void> {
	try {
		const result = await pool.query(`
            DELETE FROM pilots 
            WHERE last_update < NOW() - INTERVAL '24 hours'
            RETURNING id
        `);
		console.log(`🗑️  Cleaned up ${result.rowCount} stale pilots`);
	} catch (err) {
		console.error("Error cleaning up stale pilots:", err);
	}
}

(async () => {
	await pgInitTrackPointsTable();
	await pgInitPilotsTable();
})();
