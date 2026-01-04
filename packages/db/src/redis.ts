import type { DeltaTrackPoint, TrackPoint } from "@sr24/types/interface";
import { createClient, RESP_TYPES } from "redis";
import { decodeTrackpoints } from "./buffer.js";

const BATCH_SIZE = 1000;

const client = createClient({
	url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
	password: process.env.NODE_ENV === "production" ? process.env.REDIS_PASSWORD : undefined,
	database: Number(process.env.REDIS_DB) || 0,
})
	.on("error", (err) => console.log("Redis Client Error", err))
	.on("connect", () => console.log("✅ Connected to Redis (normal)"));

const bufferClient = createClient({
	url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
	password: process.env.NODE_ENV === "production" ? process.env.REDIS_PASSWORD : undefined,
	database: Number(process.env.REDIS_DB) || 0,
})
	.withTypeMapping({ [RESP_TYPES.BLOB_STRING]: Buffer })
	.on("error", (err) => console.log("Redis Client Error", err))
	.on("connect", () => console.log("✅ Connected to Redis (buffer)"));

await client.connect();

export async function rdsConnectBufferClient(): Promise<void> {
	await bufferClient.connect();
}

export async function rdsHealthCheck(): Promise<boolean> {
	try {
		await client.ping();
		return true;
	} catch (err) {
		console.error("Redis health check failed:", err);
		return false;
	}
}

export async function rdsShutdown(): Promise<void> {
	client.destroy();
	console.log("Redis connection closed");
}

export async function rdsPub(channel: string, message: any): Promise<void> {
	try {
		await client.publish(channel, JSON.stringify(message));
	} catch (err) {
		console.error(`Failed to publish ${channel}:`, err);
		throw err;
	}
}

export async function rdsSub(channel: string, listener: (message: string) => void): Promise<void> {
	const subscriber = client.duplicate();
	await subscriber.connect();

	subscriber.on("error", (err) => {
		console.error("Subscriber error:", err);
	});

	await subscriber.subscribe(channel, listener);
}

export async function rdsSetSingle(key: string, value: any, ttlSeconds: number | null = null): Promise<void> {
	try {
		if (ttlSeconds) {
			await client.setEx(key, ttlSeconds, JSON.stringify(value));
		} else {
			await client.set(key, JSON.stringify(value));
		}
	} catch (err) {
		console.error(`Failed to set key ${key}:`, err);
		throw err;
	}
}

type KeyExtractor<T> = (item: T) => string;

export async function rdsSetMultiple<T>(
	items: T[],
	keyPrefix: string,
	keyExtractor: KeyExtractor<T>,
	activeSetName?: string,
	ttlSeconds: number | null = null,
): Promise<void> {
	if (items.length === 0) return;

	try {
		for (let i = 0; i < items.length; i += BATCH_SIZE) {
			const batch = items.slice(i, i + BATCH_SIZE);
			const pipeline = client.multi();

			for (const item of batch) {
				const key = `${keyPrefix}:${keyExtractor(item)}`;
				if (ttlSeconds) {
					pipeline.setEx(key, ttlSeconds, JSON.stringify(item));
				} else {
					pipeline.set(key, JSON.stringify(item));
				}
				if (activeSetName) {
					pipeline.sAdd(activeSetName, keyExtractor(item));
				}
			}

			await pipeline.exec();
		}
		// console.log(`✅ ${totalSet} items set in ${activeSetName || keyPrefix}.`);
	} catch (err) {
		console.error(`Failed to set multiple items in ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsGetSingle(key: string): Promise<any> {
	try {
		const data = await client.get(key);
		return data ? JSON.parse(data) : null;
	} catch (err) {
		console.error(`Failed to get key ${key}:`, err);
		throw err;
	}
}

export async function rdsGetMultiple(keyPrefix: string, keys: string[]): Promise<(any | null)[]> {
	if (keys.length === 0) return [];

	try {
		const keysWithPrefix = keyPrefix === "" ? keys : keys.map((val) => `${keyPrefix}:${val}`);
		const results = await client.mGet(keysWithPrefix);

		return results.map((r) => (r ? JSON.parse(r) : null));
	} catch (err) {
		console.error(`Failed to get multiple keys with prefix ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsSetTrackpoints(trackpoints: Map<string, Buffer>): Promise<void> {
	if (trackpoints.size === 0) return;
	const timestamp = Date.now();

	try {
		const pipeline = bufferClient.multi();

		for (const [id, buffer] of trackpoints) {
			const key = `trackpoint:${id}`;
			pipeline.zAdd(key, { score: timestamp, value: buffer });
			pipeline.expire(key, 12 * 60 * 60);
		}

		await pipeline.exec();
	} catch (err) {
		console.error(`Failed to set multiple trackpoints:`, err);
		throw err;
	}
}

export async function rdsGetTrackPoints(id: string): Promise<(TrackPoint | DeltaTrackPoint)[]>;
export async function rdsGetTrackPoints(id: string, buffer: true): Promise<Buffer[]>;
export async function rdsGetTrackPoints(id: string, buffer?: boolean): Promise<(TrackPoint | DeltaTrackPoint)[] | Buffer[]> {
	try {
		const buffers: Buffer[] = await bufferClient.zRange(`trackpoint:${id}`, 0, -1);
		if (buffers.length === 0) return [];
		if (buffer) return buffers;

		return decodeTrackpoints(buffers);
	} catch (err) {
		console.error(`Failed to get trackpoints for id ${id}:`, err);
		throw err;
	}
}
