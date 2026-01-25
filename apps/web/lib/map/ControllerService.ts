import type { ControllerDelta, ControllerMerged } from "@sr24/types/interface";
import type { View } from "ol";
import type Feature from "ol/Feature";
import type { MultiPolygon, Point, Polygon } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type { RgbaColor } from "react-colorful";
import { toast } from "react-toastify";
import MessageBox from "@/components/MessageBox/MessageBox";
import { createAirportFeature, createFirFeature, createTraconFeature, stripPrefix } from "./controllers";
import { type ControllerStyleVars, getAirportStyle, getFirStyle, getLabelStyle, getTraconStyle } from "./styles/controller";

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
	private labelSource = new VectorSource<Feature<Point>>();
	private firLayer: VectorLayer | null = null;
	private traconLayer: VectorLayer | null = null;
	private airportLayer: VectorLayer | null = null;
	private labelLayer: VectorLayer | null = null;

	private set = new Set<string>();
	private highlighted: string | null = null;

	private styleVars: ControllerStyleVars = {};

	public init(): VectorLayer[] {
		this.firLayer = new VectorLayer({
			source: this.firSource,
			style: getFirStyle(this.styleVars),
			properties: {
				type: "fir",
			},
			zIndex: 1,
		});
		this.traconLayer = new VectorLayer({
			source: this.traconSource,
			style: getTraconStyle(this.styleVars),
			properties: {
				type: "tracon",
			},
			zIndex: 2,
		});
		this.airportLayer = new VectorLayer({
			source: this.airportSource,
			style: getAirportStyle(this.styleVars),
			properties: {
				type: "airport_label",
			},
			zIndex: 6,
		});
		this.labelLayer = new VectorLayer({
			source: this.labelSource,
			style: getLabelStyle(this.styleVars),
			properties: {
				type: "sector_label",
			},
			zIndex: 8,
		});

		return [this.firLayer, this.traconLayer, this.airportLayer, this.labelLayer];
	}

	public getSource(): VectorSource<Feature<Point>> {
		return this.labelSource;
	}

	public setTheme(_theme: boolean) {
		// No theme changes yet
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

	public async updateFeatures(controllers: ControllerDelta): Promise<boolean> {
		const controllersInDelta = new Set<string>();

		for (const c of controllers.updated) {
			if (this.set.has(c.id)) {
				controllersInDelta.add(c.id);
				continue;
			}

			if (c.facility === "airport") {
				const id = stripPrefix(c.id);
				const feature = this.airportSource.getFeatureById(`sector_${id}`) as Feature<Point> | undefined;
				if (feature) {
					await createAirportFeature(c, feature);
				}
			}
			controllersInDelta.add(c.id);
		}

		for (const c of controllers.added) {
			if (controllersInDelta.has(c.id)) {
				continue;
			}

			const id = stripPrefix(c.id);
			controllersInDelta.add(c.id);
			this.set.add(c.id);

			if (c.facility === "tracon") {
				const { tracon, label } = await createTraconFeature(id);
				if (tracon) {
					this.traconSource.addFeature(tracon);
				}
				if (label) {
					this.labelSource.addFeature(label);
				}

				continue;
			}

			if (c.facility === "fir") {
				const { fir, label } = await createFirFeature(id);
				if (fir) {
					this.firSource.addFeature(fir);
				}
				if (label) {
					this.labelSource.addFeature(label);
				}

				continue;
			}

			if (c.facility === "airport") {
				const airport = await createAirportFeature(c);
				if (airport) {
					this.airportSource.addFeature(airport);
				}
			}
		}

		const toRemove: string[] = [];

		for (const id of this.set) {
			if (controllersInDelta.has(id)) continue;

			toRemove.push(id);
			const shortId = stripPrefix(id);

			if (id.startsWith("tracon_") || id.startsWith("fir_")) {
				const feature = this.labelSource.getFeatureById(`sector_${shortId}`);
				feature && this.labelSource.removeFeature(feature);
			}

			if (id.startsWith("tracon_")) {
				const feature = this.traconSource.getFeatureById(`sector_${shortId}`);
				feature && this.traconSource.removeFeature(feature);
				continue;
			}

			if (id.startsWith("fir_")) {
				const feature = this.firSource.getFeatureById(`sector_${shortId}`);
				feature && this.firSource.removeFeature(feature);
				continue;
			}

			if (id.startsWith("airport_")) {
				const feature = this.airportSource.getFeatureById(`sector_${shortId}`);
				feature && this.airportSource.removeFeature(feature);
			}
		}

		for (const id of toRemove) {
			this.set.delete(id);
		}

		if (this.highlighted && !this.set.has(`tracon_${this.highlighted}`) && !this.set.has(`fir_${this.highlighted}`)) {
			toast.info(MessageBox, { data: { title: "Controller Disconnected", message: `The viewed controller has disconnected.` } });
			this.highlighted = null;
			return true;
		}

		return false;
	}

	public moveToFeature(id: string, view?: View | undefined): Feature<Point> | null {
		const labelFeature = this.labelSource.getFeatureById(`sector_${id}`) as Feature<Point> | undefined;
		if (!view) return labelFeature || null;

		const geom = labelFeature?.getGeometry();
		const coords = geom?.getCoordinates();
		if (!coords) return null;

		view?.animate({
			center: coords,
			duration: 200,
			zoom: 7,
		});

		this.setHighlighted(id);

		return labelFeature || null;
	}

	public setSettings({
		showSectors,
		firColor,
		traconColor,
		showAirports,
		airportSize,
	}: {
		showSectors?: boolean;
		firColor?: RgbaColor;
		traconColor?: RgbaColor;
		showAirports?: boolean;
		airportSize?: number;
	}): void {
		if (showSectors !== undefined) {
			this.firLayer?.setVisible(showSectors);
			this.traconLayer?.setVisible(showSectors);
			this.labelLayer?.setVisible(showSectors);
		}
		if (showAirports !== undefined) {
			this.airportLayer?.setVisible(showAirports);
		}
		if (airportSize) {
			this.styleVars.airportSize = airportSize;
			this.airportLayer?.setStyle(getAirportStyle(this.styleVars));
		}
		if (firColor) {
			this.styleVars.firColor = firColor;
			this.labelLayer?.setStyle(getLabelStyle(this.styleVars));
			this.firLayer?.setStyle(getFirStyle(this.styleVars));
		}
		if (traconColor) {
			this.styleVars.traconColor = traconColor;
			this.labelLayer?.setStyle(getLabelStyle(this.styleVars));
			this.traconLayer?.setStyle(getTraconStyle(this.styleVars));
		}
	}
}
