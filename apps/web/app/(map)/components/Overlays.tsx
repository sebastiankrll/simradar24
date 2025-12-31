import type { Feature } from "ol";
import "./Overlays.css";
import type { FIRFeature, SimAwareTraconFeature, StaticAirline, StaticAirport } from "@sr24/types/db";
import type { AirportShort, ControllerMerged, ControllerShort } from "@sr24/types/interface";
import type { Point } from "ol/geom";
import { useState } from "react";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";
import Icon, { getAirlineIcon } from "@/components/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import type { PilotProperties } from "@/types/ol";
import { convertAltitude, convertSpeed, convertVerticalSpeed } from "@/utils/helpers";

export function PilotOverlay({ feature, airline }: { feature: Feature<Point>; airline: StaticAirline | null }) {
	const { planeOverlay, altitudeUnit, verticalSpeedUnit, speedUnit } = useSettingsStore();

	const data = feature.getProperties() as PilotProperties;

	let hdg = String(data.heading);
	if (hdg.length === 1) {
		hdg = `00${hdg}`;
	}
	if (hdg.length === 2) {
		hdg = `0${hdg}`;
	}

	return (
		<div className="overlay-wrapper">
			{planeOverlay === "full" && (
				<div className="overlay-live pilot">
					<div className="overlay-live-item">
						<span>ALT</span>
						{convertAltitude(Math.round(data.altitude_ms / 250) * 250, altitudeUnit, false)}
					</div>
					<div className="overlay-live-item">
						<span>FPM</span>
						{convertVerticalSpeed(Math.round(data.vertical_speed / 50) * 50, verticalSpeedUnit, false)}
					</div>
					<div className="overlay-live-item">
						<span>GS</span>
						{convertSpeed(data.groundspeed, speedUnit, false)}
					</div>
					<div className="overlay-live-item">
						<span>HDG</span>
						{hdg}
					</div>
				</div>
			)}
			{planeOverlay !== "callsign" && (
				<div className="overlay-main-wrapper">
					<div className="overlay-icon" style={{ backgroundColor: airline?.color?.[0] ?? "" }}>
						{getAirlineIcon(airline)}
					</div>
					<div className="overlay-title">
						<p>{data.callsign}</p>
						<p>{data.route.replace(" ", " \u002d ")}</p>
					</div>
					<div className="overlay-misc">
						<div className="overlay-pilot-ac-type">{data.aircraft}</div>
						<div className="overlay-pilot-frequency">{(data.frequency / 1000).toFixed(3)}</div>
					</div>
				</div>
			)}
			{planeOverlay === "callsign" && <div className="overlay-main-wrapper minimal">{data.callsign}</div>}
			<div className="overlay-anchor"></div>
		</div>
	);
}

export function getControllerColor(facility: number): string {
	switch (facility) {
		case -1:
			return "rgb(255, 138, 43)";
		case 2:
			return "rgb(60, 177, 255)";
		case 3:
			return "rgb(11, 211, 167)";
		case 4:
			return "rgb(234, 89, 121)";
		case 5:
			return "rgb(222, 89, 234)";
		case 6:
			return "rgb(77, 95, 131)";
		default:
			return "rgb(255, 138, 43)";
	}
}

function copyControllerAtisToClipboard(controller: ControllerShort | undefined) {
	const atis = controller?.atis?.join("\n") || "";
	navigator.clipboard.writeText(atis);
}

