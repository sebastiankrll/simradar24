import { rdsGetSingle } from "@sk/db/redis";
import type { FIRFeature, SimAwareTraconFeature } from "@sk/types/db";
import type { ControllerDelta, ControllerLong, ControllerMerged, ControllerShort, PilotLong, VatsimData } from "@sk/types/vatsim";
import { haversineDistance } from "./utils/helpers.js";

let cachedMerged: ControllerMerged[] = [];
let deleted: string[] = [];
let updated: ControllerMerged[] = [];
let added: ControllerMerged[] = [];

export async function mapControllers(vatsimData: VatsimData, pilotsLong: PilotLong[]): Promise<[ControllerLong[], ControllerMerged[]]> {
	const controllersLong: ControllerLong[] = vatsimData.controllers.map((controller) => {
		return {
			callsign: controller.callsign,
			frequency: parseFrequencyToKHz(controller.frequency),
			facility: controller.facility,
			atis: controller.text_atis,
			connections: 0,
			cid: controller.cid,
			name: controller.name,
			rating: controller.rating,
			server: controller.server,
			visual_range: controller.visual_range,
			logon_time: new Date(controller.logon_time),
			timestamp: new Date(controller.last_updated),
		};
	});

	getConnectionsCount(vatsimData, controllersLong, pilotsLong);

	const merged = await mergeControllers(controllersLong);

	const deletedMerged = cachedMerged.filter((a) => !merged.some((b) => b.id === a.id));
	deleted = deletedMerged.map((c) => c.id);
	added = merged.filter((a) => !cachedMerged.some((b) => b.id === a.id));
	updated = merged.filter((a) => cachedMerged.some((b) => b.id === a.id));

	cachedMerged = merged;
	return [controllersLong, merged];
}

export function getControllerDelta(): ControllerDelta {
	return {
		deleted,
		added,
		updated,
	};
}

// "122.800" ==> 122800
function parseFrequencyToKHz(freq: string): number {
	const num = Number(freq.replace(".", ""));
	if (Number.isNaN(num)) return 122_800;

	return num;
}

function getConnectionsCount(vatsimData: VatsimData, controllersLong: ControllerLong[], pilotsLong: PilotLong[]) {
	const controllersByFreq = new Map<number, ControllerLong[]>();

	for (const controllerLong of controllersLong) {
		const freq = controllerLong.frequency;

		if (!controllersByFreq.has(freq)) {
			controllersByFreq.set(freq, []);
		}
		controllersByFreq.get(freq)?.push(controllerLong);
	}

	const pilotsByFreq = new Map<number, PilotLong[]>();
	for (const pilotLong of pilotsLong) {
		const freq = pilotLong.frequency;

		if (!pilotsByFreq.has(freq)) {
			pilotsByFreq.set(freq, []);
		}
		pilotsByFreq.get(freq)?.push(pilotLong);
	}

	for (const [freq, controllerList] of controllersByFreq.entries()) {
		const pilotList = pilotsByFreq.get(freq) || [];

		if (controllerList.length === 1) {
			controllerList[0].connections = pilotList.length;
		} else {
			for (const pilot of pilotList) {
				let closestController = controllerList[0];
				let minDist = Infinity;

				for (const controller of controllerList) {
					const transceiverData = vatsimData.transceivers.find((t) => t.callsign === controller.callsign);
					const transceiverByFreq = transceiverData?.transceivers.find((t) => Number(t.frequency.toString().slice(0, 6)) === freq);
					if (!transceiverByFreq) continue;

					const dist = haversineDistance([pilot.latitude, pilot.longitude], [transceiverByFreq.latDeg, transceiverByFreq.lonDeg]);
					if (dist < minDist) {
						minDist = dist;
						closestController = controller;
					}
				}

				closestController.connections++;
			}
		}
	}
}

const firPrefixes: Map<string, string> = new Map();
const traconPrefixes: Map<string, string> = new Map();

export async function mergeControllers(controllersLong: ControllerLong[]): Promise<ControllerMerged[]> {
	await updateFeaturesFromRedis();

	const merged = new Map<string, ControllerMerged>();

	for (const c of controllersLong) {
		let id: string | null = null;
		let facility: ControllerMerged["facility"] | null = null;

		const parts = c.callsign.split("_");
		const prefix1 = parts[0];
		const prefix2 = parts.length > 1 ? `${parts[0]}_${parts[1]}` : null;

		if (c.facility === 6) {
			id = firPrefixes.get(prefix1) || (prefix2 ? firPrefixes.get(prefix2) : null) || null;
			facility = "fir";
		} else if (c.facility === 5) {
			id = traconPrefixes.get(prefix1) || (prefix2 ? traconPrefixes.get(prefix2) : null) || null;
			facility = "tracon";
		} else {
			id = prefix1;
			facility = "airport";
		}

		if (!id) continue;

		const controllerShort: ControllerShort = {
			callsign: c.callsign,
			frequency: c.frequency,
			facility: c.facility,
			atis: c.atis,
			connections: c.connections,
		};

		if (c.facility === 6) {
			id = `fir_${id}`;
		} else if (c.facility === 5) {
			id = `tracon_${id}`;
		} else {
			id = `airport_${id}`;
		}

		const existing = merged.get(id);
		if (existing) {
			existing.controllers.push(controllerShort);
		} else {
			merged.set(id, {
				id,
				facility,
				controllers: [controllerShort],
			});
		}
	}

	return Array.from(merged.values());
}

let currentFirsVersion: string | null = null;
let currentTraconsVersion: string | null = null;

async function updateFeaturesFromRedis(): Promise<void> {
	const firsVersion = await rdsGetSingle("static_firs:version");
	const traconsVersion = await rdsGetSingle("static_tracons:version");

	if (currentFirsVersion !== firsVersion) {
		const features = (await rdsGetSingle("static_firs:all")) as FIRFeature[] | undefined;
		if (features) {
			firPrefixes.clear();
			features.forEach((f) => {
				const prefix = f.properties.callsign_prefix;
				const id = f.properties.id;
				if (prefix === "") {
					firPrefixes.set(id, id);
				} else {
					firPrefixes.set(prefix, id);
				}
			});

			currentFirsVersion = firsVersion;
		}
	}

	if (currentTraconsVersion !== traconsVersion) {
		const features = (await rdsGetSingle("static_tracons:all")) as SimAwareTraconFeature[] | undefined;
		if (features) {
			traconPrefixes.clear();
			features.forEach((f) => {
				const prefixes = f.properties.prefix;

				if (typeof prefixes === "string") {
					traconPrefixes.set(prefixes, f.properties.id);
				} else {
					prefixes.forEach((prefix) => {
						traconPrefixes.set(prefix, f.properties.id);
					});
				}
			});

			currentTraconsVersion = traconsVersion;
		}
	}
}
