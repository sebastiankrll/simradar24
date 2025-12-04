"use client";

import type { SimAwareTraconFeature, StaticAirport } from "@sk/types/db";
import type { AirportLong, ControllerLong } from "@sk/types/vatsim";
import { parseMetar } from "metar-taf-parser";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Spinner from "@/components/Spinner/Spinner";
import { cacheIsInitialized, getCachedAirport, getCachedTracon, getControllersLong } from "@/storage/cache";
import { fetchApi } from "@/utils/api";
import { setHeight } from "../helpers";
import NotFoundPanel from "../NotFound";
import { ControllerInfo } from "../shared/ControllerInfo";
import { AirportConnections } from "./AirportConnections";
import { AirportStatus } from "./AirportStatus";
import { AirportTitle } from "./AirportTitle";
import { AirportWeather } from "./AirportWeather";

export interface AirportPanelStatic {
	airport: StaticAirport | null;
	tracon: SimAwareTraconFeature | null;
	controllers: ControllerLong[];
}
type AccordionSection = "weather" | "stats" | "controllers" | null;

export function AirportGeneral({ icao }: { icao: string }) {
	const { data, isLoading } = useSWR<AirportLong>(`/data/airport/${icao}`, fetchApi, { refreshInterval: 60_000 });
	const parsedMetar = data?.metar ? parseMetar(data.metar) : null;

	const [staticData, setStaticData] = useState<AirportPanelStatic>({
		airport: null,
		controllers: [],
		tracon: null,
	});
	useEffect(() => {
		const loadStaticData = async () => {
			while (!cacheIsInitialized()) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			const [airport, controllers, tracon] = await Promise.all([getCachedAirport(icao), getControllersLong(icao), getCachedTracon(icao)]);

			setStaticData({ airport, controllers, tracon });
		};

		loadStaticData();
	}, [icao]);

	const weatherRef = useRef<HTMLDivElement>(null);
	const statsRef = useRef<HTMLDivElement>(null);
	const controllersRef = useRef<HTMLDivElement>(null);

	const [openSection, setOpenSection] = useState<AccordionSection>(null);
	const toggleSection = (section: AccordionSection) => {
		setOpenSection(openSection === section ? null : section);
	};

	useEffect(() => {
		setHeight(weatherRef, openSection === "weather");
		setHeight(statsRef, openSection === "stats");
		setHeight(controllersRef, openSection === "controllers");
	}, [openSection]);

	if (isLoading) return <Spinner />;
	if (!data)
		return (
			<NotFoundPanel
				title="Airport not found!"
				text="This airport does not exist or is currently unavailable, most likely because of an incorrect ICAO code."
				disableHeader
			/>
		);

	return (
		<>
			<AirportTitle staticAirport={staticData.airport} />
			<AirportStatus airport={data} parsedMetar={parsedMetar} />
			<div className="panel-container main scrollable">
				<button
					className={`panel-container-header${openSection === "weather" ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("weather")}
				>
					<p>More Weather & METAR</p>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Weather & METAR</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<AirportWeather airport={data} parsedMetar={parsedMetar} openSection={openSection} ref={weatherRef} />
				<AirportConnections airport={data} />
				<button
					className={`panel-container-header${openSection === "weather" ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("controllers")}
				>
					<p>Controller Information</p>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Controllers</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<ControllerInfo
					controllers={staticData.controllers}
					airport={staticData.airport}
					tracon={staticData.tracon}
					openSection={openSection}
					ref={controllersRef}
				/>
			</div>
		</>
	);
}
