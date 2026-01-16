import type { TrackPoint } from "@sr24/types/interface";
import { Feature } from "ol";
import type { Coordinate } from "ol/coordinate";
import { LineString, type Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import type { PilotProperties } from "@/types/ol";
import { getStroke, getTrackPointColor } from "./tracks";

export class TrackService {
	private source = new VectorSource({
		useSpatialIndex: false,
	});
	private layer: VectorLayer | null = null;

	public pilotId: string | null = null;

	private lastIndex = 0;
	private lastCoords: Coordinate = [0, 0];
	private lastStroke: Stroke | undefined;
	private lastAltitudeAgl: number | undefined;
	private animatedTrackFeature: Feature<LineString> | null = null;

	public init(): VectorLayer {
		this.layer = new VectorLayer({
			source: this.source,
			properties: {
				type: "track",
			},
			zIndex: 3,
		});
		return this.layer;
	}

	public setFeatures(trackPoints: TrackPoint[], id?: string): void {
		this.source.clear();
		if (trackPoints.length === 0 || !id) return;

		const trackFeatures: Feature<LineString>[] = [];

		for (this.lastIndex = 0; this.lastIndex < trackPoints.length - 1; this.lastIndex++) {
			const start = trackPoints[this.lastIndex];
			const end = trackPoints[this.lastIndex + 1];

			const trackFeature = new Feature({
				geometry: new LineString([start.coordinates, end.coordinates]),
				type: "track",
			});
			const stroke = getStroke(start, end);

			trackFeature.setStyle(
				new Style({
					stroke: stroke,
				}),
			);
			trackFeature.setId(`track_${this.lastIndex}`);
			trackFeatures.push(trackFeature);

			if (this.lastIndex === trackPoints.length - 2) {
				this.lastCoords = end.coordinates;
				this.animatedTrackFeature = trackFeature;
				this.lastStroke = stroke;
			}
		}

		this.source.addFeatures(trackFeatures);

		this.pilotId = id;
	}

	public updateFeatures(feature: Feature<Point> | null): void {
		const type = feature?.get("type");
		if (this.source.getFeatures().length === 0 || type !== "pilot") return;

		const coordinates = feature?.getGeometry()?.getCoordinates();
		if (!coordinates) return;

		if (this.animatedTrackFeature) {
			const geom = this.animatedTrackFeature.getGeometry() as LineString;
			const coords = geom.getCoordinates();
			coords[1] = this.lastCoords;
			geom.setCoordinates(coords);
			this.animatedTrackFeature.setGeometry(geom);
		}

		const props: PilotProperties | undefined = feature?.get("properties");

		const trackFeature = new Feature({
			geometry: new LineString([this.lastCoords, coordinates]),
			type: "track",
		});
		const stroke = props?.altitude_ms
			? new Stroke({
					color: getTrackPointColor(props.altitude_agl || this.lastAltitudeAgl, props.altitude_ms),
					width: 3,
				})
			: this.lastStroke;

		const style = new Style({ stroke: stroke });
		trackFeature.setStyle(style);
		trackFeature.setId(`track_${this.pilotId}_${++this.lastIndex}`);
		this.source.addFeature(trackFeature);

		this.lastCoords = props?.coordinates || this.lastCoords;
		this.lastStroke = stroke;
		this.lastAltitudeAgl = props?.altitude_agl;
		this.animatedTrackFeature = trackFeature;
	}

	public animateFeatures(feature: Feature<Point> | null): void {
		const type = feature?.get("type");
		const pilotCoords = feature?.getGeometry()?.getCoordinates();
		if (!this.animatedTrackFeature || this.source.getFeatures().length === 0 || !pilotCoords || type !== "pilot") return;

		const geom = this.animatedTrackFeature.getGeometry() as LineString;
		const coords = geom.getCoordinates();
		coords[1] = pilotCoords;
		geom.setCoordinates(coords);
		this.animatedTrackFeature.setGeometry(geom);
	}

	public setSettings({ show }: { show?: boolean }): void {
		if (show !== undefined) {
			this.layer?.setVisible(show);
		}
	}
}
