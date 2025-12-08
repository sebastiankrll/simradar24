import type { PilotDelta } from "@sr24/types/vatsim";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import { fromLonLat } from "ol/proj";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { fetchTrackPoints } from "@/storage/cache";
import { trackSource } from "./dataLayers";

interface Cached {
	id: string | null;
	coords: [number, number];
	index: number;
	stroke?: Stroke;
}

const cached: Cached = {
	id: null,
	coords: [0, 0],
	index: -1,
};

export async function initTrackFeatures(id: string | null): Promise<void> {
	if (!id) return;
	const trackPoints = await fetchTrackPoints(id.replace("pilot_", ""));
	const trackFeatures: Feature<LineString>[] = [];

	for (cached.index = 0; cached.index < trackPoints.length - 1; cached.index++) {
		const start = trackPoints[cached.index];
		const end = trackPoints[cached.index + 1];

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
		trackFeature.setId(`track_${id}_${cached.index}`);
		trackFeatures.push(trackFeature);

		if (cached.index === trackPoints.length - 2) {
			cached.coords = [end.longitude, end.latitude];
			cached.stroke = stroke;
		}
	}

	trackSource.clear();
	trackSource.addFeatures(trackFeatures);
	cached.id = id;
}

export async function updateTrackFeatures(delta: PilotDelta): Promise<void> {
	if (trackSource.getFeatures().length === 0) return;

	const pilot = delta.updated.find((p) => `pilot_${p.id}` === cached.id);
	if (!cached.id || !pilot) return;
	if (pilot.latitude === undefined || pilot.longitude === undefined) return;

	const trackFeature = new Feature({
		geometry: new LineString([cached.coords, [pilot.longitude, pilot.latitude]].map((coord) => fromLonLat(coord))),
		type: "track",
	});

	const stroke =
		pilot.altitude_agl !== undefined && pilot.altitude_ms !== undefined ? getTrackSegmentColor(pilot.altitude_agl, pilot.altitude_ms) : cached.stroke;
	const style = new Style({ stroke: stroke });

	trackFeature.setStyle(style);
	trackFeature.setId(`track_${pilot.id}_${++cached.index}`);

	trackSource.addFeature(trackFeature);

	cached.coords = [pilot.longitude, pilot.latitude];
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
