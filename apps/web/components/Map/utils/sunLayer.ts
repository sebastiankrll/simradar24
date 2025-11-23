import { Feature } from "ol";
import { MultiPolygon } from "ol/geom";
import { circular } from "ol/geom/Polygon";
import WebGLVectorLayer from "ol/layer/WebGLVector";
import VectorSource from "ol/source/Vector";

const sunSource = new VectorSource({
	wrapX: false,
});
const sunLayer = new WebGLVectorLayer({
	source: sunSource,
	style: {
		"fill-color": [77, 95, 131, 0.07],
	},
	properties: {
		type: "sun",
	},
});

let sunInterval: NodeJS.Timeout;

export function initSunLayer(): WebGLVectorLayer {
	clearInterval(sunInterval);

	sunInterval = setInterval(() => {
		updateSunFeatures();
	}, 30000);

	updateSunFeatures();

	return sunLayer;
}

function updateSunFeatures(): void {
	const angles = [0.566666, 6, 12, 18];
	const center = getShadowPosition(new Date());

	const newFeatures = angles.map((angle) => {
		const radius = getShadowRadiusFromAngle(angle);
		const polygon = createCircularPolygon(center, radius);

		return new Feature(polygon.transform("EPSG:4326", "EPSG:3857"));
	});

	sunSource.clear();
	sunSource.addFeatures(newFeatures);
}

function createCircularPolygon(center: number[], radius: number): MultiPolygon {
	const polygon = circular(center, radius, 128);
	const coords = polygon.getCoordinates()[0];

	const shift = coords.map(([lon, lat]) => {
		if (center[0] > 0) {
			lon -= 360;
		}
		if (center[0] < 0) {
			lon += 360;
		}

		return [lon, lat];
	});

	return new MultiPolygon([[coords], [shift]]);
}

function getShadowRadiusFromAngle(angle: number): number {
	const shadow_radius = 6371008 * Math.PI * 0.5;
	const twilight_dist = ((6371008 * 2 * Math.PI) / 360) * angle;

	return shadow_radius - twilight_dist;
}

function getShadowPosition(time: Date): number[] {
	const sunPosition = calculateSunPosition(time);

	return [sunPosition[0] + 180, -sunPosition[1]];
}

function calculateSunPosition(time: Date): number[] {
	const rad = 0.017453292519943295;

	const ms_past_midnight = ((time.getUTCHours() * 60 + time.getUTCMinutes()) * 60 + time.getUTCSeconds()) * 1000 + time.getUTCMilliseconds();
	const jc = (time.getTime() / 86400000.0 + 2440587.5 - 2451545) / 36525;
	const mean_long_sun = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
	const mean_anom_sun = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
	const sun_eq =
		Math.sin(rad * mean_anom_sun) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
		Math.sin(rad * 2 * mean_anom_sun) * (0.019993 - 0.000101 * jc) +
		Math.sin(rad * 3 * mean_anom_sun) * 0.000289;
	const sun_true_long = mean_long_sun + sun_eq;
	const sun_app_long = sun_true_long - 0.00569 - 0.00478 * Math.sin(rad * 125.04 - 1934.136 * jc);
	const mean_obliq_ecliptic = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
	const obliq_corr = mean_obliq_ecliptic + 0.00256 * Math.cos(rad * 125.04 - 1934.136 * jc);

	const lat = Math.asin(Math.sin(rad * obliq_corr) * Math.sin(rad * sun_app_long)) / rad;

	const eccent = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
	const y = Math.tan(rad * (obliq_corr / 2)) * Math.tan(rad * (obliq_corr / 2));
	const rq_of_time =
		4 *
		((y * Math.sin(2 * rad * mean_long_sun) -
			2 * eccent * Math.sin(rad * mean_anom_sun) +
			4 * eccent * y * Math.sin(rad * mean_anom_sun) * Math.cos(2 * rad * mean_long_sun) -
			0.5 * y * y * Math.sin(4 * rad * mean_long_sun) -
			1.25 * eccent * eccent * Math.sin(2 * rad * mean_anom_sun)) /
			rad);
	const true_solar_time_in_deg = ((ms_past_midnight + rq_of_time * 60000) % 86400000) / 240000;

	const lon = -(true_solar_time_in_deg < 0 ? true_solar_time_in_deg + 180 : true_solar_time_in_deg - 180);

	return [lon, lat];
}
