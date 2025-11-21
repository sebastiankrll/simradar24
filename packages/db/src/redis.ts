import type { WsShort } from "@sk/types/vatsim";
import Redis from "ioredis";

const redis = new Redis();

export async function rdsPubWsShort(wsShort: WsShort) {
	redis.publish("ws:short", JSON.stringify(wsShort));
	// console.log("✅ ws:short published on redis!")
}

export async function rdsSubWsShort(callback: (data: WsShort) => void) {
	redis.subscribe("ws:short", (err) => {
		if (err) {
			console.error("Failed to subscribe: %s", err.message);
		} else {
			// console.log(`✅ Subscribed to ws:short. Currently subscribed to ${count} channel(s).`)
		}
	});

	redis.on("message", (channel, data) => {
		if (channel === "ws:short") {
			try {
				const parsed: WsShort = JSON.parse(data);
				// console.log("✅ Received new data on ws:short.")
				callback(parsed);
			} catch (err) {
				console.error("Failed to parse ws:short data", err);
			}
		}
	});
}

export async function rdsSetSingle(key: string, value: any): Promise<void> {
	await redis.set(key, JSON.stringify(value));
	console.log(`✅ Item ${key} set.`);
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

	console.log(`✅ ${items.length} items set in ${activeSetName || keyPrefix}.`);
}

export async function rdsGetSingle(query: string): Promise<string | null> {
	const data = await redis.get(query);
	if (!data) return null;

	return JSON.parse(data);
}

export async function rdsGetMultiple(
	keyPrefix: string,
	values: string[],
): Promise<any[]> {
	const keys = values.map((i) => `${keyPrefix}:${i}`);
	const results = await redis.mget(...keys);

	return results.map((r) => (r ? JSON.parse(r) : null));
}
