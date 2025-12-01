import type { AirportLong } from "@sk/types/vatsim";
import { CloudQuantity, Descriptive, type IMetar, Intensity, type IWind, Phenomenon } from "metar-taf-parser";

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

function getTemperature(temp: number | undefined): string {
	if (!temp) {
		return "N/A";
	}
	return `${temp} °C`;
}

function getWind(wind: IWind | undefined): string {
	if (!wind) {
		return "N/A";
	}
	const unit = wind.unit || "KT";
	if (wind.degrees) {
		return `${wind.degrees}° / ${wind.speed}${wind.gust ? `G${wind.gust}` : ""} ${unit}`;
	}
	return `${wind.direction} / ${wind.speed}${wind.gust ? `G${wind.gust}` : ""} ${unit}`;
}

export function getDelayColor(avgDelay: number) {
	if (avgDelay >= 60) {
		return "red";
	} else if (avgDelay >= 30) {
		return "yellow";
	} else if (avgDelay > 0) {
		return "green";
	}
	return "green";
}

export function AirportStatus({ airport, parsedMetar }: { airport: AirportLong; parsedMetar: IMetar | null }) {
	const avgDelay = Math.round((airport.dep_traffic.average_delay + airport.arr_traffic.average_delay) / 2);

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
						<p>{getTemperature(parsedMetar.temperature)}</p>
					</div>
					<div className="panel-airport-status-item">
						<p>Wind</p>
						<p>{getWind(parsedMetar.wind)}</p>
					</div>
				</div>
			)}
			<div id="panel-airport-status-flights">
				<div className="panel-airport-status-item">
					<p>Departures</p>
					<p>{airport.dep_traffic.traffic_count}</p>
				</div>
				<div className="panel-airport-status-item">
					<p>Arrivals</p>
					<p>{airport.arr_traffic.traffic_count}</p>
				</div>
				<div className="panel-airport-status-item">
					<p>Avg. Delay</p>
					<p className={getDelayColor(avgDelay)}>{`${avgDelay} min`}</p>
				</div>
			</div>
		</div>
	);
}
