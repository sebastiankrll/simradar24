import { createClient } from "redis";

const BATCH_SIZE = 1000;

const client = createClient({
	url: `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`,
	password: process.env.NODE_ENV === "production" ? process.env.REDIS_PASSWORD : undefined,
	database: Number(process.env.REDIS_DB) || 0,
})
	.on("error", (err) => console.log("Redis Client Error", err))
	.on("connect", () => console.log("✅ Connected to Redis"));

export async function rdsConnect(retries = 5, delayMs = 2000): Promise<void> {
	for (let i = 0; i < retries; i++) {
		try {
			await client.connect();
			return;
		} catch (_err) {
			console.log(`Attempt ${i + 1} failed. Retrying in ${delayMs}ms...`);
			await new Promise((res) => setTimeout(res, delayMs));
		}
	}
	throw new Error("Failed to connect to the database after multiple attempts");
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

export async function rdsSetMultipleTimeSeries<T>(
	items: T[],
	keyPrefix: string,
	keyExtractor: KeyExtractor<T>,
	ttlSeconds: number | null = null,
): Promise<void> {
	if (items.length === 0) return;

	const timestamp = Date.now();

	try {
		for (let i = 0; i < items.length; i += BATCH_SIZE) {
			const batch = items.slice(i, i + BATCH_SIZE);
			const pipeline = client.multi();

			for (const item of batch) {
				const key = `${keyPrefix}:${keyExtractor(item)}`;
				pipeline.zAdd(key, { score: timestamp, value: JSON.stringify(item) });
				if (ttlSeconds) {
					pipeline.expire(key, ttlSeconds);
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

export async function rdsGetTimeSeries(key: string): Promise<any[]> {
	try {
		const members = await client.ZRANGE(key, 0, -1);
		return members
			.map((m) => {
				try {
					return JSON.parse(m);
				} catch {
					return null;
				}
			})
			.filter((item) => item !== null) as any[];
	} catch (err) {
		console.error(`Failed to get time series for key ${key}:`, err);
		throw err;
	}
}
