import { rdsSetSingle } from "@sk/db/redis";
import type { SimAwareTraconFeature } from "@sk/types/db";
import axios from "axios";

const RELEASE_URL = "https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/releases/latest";
const BASE_DATA_URL = "https://github.com/vatsimnetwork/simaware-tracon-project/releases/download/";

let version: string | null = null;

export async function updateTracons(): Promise<void> {
	if (!(await isNewRelease())) return;

	try {
		const traconBoundJsonUrl = `${BASE_DATA_URL}${version}/TRACONBoundaries.geojson`;

		const response = await axios.get(traconBoundJsonUrl, {
			responseType: "json",
		});
		const features = flattenCollection(response.data);
		const closedFeatures = closePolygons(features);

		await rdsSetSingle("static_tracons:all", closedFeatures);
		await rdsSetSingle("static_tracons:version", version?.replace(/^v/, "") || "1.0.0");
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

function flattenCollection(collection: any): SimAwareTraconFeature[] {
	const features: SimAwareTraconFeature[] = [];

	for (const item of collection.features) {
		if (item.type === "Feature") {
			features.push(item);
		}
		if (item.type === "FeatureCollection") {
			features.push(...flattenCollection(item));
		}
	}
	return features;
}

function closePolygons(features: SimAwareTraconFeature[]): SimAwareTraconFeature[] {
	return features.map((feature) => {
		for (const multiPoly of feature.geometry.coordinates) {
			for (const ring of multiPoly) {
				const first = ring[0];
				const last = ring[ring.length - 1];

				if (first[0] !== last[0] || first[1] !== last[1]) {
					ring.push(first);
				}
			}
		}

		return feature;
	});
}
