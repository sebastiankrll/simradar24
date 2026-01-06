import type { AirportLong } from "@sr24/types/interface";
import { CloudQuantity, Descriptive, type IMetar, Intensity, type IWind, Phenomenon } from "metar-taf-parser";
import { getDelayColorFromNumber } from "@/components/Panel/utils";
import { useSettingsStore } from "@/storage/zustand";
import { convertSpeed, convertTemperature } from "@/utils/helpers";

function getConditions(metar: IMetar): string {
	if (metar.cavok) {
		return "Clear";
	}

	// Check weather phenomena (rain, snow, fog, thunderstorm, etc.)
	const weatherConditions = metar.weatherConditions || [];

	// Thunderstorm check - using Descriptive enum
	if (weatherConditions.some((w) => w.descriptive === Descriptive.THUNDERSTORM)) {
		return "Thunderstorm";
	}

	// Check intensity
	const hasHeavy = weatherConditions.some((w) => w.intensity === Intensity.HEAVY);

	// Precipitation checks - using Phenomenon enum
	const hasRain = weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.RAIN));
	const hasSnow = weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.SNOW));
	const hasDrizzle = weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.DRIZZLE));

	if (hasRain) {
		return hasHeavy ? "Heavy Rain" : "Rain";
	}
	if (hasSnow) {
		return hasHeavy ? "Heavy Snow" : "Snow";
	}
	if (hasDrizzle) {
		return "Drizzle";
	}

	// Fog/Mist checks - using Phenomenon enum
	if (weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.FOG))) {
		return "Fog";
	}
	if (weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.MIST))) {
		return "Mist";
	}

	// Haze/Smoke
	if (weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.HAZE))) {
		return "Hazy";
	}
	if (weatherConditions.some((w) => w.phenomenons?.includes(Phenomenon.SMOKE))) {
		return "Smoky";
	}

	// Cloud coverage checks - using CloudQuantity enum
	const clouds = metar.clouds || [];
	if (clouds.length === 0) {
		return "Clear";
	}

	// Check for overcast or broken clouds
	if (clouds.some((c) => c.quantity === CloudQuantity.OVC)) {
		return "Overcast";
	}
	if (clouds.some((c) => c.quantity === CloudQuantity.BKN)) {
		return "Cloudy";
	}
	if (clouds.some((c) => c.quantity === CloudQuantity.SCT)) {
		return "Partly Cloudy";
	}
	if (clouds.some((c) => c.quantity === CloudQuantity.FEW)) {
		return "Few Clouds";
	}
	if (clouds.some((c) => c.quantity === CloudQuantity.SKC || c.quantity === CloudQuantity.NSC)) {
		return "Clear";
	}

	// Visibility check for poor visibility
	if (metar.visibility && metar.visibility.value < 5000) {
		return "Poor Visibility";
	}

	return "Clear";
}

function getWind(wind: IWind | undefined, windUnit: "knots" | "kmh" | "mph" | "ms"): string {
	if (!wind) {
		return "N/A";
	}

	let factor = 1;

	if (wind.unit === "MPS") {
		factor = 1.94384;
	} else if (wind.unit === "KM/H") {
		factor = 0.539957;
	}

	const speed = convertSpeed(wind.speed * factor, windUnit);
	const gust = convertSpeed((wind.gust || 0) * factor, windUnit);

	let shortUnit = "KT";
	if (windUnit === "kmh") {
		shortUnit = "KMH";
	} else if (windUnit === "mph") {
		shortUnit = "MPH";
	} else if (windUnit === "ms") {
		shortUnit = "MS";
	}

	if (wind.degrees) {
		return `${wind.degrees}° / ${speed}${wind.gust ? `G${gust}` : ""} ${shortUnit}`;
	}
	return `${wind.direction} / ${speed}${wind.gust ? `G${gust}` : ""} ${shortUnit}`;
}

export function AirportStatus({ airport, parsedMetar }: { airport: AirportLong | undefined; parsedMetar: IMetar | null }) {
	const { temperatureUnit, windSpeedUnit } = useSettingsStore();

	const avgDelay = airport ? Math.round((airport.dep_traffic.average_delay + airport.arr_traffic.average_delay) / 2) : 0;

	return (
		<div className="panel-container" id="panel-airport-status">
			{parsedMetar && (
				<div id="panel-airport-status-weather">
					<div className="panel-airport-status-item">
						<p>Condition</p>
						<p>{getConditions(parsedMetar)}</p>
					</div>
					<div className="panel-airport-status-item">
						<p>Temp.</p>
						<p>{convertTemperature(parsedMetar.temperature, temperatureUnit)}</p>
					</div>
					<div className="panel-airport-status-item">
						<p>Wind</p>
						<p>{getWind(parsedMetar.wind, windSpeedUnit)}</p>
					</div>
				</div>
			)}
			<div id="panel-airport-status-flights">
				<div className="panel-airport-status-item">
					<p>Departures</p>
					<p>{airport?.dep_traffic.traffic_count || 0}</p>
				</div>
				<div className="panel-airport-status-item">
					<p>Arrivals</p>
					<p>{airport?.arr_traffic.traffic_count || 0}</p>
				</div>
				<div className="panel-airport-status-item">
					<p>Avg. Delay</p>
					<p>
						<span className={`delay-indicator ${getDelayColorFromNumber(avgDelay) ?? ""}`}></span>
						{`${avgDelay} min`}
					</p>
				</div>
			</div>
		</div>
	);
}
