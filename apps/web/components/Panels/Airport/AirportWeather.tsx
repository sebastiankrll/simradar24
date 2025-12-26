import type { IAltimeter, IMetar, Visibility } from "metar-taf-parser";
import Icon from "@/components/shared/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import { convertAltitude, convertTemperature, convertTime } from "@/utils/helpers";

function getAltimeter(altimeter: IAltimeter | undefined): string {
	if (!altimeter) {
		return "N/A";
	}
	const unit = altimeter.unit || "inHg";
	return `${altimeter.value} ${unit}`;
}

function getHumidity(parsedMetar: IMetar | null): string {
	if (!parsedMetar || parsedMetar.temperature === undefined || parsedMetar.dewPoint === undefined) {
		return "N/A";
	}
	const humidity =
		100 *
		(Math.exp((17.625 * parsedMetar.dewPoint) / (243.04 + parsedMetar.dewPoint)) /
			Math.exp((17.625 * parsedMetar.temperature) / (243.04 + parsedMetar.temperature)));

	return `${humidity.toFixed(0)} %`;
}

function getVisibility(visibility: Visibility | undefined): string {
	if (!visibility) {
		return "N/A";
	}
	return `${visibility.value >= 9999 ? ">9999" : visibility.value} ${visibility.unit || "m"}`;
}

function getClouds(parsedMetar: IMetar | null, altitudeUnit: "feet" | "meters"): string {
	if (!parsedMetar || !parsedMetar.clouds || parsedMetar.clouds.length === 0) {
		return "N/A";
	}

	const quantityPriority: Record<string, number> = {
		OVC: 4,
		BKN: 3,
		SCT: 2,
		FEW: 1,
		SKC: 0,
		NSC: 0,
	};

	const maxCloud = parsedMetar.clouds.reduce((max, cloud) => {
		const currentPriority = quantityPriority[cloud.quantity] || 0;
		const maxPriority = quantityPriority[max.quantity] || 0;
		return currentPriority > maxPriority ? cloud : max;
	}, parsedMetar.clouds[0]);

	if (!maxCloud || !maxCloud.height) {
		return "N/A";
	}

	return `${maxCloud.quantity} @ ${convertAltitude(maxCloud.height, altitudeUnit)}`;
}

function getLastUpdated(parsedMetar: IMetar | null, timeFormat: "24h" | "12h", timeZone: "local" | "utc"): string {
	if (!parsedMetar || !parsedMetar.hour || !parsedMetar.minute) {
		return "N/A";
	}
	return convertTime(new Date().setUTCHours(parsedMetar.hour, parsedMetar.minute, 0, 0), timeFormat, timeZone);
}

export function AirportWeather({
	parsedMetar,
	metar,
	taf,
	openSection,
	ref,
}: {
	parsedMetar: IMetar | null;
	metar: string | undefined;
	taf: string | undefined;
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const { temperatureUnit, altitudeUnit, timeFormat, timeZone } = useSettingsStore();

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "weather" ? " open" : ""}`}>
			<div className="panel-section-title">
				<Icon name="cloud" size={24} />
			</div>
			<div className="panel-section-content" id="panel-airport-weather">
				<div className="panel-data-item">
					<p>Altimeter</p>
					<p>{getAltimeter(parsedMetar?.altimeter)}</p>
				</div>
				<div className="panel-data-item">
					<p>Dew point</p>
					<p>{convertTemperature(parsedMetar?.dewPoint, temperatureUnit)}</p>
				</div>
				<div className="panel-data-item">
					<p>Humidity</p>
					<p>{getHumidity(parsedMetar)}</p>
				</div>
				<div className="panel-data-item">
					<p>Visibility</p>
					<p>{getVisibility(parsedMetar?.visibility)}</p>
				</div>
				<div className="panel-data-item">
					<p>Clouds</p>
					<p>{getClouds(parsedMetar, altitudeUnit)}</p>
				</div>
				<div className="panel-data-item">
					<p>Updated</p>
					<p>{getLastUpdated(parsedMetar, timeFormat, timeZone)}</p>
				</div>
				<div className="panel-data-item">
					<p>Remarks</p>
					<p>{parsedMetar?.remark || "N/A"}</p>
				</div>
				<div className="panel-data-item">
					<p>Latest METAR</p>
					<p>{metar || "N/A"}</p>
				</div>
				<div className="panel-data-item">
					<p>Latest TAF</p>
					<p>{taf || "N/A"}</p>
				</div>
			</div>
		</div>
	);
}
