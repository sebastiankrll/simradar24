"use client";

import type { StaticAircraft, StaticAirline, StaticAirport } from "@sr24/types/db";
import type { PilotLong, TrackPoint, WsDelta } from "@sr24/types/vatsim";
import { useEffect, useRef, useState } from "react";
import { cacheIsInitialized, fetchTrackPoints, getCachedAirline, getCachedAirport } from "@/storage/cache";
import "./PilotPanel.css";
import useSWR from "swr";
import Icon from "@/components/shared/Icon/Icon";
import Spinner from "@/components/shared/Spinner/Spinner";
import { fetchApi } from "@/utils/api";
import { wsClient } from "@/utils/ws";
import { followPilotOnMap, resetMap, showRouteOnMap } from "../../Map/utils/events";
import { setHeight } from "../helpers";
import NotFoundPanel from "../NotFound";
import { PilotAircraft } from "./PilotAircraft";
import { PilotCharts } from "./PilotCharts";
import { PilotFlightplan } from "./PilotFlightplan";
import { PilotMisc } from "./PilotMisc";
import { PilotStatus } from "./PilotStatus";
import { PilotTelemetry } from "./PilotTelemetry";
import { PilotTitle } from "./PilotTitle";
import { PilotUser } from "./PilotUser";

export interface PilotPanelStatic {
	airline: StaticAirline | null;
	departure: StaticAirport | null;
	arrival: StaticAirport | null;
}
type AccordionSection = "info" | "charts" | "pilot" | null;
type MapInteraction = "route" | "follow" | null;

function onStatsClick(cid: number) {
	window.open(`https://stats.vatsim.net/stats/${cid}`, "_blank");
}

export default function PilotPanel({ id }: { id: string }) {
	const {
		data: pilotData,
		isLoading,
		mutate,
	} = useSWR<PilotLong>(`/data/pilot/${id}`, fetchApi, {
		refreshInterval: 60_000,
	});

	const lastIdRef = useRef<string | null>(null);

	const registration = pilotData?.flight_plan?.ac_reg;
	const { data: aircraftData } = useSWR<StaticAircraft>(registration ? `/data/aircraft/${registration}` : null, fetchApi, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});

	const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
	const [staticData, setStaticData] = useState<PilotPanelStatic>({
		airline: null,
		departure: null,
		arrival: null,
	});

	const [mapInteraction, setMapInteraction] = useState<MapInteraction>(null);
	const toggleMapInteraction = (interaction: MapInteraction) => {
		const newInteraction = mapInteraction === interaction ? null : interaction;
		setMapInteraction(newInteraction);
		showRouteOnMap(staticData.departure, staticData.arrival, newInteraction);
		followPilotOnMap(id, newInteraction);
	};

	const [shared, setShared] = useState(false);
	const onShareClick = () => {
		navigator.clipboard.writeText(`${window.location.origin}/pilot/${id}`);
		setShared(true);
		setTimeout(() => setShared(false), 2000);
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
		if (!pilotData || lastIdRef.current === pilotData.id) return;
		lastIdRef.current = pilotData.id;

		const airlineCode = pilotData.callsign.slice(0, 3).toUpperCase();
		const loadStaticData = async () => {
			while (!cacheIsInitialized()) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			Promise.all([
				getCachedAirline(airlineCode || ""),
				getCachedAirport(pilotData.flight_plan?.departure.icao || ""),
				getCachedAirport(pilotData.flight_plan?.arrival.icao || ""),
				fetchTrackPoints(pilotData.id),
			]).then(([airline, departure, arrival, trackPoints]) => {
				setStaticData({ airline, departure, arrival });
				setTrackPoints(trackPoints);
			});
		};

		loadStaticData();
	}, [pilotData]);

	useEffect(() => {
		const handleMessage = (delta: WsDelta) => {
			const updatedPilot = delta.pilots.updated.find((p) => p.id === id);

			if (updatedPilot) {
				mutate((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						...updatedPilot,
					};
				}, false);

				setTrackPoints((prev) => [
					...prev,
					{
						id: updatedPilot.id,
						latitude: updatedPilot.latitude ?? prev[prev.length - 1]?.latitude,
						longitude: updatedPilot.longitude ?? prev[prev.length - 1]?.longitude,
						altitude_agl: updatedPilot.altitude_agl ?? prev[prev.length - 1]?.altitude_agl,
						altitude_ms: updatedPilot.altitude_ms ?? prev[prev.length - 1]?.altitude_ms,
						groundspeed: updatedPilot.groundspeed ?? prev[prev.length - 1]?.groundspeed,
						vertical_speed: updatedPilot.vertical_speed ?? prev[prev.length - 1]?.vertical_speed,
						heading: updatedPilot.heading ?? prev[prev.length - 1]?.heading,
						timestamp: new Date(),
					},
				]);
			}
		};

		wsClient.addListener(handleMessage);

		return () => {
			wsClient.removeListener(handleMessage);
		};
	}, [id, mutate]);

	if (isLoading) return <Spinner />;
	if (!pilotData)
		return (
			<NotFoundPanel
				title="Pilot not found!"
				text="This pilot does not exist or is currently unavailable, most likely because of an incorrect ID or disconnect."
			/>
		);

	const callsignNumber = pilotData.callsign.slice(3);
	const flightNumber = staticData.airline?.iata ? staticData.airline.iata + callsignNumber : pilotData.callsign;

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">{pilotData.callsign}</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
					<Icon name="cancel" size={24} />
				</button>
			</div>
			<PilotTitle pilot={pilotData} data={staticData} />
			<PilotStatus pilot={pilotData} data={staticData} />
			<div className="panel-container main scrollable">
				<button className={`panel-container-header${openSection === "info" ? " open" : ""}`} type="button" onClick={() => toggleSection("info")}>
					<p>More {flightNumber} Information</p>
					<Icon name="arrow-down" />
				</button>
				<PilotFlightplan pilot={pilotData} data={staticData} openSection={openSection} ref={infoRef} />
				<PilotAircraft pilot={pilotData} aircraft={aircraftData} />
				<button className={`panel-container-header${openSection === "charts" ? " open" : ""}`} type="button" onClick={() => toggleSection("charts")}>
					<p>Speed & Altitude Graph</p>
					<Icon name="arrow-down" />
				</button>
				<PilotCharts trackPoints={trackPoints} openSection={openSection} ref={chartsRef} />
				<PilotTelemetry pilot={pilotData} />
				<button className={`panel-container-header${openSection === "pilot" ? " open" : ""}`} type="button" onClick={() => toggleSection("pilot")}>
					<p>Pilot Information</p>
					<Icon name="arrow-down" />
				</button>
				<PilotUser pilot={pilotData} openSection={openSection} ref={userRef} />
				<PilotMisc pilot={pilotData} />
			</div>
			<div className="panel-navigation">
				<button
					className={`panel-navigation-button${mapInteraction === "route" ? " active" : ""}`}
					type="button"
					onClick={() => toggleMapInteraction("route")}
				>
					<Icon name="tour" size={20} />
					<p>Route</p>
				</button>
				<button
					className={`panel-navigation-button${mapInteraction === "follow" ? " active" : ""}`}
					type="button"
					onClick={() => toggleMapInteraction("follow")}
				>
					<Icon name="gps" size={20} />
					<p>Follow</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => onShareClick()}>
					<Icon name="share-android" size={20} />
					<p>{shared ? "Copied!" : "Share"}</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => onStatsClick(pilotData.cid)}>
					<Icon name="more" size={20} />
					<p>More</p>
				</button>
			</div>
		</>
	);
}
