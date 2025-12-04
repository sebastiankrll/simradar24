import type { PilotLong, TrackPoint } from "@sk/types/vatsim";
import { Pool } from "pg";

const pool = new Pool({
	user: process.env.POSTGRES_USER,
	host: process.env.POSTGRES_HOST,
	database: process.env.POSTGRES_DB,
	password: process.env.POSTGRES_PASSWORD,
	port: Number(process.env.POSTGRES_PORT || 5432),
	max: 100,
	min: 10,
	idleTimeoutMillis: 10000,
	connectionTimeoutMillis: 3000,
	statement_timeout: 5000,
	query_timeout: 5000,
	application_name: "simradar24-api",
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000,
});

pool.on("error", (err) => {
	console.error("Unexpected error on idle client", err);
});

pool.on("connect", () => {
	console.log("✅ Connected to PostgreSQL");
});

// Health check
export async function pgHealthCheck(): Promise<boolean> {
	try {
		await pool.query("SELECT 1");
		return true;
	} catch (err) {
		console.error("PostgreSQL health check failed:", err);
		return false;
	}
}

// Graceful shutdown
export async function pgShutdown(): Promise<void> {
	await pool.end();
	console.log("PostgreSQL connection pool closed");
}

export async function pgInitTrackPointsTable() {
	try {
		await pool.query(`
      CREATE TABLE IF NOT EXISTS track_points (
        id VARCHAR(10) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        altitude_agl INTEGER,
        altitude_ms INTEGER,
        groundspeed INTEGER,
        vertical_speed INTEGER,
        heading INTEGER,
        PRIMARY KEY (id, timestamp)
      );
    `);

		// Critical: Create index on id column for fast lookups
		await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_track_points_id_timestamp 
      ON track_points (id, timestamp DESC);
    `);

		// Convert to hypertable
		await pool.query(`
      SELECT create_hypertable('track_points', 'timestamp', 
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      );
    `);

		console.log("✅ Track points table initialized with index");
	} catch (err) {
		console.error("❌ Error initializing track_points table:", err);
		throw err;
	}
}

export async function pgUpsertTrackPoints(trackPoints: TrackPoint[]) {
	if (trackPoints.length === 0) return;

	const BATCH_SIZE = 500;
	// let totalInserted = 0;

	try {
		for (let i = 0; i < trackPoints.length; i += BATCH_SIZE) {
			const batch = trackPoints.slice(i, i + BATCH_SIZE);
			const values: any[] = [];
			const placeholders: string[] = [];

			batch.forEach((tp, idx) => {
				const paramIdx = idx * 9;
				placeholders.push(
					`($${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9})`,
				);
				values.push(tp.id, tp.latitude, tp.longitude, tp.altitude_agl, tp.altitude_ms, tp.groundspeed, tp.vertical_speed, tp.heading, tp.timestamp);
			});

			const query = `
        INSERT INTO track_points (id, latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed, heading, timestamp)
        VALUES ${placeholders.join(", ")}
        ON CONFLICT (id, timestamp) DO NOTHING
      `;

			await pool.query(query, values);
			// totalInserted += result.rowCount || 0;
		}

		// console.log(`✅ Inserted ${totalInserted} track points`);
	} catch (err) {
		console.error("Error inserting track points:", err);
		throw err;
	}
}

export async function pgGetTrackPointsByid(id: string): Promise<TrackPoint[]> {
	try {
		if (!id || typeof id !== "string" || id.length > 100) {
			throw new Error("Invalid track ID");
		}

		// Use pool.query instead of getting a client
		// This is faster for simple queries
		const query = `
      SELECT id, timestamp, latitude, longitude, altitude_agl, altitude_ms, 
             groundspeed, vertical_speed, heading
      FROM track_points
      WHERE id = $1
      ORDER BY timestamp ASC
      LIMIT 5000
    `;

		const { rows } = await pool.query(query, [id]);

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
		throw err;
	}
}

export async function pgInitPilotsTable() {
	const createTableQuery = `
    CREATE TABLE IF NOT EXISTS pilots (
      id TEXT PRIMARY KEY,
      cid INTEGER NOT NULL,
      callsign TEXT NOT NULL,
      name TEXT NOT NULL,
      aircraft TEXT NOT NULL,
      server TEXT NOT NULL,
      pilot_rating TEXT NOT NULL,
      military_rating TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      altitude_agl DOUBLE PRECISION NOT NULL,
      altitude_ms DOUBLE PRECISION NOT NULL,
      groundspeed DOUBLE PRECISION NOT NULL,
      vertical_speed DOUBLE PRECISION NOT NULL,
      heading DOUBLE PRECISION NOT NULL,
      transponder TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      qnh_i_hg DOUBLE PRECISION NOT NULL,
      qnh_mb DOUBLE PRECISION NOT NULL,
      flight_plan JSONB,
      route TEXT NOT NULL,
      dep_icao TEXT,
      arr_icao TEXT,
      times JSONB,
      sched_off_block TIMESTAMPTZ,
      sched_on_block TIMESTAMPTZ,
      logon_time TIMESTAMPTZ NOT NULL,
      last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      live BOOLEAN NOT NULL DEFAULT FALSE
    );
  `;

	try {
		await pool.query(createTableQuery);
		await pool.query(`CREATE INDEX IF NOT EXISTS pilots_dep_idx ON pilots (dep_icao, sched_off_block DESC, id DESC)`);
		await pool.query(`CREATE INDEX IF NOT EXISTS pilots_arr_idx ON pilots (arr_icao, sched_on_block DESC, id DESC)`);
		await pool.query(`CREATE INDEX IF NOT EXISTS pilots_callsign_idx ON pilots (callsign, last_update DESC)`);
		await pool.query(`CREATE INDEX IF NOT EXISTS pilots_last_update_idx ON pilots (last_update)`);
		await pool.query(`CREATE INDEX IF NOT EXISTS pilots_live_idx ON pilots (live, last_update DESC)`);
		console.log("pilots table is ready ✅");
	} catch (err) {
		console.error("Error initializing pilots table:", err);
		throw err;
	}
}

export async function pgUpsertPilots(pilots: PilotLong[]): Promise<void> {
	if (!pilots.length) return;

	const BATCH_SIZE = 100;
	// let totalUpserted = 0;

	try {
		for (let i = 0; i < pilots.length; i += BATCH_SIZE) {
			const batch = pilots.slice(i, i + BATCH_SIZE);
			const cols = `(
        id, cid, callsign, name, aircraft, server, pilot_rating, military_rating,
        latitude, longitude, altitude_agl, altitude_ms, groundspeed, vertical_speed,
        heading, transponder, frequency, qnh_i_hg, qnh_mb,
        flight_plan, route, dep_icao, arr_icao, times, sched_off_block, sched_on_block,
        logon_time, last_update, live
      )`;

			const values: any[] = [];
			const placeholders: string[] = [];

			batch.forEach((p, idx) => {
				const paramIdx = idx * 29;
				const params = Array.from({ length: 29 }, (_, j) => `$${paramIdx + j + 1}`);
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
					p.live,
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
            last_update = EXCLUDED.last_update,
            live = EXCLUDED.live
      `;

			await pool.query(query, values);
			// totalUpserted += result.rowCount || 0;
		}

		// console.log(`✅ Upserted ${totalUpserted} pilots`);
	} catch (err) {
		console.error("Error upserting pilots:", err);
		throw err;
	}
}

