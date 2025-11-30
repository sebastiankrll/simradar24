"use client";

import type { StaticAircraft, StaticAirline, StaticAirport } from "@sk/types/db";
import type { PilotLong, TrackPoint, WsDelta } from "@sk/types/vatsim";
import { useEffect, useRef, useState } from "react";
import { fetchTrackPoints, getCachedAirline, getCachedAirport } from "@/storage/cache";
import "./PilotPanel.css";
import { PilotAircraft } from "./components/PilotAircraft";
import { PilotFlightplan } from "./components/PilotFlightplan";
import { PilotStatus } from "./components/PilotStatus";
import { PilotTitle } from "./components/PilotTitle";
import { PilotCharts } from "./components/PilotCharts";
import { PilotTelemetry } from "./components/PilotTelemetry";
import { PilotUser } from "./components/PilotUser";
import { PilotMisc } from "./components/PilotMisc";
import { wsClient } from "@/utils/ws";
import { followPilotOnMap, showRouteOnMap } from "../Map/utils/events";

export interface PilotPanelFetchData {
	airline: StaticAirline | null;
	departure: StaticAirport | null;
	arrival: StaticAirport | null;
}
type AccordionSection = "info" | "charts" | "pilot" | null;
type MapInteraction = "route" | "follow" | null;

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function setHeight(ref: React.RefObject<HTMLDivElement | null>, isOpen: boolean) {
	if (!ref.current) return;

	if (isOpen) {
		// Measure the scrollHeight (natural content height)
		const height = ref.current.scrollHeight;
		ref.current.style.minHeight = `${height}px`;
	} else {
		ref.current.style.minHeight = "0px";
	}
}

