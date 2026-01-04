import type { PilotDelta } from "@sr24/types/interface";
import { Feature } from "ol";
import type { Coordinate } from "ol/coordinate";
import { LineString, type Point } from "ol/geom";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { fetchTrackPoints } from "@/storage/cache";
import { pilotMainSource, trackSource } from "./dataLayers";

let pilotId: string | null = null;
let lastIndex = 0;
let lastCoords: Coordinate = [0, 0];
let lastStroke: Stroke | undefined;
let lastAltitudeAgl: number | undefined;
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
			geometry: new LineString([start.coordinates, end.coordinates]),
			type: "track",
		});
		const stroke = new Stroke({
			color: start.color,
			width: 3,
		});

		trackFeature.setStyle(
			new Style({
				stroke: stroke,
			}),
		);
		trackFeature.setId(`track_${id}_${lastIndex}`);
		trackFeatures.push(trackFeature);

		if (lastIndex === trackPoints.length - 2) {
			lastCoords = end.coordinates;
			animatedTrackFeature = trackFeature;
			lastStroke = stroke;
		}
	}

	trackSource.clear();
	trackSource.addFeatures(trackFeatures);

	pilotId = id;
	pilotFeature = pilotMainSource.getFeatureById(id) as Feature<Point>;
}

export async function updateTrackFeatures(delta: PilotDelta): Promise<void> {
	if (trackSource.getFeatures().length === 0) return;

	const pilot = delta.updated.find((p) => `pilot_${p.id}` === pilotId);
	if (!pilotId || !pilot) return;
	if (!pilot.coordinates) return;

	if (animatedTrackFeature) {
		const geom = animatedTrackFeature.getGeometry() as LineString;
		const coords = geom.getCoordinates();
		coords[1] = lastCoords;
		geom.setCoordinates(coords);
		animatedTrackFeature.setGeometry(geom);
	}

	const trackFeature = new Feature({
		geometry: new LineString([lastCoords, pilot.coordinates]),
		type: "track",
	});
	const stroke = pilot.altitude_ms
		? new Stroke({
				color: getTrackPointColor(pilot.altitude_agl || lastAltitudeAgl, pilot.altitude_ms),
				width: 3,
			})
		: lastStroke;

	const style = new Style({ stroke: stroke });
	trackFeature.setStyle(style);
	trackFeature.setId(`track_${pilot.id}_${++lastIndex}`);
	trackSource.addFeature(trackFeature);

	lastCoords = pilot.coordinates;
	lastStroke = stroke;
	lastAltitudeAgl = pilot.altitude_agl;
	pilotFeature = pilotMainSource.getFeatureById(`pilot_${pilot.id}`) as Feature<Point>;
	animatedTrackFeature = trackFeature;
}

function getTrackPointColor(altitude_agl: number | undefined, altitude_ms: number): string {
	if (altitude_agl !== undefined && altitude_agl < 50) {
		return "#4d5f83";
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
	const hexString = `#${resultRGB.map((c) => c.toString(16).padStart(2, "0")).join("")}`;

	return hexString;
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
