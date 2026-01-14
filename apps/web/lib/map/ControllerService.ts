import type { ControllerMerged } from "@sr24/types/interface";
import type { View } from "ol";
import type Feature from "ol/Feature";
import type { FeatureLike } from "ol/Feature";
import type { MultiPolygon, Point, Polygon } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";
import { createAirportFeature, createFirFeature, createTraconFeature, stripPrefix } from "./controllers";
import { webglConfig } from "./webglConfig";

export class ControllerService {
	private firSource = new VectorSource({
		useSpatialIndex: false,
	});
	private traconSource = new VectorSource({
		useSpatialIndex: false,
	});
	private airportSource = new VectorSource({
		useSpatialIndex: false,
	});
	private labelSource = new VectorSource({
		useSpatialIndex: false,
	});
	private firLayer: WebGLVectorLayer | null = null;
	private traconLayer: WebGLVectorLayer | null = null;
	private airportLayer: WebGLVectorLayer | null = null;
	private labelLayer: VectorLayer | null = null;

	private styleCache = new Map<string, Style>();

	private set = new Set<string>();
	private highlighted: string | null = null;

	public init(): (WebGLVectorLayer | VectorLayer)[] {
		this.firLayer = new WebGLVectorLayer({
			source: this.firSource,
			variables: {
				fill: "rgba(77, 95, 131, 0.1)",
				stroke: "rgba(77, 95, 131, 1)",
			},
			style: webglConfig.controller,
			properties: {
				type: "fir",
			},
			zIndex: 1,
		});
		this.traconLayer = new WebGLVectorLayer({
			source: this.traconSource,
			variables: {
				fill: "rgba(222, 89, 234, 0.1)",
				stroke: "rgba(222, 89, 234, 1)",
			},
			style: webglConfig.controller,
			properties: {
				type: "tracon",
			},
			zIndex: 2,
		});
		this.airportLayer = new WebGLVectorLayer({
			source: this.airportSource,
			variables: {
				size: 1,
			},
			style: webglConfig.airport_label,
			properties: {
				type: "airport_label",
			},
			zIndex: 6,
		});
		this.labelLayer = new VectorLayer({
			source: this.labelSource,
			style: this.getLabelStyle.bind(this),
			properties: {
				type: "sector_label",
			},
			zIndex: 8,
		});

		return [this.firLayer, this.traconLayer, this.airportLayer, this.labelLayer];
	}

	public setTheme(theme: boolean) {
		this.firLayer?.updateStyleVariables({ theme });
		this.traconLayer?.updateStyleVariables({ theme });
	}

	public hoverSector(feature: Feature<Point> | undefined | null, hovered: boolean, event: "hovered" | "clicked"): void {
		if (feature?.get("type") === "tracon") {
			const id = feature.getId()?.toString();
			if (id) {
				const multiFeature = this.traconSource.getFeatureById(id);
				if (multiFeature) {
					multiFeature.set(event, hovered);
				}
			}
		}

		if (feature?.get("type") === "fir") {
			const id = feature.getId()?.toString();
			if (id) {
				const multiFeature = this.firSource.getFeatureById(id);
				if (multiFeature) {
					multiFeature.set(event, hovered);
				}
			}
		}
	}

	private getLabelStyle(feature: FeatureLike, resolution: number): Style | undefined {
		const type = feature.get("type") as "tracon" | "fir";

		if ((type === "tracon" && resolution > 3500) || (type === "fir" && resolution > 6000)) {
			return;
		}

		const active = (feature.get("clicked") as boolean) || (feature.get("hovered") as boolean);
		const label = feature.get("label") as string;

		const key = `${type}_${active}`;
		const cached = this.styleCache.get(key);
		if (cached) {
			cached.getText()?.setText(label);
			return cached;
		}

		const bg = type === "fir" ? new Fill({ color: "rgb(77, 95, 131)" }) : new Fill({ color: "rgb(222, 89, 234)" });
		const style = new Style({
			text: new Text({
				font: "400 11px Ubuntu, sans-serif",
				fill: new Fill({ color: "white" }),
				backgroundFill: active ? new Fill({ color: "rgb(234, 89, 121)" }) : bg,
				padding: [3, 2, 1, 4],
				textAlign: "center",
			}),
		});
		style.getText()?.setText(label);
		this.styleCache.set(key, style);

		return style;
	}

	public setHighlighted(id: string): void {
		this.highlighted = id;
	}

	public clearHighlighted(): void {
		this.highlighted = null;
	}

	public async setFeatures(controllers: ControllerMerged[]) {
		this.set.clear();
		this.firSource.clear();
		this.traconSource.clear();
		this.airportSource.clear();
		this.labelSource.clear();

		const traconFeatures: Feature<MultiPolygon | Polygon>[] = [];
		const firFeatures: Feature<MultiPolygon>[] = [];
		const labelFeatures: Feature<Point>[] = [];
		const airportFeatures: Feature<Point>[] = [];

		await Promise.all(
			controllers.map(async (c) => {
				const id = stripPrefix(c.id);
				this.set.add(c.id);

				if (c.facility === "tracon") {
					const { tracon, label } = await createTraconFeature(id);
					if (tracon) {
						traconFeatures.push(tracon);
					}
					if (label) {
						labelFeatures.push(label);
					}

					return;
				}

				if (c.facility === "fir") {
					const { fir, label } = await createFirFeature(id);
					if (fir) {
						firFeatures.push(fir);
					}
					if (label) {
						labelFeatures.push(label);
					}

					return;
				}

				if (c.facility === "airport") {
					const airport = await createAirportFeature(c);
					if (airport) {
						airportFeatures.push(airport);
					}
				}
			}),
		);

		this.firSource.addFeatures(firFeatures);
		this.traconSource.addFeatures(traconFeatures);
		this.airportSource.addFeatures(airportFeatures);
		this.labelSource.addFeatures(labelFeatures);
	}

	public moveToFeature(id: string, view: View | undefined): Feature<Point> | null {
		const labelFeature = this.labelSource.getFeatureById(`sector_${id}`) as Feature<Point> | null;

		const geom = labelFeature?.getGeometry();
		const coords = geom?.getCoordinates();
		if (!coords) return null;

		view?.animate({
			center: coords,
			duration: 200,
			zoom: 7,
		});

		this.setHighlighted(id);

		return labelFeature;
	}
}
