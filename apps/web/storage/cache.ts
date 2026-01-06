import type { FIRFeature, SimAwareTraconFeature, StaticAircraft, StaticAirline, StaticAirport } from "@sr24/types/db";
import type { DeltaTrackPoint, TrackPoint } from "@sr24/types/interface";
import { decodeTrackPoints } from "@/components/Map/trackFeatures";
import { fetchApi } from "@/utils/api";
import { dxGetAirline, dxGetAirport, dxGetFirs, dxGetTracons } from "./dexie";

const cachedAirports: Map<string, StaticAirport> = new Map();

export async function getCachedAirport(id: string): Promise<StaticAirport | null> {
	const cached = cachedAirports.get(id);
	if (cached) return cached;

	const airport = await dxGetAirport(id);
	if (airport) {
		cachedAirports.set(id, airport);
	}

	return airport || null;
}

const cachedAirlines: Map<string, StaticAirline> = new Map();

export async function getCachedAirline(id: string): Promise<StaticAirline | null> {
	const cached = cachedAirlines.get(id);
	if (cached) return cached;

	const airline = await dxGetAirline(id);
	if (airline) {
		cachedAirlines.set(id, airline);
	}

	return airline || null;
}

const cachedAircrafts: Map<string, StaticAircraft> = new Map();

export async function getCachedAircraft(registration: string): Promise<StaticAircraft | null> {
	const cached = cachedAircrafts.get(registration);
	if (cached) return cached;

	const aircraft = await fetchApi<StaticAircraft>(`/data/aircraft/${registration}`);
	if (aircraft) {
		cachedAircrafts.set(registration, aircraft);
	}

	return aircraft || null;
}

const cachedTracons: Map<string, SimAwareTraconFeature> = new Map();

export async function getCachedTracon(id: string): Promise<SimAwareTraconFeature | null> {
	const cached = cachedTracons.get(id);
	if (cached) return cached;

	const tracon = await dxGetTracons([id]).then((res) => res[0]);
	const feature = tracon?.feature as SimAwareTraconFeature;
	if (feature) {
		cachedTracons.set(id, feature);
	}

	return feature || null;
}

const cachedFirs: Map<string, FIRFeature> = new Map();

export async function getCachedFir(id: string): Promise<FIRFeature | null> {
	const cached = cachedFirs.get(id);
	if (cached) return cached;

	const fir = await dxGetFirs([id]).then((res) => res[0]);
	const feature = fir?.feature as FIRFeature;
	if (feature) {
		cachedFirs.set(id, feature);
	}

	return feature || null;
}

const cachedTrackPoints = new Map<string, TrackPoint[]>();
const pendingTrackPoints = new Map<string, Promise<TrackPoint[]>>();

export async function getCachedTrackPoints(id: string): Promise<TrackPoint[]> {
	const cached = cachedTrackPoints.get(id);
	if (cached) {
		return cached;
	}

	const inFlight = pendingTrackPoints.get(id);
	if (inFlight) {
		return inFlight;
	}

	const promise = fetchApi<(TrackPoint | DeltaTrackPoint)[]>(`/map/pilot/${id}/track`)
		.then((masked) => {
			const data = decodeTrackPoints(masked);
			cachedTrackPoints.set(id, data);
			pendingTrackPoints.delete(id);
			return data;
		})
		.catch((err) => {
			pendingTrackPoints.delete(id);
			throw err;
		});

	pendingTrackPoints.set(id, promise);
	return promise;
}

export function clearCachedTrackPoints(): void {
	cachedTrackPoints.clear();
}
