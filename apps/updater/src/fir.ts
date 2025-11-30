import { rdsGetSingle, rdsSetSingle } from "@sk/db/redis";
import type { FIRFeature, FIRProperties, VatSpyDat, VatSpyFIRFeatureCollection } from "@sk/types/db";
import axios from "axios";

const RELEASE_URL = "https://api.github.com/repos/vatsimnetwork/vatspy-data-project/releases/latest";
const BASE_DATA_URL = "https://github.com/vatsimnetwork/vatspy-data-project/releases/download/";

let version: string | null = null;

export async function updateFirs(): Promise<void> {
	if (!version) {
		await initVersion();
	}
	if (!(await isNewRelease())) return;

	try {
		const vatSpyDatUrl = `${BASE_DATA_URL}${version}/VATSpy.dat`;
		const firBoundJsonUrl = `${BASE_DATA_URL}${version}/Boundaries.geojson`;

		const vatSpyResponse = await axios.get(vatSpyDatUrl, {
			responseType: "text",
		});
		const vatSpyDat = vatSpyResponse.data;
		if (!vatSpyDat) return;

		const firs = extractVatSpyDat(vatSpyDat);

		const boundsResponse = await axios.get(firBoundJsonUrl, {
			responseType: "json",
		});
		const collection = boundsResponse.data as VatSpyFIRFeatureCollection;
		if (!collection || !collection.features) return;

		const newFeatures: FIRFeature[] = collection.features.map((feature) => {
			const fir = firs.find((f) => f.icao === feature.properties.id);
			const newProps: FIRProperties = {
				...feature.properties,
				name: fir?.name ?? "",
				callsign_prefix: fir?.callsign_prefix ?? "",
			};

			return {
				...feature,
				properties: newProps,
			};
		});

		await rdsSetSingle("static_firs:all", newFeatures);
		await rdsSetSingle("static_firs:version", version || "1.0.0");

		console.log(`✅ FIR data updated to version ${version}`);
	} catch (error) {
		console.error(`Error checking for new FIR data: ${error}`);
	}
}

async function initVersion(): Promise<void> {
	if (!version) {
		const redisVersion = await rdsGetSingle("static_firs:version");
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

function extractVatSpyDat(vatSpyDat: string): VatSpyDat[] {
	const firs: VatSpyDat[] = [];

	const sectionStart = vatSpyDat.indexOf("[FIRs]");
	if (sectionStart === -1) return [];

	const lines = vatSpyDat.slice(sectionStart).split("\r\n");

	for (let line of lines) {
		line = line.trim();

		if (line === "") break;
		if (line.startsWith(";") || line.startsWith("[FIRs]")) continue;

		const [icao, name, callsign_prefix, fir_bound] = line.split("|");
		firs.push({
			icao,
			name,
			callsign_prefix,
			fir_bound,
		});
	}

	return firs;
}
