import type { IAltimeter, IMetar, Visibility } from "metar-taf-parser";
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
				<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
					<title>Weather</title>
					<path
						fillRule="evenodd"
						d="M21.737 13.539c.061-.308.061-.554.061-.862 0-3.57-2.861-6.462-6.393-6.462-.852 0-1.644.185-2.375.493-.852-1.17-2.192-1.908-3.653-1.908-2.436 0-4.445 2.03-4.445 4.492 0 1.231.487 2.4 1.4 3.262-.852.8-1.4 1.907-1.4 3.138 0 2.339 1.888 4.247 4.201 4.247h1.34c.365 0 .609-.247.609-.616 0-.37-.244-.615-.61-.615H9.134c-1.644 0-2.983-1.354-2.983-3.016 0-1.6 1.278-2.892 2.8-3.015v.062c0 .43.062.922.122 1.353a.596.596 0 0 0 .61.493h.121a.64.64 0 0 0 .487-.739c-.06-.492-.06-.861-.06-1.17 0-2.891 2.313-5.23 5.175-5.23s5.176 2.339 5.176 5.23c0 .247 0 .493-.061.74-.914.123-1.705.615-2.253 1.353-.183.308-.122.677.122.862.243.184.67.123.852-.123a1.91 1.91 0 0 1 1.583-.862c1.096 0 1.948.923 1.948 1.97s-.791 1.969-1.887 1.969h-1.888c-.365 0-.608.246-.608.615 0 .37.243.615.608.615h1.827c1.766 0 3.166-1.415 3.166-3.2.122-1.476-.913-2.707-2.253-3.076ZM9.133 11.385c-.609 0-1.217.123-1.705.369-.73-.615-1.217-1.539-1.217-2.523 0-1.785 1.461-3.262 3.227-3.262.974 0 1.948.493 2.557 1.231-1.461.923-2.496 2.4-2.862 4.185m6.394 3.385c-.183-.309-.548-.431-.792-.247-.304.185-.426.554-.243.8l1.583 3.015h-2.618a.64.64 0 0 0-.549.308.56.56 0 0 0 0 .616l2.314 4.43a.64.64 0 0 0 .548.308c.122 0 .183 0 .305-.061.304-.185.426-.554.243-.862l-1.826-3.508h2.618a.72.72 0 0 0 .548-.307.56.56 0 0 0 0-.616zm-1.34-9.785a.55.55 0 0 0 .426-.185l1.34-1.354a.6.6 0 0 0 0-.861.584.584 0 0 0-.852 0l-1.34 1.353a.6.6 0 0 0 0 .862.55.55 0 0 0 .426.185M9.438 2.892c.365 0 .609-.246.609-.615V.615c0-.369-.244-.615-.61-.615-.365 0-.608.246-.608.615v1.723c0 .308.243.554.609.554M4.932 3.938 3.532 2.4a.584.584 0 0 0-.853 0 .664.664 0 0 0-.06.862l1.4 1.538a.69.69 0 0 0 .487.185.65.65 0 0 0 .426-.185c.183-.246.244-.615 0-.862M3.349 9.23c0-.368-.244-.615-.609-.615H.609c-.365 0-.609.247-.609.616s.244.615.609.615H2.74c.304 0 .609-.308.609-.615Zm.243 4.924-1.217 1.23a.6.6 0 0 0 0 .862.55.55 0 0 0 .426.185.55.55 0 0 0 .426-.185l1.218-1.23a.6.6 0 0 0 0-.862.584.584 0 0 0-.853 0"
						clipRule="evenodd"
					></path>
				</svg>
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
					<p>Last updated</p>
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
