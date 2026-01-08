"use client";

import type { SimAwareTraconFeature, StaticAirport } from "@sr24/types/db";
import type { AirportLong, ControllerLong } from "@sr24/types/interface";
import { parseMetar } from "metar-taf-parser";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Icon from "@/components/Icon/Icon";
import Spinner from "@/components/Spinner/Spinner";
import { getCachedAirport, getCachedTracon } from "@/storage/cache";
import { getControllersApiRequest } from "@/storage/map";
import { fetchApi } from "@/utils/api";
import NotFoundPanel from "../../../../../components/Panel/NotFound";
import { setHeight } from "../../../../../components/Panel/utils";
import { ControllerInfo } from "../shared/ControllerInfo";
import { AirportConnections } from "./AirportConnections";
import { AirportStatus } from "./AirportStatus";
import { AirportTitle } from "./AirportTitle";
import { AirportWeather } from "./AirportWeather";

export interface AirportPanelStatic {
	airport: StaticAirport | null;
	tracon: SimAwareTraconFeature | null;
}
type AccordionSection = "weather" | "stats" | "controllers" | null;
interface WeatherResponse {
	metar: string;
	taf: string;
}

export function AirportGeneral({ icao }: { icao: string }) {
	const { data: airportData, isLoading } = useSWR<AirportLong>(`/map/airport/${icao}`, fetchApi, {
		refreshInterval: 60_000,
		shouldRetryOnError: false,
	});
	const { data: weatherData } = useSWR<WeatherResponse>(`/map/airport/${icao}/weather`, fetchApi, {
		refreshInterval: 5 * 60_000,
		shouldRetryOnError: false,
	});
	const controllerApiRequest = getControllersApiRequest(icao, "airport");
	const { data: controllers } = useSWR<ControllerLong[]>(controllerApiRequest, fetchApi, {
		refreshInterval: 60_000,
		shouldRetryOnError: false,
	});

	const parsedMetar = weatherData?.metar ? parseMetar(weatherData.metar) : null;

	const lastIcaoRef = useRef<string | null>(null);

	const [staticData, setStaticData] = useState<AirportPanelStatic | null>(null);
	useEffect(() => {
		if (!icao || lastIcaoRef.current === icao) return;
		lastIcaoRef.current = icao;

		(async () => {
			const [airport, tracon] = await Promise.all([getCachedAirport(icao), getCachedTracon(icao)]);
			setStaticData({ airport, tracon });
		})();
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

	if (isLoading || !staticData) return <Spinner />;
	if (!staticData.airport)
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
			<AirportStatus airport={airportData} parsedMetar={parsedMetar} />
			<div className="panel-container main scrollable">
				<button
					className={`panel-container-header${openSection === "weather" ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("weather")}
				>
					<p>More Weather & METAR</p>
					<Icon name="arrow-down" />
				</button>
				<AirportWeather parsedMetar={parsedMetar} metar={weatherData?.metar} taf={weatherData?.taf} openSection={openSection} ref={weatherRef} />
				<AirportConnections airport={airportData} />
				{controllers && controllers.length > 0 && (
					<>
						<button
							className={`panel-container-header${openSection === "controllers" ? " open" : ""}`}
							type="button"
							onClick={() => toggleSection("controllers")}
						>
							<p>Controller Information</p>
							<Icon name="arrow-down" />
						</button>
						<ControllerInfo
							controllers={controllers}
							airport={staticData.airport}
							sector={staticData.tracon}
							openSection={openSection}
							ref={controllersRef}
						/>
					</>
				)}
			</div>
		</>
	);
}
