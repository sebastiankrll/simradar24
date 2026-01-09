import { rdsSub } from "@sr24/db/redis";
import type { AirportLong, ControllerLong, DashboardData, InitialData, PilotLong, RedisAll } from "@sr24/types/interface";

class MapStore {
	init: InitialData | null = null;
	dashboard: DashboardData | null = null;
	pilots = new Map<string, PilotLong>();
	controllers = new Map<string, ControllerLong>();
	airports = new Map<string, AirportLong>();

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
		});
	}
}

export const mapStore = new MapStore();
await mapStore.start();
