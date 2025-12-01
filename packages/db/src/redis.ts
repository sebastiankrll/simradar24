import type { WsDelta } from "@sk/types/vatsim";
import Redis from "ioredis";

const redis = new Redis({
	host: process.env.REDIS_HOST || "localhost",
	port: Number(process.env.REDIS_PORT) || 6379,
});

export async function rdsPubWsDelta(delta: WsDelta) {
	redis.publish("ws:delta", JSON.stringify(delta));
	// console.log("✅ ws:delta published on redis!")
}

export async function rdsSubWsDelta(callback: (data: WsDelta) => void) {
	redis.subscribe("ws:delta", (err) => {
		if (err) {
			console.error("Failed to subscribe: %s", err.message);
		} else {
			// console.log(`✅ Subscribed to ws:delta. Currently subscribed to ${count} channel(s).`)
		}
	});

	redis.on("message", (channel, data) => {
		if (channel === "ws:delta") {
			try {
				const parsed: WsDelta = JSON.parse(data);
				// console.log("✅ Received new data on ws:delta.")
				callback(parsed);
			} catch (err) {
				console.error("Failed to parse ws:delta data", err);
			}
		}
	});
}

export async function rdsSetSingle(key: string, value: any): Promise<void> {
	await redis.set(key, JSON.stringify(value));
	// console.log(`✅ Item ${key} set.`);
}

type KeyExtractor<T> = (item: T) => string;

export async function rdsSetMultiple<T>(
	items: T[],
	keyPrefix: string,
	keyExtractor: KeyExtractor<T>,
	activeSetName?: string,
	ttlSeconds: number | null = null,
) {
	if (items.length === 0) return;

	const BATCH_SIZE = 2000;

	for (let i = 0; i < items.length; i += BATCH_SIZE) {
		const batch = items.slice(i, i + BATCH_SIZE);
		const pipeline = redis.pipeline();

		for (const item of batch) {
			const key = `${keyPrefix}:${keyExtractor(item)}`;
			pipeline.set(key, JSON.stringify(item));
			if (ttlSeconds) {
				pipeline.expire(key, ttlSeconds);
			}
			if (activeSetName) {
				pipeline.sadd(activeSetName, keyExtractor(item));
			}
		}

		await pipeline.exec();
	}

	// console.log(`✅ ${items.length} items set in ${activeSetName || keyPrefix}.`);
}

export async function rdsGetSingle(query: string): Promise<any> {
	const data = await redis.get(query);
	if (!data) return null;

	return JSON.parse(data);
}

export async function rdsGetMultiple(keyPrefix: string, values: string[]): Promise<any[]> {
	const keys = values.map((i) => `${keyPrefix}:${i}`);
	const results = await redis.mget(...keys);

	return results.map((r) => (r ? JSON.parse(r) : null));
}

export async function rdsSetRingStorage(key: string, value: any, windowMs: number): Promise<void> {
	const timestamp = Date.now();
	const member = JSON.stringify({ t: timestamp, v: value });
	await redis.zadd(key, timestamp, member);
	await redis.zremrangebyscore(key, 0, timestamp - windowMs);
}

export async function rdsGetRingStorage(key: string, windowMs: number): Promise<any[]> {
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
}
