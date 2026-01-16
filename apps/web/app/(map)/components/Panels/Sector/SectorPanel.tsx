"use client";

import type { FIRFeature, SimAwareTraconFeature } from "@sr24/types/db";
import type { ControllerLong } from "@sr24/types/interface";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { mapService } from "@/app/(map)/lib";
import Icon from "@/components/Icon/Icon";
import { setHeight } from "@/components/Panel/utils";
import Spinner from "@/components/Spinner/Spinner";
import { getCachedFir, getCachedTracon } from "@/storage/cache";
import { fetchApi } from "@/utils/api";
import { ControllerInfo } from "../shared/ControllerInfo";
import NotFoundPanel from "../shared/NotFound";
import { SectorTitle } from "./SectorTitle";

export interface SectorPanelStatic {
	feature: SimAwareTraconFeature | FIRFeature | null;
	type: "tracon" | "fir" | null;
}
type AccordionSection = "controllers" | null;

export default function SectorPanel({ callsign }: { callsign: string }) {
	const { data: controllers, isLoading } = useSWR<ControllerLong[]>(`/map/controller/sector/${callsign}`, fetchApi, {
		refreshInterval: 60_000,
		shouldRetryOnError: false,
	});

	const [staticData, setStaticData] = useState<SectorPanelStatic | null>(null);
	const lastCallsignRef = useRef<string | null>(null);

	useEffect(() => {
		if (!callsign || lastCallsignRef.current === callsign) return;
		lastCallsignRef.current = callsign;

		(async () => {
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
		})();
	}, [callsign]);

	const controllersRef = useRef<HTMLDivElement>(null);

	const [openSection, setOpenSection] = useState<AccordionSection>(null);
	const toggleSection = (section: AccordionSection) => {
		setOpenSection(openSection === section ? null : section);
	};

	useEffect(() => {
		setHeight(controllersRef, openSection === "controllers");
	}, [openSection]);

	if (isLoading || !staticData) return <Spinner />;
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
				<button className="panel-close" type="button" onClick={() => mapService.resetMap()}>
					<Icon name="cancel" size={24} />
				</button>
			</div>
			<SectorTitle staticData={staticData} />
			{controllers.length > 0 && (
				<div className="panel-container main scrollable">
					<button
						className={`panel-container-header${openSection === "controllers" ? " open" : ""}`}
						type="button"
						onClick={() => toggleSection("controllers")}
					>
						<p>Controller Information</p>
						<Icon name="arrow-down" />
					</button>
					<ControllerInfo controllers={controllers} sector={staticData.feature} openSection={openSection} ref={controllersRef} />
				</div>
			)}
		</>
	);
}
