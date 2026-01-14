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
	private eventAirportsAreActive = false;

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
		const visibleSizes = getVisibleSizes(zoom);
		if (visibleSizes.length === 0) {
			this.source.clear();

			this.highlighted.forEach((id) => {
				const feature = this.map.get(id);
				if (feature) {
					this.source.addFeature(feature);
				}
			});

			return;
		}

		const [minX, minY, maxX, maxY] = transformExtent(extent, "EPSG:3857", "EPSG:4326");
		const airportsByExtent = this.rbush.search({ minX, minY, maxX, maxY });
		const airportsBySize = airportsByExtent.filter((f) => visibleSizes.includes(f.size));

		this.source.clear();
		if (!this.eventAirportsAreActive) {
			this.source.addFeatures(airportsBySize.map((f) => f.feature));
		}

		if (this.highlighted.size > 0) {
			this.highlighted.forEach((id) => {
				const exists = airportsBySize.find((a) => a.feature.getId() === `airport_${id}`);
				if (!exists || this.eventAirportsAreActive) {
					const feature = this.map.get(id);
					if (feature) {
						this.source.addFeature(feature);
					}
				}
			});
		}
	}

	public setHighlighted(id: string): void {
		this.highlighted.add(id);
	}

	public clearHighlighted(): void {
		this.highlighted.clear();
	}

	public getEventAirportsView(ids: string[]): void {
		this.highlighted.forEach((id) => {
			const feature = this.map.get(id);
			if (feature) {
				feature.set("clicked", false);
			}
		});
		this.highlighted.clear();

		const features: Feature<Point>[] = [];
		ids.forEach((id) => {
			const feature = this.map.get(id);
			if (feature) {
				features.push(feature);
				feature.set("clicked", true);
				this.highlighted.add(id);
			}
		});

		if (features.length === 0) return;

		const extent = features[0].getGeometry()?.getExtent();
		if (!extent) return;

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

		this.eventAirportsAreActive = true;
		this.source.clear();
		this.source.addFeatures(features);

		// toggleLayerVisibility(["pilot", "controllers"], false);

		// view?.fit(extent, {
		// 	duration: 200,
		// 	maxZoom: 12,
		// 	padding: MAP_PADDING,
		// });
	}

	public hideEventAirports() {
		this.eventAirportsAreActive = false;
		this.highlighted.forEach((id) => {
			const feature = this.map.get(id);
			if (feature) {
				feature.set("clicked", false);
			}
		});
		this.highlighted.clear();
		// toggleLayerVisibility(["pilot", "controllers"], true);
		// setAirportFeatures(view.calculateExtent(), view.getZoom() || 0);
	}

	public moveToFeature(id: string, view: View | undefined): Feature<Point> | null {
		let feature = this.source.getFeatureById(`airport_${id}`) as Feature<Point> | undefined;
		if (!feature) {
			feature = this.map.get(id);
		}

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
}
