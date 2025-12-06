import type { WsDelta } from "@sr24/types/vatsim";
import { createClient } from "redis";

const client = createClient({
	url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
	password: process.env.NODE_ENV === "production" ? process.env.REDIS_PASSWORD : undefined,
	database: Number(process.env.REDIS_DB) || 0,
})
	.on("error", (err) => console.log("Redis Client Error", err))
	.on("connect", () => console.log("✅ Connected to Redis"));

export async function rdsConnect(): Promise<void> {
	if (!client.isOpen) {
		await client.connect();
	}
}

// Health check
export async function rdsHealthCheck(): Promise<boolean> {
	try {
		await client.ping();
		return true;
	} catch (err) {
		console.error("Redis health check failed:", err);
		return false;
	}
}

// Graceful shutdown
export async function rdsShutdown(): Promise<void> {
	client.destroy();
	console.log("Redis connection closed");
}

export async function rdsPubWsDelta(delta: WsDelta): Promise<void> {
	try {
		await client.publish("ws:delta", JSON.stringify(delta));
	} catch (err) {
		console.error("Failed to publish ws:delta:", err);
		throw err;
	}
}

export async function rdsSubWsDelta(listener: (message: string) => void): Promise<void> {
	const subscriber = client.duplicate();
	await subscriber.connect();

	subscriber.on("error", (err) => {
		console.error("Subscriber error:", err);
	});

	await subscriber.subscribe("ws:delta", listener);
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

	const BATCH_SIZE = 1000;

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

export async function rdsGetMultiple(keyPrefix: string, values: string[]): Promise<(any | null)[]> {
	if (values.length === 0) return [];

	try {
		const keys = values.map((val) => `${keyPrefix}:${val}`);
		const results = await client.mGet(keys);
		return results.map((r) => (r ? JSON.parse(r) : null));
	} catch (err) {
		console.error(`Failed to get multiple keys with prefix ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsDeleteSingle(key: string): Promise<void> {
	try {
		await client.del(key);
	} catch (err) {
		console.error(`Failed to delete key ${key}:`, err);
		throw err;
	}
}

export async function rdsDeleteMultiple(keyPrefix: string, values: string[]): Promise<void> {
	if (values.length === 0) return;

	try {
		const keys = values.map((val) => `${keyPrefix}:${val}`);
		await client.del(keys);
	} catch (err) {
		console.error(`Failed to delete multiple keys with prefix ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsSetRingStorage(key: string, value: any, windowMs: number): Promise<void> {
	try {
		const timestamp = Date.now();
		const member = JSON.stringify({ t: timestamp, v: value });
		await client.zAdd(key, { score: timestamp, value: member });
		await client.zRemRangeByScore(key, 0, timestamp - windowMs);
	} catch (err) {
		console.error(`Failed to set ring storage for key ${key}:`, err);
		throw err;
	}
}

export async function rdsGetRingStorage(key: string, windowMs: number): Promise<any[]> {
	try {
		const timestamp = Date.now();
		const minScore = timestamp - windowMs;
		const members = await client.zRangeByScore(key, minScore, timestamp);

		return members
			.map((m) => {
				try {
					return JSON.parse(m);
				} catch {
					return null;
				}
			})
			.filter((item) => item !== null);
	} catch (err) {
		console.error(`Failed to get ring storage for key ${key}:`, err);
		throw err;
	}
}

// export async function rdsSetTimeSeries(key: string, value: any, timestamp: number): Promise<void> {
// 	try {
// 		await redis.
// 	} catch (err) {
// 		console.error(`Failed to set time series for key ${key}:`, err);
// 		throw err;
// 	}
// }
