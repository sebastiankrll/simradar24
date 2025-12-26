import { rdsGetSingle, rdsSetSingle } from "@sr24/db/redis";
import axios from "axios";

const RELEASE_URL = "https://api.github.com/repos/sebastiankrll/simradar21-data/releases/latest";
const BASE_DATA_URL = "https://github.com/sebastiankrll/simradar21-data/releases/download/";

let version: string | null = null;
let release: string | null = null;

export async function updateAircrafts(): Promise<void> {
	if (!version) {
		await initVersion();
	}
	if (!(await isNewRelease())) return;

	try {
		const aircraftsJsonUrl = `${BASE_DATA_URL}${release}/aircrafts.json`;

		const response = await axios.get(aircraftsJsonUrl, {
			responseType: "json",
		});

		await rdsSetSingle("static_aircrafts:all", response.data);
		await rdsSetSingle("static_aircrafts:version", version || "1.0.0");

		console.log(`✅ Aircrafts data updated to version ${version}`);
	} catch (error) {
		console.error(`Error checking for new aircrafts data: ${error}`);
	}
}

async function initVersion(): Promise<void> {
	if (!version) {
		const redisVersion = await rdsGetSingle("static_aircrafts:version");
		version = redisVersion || "0.0.0";
	}
}

async function isNewRelease(): Promise<boolean> {
	try {
		const releaseResponse = await axios.get(RELEASE_URL);
		release = releaseResponse.data.tag_name;

		const versionsResponse = await axios.get(`${BASE_DATA_URL}${release}/versions.json`, {
			responseType: "json",
		});
		const latestVersion = versionsResponse.data.aircrafts;

		if (latestVersion !== version) {
			version = latestVersion;
			return true;
		}
	} catch (error) {
		console.error(`Error checking for updates: ${error}`);
	}

	return false;
}
