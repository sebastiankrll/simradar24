import type { StaticAircraft, StaticAirline, StaticAirport } from "@sr24/types/db";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { PilotTitle } from "@/components/Panel/Pilot/PilotTitle";
import { fetchApi } from "@/utils/api";
import "@/components/Panel/BasePanel.css";
import "@/components/Panel/Pilot/PilotPanel.css";
import type { PilotLong } from "@sr24/types/interface";
import flightStatusSprite from "@/assets/images/sprites/flightStatusSprite.png";
import Icon from "@/components/Icon/Icon";
import { PilotAircraft } from "@/components/Panel/Pilot/PilotAircraft";
import { PilotAirport } from "@/components/Panel/Pilot/PilotAirport";
import { PilotFlightplan } from "@/components/Panel/Pilot/PilotFlightplan";
import { PilotMisc } from "@/components/Panel/Pilot/PilotMisc";
import { PilotTelemetry } from "@/components/Panel/Pilot/PilotTelemetry";
import { PilotTimes } from "@/components/Panel/Pilot/PilotTimes";
import { PilotUser } from "@/components/Panel/Pilot/PilotUser";
import { getSpriteOffset, setHeight } from "@/components/Panel/utils";
import { getCachedAirline, getCachedAirport } from "@/storage/cache";

interface PilotPanelStatic {
	airline: StaticAirline | null;
	departure: StaticAirport | null;
	arrival: StaticAirport | null;
}
type AccordionSection = "info" | "charts" | "pilot" | null;

export default function ReplayPanel({ pilot }: { pilot: PilotLong }) {
	const lastIdRef = useRef<string | null>(null);

	const registration = pilot?.flight_plan?.ac_reg;
	const { data: aircraftData } = useSWR<StaticAircraft>(registration ? `/data/aircraft/${registration}` : null, fetchApi, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});

	const [staticData, setStaticData] = useState<PilotPanelStatic>({
		airline: null,
		departure: null,
		arrival: null,
	});

	useEffect(() => {
		if (!pilot || lastIdRef.current === pilot.id) return;
		lastIdRef.current = pilot.id;

		const airlineCode = pilot.callsign.slice(0, 3).toUpperCase();
		const loadStaticData = async () => {
			Promise.all([
				getCachedAirline(airlineCode || ""),
				getCachedAirport(pilot.flight_plan?.departure.icao || ""),
				getCachedAirport(pilot.flight_plan?.arrival.icao || ""),
			]).then(([airline, departure, arrival]) => {
				setStaticData({ airline, departure, arrival });
			});
		};

		loadStaticData();
	}, [pilot]);

	const infoRef = useRef<HTMLDivElement>(null);
	const chartsRef = useRef<HTMLDivElement>(null);
	const userRef = useRef<HTMLDivElement>(null);

	const [openSection, setOpenSection] = useState<AccordionSection>(null);
	const toggleSection = (section: AccordionSection) => {
		setOpenSection(openSection === section ? null : section);
	};

	useEffect(() => {
		setHeight(infoRef, openSection === "info");
		setHeight(chartsRef, openSection === "charts");
		setHeight(userRef, openSection === "pilot");
	}, [openSection]);

	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = staticData.airline?.iata ? staticData.airline.iata + callsignNumber : pilot.callsign;

	return (
		<div id="pilot-replay-panel">
			<PilotTitle pilot={pilot} data={staticData} />
			<div className="panel-container" id="panel-pilot-status">
				<div id="panel-pilot-route">
					<PilotAirport airport={staticData.departure} />
					<div id="panel-pilot-route-line"></div>
					<div
						id="panel-pilot-route-icon"
						style={{
							backgroundImage: `url(${flightStatusSprite.src})`,
							backgroundPositionY: `${getSpriteOffset(pilot.times?.state)}px`,
						}}
					></div>
					<PilotAirport airport={staticData.arrival} />
				</div>
				<PilotTimes pilot={pilot} departure={staticData.departure} arrival={staticData.arrival} />
			</div>
			<div className="panel-container main scrollable">
				<button className={`panel-container-header${openSection === "info" ? " open" : ""}`} type="button" onClick={() => toggleSection("info")}>
					<p>More {flightNumber} Information</p>
					<Icon name="arrow-down" />
				</button>
				<PilotFlightplan pilot={pilot} data={staticData} openSection={openSection} ref={infoRef} />
				<PilotAircraft pilot={pilot} aircraft={aircraftData} />
				{/* <button className={`panel-container-header${openSection === "charts" ? " open" : ""}`} type="button" onClick={() => toggleSection("charts")}>
					<p>Speed & Altitude Graph</p>
					<Icon name="arrow-down" />
				</button>
				<PilotCharts trackPoints={trackPoints} openSection={openSection} ref={chartsRef} /> */}
				<PilotTelemetry pilot={pilot} />
				<button className={`panel-container-header${openSection === "pilot" ? " open" : ""}`} type="button" onClick={() => toggleSection("pilot")}>
					<p>Pilot Information</p>
					<Icon name="arrow-down" />
				</button>
				<PilotUser pilot={pilot} openSection={openSection} ref={userRef} />
				<PilotMisc pilot={pilot} />
			</div>
		</div>
	);
}
