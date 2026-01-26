import type { PilotDelta, PilotShort } from "@sr24/types/interface";
import { Feature, type View } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import RBush from "rbush";
import { toast } from "react-toastify";
import MessageBox from "@/components/MessageBox/MessageBox";
import type { SelectOptionType } from "@/components/Select/Select";
import type { PilotProperties } from "@/types/ol";
import type { FilterValues } from "@/types/zustand";
import { getPilotStyle, getShadowStyle, type PilotStyleVars } from "./styles/pilot";

type RBushFeature = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	altitude_agl: number;
	feature: Feature<Point>;
};

export class PilotService {
	private source = new VectorSource<Feature<Point>>({
		useSpatialIndex: false,
	});
	private mainLayer: VectorLayer | null = null;
	private shadowLayer: VectorLayer | null = null;

	private rbush = new RBush<RBushFeature>();
	private map = new Map<string, RBushFeature>();
	private rendered = new Set<string>();

	private filters: Partial<Record<keyof FilterValues, SelectOptionType[] | number[]>> = {};
	private highlighted = new Set<string>();
	private focused = new Set<string>();
	private isFocused = false;
	// private viewInitialized = false;

	private styleVars: PilotStyleVars = {};

	public init(): VectorLayer[] {
		this.mainLayer = new VectorLayer({
			source: this.source,
			style: getPilotStyle(this.styleVars),
			properties: {
				type: "pilot_main",
			},
			declutter: true,
			zIndex: 5,
		});
		this.shadowLayer = new VectorLayer({
			source: this.source,
			style: getShadowStyle(this.styleVars),
			properties: {
				type: "pilot_shadow",
			},
			zIndex: 4,
		});

		return [this.mainLayer, this.shadowLayer];
	}

	public getSource(): VectorSource<Feature<Point>> {
		return this.source;
	}

	public setTheme(theme: boolean) {
		this.styleVars.theme = theme;
		this.shadowLayer?.setStyle(getShadowStyle(this.styleVars));
	}

	public setFilters(filters?: Partial<Record<keyof FilterValues, SelectOptionType[] | number[]>>) {
		this.filters = filters || {};
	}

	private filterFeature(feature: Feature<Point>): boolean {
		if (Object.keys(this.filters).length === 0) return true;

		const callsign = feature.get("callsign") as string | undefined;

		if (this.filters.Airline && this.filters.Airline.length > 0) {
			const filters = this.filters.Airline as SelectOptionType[];
			if (!filters.some((f) => f.value === callsign?.slice(0, 3))) {
				return false;
			}
		}
		if (this.filters["Aircraft Type"] && this.filters["Aircraft Type"].length > 0) {
			const aircraftType = feature.get("aircraft") as string | undefined;
			const filters = this.filters["Aircraft Type"] as SelectOptionType[];
			if (!filters.some((filter) => aircraftType?.includes(filter.value))) {
				return false;
			}
		}
		if (this.filters["Aircraft Registration"] && this.filters["Aircraft Registration"].length > 0) {
			const registration = feature.get("ac_reg") as string | undefined;
			const filters = this.filters["Aircraft Registration"] as SelectOptionType[];
			if (!filters.some((filter) => registration?.includes(filter.value))) {
				return false;
			}
		}

		const route = feature.get("route") as string | undefined;

		if (this.filters.Departure && this.filters.Departure.length > 0) {
			const filters = this.filters.Departure as SelectOptionType[];
			if (!filters.some((filter) => filter.value === route?.split(" -- ")[0])) {
				return false;
			}
		}
		if (this.filters.Arrival && this.filters.Arrival.length > 0) {
			const filters = this.filters.Arrival as SelectOptionType[];
			if (!filters.some((filter) => filter.value === route?.split(" -- ")[1])) {
				return false;
			}
		}
		if (this.filters.Any && this.filters.Any.length > 0) {
			const filters = this.filters.Any as SelectOptionType[];
			if (!filters.some((filter) => filter.value === route?.split(" -- ")[0] || filter.value === route?.split(" -- ")[1])) {
				return false;
			}
		}
		if (this.filters.Callsign && this.filters.Callsign.length > 0) {
			const filters = this.filters.Callsign as SelectOptionType[];
			if (!filters.some((filter) => callsign?.includes(filter.value))) {
				return false;
			}
		}
		if (this.filters.Squawk && this.filters.Squawk.length > 0) {
			const squawk = feature.get("transponder") as string | undefined;
			const filters = this.filters.Squawk as SelectOptionType[];
			if (!filters.some((filter) => filter.value === squawk)) {
				return false;
			}
		}
		if (this.filters["Flight Rules"] && this.filters["Flight Rules"].length > 0) {
			const flightRules = feature.get("flight_rules") as string | undefined;
			const filters = this.filters["Flight Rules"] as SelectOptionType[];
			if (!filters.some((filter) => filter.value === flightRules)) {
				return false;
			}
		}
		if (this.filters["Barometric Altitude"] && this.filters["Barometric Altitude"].length > 0) {
			const altitude = feature.get("altitude_ms") as number | undefined;
			const [min, max] = this.filters["Barometric Altitude"] as number[];
			if (altitude === undefined || altitude < min || altitude > max) {
				return false;
			}
		}
		if (this.filters.Groundspeed && this.filters.Groundspeed.length > 0) {
			const groundspeed = feature.get("groundspeed") as number | undefined;
			const [min, max] = this.filters.Groundspeed as number[];
			if (groundspeed === undefined || groundspeed < min || groundspeed > max) {
				return false;
			}
		}

		return true;
	}

