import type { InitialData } from "@sr24/types/interface";
import { MapService } from "@/lib/map/MapService";
import { dxGetAllAirports } from "@/storage/dexie";
import { useFiltersStore } from "@/storage/zustand";
import { fetchApi } from "@/utils/api";
import { type WsData, type WsPresence, wsClient } from "@/utils/ws";

export const mapService = new MapService();

let initialized = false;
let lastMessageSeq: number | null = null;

export async function init(pathname: string): Promise<void> {
	if (initialized) {
		const type = pathname.split("/")[1];
		const id = pathname.split("/")[2];
		mapService.setClickedFeature(type, id);
		return;
	}

	const data = await fetchApi<InitialData>("/map/init");
	const staticAirports = await dxGetAllAirports();

	mapService.setStore({ airports: data.airports, controllers: data.controllers });
	await mapService.setFeatures({ pilots: data.pilots, airports: staticAirports, controllers: data.controllers });

	const handleMessage = async (msg: WsData | WsPresence) => {
		if (msg.t === "delta") {
			if (lastMessageSeq && msg.s !== (lastMessageSeq + 1) % Number.MAX_SAFE_INTEGER) {
				console.warn(`Missed WS messages: last seq ${lastMessageSeq}, current seq ${msg.s}`);
				const data = await fetchApi<InitialData>("/map/init");

				await mapService.setFeatures({ pilots: data.pilots, controllers: data.controllers });
				mapService.setStore({ airports: data.airports, controllers: data.controllers });
			} else {
				mapService.updateStore({ airports: msg.data.airports, controllers: msg.data.controllers });
				await mapService.updateFeatures({ pilots: msg.data.pilots, controllers: msg.data.controllers });
			}
			lastMessageSeq = msg.s;
		}
	};
	wsClient.addListener(handleMessage);

	initFilters();
	if (pathname !== "") {
		const type = pathname.split("/")[1];
		const id = pathname.split("/")[2];
		mapService.setClickedFeature(type, id, true);
	}
	initialized = true;
}

function initFilters(): void {
	const state = useFiltersStore.getState();
	const activeInputs = Object.entries(state)
		.filter(([_key, value]) => Array.isArray(value) && value.length > 0)
		.map(([key]) => key);
	if (activeInputs.length === 0) return;

	const values: Record<string, any> = {};
	activeInputs.forEach((key) => {
		values[key] = state[key as keyof typeof state];
	});

	mapService.setFilters(values);
}