export default function PilotPanel({ initialPilot, aircraft }: { initialPilot: PilotLong; aircraft: StaticAircraft | null }) {
	const [pilot, setPilot] = useState<PilotLong>(initialPilot);
	const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
	const [data, setData] = useState<PilotPanelFetchData>({
		airline: null,
		departure: null,
		arrival: null,
	});
	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = data.airline?.iata ? data.airline.iata + callsignNumber : pilot?.callsign;

	const [mapInteraction, setMapInteraction] = useState<MapInteraction>(null);
	const toggleMapInteraction = (interaction: MapInteraction) => {
		setMapInteraction(mapInteraction === interaction ? null : interaction);

		if (interaction === "route" && data.departure && data.arrival) {
			showRouteOnMap(data.departure, data.arrival, mapInteraction !== "route");
		}

		if (interaction === "follow") {
			followPilotOnMap(pilot.id, mapInteraction !== "follow");
		}
	};

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

	useEffect(() => {
		const airlineCode = pilot.callsign.slice(0, 3).toUpperCase();
		Promise.all([
			getCachedAirline(airlineCode || ""),
			getCachedAirport(pilot.flight_plan?.departure.icao || ""),
			getCachedAirport(pilot.flight_plan?.arrival.icao || ""),
			fetchTrackPoints(pilot.id),
		]).then(([airline, departure, arrival, trackPoints]) => {
			setData({ airline, departure, arrival });
			setTrackPoints(trackPoints);
		});
	}, [pilot]);

	useEffect(() => {
		const onDelta = (delta: WsDelta) => {
			const updatedPilot = delta.pilots.updated.find((p) => p.id === pilot.id);

			if (updatedPilot) {
				setPilot((prev) => ({
					...prev,
					...updatedPilot,
				}));
			}
		};

		const fetchPilot = async () => {
			try {
				const res = await fetch(`${BASE_URL}/api/data/pilot/${pilot.id}`);
				if (res.ok) {
					const updatedPilot: PilotLong = await res.json();
					setPilot(updatedPilot);

					const newTrackpoint: TrackPoint = {
						id: updatedPilot.id,
						latitude: updatedPilot.latitude,
						longitude: updatedPilot.longitude,
						altitude_agl: updatedPilot.altitude_agl,
						altitude_ms: updatedPilot.altitude_ms,
						groundspeed: updatedPilot.groundspeed,
						vertical_speed: updatedPilot.vertical_speed,
						heading: updatedPilot.heading,
						timestamp: updatedPilot.timestamp,
					};
					setTrackPoints((prev) => [...prev, newTrackpoint]);
				}
			} catch (error) {
				console.error("Failed to fetch pilot data:", error);
			}
		};

		wsClient.addListener(onDelta);
		const interval = setInterval(fetchPilot, 60_000);

		return () => {
			wsClient.removeListener(onDelta);
			clearInterval(interval);
		};
	}, [pilot.id]);

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">{pilot.callsign}</div>
				<button className="panel-close" type="button">
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Close panel</title>
						<path
							fillRule="evenodd"
							d="M23.763 22.658 13.106 12 23.68 1.42a.781.781 0 0 0-1.1-1.1L12 10.894 1.42.237a.78.78 0 0 0-1.1 1.105L10.894 12 .237 22.658a.763.763 0 0 0 0 1.105.76.76 0 0 0 1.105 0L12 13.106l10.658 10.657a.76.76 0 0 0 1.105 0 .76.76 0 0 0 0-1.105"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
			</div>
			<PilotTitle pilot={pilot} data={data} />
			<PilotStatus pilot={pilot} data={data} />
			<div className="panel-container main">
				<button className={`panel-container-header${openSection === "info" ? " open" : ""}`} type="button" onClick={() => toggleSection("info")}>
					<p>More {flightNumber} information</p>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Toggle more information</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<PilotFlightplan pilot={pilot} data={data} openSection={openSection} ref={infoRef} />
				<PilotAircraft pilot={pilot} aircraft={aircraft} />
				<button className={`panel-container-header${openSection === "charts" ? " open" : ""}`} type="button" onClick={() => toggleSection("charts")}>
					<p>Speed & altitude graph</p>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Toggle more information</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<PilotCharts trackPoints={trackPoints} openSection={openSection} ref={chartsRef} />
				<PilotTelemetry pilot={pilot} />
				<button className={`panel-container-header${openSection === "pilot" ? " open" : ""}`} type="button" onClick={() => toggleSection("pilot")}>
					<p>Pilot information</p>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Toggle more information</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<PilotUser pilot={pilot} openSection={openSection} ref={userRef} />
				<PilotMisc pilot={pilot} />
			</div>
			<div className="panel-navigation">
				<button
					className={`panel-navigation-button${mapInteraction === "route" ? " active" : ""}`}
					type="button"
					onClick={() => toggleMapInteraction("route")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Route</title>
						<path
							fillRule="evenodd"
							d="M23.834 18.998a4.03 4.03 0 0 0-1.671-2.399c-.867-.548-1.796-.685-2.724-.41-1.176.342-1.981 1.301-2.415 2.398-1.176-.206-3.405-.823-4.271-2.399-.434-.822-.434-1.85-.062-3.083.495-1.44.433-2.81-.248-4.043C11.267 6.8 8.42 5.636 6.995 5.225c.186-.754.248-1.508.062-2.33C6.562.839 4.581-.463 2.662.154c-.929.274-1.671.96-2.167 1.85S-.124 3.991.124 5.019C.37 6.047.99 6.938 1.795 7.417c.557.343 1.177.549 1.796.549.31 0 .619-.069.99-.137.743-.206 1.424-.754 1.857-1.371 1.053.274 3.9 1.233 4.953 3.22.433.891.495 1.782.124 2.879-.558 1.644-.496 3.083.123 4.248 1.115 2.056 3.715 2.81 5.077 3.084 0 .342.062.753.124 1.165.247 1.027.866 1.918 1.671 2.398.557.342 1.176.548 1.795.548.31 0 .62-.069.991-.137a3.57 3.57 0 0 0 2.167-1.85c.557-.96.68-1.987.371-3.015M4.272 6.527c-.62.205-1.239.068-1.796-.275-.557-.342-.928-.89-1.114-1.576-.186-.685-.062-1.37.248-1.987a2.4 2.4 0 0 1 1.423-1.233c.186-.069.434-.069.62-.069 1.052 0 1.98.754 2.29 1.919.31 1.37-.433 2.81-1.671 3.22Zm18.2 14.8a2.4 2.4 0 0 1-1.424 1.234c-.619.206-1.238.069-1.795-.274s-.928-.89-1.114-1.576c-.372-1.37.371-2.81 1.671-3.22.186-.07.434-.07.62-.07 1.052 0 1.98.755 2.29 1.92.124.685.062 1.37-.248 1.987Z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>Route</p>
				</button>
				<button
					className={`panel-navigation-button${mapInteraction === "follow" ? " active" : ""}`}
					type="button"
					onClick={() => toggleMapInteraction("follow")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Follow</title>
						<path
							fillRule="evenodd"
							d="M9.344 1.16c-.367 0-.611.245-.611.611v6.107L1.038.183a.59.59 0 0 0-.855 0 .59.59 0 0 0 0 .855l7.695 7.695H1.77c-.366 0-.61.244-.61.61 0 .367.244.611.61.611h8.244V1.771c-.06-.366-.366-.61-.671-.61ZM22.84 9.344c0-.367-.245-.611-.611-.611h-6.107l7.695-7.695a.59.59 0 0 0 0-.855.59.59 0 0 0-.855 0l-7.695 7.695V1.77c0-.366-.244-.61-.61-.61-.367 0-.611.244-.611.61v8.244h8.183c.366-.06.61-.305.61-.671Zm-6.718 5.923h6.107c.366 0 .61-.244.61-.61 0-.367-.244-.611-.61-.611h-8.183v8.183c0 .366.244.61.61.61.367 0 .611-.244.611-.61v-6.107l7.695 7.695a.66.66 0 0 0 .427.183.66.66 0 0 0 .428-.183.59.59 0 0 0 0-.855zM1.16 14.656c0 .367.245.611.611.611h6.107L.183 22.962a.59.59 0 0 0 0 .855.66.66 0 0 0 .428.183.66.66 0 0 0 .427-.183l7.695-7.695v6.107c0 .366.244.61.61.61.367 0 .611-.244.611-.61v-8.183H1.771a.61.61 0 0 0-.61.61Z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>Follow</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => {}}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Share</title>
						<path
							fillRule="evenodd"
							d="M22.681 10.01v12.746H1.32V10.01H0V24h24V10.01zM11.34 2.363v14.673h1.32V2.301l4.549 4.165.923-.87L12 0 5.868 5.596l.923.87 4.55-4.103Z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>Share</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => {}}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>More</title>
						<path
							fillRule="evenodd"
							d="M3.985 10.111c1.05 0 1.88.833 1.88 1.889s-.83 1.889-1.88 1.889-1.88-.833-1.88-1.889.83-1.889 1.88-1.889m0-1.111A2.98 2.98 0 0 0 1 12c0 1.667 1.327 3 2.985 3a2.98 2.98 0 0 0 2.985-3c0-1.667-1.382-3-2.985-3M12 10.111c1.05 0 1.88.833 1.88 1.889s-.83 1.889-1.88 1.889-1.88-.833-1.88-1.889.83-1.889 1.88-1.889M12 9a2.98 2.98 0 0 0-2.985 3c0 1.667 1.327 3 2.985 3a2.98 2.98 0 0 0 2.985-3c0-1.667-1.327-3-2.985-3m8.015 1.111c1.05 0 1.88.833 1.88 1.889s-.83 1.889-1.88 1.889-1.88-.833-1.88-1.889.885-1.889 1.88-1.889m0-1.111a2.98 2.98 0 0 0-2.985 3c0 1.667 1.327 3 2.985 3A2.98 2.98 0 0 0 23 12c0-1.667-1.327-3-2.985-3"
							clipRule="evenodd"
						></path>
					</svg>
					<p>More</p>
				</button>
			</div>
		</>
	);
}