	public setHighlighted(id: string): void {
		this.highlighted.add(id);
	}

	public clearHighlighted(): void {
		this.highlighted.clear();
	}

	public setFeatures(pilots: PilotShort[]) {
		this.rbush.clear();
		this.map.clear();

		for (const p of pilots) {
			if (!p.coordinates) continue;

			const props: PilotProperties = {
				type: "pilot",
				coord3857: p.coordinates,
				clicked: false,
				hovered: false,
				...p,
			};

			const feature = new Feature({
				geometry: new Point(p.coordinates),
			});
			feature.setProperties(props);
			feature.setId(`pilot_${p.id}`);

			const newItem: RBushFeature = {
				minX: p.coordinates[0],
				minY: p.coordinates[1],
				maxX: p.coordinates[0],
				maxY: p.coordinates[1],
				altitude_agl: p.altitude_agl || 0,
				feature,
			};

			this.map.set(p.id, newItem);
			this.rbush.insert(newItem);
		}
	}

	public updateFeatures(delta: PilotDelta): boolean {
		const pilotsInDelta = new Set<string>();

		for (const p of delta.updated) {
			const item = this.map.get(p.id);
			if (!item) continue;

			pilotsInDelta.add(p.id);

			if (Object.keys(p).length === 1) continue;

			for (const k in p) {
				item.feature.set(k, p[k as keyof typeof p], true);
			}

			if (p.coordinates) {
				const geom = item.feature.getGeometry();
				geom?.setCoordinates(p.coordinates);

				item.feature.set("coord3857", p.coordinates, true);
				this.rbush.remove(item);
				item.minX = item.maxX = p.coordinates[0];
				item.minY = item.maxY = p.coordinates[1];
				this.rbush.insert(item);
			}

			this.map.set(p.id, item);
		}

		for (const p of delta.added) {
			if (pilotsInDelta.has(p.id)) continue;

			pilotsInDelta.add(p.id);

			const props: PilotProperties = {
				type: "pilot",
				coord3857: p.coordinates,
				clicked: false,
				hovered: false,
				...p,
			};
			const feature = new Feature({
				geometry: new Point(p.coordinates),
			});
			feature.setProperties(props);
			feature.setId(`pilot_${p.id}`);

			const newItem: RBushFeature = {
				minX: p.coordinates[0],
				minY: p.coordinates[1],
				maxX: p.coordinates[0],
				maxY: p.coordinates[1],
				altitude_agl: p.altitude_agl || 0,
				feature,
			};

			this.map.set(p.id, newItem);
			this.rbush.insert(newItem);
		}

		const toRemove: string[] = [];

		for (const item of this.map) {
			if (pilotsInDelta.has(item[0])) continue;
			toRemove.push(item[0]);
			this.rbush.remove(item[1]);
		}

		for (const id of toRemove) {
			this.map.delete(id);
		}

		if (this.highlighted.size > 0) {
			for (const id of this.highlighted) {
				if (!this.map.has(id)) {
					toast.info(MessageBox, { data: { title: "Pilot Disconnected", message: `The viewed pilot has disconnected.` } });
					this.highlighted.delete(id);
					return true;
				}
			}
		}

		return false;
	}

