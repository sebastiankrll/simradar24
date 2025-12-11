"use client";

import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerLong } from "@sr24/types/vatsim";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { resetMap } from "@/components/Map/utils/events";
import Spinner from "@/components/Spinner/Spinner";
import { cacheIsInitialized, getCachedFir, getCachedTracon, getControllersApiRequest } from "@/storage/cache";
import { fetchApi } from "@/utils/api";
import { setHeight } from "../helpers";
import NotFoundPanel from "../NotFound";
import { ControllerInfo } from "../shared/ControllerInfo";
import { SectorTitle } from "./SectorTitle";

export interface SectorPanelStatic {
	feature: SimAwareTraconFeature | FIRFeature | null;
	type: "tracon" | "fir" | null;
}
type AccordionSection = "controllers" | null;

export default function SectorPanel({ callsign }: { callsign: string }) {
	const controllerApiRequest = getControllersApiRequest(callsign, "sector");
	const { data: controllers, isLoading } = useSWR<ControllerLong[]>(controllerApiRequest, fetchApi, {
		refreshInterval: 60_000,
		shouldRetryOnError: false,
	});

	const [staticData, setStaticData] = useState<SectorPanelStatic>({
		feature: null,
		type: null,
	});
	const lastCallsignRef = useRef<string | null>(null);

	useEffect(() => {
		if (!callsign || lastCallsignRef.current === callsign) return;
		lastCallsignRef.current = callsign;

		const loadStaticData = async () => {
			while (!cacheIsInitialized()) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			let feature: SimAwareTraconFeature | FIRFeature | null = null;
			let type: "tracon" | "fir" | null = null;

			feature = await getCachedTracon(callsign);
			type = "tracon";
			if (!feature) {
				feature = await getCachedFir(callsign);
				type = "fir";
			}
			if (!feature) {
				type = null;
			}
			setStaticData({ feature, type });
		};

		loadStaticData();
	}, [callsign]);

	const controllersRef = useRef<HTMLDivElement>(null);

	const [openSection, setOpenSection] = useState<AccordionSection>(null);
	const toggleSection = (section: AccordionSection) => {
		setOpenSection(openSection === section ? null : section);
	};

	useEffect(() => {
		setHeight(controllersRef, openSection === "controllers");
	}, [openSection]);

	if (isLoading) return <Spinner />;
	if (!controllers || controllers.length === 0)
		return (
			<NotFoundPanel
				title="Sector not found!"
				text="This sector does not exist or no controllers are available, most likely because of an incorrect callsign or disconnected controllers."
			/>
		);

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">{callsign}</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
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
			<SectorTitle staticData={staticData} />
			<div className="panel-container main scrollable">
				<button
					className={`panel-container-header${openSection === "controllers" ? " open" : ""}`}
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
				<ControllerInfo controllers={controllers} sector={staticData.feature} openSection={openSection} ref={controllersRef} />
			</div>
		</>
	);
}
