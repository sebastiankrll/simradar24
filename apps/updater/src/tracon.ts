import { rdsGetSingle, rdsSetSingle } from "@sk/db/redis";
import type { SimAwareTraconFeature } from "@sk/types/db";
import axios from "axios";

const RELEASE_URL = "https://api.github.com/repos/vatsimnetwork/simaware-tracon-project/releases/latest";
const BASE_DATA_URL = "https://github.com/vatsimnetwork/simaware-tracon-project/releases/download/";

let version: string | null = null;

export async function updateTracons(): Promise<void> {
	if (!version) {
		await initVersion();
	}
	if (!(await isNewRelease())) return;

	try {
		const traconBoundJsonUrl = `${BASE_DATA_URL}${version}/TRACONBoundaries.geojson`;

		const response = await axios.get(traconBoundJsonUrl, {
			responseType: "json",
		});
		const features = flattenCollection(response.data);
		const closedFeatures = closePolygons(features);
		const labeledFeatures = setLabelPosition(closedFeatures);

		await rdsSetSingle("static_tracons:all", labeledFeatures);
		await rdsSetSingle("static_tracons:version", version || "1.0.0");

		console.log(`✅ TRACON data updated to version ${version}`);
	} catch (error) {
		console.error(`Error checking for new TRACON data: ${error}`);
	}
}

async function initVersion(): Promise<void> {
	if (!version) {
		const redisVersion = await rdsGetSingle("static_tracons:version");
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

export function setLabelPosition(features: SimAwareTraconFeature[]): SimAwareTraconFeature[] {
	return features.map((feature) => {
		if (!feature.properties.label_lon || !feature.properties.label_lat) {
			let lonlat = null;

			for (const multiPoly of feature.geometry.coordinates) {
				for (const ring of multiPoly) {
					for (const coord of ring) {
						if (!lonlat || coord[0] + coord[1] < lonlat[0] + lonlat[1]) {
							lonlat = coord;
						}
					}
				}
			}

			if (lonlat) {
				feature.properties.label_lon = lonlat[0];
				feature.properties.label_lat = lonlat[1];
			}
		}

		return feature;
	});
}
