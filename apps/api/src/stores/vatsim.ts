import { rdsSub } from "@sr24/db/redis";
import type { AirportLong, ControllerLong, ControllerMerged, DashboardData, InitialData, PilotLong, RedisAll } from "@sr24/types/interface";

class MapStore {
	init: InitialData | null = null;
	dashboard: DashboardData | null = null;
	pilots = new Map<string, PilotLong>();
	controllers = new Map<string, ControllerLong>();
	airports = new Map<string, AirportLong>();
	merged: ControllerMerged[] = [];

	async start() {
		await rdsSub("data:all", (data) => {
			const parsed: RedisAll = JSON.parse(data);
			this.init = parsed.init;
			this.dashboard = parsed.dashboard;

			this.pilots.clear();
			parsed.pilots.forEach((p) => {
				this.pilots.set(p.id, p);
			});

			this.controllers.clear();
			parsed.controllers.forEach((c) => {
				this.controllers.set(c.callsign, c);
			});

			this.airports.clear();
			parsed.airports.forEach((a) => {
				this.airports.set(a.icao, a);
			});

			this.merged = parsed.init.controllers;
		});
	}

	getControllersByCallsign(callsign: string, type: "airport" | "sector"): ControllerLong[] {
		if (type === "airport") {
			const ids = this.merged.filter((c) => c.id === `airport_${callsign}`).flatMap((c) => c.controllers.map((ctl) => ctl.callsign));
			return ids.map((id) => this.controllers.get(id)).filter((controller) => controller !== undefined);
		}

		const firIds = this.merged.filter((c) => c.id === `fir_${callsign}`).flatMap((c) => c.controllers.map((ctl) => ctl.callsign));
		if (firIds.length > 0) {
			return firIds.map((id) => this.controllers.get(id)).filter((controller) => controller !== undefined);
		} else {
			const ids = this.merged.filter((c) => c.id === `tracon_${callsign}`).flatMap((c) => c.controllers.map((ctl) => ctl.callsign));
			return ids.map((id) => this.controllers.get(id)).filter((controller) => controller !== undefined);
		}
	}
}

export const mapStore = new MapStore();
await mapStore.start();
