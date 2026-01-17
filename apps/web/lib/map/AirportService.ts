import type { StaticAirport } from "@sr24/types/db";
import { Feature, type View } from "ol";
import type { Extent } from "ol/extent";
import { Point } from "ol/geom";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import { fromLonLat, transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import RBush from "rbush";
import type { AirportProperties } from "@/types/ol";
import { getAirportSize, getVisibleSizes } from "./airports";
import { webglConfig } from "./webglConfig";

type RBushFeature = {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	size: string;
	feature: Feature<Point>;
};

export class AirportService {
	private source = new VectorSource({
		useSpatialIndex: false,
	});
	private layer: WebGLVectorLayer | null = null;

	private rbush = new RBush<RBushFeature>();
	private map = new Map<string, Feature<Point>>();

	private highlighted = new Set<string>();
	private focused = new Set<string>();
	private isFocused = false;

	public init(): WebGLVectorLayer {
		this.layer = new WebGLVectorLayer({
			source: this.source,
			variables: {
				size: 1,
			},
			style: webglConfig.airport_main,
			properties: {
				type: "airport_main",
			},
			zIndex: 7,
		});
		return this.layer;
	}

	public setFeatures(airports: StaticAirport[]): void {
		this.rbush.clear();
		this.source.clear();
		this.map.clear();

		const items: RBushFeature[] = airports.map((a) => {
			const feature = new Feature({
				geometry: new Point(fromLonLat([a.longitude, a.latitude])),
			});
			const props: AirportProperties = {
				clicked: false,
				hovered: false,
				size: getAirportSize(a.size),
				type: "airport",
			};
			feature.setProperties(props);
			feature.setId(`airport_${a.id}`);

			this.map.set(a.id, feature);

			return {
				minX: a.longitude,
				minY: a.latitude,
				maxX: a.longitude,
				maxY: a.latitude,
				size: getAirportSize(a.size),
				feature: feature,
			};
		});
		this.rbush.load(items);
	}

	public renderFeatures(extent: Extent, zoom: number) {
		let newFeatures: Feature<Point>[] = [];

		if (this.isFocused) {
			this.source.clear();
			this.focused.forEach((id) => {
				const feature = this.map.get(id);
				if (feature) {
					this.source.addFeature(feature);
				}
			});
			return;
		}

		const visibleSizes = getVisibleSizes(zoom);
		if (visibleSizes.length === 0) {
			this.source.clear();

			this.highlighted.forEach((id) => {
				const feature = this.map.get(id);
				if (feature) {
					newFeatures.push(feature);
				}
			});

			this.source.addFeatures(newFeatures);

			return;
		}

		const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
		const airportsByExtent = this.rbush.search({ minX, minY, maxX, maxY });
		const airportsBySize = airportsByExtent.filter((f) => visibleSizes.includes(f.size));
		newFeatures = airportsBySize.map((f) => f.feature);

		this.highlighted.forEach((id) => {
			const exists = newFeatures.find((f) => f.getId() === `airport_${id}`);
			if (!exists) {
				const feature = this.map.get(id);
				if (feature) {
					newFeatures.push(feature);
				}
			}
		});

		this.source.clear();
		this.source.addFeatures(newFeatures);
	}

	public setHighlighted(id: string): void {
		this.highlighted.add(id);
	}

	public clearHighlighted(): void {
		this.highlighted.clear();
	}

	public moveToFeature(id: string, view?: View | undefined): Feature<Point> | null {
		let feature = this.source.getFeatureById(`airport_${id}`) as Feature<Point> | undefined;
		if (!feature) {
			feature = this.map.get(id);
		}

		if (!view) return feature || null;

		const geom = feature?.getGeometry();
		const coords = geom?.getCoordinates();
		if (!coords) return null;

		view?.animate({
			center: coords,
			duration: 200,
			zoom: 8,
		});

		this.setHighlighted(id);

		return feature || null;
	}

	public setSettings({ show, size }: { show?: boolean; size?: number }): void {
		if (show !== undefined) {
			this.layer?.setVisible(show);
		}
		if (size) {
			this.layer?.updateStyleVariables({ size: size / 50 });
		}
	}

	public getExtent(ids: string[]): Extent | null {
		const features: Feature<Point>[] = [];
		ids.forEach((id) => {
			const feature = this.map.get(id);
			if (feature) {
				features.push(feature);
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

	public focusFeatures(ids: string[]): void {
		this.unfocusFeatures();

		ids.forEach((id) => {
			const feature = this.map.get(id);
			if (feature) {
				feature.set("clicked", true);
				this.focused.add(id);
			}
		});

		this.isFocused = true;
	}

	public unfocusFeatures() {
		this.focused.forEach((id) => {
			const feature = this.map.get(id);
			const highlighted = this.highlighted.has(id);
			if (feature) {
				feature.set("clicked", highlighted);
			}
		});
		this.focused.clear();

		this.isFocused = false;
	}
}
