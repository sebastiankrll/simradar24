import { rdsGetSingle } from "@sr24/db/redis";
import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerDelta, ControllerLong, ControllerMerged, ControllerShort, PilotLong, VatsimData } from "@sr24/types/vatsim";
import { haversineDistance } from "./utils/helpers.js";

let cached: ControllerMerged[] = [];
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

	vatsimData.atis.forEach((atis) => {
		controllersLong.push({
			callsign: atis.callsign,
			frequency: parseFrequencyToKHz(atis.frequency),
			facility: -1,
			atis: atis.text_atis,
			connections: 0,
			cid: atis.cid,
			name: atis.name,
			rating: atis.rating,
			server: atis.server,
			visual_range: atis.visual_range,
			logon_time: new Date(atis.logon_time),
			timestamp: new Date(atis.last_updated),
		});
	});

	const merged = await mergeControllers(controllersLong);
	setControllerDelta(merged);

	return [controllersLong, merged];
}

function setControllerDelta(merged: ControllerMerged[]): void {
	added = [];
	updated = [];

	for (const m of merged) {
		const cachedMerged = cached.find((c) => c.id === m.id);
		if (!cachedMerged) {
			added.push(m);
		} else {
			const updatedControllers: ControllerShort[] = [];

			for (const controller of m.controllers) {
				const cachedController = cachedMerged.controllers.find((c) => c.callsign === controller.callsign);
				const controllerShort = getControllerShort(controller, cachedController);
				if (Object.keys(controllerShort).length > 1) {
					updatedControllers.push(controllerShort);
				}
			}
			
			if (updatedControllers.length > 0) {
				updated.push({
					id: m.id,
					facility: m.facility,
					controllers: updatedControllers,
				});
			}
		}
	}

	cached = merged;
}

function getControllerShort(controller: ControllerShort, cachedController?: ControllerShort): ControllerShort {
	if (!cachedController) {
		return {
			callsign: controller.callsign,
			frequency: controller.frequency,
			facility: controller.facility,
			atis: controller.atis,
			connections: controller.connections,
		};
	} else {
		const controllerShort: ControllerShort = { callsign: controller.callsign };

		if (controller.frequency !== cachedController.frequency) controllerShort.frequency = controller.frequency;
		if (controller.facility !== cachedController.facility) controllerShort.facility = controller.facility;
		if (JSON.stringify(controller.atis) !== JSON.stringify(cachedController.atis)) controllerShort.atis = controller.atis;
		if (controller.connections !== cachedController.connections) controllerShort.connections = controller.connections;

		return controllerShort;
	}
}

export function getControllerDelta(): ControllerDelta {
	return {
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

	const reduceCallsign = (callsign: string): string[] => {
		const parts = callsign.split("_");
		const levels: string[] = [];

		for (let i = parts.length; i > 0; i--) {
			levels.push(parts.slice(0, i).join("_"));
		}

		return levels;
	};

	const findPrefixMatch = (levels: string[], facility: number): string | null => {
		const lookup = facility === 6 ? firPrefixes : traconPrefixes;

		for (const lvl of levels) {
			const match = lookup.get(lvl);
			if (match) return match;
		}
		return null;
	};

	for (const c of controllersLong) {
		let id: string | null = null;
		let facility: ControllerMerged["facility"] | null = null;

		const levels = reduceCallsign(c.callsign);

		if (c.facility === 6) {
			// FIR
			id = findPrefixMatch(levels, 6);
			facility = "fir";
		} else if (c.facility === 5) {
			// TRACON
			id = findPrefixMatch(levels, 5);
			facility = "tracon";
		} else {
			// Airport: simply take the first segment
			id = levels[levels.length - 1];
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

		id = facility === "fir" ? `fir_${id}` : facility === "tracon" ? `tracon_${id}` : `airport_${id}`;

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
