import { rdsSetSingle } from "@sk/db/redis";
import type { SimAwareTraconFeatureCollection } from "@sk/types/db";
import axios from "axios";

const RELEASE_URL =
	"https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/releases/latest";
const BASE_DATA_URL =
	"https://github.com/vatsimnetwork/simaware-tracon-project/releases/download/";

let version: string | null = null;

export async function updateTracons(): Promise<void> {
	if (!(await isNewRelease())) return;

	try {
		const traconBoundJsonUrl = `${BASE_DATA_URL}${version}/TRACONBoundaries.geojson`;

		const response = await axios.get(traconBoundJsonUrl, {
			responseType: "json",
		});
		const collection = response.data as SimAwareTraconFeatureCollection;
		if (!collection) return;

		await rdsSetSingle("static_tracons:all", collection);
		await rdsSetSingle(
			"static_tracons:version",
			version?.replace(/^v/, "") || "1.0.0",
		);
	} catch (error) {
		console.error(`Error checking for new TRACON data: ${error}`);
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
