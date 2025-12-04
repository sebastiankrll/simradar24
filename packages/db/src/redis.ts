import type { WsDelta } from "@sk/types/vatsim";
import Redis from "ioredis";

// Connection pool with retry logic
const redis = new Redis({
	host: process.env.REDIS_HOST || "localhost",
	port: Number(process.env.REDIS_PORT) || 6379,
	password: process.env.NODE_ENV === "production" ? process.env.REDIS_PASSWORD : undefined,
	db: Number(process.env.REDIS_DB) || 0,
	retryStrategy: (times: number) => {
		const delay = Math.min(times * 50, 2000);
		return delay;
	},
	maxRetriesPerRequest: 3,
	enableReadyCheck: true,
	enableOfflineQueue: true,
	connectTimeout: 10000,
	commandTimeout: 5000,
	lazyConnect: false,
});

// Error handling for the connection
redis.on("error", (err) => {
	console.error("Redis connection error:", err);
});

redis.on("connect", () => {
	console.log("✅ Connected to Redis");
});

redis.on("reconnecting", () => {
	console.warn("⚠️ Reconnecting to Redis...");
});

// Health check
export async function rdsHealthCheck(): Promise<boolean> {
	try {
		await redis.ping();
		return true;
	} catch (err) {
		console.error("Redis health check failed:", err);
		return false;
	}
}

// Graceful shutdown
export async function rdsShutdown(): Promise<void> {
	await redis.quit();
	console.log("Redis connection closed");
}

export async function rdsPubWsDelta(delta: WsDelta): Promise<void> {
	try {
		await redis.publish("ws:delta", JSON.stringify(delta));
	} catch (err) {
		console.error("Failed to publish ws:delta:", err);
		throw err;
	}
}

export async function rdsSubWsDelta(callback: (data: WsDelta) => void): Promise<void> {
	const subscriber = redis.duplicate();

	subscriber.on("error", (err) => {
		console.error("Subscriber error:", err);
	});

	subscriber.on("message", (channel, data) => {
		if (channel === "ws:delta") {
			try {
				const parsed: WsDelta = JSON.parse(data);
				callback(parsed);
			} catch (err) {
				console.error("Failed to parse ws:delta data:", err);
			}
		}
	});

	await subscriber.subscribe("ws:delta");
}

export async function rdsSetSingle(key: string, value: any, ttlSeconds: number | null = null): Promise<void> {
	try {
		if (ttlSeconds) {
			await redis.setex(key, ttlSeconds, JSON.stringify(value));
		} else {
			await redis.set(key, JSON.stringify(value));
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

	const BATCH_SIZE = 1000; // Reduced from 2000 for better performance
	// let totalSet = 0;

	try {
		for (let i = 0; i < items.length; i += BATCH_SIZE) {
			const batch = items.slice(i, i + BATCH_SIZE);
			const pipeline = redis.pipeline();

			for (const item of batch) {
				const key = `${keyPrefix}:${keyExtractor(item)}`;
				if (ttlSeconds) {
					pipeline.setex(key, ttlSeconds, JSON.stringify(item));
				} else {
					pipeline.set(key, JSON.stringify(item));
				}
				if (activeSetName) {
					pipeline.sadd(activeSetName, keyExtractor(item));
				}
				// totalSet++;
			}

			await pipeline.exec();
		}

		// console.log(`✅ ${totalSet} items set in ${activeSetName || keyPrefix}.`);
	} catch (err) {
		console.error(`Failed to set multiple items in ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsGetSingle(query: string): Promise<any> {
	try {
		const data = await redis.get(query);
		return data ? JSON.parse(data) : null;
	} catch (err) {
		console.error(`Failed to get key ${query}:`, err);
		throw err;
	}
}

export async function rdsGetMultiple(keyPrefix: string, values: string[]): Promise<(any | null)[]> {
	if (values.length === 0) return [];

	try {
		const keys = values.map((val) => `${keyPrefix}:${val}`);
		const results = await redis.mget(...keys);
		return results.map((r) => (r ? JSON.parse(r) : null));
	} catch (err) {
		console.error(`Failed to get multiple keys with prefix ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsDeleteSingle(key: string): Promise<void> {
	try {
		await redis.del(key);
	} catch (err) {
		console.error(`Failed to delete key ${key}:`, err);
		throw err;
	}
}

export async function rdsDeleteMultiple(keyPrefix: string, values: string[]): Promise<void> {
	if (values.length === 0) return;

	try {
		const keys = values.map((val) => `${keyPrefix}:${val}`);
		await redis.del(...keys);
	} catch (err) {
		console.error(`Failed to delete multiple keys with prefix ${keyPrefix}:`, err);
		throw err;
	}
}

export async function rdsSetRingStorage(key: string, value: any, windowMs: number): Promise<void> {
	try {
		const timestamp = Date.now();
		const member = JSON.stringify({ t: timestamp, v: value });
		await redis.zadd(key, timestamp, member);
		await redis.zremrangebyscore(key, 0, timestamp - windowMs);
	} catch (err) {
		console.error(`Failed to set ring storage for key ${key}:`, err);
		throw err;
	}
}

export async function rdsGetRingStorage(key: string, windowMs: number): Promise<any[]> {
	try {
		const timestamp = Date.now();
		const minScore = timestamp - windowMs;
		const members = await redis.zrangebyscore(key, minScore, timestamp);
		return members
			.map((member) => {
				try {
					return JSON.parse(member);
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
