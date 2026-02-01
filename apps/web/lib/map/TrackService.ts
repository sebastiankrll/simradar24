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

type TrackCache = {
	lastIndex: number;
	lastCoords?: Coordinate;
	lastStroke?: Stroke;
	lastAltitudeAgl?: number;
	animatedTrackFeature?: Feature<LineString>;
};

export class TrackService {
	private source = new VectorSource({
		useSpatialIndex: false,
	});
	private layer: VectorLayer | null = null;

	private map = new Map<string, TrackCache>();

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

	public setFeatures(trackPoints: TrackPoint[], id: string): void {
		if (trackPoints.length === 0) return;

		const trackCache: TrackCache = {
			lastIndex: 0,
		};
		const features: Feature<LineString>[] = [];

		for (trackCache.lastIndex = 0; trackCache.lastIndex < trackPoints.length - 1; trackCache.lastIndex++) {
			const start = trackPoints[trackCache.lastIndex];
			const end = trackPoints[trackCache.lastIndex + 1];

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
			trackFeature.setId(`track_${id}_${trackCache.lastIndex}`);
			features.push(trackFeature);

			if (trackCache.lastIndex === trackPoints.length - 2) {
				trackCache.lastCoords = end.coordinates;
				trackCache.animatedTrackFeature = trackFeature;
				trackCache.lastStroke = stroke;
			}
		}

		this.source.addFeatures(features);
		this.map.set(id, trackCache);
	}

	public updateFeatures(feature: Feature<Point> | null, id: string): void {
		const trackCache = this.map.get(id);
		if (!trackCache) return;

		const coordinates = feature?.getGeometry()?.getCoordinates();
		const lastCoords = trackCache.lastCoords;
		if (!coordinates || !lastCoords) return;

		if (trackCache.animatedTrackFeature) {
			const geom = trackCache.animatedTrackFeature.getGeometry() as LineString;
			const coords = geom.getCoordinates();
			coords[1] = lastCoords;
			geom.setCoordinates(coords);
			trackCache.animatedTrackFeature.setGeometry(geom);
		}

		const props: PilotProperties | undefined = feature?.get("properties");

		const trackFeature = new Feature({
			geometry: new LineString([lastCoords, coordinates]),
			type: "track",
		});
		const stroke = props?.altitude_ms
			? new Stroke({
					color: getTrackPointColor(props.altitude_agl || trackCache.lastAltitudeAgl, props.altitude_ms),
					width: 3,
				})
			: trackCache.lastStroke;

		const style = new Style({ stroke: stroke });
		trackFeature.setStyle(style);
		trackFeature.setId(`track_${id}_${++trackCache.lastIndex}`);

		this.source.addFeature(trackFeature);

		trackCache.lastCoords = coordinates || lastCoords;
		trackCache.lastStroke = stroke;
		trackCache.lastAltitudeAgl = props?.altitude_agl;
		trackCache.animatedTrackFeature = trackFeature;
	}

	public removeFeatures(id: string): void {
		this.source
			.getFeatures()
			.filter((f) => String(f.getId()).startsWith(`track_${id}_`))
			.forEach((f) => void this.source.removeFeature(f));

		this.map.delete(id);
	}

	public animateFeatures(id: string, feature: Feature<Point> | null): void {
		const trackCache = this.map.get(id);
		const pilotCoords = feature?.getGeometry()?.getCoordinates();
		if (!trackCache?.animatedTrackFeature || this.source.getFeatures().length === 0 || !pilotCoords) return;

		const geom = trackCache.animatedTrackFeature.getGeometry() as LineString;
		const coords = geom.getCoordinates();
		coords[1] = pilotCoords;
		geom.setCoordinates(coords);
		trackCache.animatedTrackFeature.setGeometry(geom);
	}

	public setSettings({ show }: { show?: boolean }): void {
		if (show !== undefined) {
			this.layer?.setVisible(show);
		}
	}

	public clearFeatures(): void {
		this.source.clear();
		this.map.clear();
	}
}
