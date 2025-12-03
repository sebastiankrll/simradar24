import { pipeline } from "node:stream/promises";
import { rdsGetSingle, rdsSetMultiple, rdsSetSingle } from "@sk/db/redis";
import type { StaticAircraft } from "@sk/types/db";
import axios from "axios";
import { fetch } from "undici";
import StreamJson from "stream-json";
import StreamArray from "stream-json/streamers/StreamArray.js";

const RELEASE_URL = "https://api.github.com/repos/sebastiankrll/simradar24-data/releases/latest";
const BASE_DATA_URL = "https://github.com/sebastiankrll/simradar24-data/releases/download/";

let version: string | null = null;

export async function updateFleets(): Promise<void> {
	if (!version) {
		await initVersion();
	}
	if (!(await isNewRelease())) return;

	try {
		const fleetsJsonUrl = `${BASE_DATA_URL}${version}/fleets.json`;
		const response = await fetch(fleetsJsonUrl);

		if (!response.body) {
			throw new Error("No response body from GitHub");
		}

		const itemsBuffer: StaticAircraft[] = [];
		const CHUNK = 10_000;

		await pipeline(response.body, StreamJson.parser(), StreamArray.streamArray(), async (stream) => {
			for await (const { value } of stream) {
				itemsBuffer.push(value);

				if (itemsBuffer.length >= CHUNK) {
					await rdsSetMultiple(itemsBuffer, "static_fleet", (a) => a.registration);
					itemsBuffer.length = 0;
					console.log(`Processed ${CHUNK} fleet items...`);
				}
			}
		});

		if (itemsBuffer.length > 0) {
			await rdsSetMultiple(itemsBuffer, "static_fleet", (a) => a.registration);
		}

		await rdsSetSingle("static_fleets:version", version || "1.0.0");

		console.log(`✅ Fleets data updated to version ${version}`);
	} catch (error) {
		console.error(`Error checking for new fleets data: ${error}`);
	}
}

async function initVersion(): Promise<void> {
	if (!version) {
		const redisVersion = await rdsGetSingle("static_fleets:version");
		version = redisVersion || "0.0.0";
	}
}

async function isNewRelease(): Promise<boolean> {
	try {
		const response = await axios.get(RELEASE_URL);
		const release = response.data.tag_name;

		if (release !== version) {
			version = release;
			return true;
		}
	} catch (error) {
		console.error(`Error checking for updates: ${error}`);
	}

	return false;
}
