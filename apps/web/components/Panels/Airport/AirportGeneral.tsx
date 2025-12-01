"use client";

import type { StaticAirport } from "@sk/types/db";
import type { AirportLong } from "@sk/types/vatsim";
import { parseMetar } from "metar-taf-parser";
import { useEffect, useRef, useState } from "react";
import { getCachedAirport } from "@/storage/cache";
import { setHeight } from "../helpers";
import { AirportConnections } from "./AirportConnections";
import { AirportStatus } from "./AirportStatus";
import { AirportTitle } from "./AirportTitle";
import { AirportWeather } from "./AirportWeather";

export interface AirportPanelStatic {
	airport: StaticAirport | null;
}
type AccordionSection = "weather" | "stats" | "controllers" | null;

export function AirportGeneral({ initialAirport }: { initialAirport: AirportLong }) {
	const [airport, _setAirport] = useState<AirportLong>(initialAirport);
	const parsedMetar = airport.metar ? parseMetar(airport.metar) : null;

	const [data, setData] = useState<AirportPanelStatic>({
		airport: null,
	});
	useEffect(() => {
		Promise.all([getCachedAirport(initialAirport.icao)]).then(([airport]) => {
			setData({ airport });
		});
	}, [initialAirport]);

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

	return (
		<>
			<AirportTitle staticAirport={data.airport} />
			<AirportStatus airport={airport} parsedMetar={parsedMetar} />
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
				<AirportWeather airport={airport} parsedMetar={parsedMetar} openSection={openSection} ref={weatherRef} />
				<AirportConnections airport={airport} />
			</div>
		</>
	);
}