export function AirportOverlay({
	cached,
	short,
	merged,
}: {
	cached: StaticAirport | null;
	short: Required<AirportShort> | null;
	merged: ControllerMerged | null;
}) {
	const [hoveredController, setHoveredController] = useState(null as string | null);
	const [clickedController, setClickedController] = useState(null as string | null);
	const [copied, setCopied] = useState<string | null>(null);

	const controllers = merged?.controllers as Required<ControllerShort>[] | undefined;
	const sortedControllers = controllers?.sort((a, b) => b.facility - a.facility);

	const handleCopyClick = () => {
		copyControllerAtisToClipboard(sortedControllers?.find((c) => c.callsign === hoveredController));
		setCopied(hoveredController);
		setTimeout(() => setCopied(null), 2000);
	};

	return (
		<div className="overlay-wrapper">
			{(clickedController || hoveredController) && (
				<div className="overlay-atis">
					<div className="overlay-atis-item">
						{sortedControllers?.find((c) => c.callsign === clickedController || c.callsign === hoveredController)?.atis?.join("\n") ||
							"Currently unavailable"}
					</div>
				</div>
			)}
			{sortedControllers && sortedControllers.length > 0 && (
				<div className="overlay-live controller" onPointerLeave={() => setHoveredController(null)}>
					{sortedControllers?.map((c) => {
						return (
							<div
								key={c.callsign}
								className={`overlay-live-item controller${clickedController === c.callsign ? " active" : ""}`}
								onPointerEnter={() => setHoveredController(c.callsign)}
								onClick={() => setClickedController(c.callsign)}
							>
								<div className="overlay-controller-color" style={{ backgroundColor: getControllerColor(c.facility) }}></div>
								<div className="overlay-controller-callsign">{c.callsign}</div>
								<div className="overlay-controller-frequency">{(c.frequency / 1000).toFixed(3)}</div>
								<Icon name="groups" size={16} />
								<div className="overlay-controller-connections">{c.connections}</div>
								<button type="button" className="overlay-controller-save" onClick={handleCopyClick}>
									{copied === c.callsign ? <Icon name="select" size={20} /> : <Icon name="copy" size={14} />}
								</button>
							</div>
						);
					})}
				</div>
			)}
			<div className="overlay-main-wrapper">
				<div className="overlay-icon flag">
					<div className={`fflag ff-lg fflag-${cached?.country}`} style={{ backgroundImage: `url(${FlagSprite.src})` }}></div>
				</div>
				<div className="overlay-title">
					<p>{cached?.name || "N/A"}</p>
					<p>{`${cached?.id || "N/A"} / ${cached?.iata || "N/A"}`}</p>
				</div>
				<div className="overlay-misc">
					<div className="overlay-airport-traffic">
						<Icon name="departure" size={18} />
						<p>{short?.dep_traffic.traffic_count || 0}</p>
					</div>
					<div className="overlay-airport-traffic">
						<Icon name="arrival" size={18} />
						<p>{short?.arr_traffic.traffic_count || 0}</p>
					</div>
				</div>
			</div>
			<div className="overlay-anchor"></div>
		</div>
	);
}

export function SectorOverlay({ cached, merged }: { cached: SimAwareTraconFeature | FIRFeature | null; merged: ControllerMerged | null }) {
	const [hoveredController, setHoveredController] = useState(null as string | null);
	const [clickedController, setClickedController] = useState(null as string | null);
	const [copied, setCopied] = useState<string | null>(null);

	const controllers = merged?.controllers as Required<ControllerShort>[] | undefined;

	const handleCopyClick = () => {
		copyControllerAtisToClipboard(controllers?.find((c) => c.callsign === hoveredController));
		setCopied(hoveredController);
		setTimeout(() => setCopied(null), 2000);
	};

	return (
		<div className="overlay-wrapper">
			{(clickedController || hoveredController) && (
				<div className="overlay-atis">
					<div className="overlay-atis-item">
						{controllers?.find((c) => c.callsign === clickedController || c.callsign === hoveredController)?.atis?.join("\n") ||
							"Currently unavailable"}
					</div>
				</div>
			)}
			{controllers && controllers.length > 0 && (
				<div className="overlay-live controller" onPointerLeave={() => setHoveredController(null)}>
					{controllers?.map((c) => {
						return (
							<div
								key={c.callsign}
								className={`overlay-live-item controller${clickedController === c.callsign ? " active" : ""}`}
								onPointerEnter={() => setHoveredController(c.callsign)}
								onClick={() => setClickedController(c.callsign)}
							>
								<div className="overlay-controller-color" style={{ backgroundColor: getControllerColor(c.facility) }}></div>
								<div className="overlay-controller-callsign">{c.callsign}</div>
								<div className="overlay-controller-frequency">{(c.frequency / 1000).toFixed(3)}</div>
								<Icon name="groups" size={16} />
								<div className="overlay-controller-connections">{c.connections}</div>
								<button type="button" className="overlay-controller-save" onClick={handleCopyClick}>
									{copied === c.callsign ? <Icon name="select" size={20} /> : <Icon name="copy" size={14} />}
								</button>
							</div>
						);
					})}
				</div>
			)}
			<div className="overlay-main-wrapper">
				<div className="overlay-title">
					<p>{cached?.properties.name || "N/A"}</p>
					<p>{cached?.properties.id || "N/A"}</p>
				</div>
				<div className="overlay-misc"></div>
			</div>
			<div className="overlay-anchor"></div>
		</div>
	);
}