	public renderFeatures(extent: Extent, resolution: number) {
		if (this.isFocused) {
			this.source.clear();
			this.focused.forEach((id) => {
				const item = this.map.get(id);
				if (item) {
					this.source.addFeature(item.feature);
				}
			});
			return;
		}

		const pilotsByExtent = this.rbush.search({
			minX: extent[0],
			minY: extent[1],
			maxX: extent[2],
			maxY: extent[3],
		});

		const limited: RBushFeature[] = [];

		for (const p of pilotsByExtent) {
			if (resolution > 25 && p.altitude_agl <= 200) continue;
			if (!this.filterFeature(p.feature)) continue;

			limited.push(p);

			if (limited.length > 300) {
				limited.sort((a, b) => b.altitude_agl - a.altitude_agl);
				limited.length = 300;
			}
		}

		const newFeatures = limited.map((p) => p.feature);
		const idSet = new Set(newFeatures.map((f) => f.getId()));

		this.highlighted.forEach((id) => {
			const fid = `pilot_${id}`;
			if (!idSet.has(fid)) {
				const item = this.map.get(id);
				if (item) newFeatures.push(item.feature);
			}
		});

		const next = new Set(newFeatures.map((f) => f.getId() as string));

		this.rendered.forEach((id) => {
			if (!next.has(id)) {
				const f = this.source.getFeatureById(id);
				if (f) this.source.removeFeature(f);
			}
		});

		newFeatures.forEach((f) => {
			const id = f.getId() as string;
			if (!this.rendered.has(id)) {
				this.source.addFeature(f);
			}
		});

		this.rendered = next;
	}

	public animateFeatures(elapsed: number): void {
		const features = this.source.getFeatures() as Feature<Point>[];

		features.forEach((feature) => {
			const kts = (feature.get("groundspeed") as number) || 0;
			if (kts <= 0) return;

			const heading = (feature.get("heading") as number) || 0;
			const headingRad = (heading * Math.PI) / 180;
			const meters = kts * 0.514444 * (elapsed / 1000);

			const [x, y] = feature.get("coord3857");
			const dx = meters * Math.sin(headingRad);
			const dy = meters * Math.cos(headingRad);
			const nx = x + dx;
			const ny = y + dy;

			feature.getGeometry()?.setCoordinates([nx, ny]);
			feature.set("coord3857", [nx, ny], true);
		});
	}

	public moveToFeature(id: string, view?: View | undefined): Feature<Point> | null {
		let feature = this.source.getFeatureById(`pilot_${id}`) as Feature<Point> | undefined;
		if (!feature) {
			const item = this.map.get(id);
			feature = item?.feature;
		}

		if (!view) return feature || null;

		const geom = feature?.getGeometry();
		const coords = geom?.getCoordinates();
		if (!coords) return null;

		view.animate({
			center: coords,
			duration: 200,
			zoom: 10,
		});

		this.setHighlighted(id);

		return feature || null;
	}

	public setSettings({ size, show }: { size?: number; show?: boolean }): void {
		if (size) {
			this.styleVars.size = size;
			this.mainLayer?.setStyle(getPilotStyle(this.styleVars));
			this.shadowLayer?.setStyle(getShadowStyle(this.styleVars));
		}
		if (show !== undefined) {
			this.mainLayer?.setVisible(show);
			this.shadowLayer?.setVisible(show);
		}
	}

	public focusFeatures(ids: string[]): void {
		this.unfocusFeatures();

		ids.forEach((id) => {
			const feature = this.map.get(id);
			if (feature?.feature) {
				feature.feature.set("clicked", true);
				this.focused.add(id);
			}
		});

		this.isFocused = true;
	}

	public unfocusFeatures() {
		this.focused.forEach((id) => {
			const feature = this.map.get(id);
			const highlighted = this.highlighted.has(id);
			if (feature?.feature) {
				feature.feature.set("clicked", highlighted);
			}
		});
		this.focused.clear();

		this.isFocused = false;
	}

	public getExtent(ids: string[]): Extent | null {
		const features: Feature<Point>[] = [];
		ids.forEach((id) => {
			const feature = this.map.get(id);
			if (feature?.feature) {
				features.push(feature.feature);
			}
		});

		if (features.length === 0) return null;

		const extent = features[0].getGeometry()?.getExtent();
		if (!extent) return null;

		features.forEach((feature) => {
			const geom = feature.getGeometry();
			if (geom) {
				const featExtent = geom.getExtent();
				extent[0] = Math.min(extent[0], featExtent[0]);
				extent[1] = Math.min(extent[1], featExtent[1]);
				extent[2] = Math.max(extent[2], featExtent[2]);
				extent[3] = Math.max(extent[3], featExtent[3]);
			}
		});

		return extent;
	}

	public getStats(): { total: number; rendered: number } {
		return {
			total: this.map.size,
			rendered: this.source.getFeatures().length,
		};
	}
}
