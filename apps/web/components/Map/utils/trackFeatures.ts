import type { PilotDelta } from "@sk/types/vatsim";
import { Feature } from "ol";
import { LineString } from "ol/geom";
import { fromLonLat } from "ol/proj";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import { fetchTrackPoints } from "@/storage/cache";
import { trackSource } from "./dataLayers";

let pilotId: string | null = null;
let lastPoint: [number, number] | null = null;
let currentIndex: number = 0;

export async function initTrackFeatures(id: string | null): Promise<void> {
    if (!id) return;
    const trackPoints = await fetchTrackPoints(id.replace("pilot_", ""));
    const trackFeatures: Feature<LineString>[] = [];

    for (currentIndex = 0; currentIndex < trackPoints.length - 1; currentIndex++) {
        const start = trackPoints[currentIndex];
        const end = trackPoints[currentIndex + 1];

        const trackFeature = new Feature({
            geometry: new LineString(
                [
                    [start.longitude, start.latitude],
                    [end.longitude, end.latitude],
                ].map((coord) => fromLonLat(coord)),
            ),
            type: "track",
        });
        const style = new Style({ stroke: getTrackSegmentColor(end.altitude_agl, end.altitude_ms) });

        trackFeature.setStyle(style);
        trackFeature.setId(`track_${id}_${currentIndex}`);
        trackFeatures.push(trackFeature);

        if (currentIndex === trackPoints.length - 2) {
            lastPoint = [end.longitude, end.latitude];
        }
    }

    trackSource.clear();
    trackSource.addFeatures(trackFeatures);
    pilotId = id;
}

export async function updateTrackFeatures(delta: PilotDelta): Promise<void> {
    if (trackSource.getFeatures().length === 0) return;

    const pilot = delta.updated.find((p) => `pilot_${p.id}` === pilotId);
    if (!pilotId || !pilot) return;

    const trackFeature = new Feature({
        geometry: new LineString([lastPoint ?? [pilot.longitude, pilot.latitude], [pilot.longitude, pilot.latitude]].map((coord) => fromLonLat(coord))),
        type: "track",
    });
    const style = new Style({ stroke: getTrackSegmentColor(pilot.altitude_agl, pilot.altitude_ms) });

    trackFeature.setStyle(style);
    trackFeature.setId(`track_${pilot.id}_${++currentIndex}`);

    trackSource.addFeature(trackFeature);

    lastPoint = [pilot.longitude, pilot.latitude];
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
