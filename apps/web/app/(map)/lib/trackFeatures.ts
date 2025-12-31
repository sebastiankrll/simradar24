import type { PilotDelta } from "@sr24/types/interface";
import { Feature } from "ol";
import type { Coordinate } from "ol/coordinate";
import { LineString, type Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { fetchTrackPoints } from "@/storage/cache";
import { pilotMainSource, trackSource } from "./dataLayers";

const STALE_MS = 60 * 1000;

let pilotId: string | null = null;
let lastIndex = 0;
let lastCoords: Coordinate = [0, 0];
let lastStroke: Stroke | undefined;
let lastTimestamp = 0;
let animatedTrackFeature: Feature<LineString> | null = null;
let pilotFeature: Feature<Point> | null = null;

export async function initTrackFeatures(id: string | null): Promise<void> {
	if (!id) return;
	const trackPoints = await fetchTrackPoints(id.replace("pilot_", ""));
	const trackFeatures: Feature<LineString>[] = [];

	for (lastIndex = 0; lastIndex < trackPoints.length - 1; lastIndex++) {
		const start = trackPoints[lastIndex];
		const end = trackPoints[lastIndex + 1];

		const trackFeature = new Feature({
			geometry: new LineString(
				[
					[start.longitude, start.latitude],
					[end.longitude, end.latitude],
				].map((coord) => fromLonLat(coord)),
			),
			type: "track",
		});
		const stroke = getTrackSegmentColor(end.altitude_agl, end.altitude_ms);
		const style = new Style({ stroke: stroke });

		trackFeature.setStyle(style);
		trackFeature.setId(`track_${id}_${lastIndex}`);
		trackFeatures.push(trackFeature);

		if (lastIndex === trackPoints.length - 2) {
			lastCoords = fromLonLat([end.longitude, end.latitude]);
			lastStroke = stroke;
			animatedTrackFeature = trackFeature;
		}
	}

	trackSource.clear();
	trackSource.addFeatures(trackFeatures);

	pilotId = id;
	pilotFeature = pilotMainSource.getFeatureById(id) as Feature<Point>;
	lastTimestamp = Date.now();
}

export async function updateTrackFeatures(delta: PilotDelta): Promise<void> {
	if (trackSource.getFeatures().length === 0) return;

	const pilot = delta.updated.find((p) => `pilot_${p.id}` === pilotId);
	if (!pilotId || !pilot) return;
	if (pilot.latitude === undefined || pilot.longitude === undefined) return;

	if (Date.now() - (lastTimestamp || 0) > STALE_MS) {
		await initTrackFeatures(pilotId);
		return;
	}

	if (animatedTrackFeature) {
		const geom = animatedTrackFeature.getGeometry() as LineString;
		const coords = geom.getCoordinates();
		coords[1] = lastCoords;
		geom.setCoordinates(coords);
		animatedTrackFeature.setGeometry(geom);
	}

	const trackFeature = new Feature({
		geometry: new LineString([lastCoords, fromLonLat([pilot.longitude, pilot.latitude])]),
		type: "track",
	});

	const stroke =
		pilot.altitude_agl !== undefined && pilot.altitude_ms !== undefined ? getTrackSegmentColor(pilot.altitude_agl, pilot.altitude_ms) : lastStroke;
	const style = new Style({ stroke: stroke });

	trackFeature.setStyle(style);
	trackFeature.setId(`track_${pilot.id}_${++lastIndex}`);

	trackSource.addFeature(trackFeature);

	lastCoords = fromLonLat([pilot.longitude, pilot.latitude]);
	lastStroke = stroke;
	pilotFeature = pilotMainSource.getFeatureById(`pilot_${pilot.id}`) as Feature<Point>;
	lastTimestamp = Date.now();
	animatedTrackFeature = trackFeature;
}

function getTrackSegmentColor(altitude_agl: number, altitude_ms: number): Stroke {
	if (altitude_agl < 50) {
		return new Stroke({
			color: "rgb(77, 95, 131)",
			width: 3,
		});
	}

	const degrees = (300 / 50000) * altitude_ms + 60;
	const colorSectors = [
		{ color: "red", angle: 0, rgb: [255, 0, 0] },
		{ color: "yellow", angle: 60, rgb: [255, 255, 0] },
		{ color: "green", angle: 120, rgb: [0, 255, 0] },
		{ color: "cyan", angle: 180, rgb: [0, 255, 255] },
		{ color: "blue", angle: 240, rgb: [0, 0, 255] },
		{ color: "magenta", angle: 300, rgb: [255, 0, 255] },
		{ color: "red", angle: 360, rgb: [255, 0, 0] },
	];

	let lowerBoundIndex = 0;
	for (let i = 0; i < colorSectors.length; i++) {
		if (degrees < colorSectors[i].angle) {
			lowerBoundIndex = i - 1;
			break;
		}
	}

	const lowerBound = colorSectors[lowerBoundIndex];
	const upperBound = colorSectors[lowerBoundIndex + 1];
	const interpolationFactor = (degrees - lowerBound.angle) / (upperBound.angle - lowerBound.angle);

	const resultRGB = [];
	for (let i = 0; i < 3; i++) {
		resultRGB[i] = Math.round(lowerBound.rgb[i] + interpolationFactor * (upperBound.rgb[i] - lowerBound.rgb[i]));
	}

	return new Stroke({
		color: `rgb(${resultRGB[0]}, ${resultRGB[1]}, ${resultRGB[2]})`,
		width: 3,
	});
}

export function animateTrackFeatures(): void {
	if (!animatedTrackFeature || !pilotFeature || trackSource.getFeatures().length === 0) return;

	const pilotCoords = pilotFeature.getGeometry()?.getCoordinates();
	if (!pilotCoords) return;

	const geom = animatedTrackFeature.getGeometry() as LineString;
	const coords = geom.getCoordinates();
	coords[1] = pilotCoords;
	geom.setCoordinates(coords);
	animatedTrackFeature.setGeometry(geom);
}