export async function pgGetAirportPilots(
	icao: string,
	direction: "dep" | "arr",
	limit: number,
	cursor?: string,
	afterCursor?: string,
): Promise<{ items: PilotLong[]; nextCursor: string | null; prevCursor: string | null }> {
	try {
		let whereCursor = "";
		const params: any[] = [icao];
		let paramIdx = 2;

		const dirCol = direction === "dep" ? "dep_icao" : "arr_icao";
		const timeCol = direction === "dep" ? "sched_off_block" : "sched_on_block";

		let isLoadingNewer = false;

		if (cursor) {
			const [tsStr, id] = Buffer.from(cursor, "base64").toString("utf8").split("|");
			whereCursor = `AND (${timeCol}, id) > ($${paramIdx++}, $${paramIdx++})`;
			params.push(new Date(tsStr), id);
		} else if (afterCursor) {
			const [tsStr, id] = Buffer.from(afterCursor, "base64").toString("utf8").split("|");
			whereCursor = `AND (${timeCol}, id) < ($${paramIdx++}, $${paramIdx++})`;
			params.push(new Date(tsStr), id);
			isLoadingNewer = true;
		} else {
			whereCursor = `AND ${timeCol} >= NOW()`;
		}

		const q = `
        SELECT *
        FROM pilots
        WHERE ${dirCol} = $1
        AND ${timeCol} IS NOT NULL
        ${whereCursor}
        ORDER BY ${timeCol} ${isLoadingNewer ? "DESC" : "ASC"}, id ${isLoadingNewer ? "DESC" : "ASC"}
        LIMIT $${paramIdx}
      `;
		params.push(limit + 1);

		let { rows } = await pool.query(q, params);

		const hadMoreThanLimit = rows.length > limit;

		if (isLoadingNewer) {
			rows = rows.reverse();
		}

		let nextCursor: string | null = null;
		let prevCursor: string | null = null;
		const items = rows as any[];

		if (hadMoreThanLimit) {
			if (isLoadingNewer) {
				items.shift();
			} else {
				items.pop();
			}
		}

		if (!isLoadingNewer && hadMoreThanLimit && items.length > 0) {
			const tail = items[items.length - 1];
			const tailTime = tail[timeCol];
			nextCursor = Buffer.from(`${new Date(tailTime).toISOString()}|${tail.id}`).toString("base64");
		}

		if (items.length > 0) {
			if (!isLoadingNewer) {
				const head = items[0];
				const headTime = head[timeCol];
				prevCursor = Buffer.from(`${new Date(headTime).toISOString()}|${head.id}`).toString("base64");
			} else if (hadMoreThanLimit) {
				const head = items[0];
				const headTime = head[timeCol];
				prevCursor = Buffer.from(`${new Date(headTime).toISOString()}|${head.id}`).toString("base64");
			}
		}

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
			ghost: false,
			logon_time: new Date(r.logon_time),
			timestamp: new Date(r.last_update),
			live: r.live,
		}));

		return { items: pilots, nextCursor, prevCursor };
	} catch (err) {
		console.error("Error fetching airport pilots:", err);
		throw err;
	}
}

export async function pgCleanupStalePilots(): Promise<void> {
	try {
		await pool.query(`
      DELETE FROM pilots 
      WHERE last_update < NOW() - INTERVAL '24 hours'
      RETURNING id
    `);
		// console.log(`🗑️  Cleaned up ${result.rowCount} stale pilots`);
	} catch (err) {
		console.error("Error cleaning up stale pilots:", err);
		throw err;
	}
}
