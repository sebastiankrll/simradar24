"use client";

import type { DashboardData } from "@sr24/types/vatsim";
import { useEffect, useRef, useState } from "react";
import { setHeight } from "../helpers";
import { DashboardEvents } from "./DashboardEvents";
import { DashboardHistory } from "./DashboardHistory";
import { DashboardStats } from "./DashboardStats";
import "./DashboardPanel.css";
import useSWR from "swr";
import Icon from "@/components/shared/Icon/Icon";
import Spinner from "@/components/shared/Spinner/Spinner";
import { fetchApi } from "@/utils/api";

function storeOpenSections(sections: string[]) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem("dashboardOpenSections", JSON.stringify(sections));
	} catch {}
}

function getStoredOpenSections(): string[] {
	if (typeof window === "undefined") return [];
	try {
		const stored = localStorage.getItem("dashboardOpenSections");
		if (!stored) return [];
		const parsed = JSON.parse(stored);
		if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
			return parsed;
		}
	} catch {}
	return [];
}

export default function DashboardPanel() {
	const { data, isLoading } = useSWR<DashboardData>("/data/dashboard", fetchApi, { refreshInterval: 60_000 });

	const historyRef = useRef<HTMLDivElement>(null);
	const statsRef = useRef<HTMLDivElement>(null);
	const eventsRef = useRef<HTMLDivElement>(null);

	const [openSection, setOpenSection] = useState<string[]>([]);
	const toggleSection = (section: string) => {
		const newOpenSections = openSection.includes(section) ? openSection.filter((s) => s !== section) : [...openSection, section];
		setOpenSection(newOpenSections);
		storeOpenSections(newOpenSections);
	};

	useEffect(() => {
		if (isLoading) return;
		setOpenSection(getStoredOpenSections());
	}, [isLoading]);

	useEffect(() => {
		setHeight(historyRef, openSection.includes("history"));
		setHeight(statsRef, openSection.includes("stats"));
		setHeight(eventsRef, openSection.includes("events"));
	}, [openSection]);

	if (!data || isLoading) return <Spinner />;

	return (
		<>
			<div className="panel-container dashboard">
				<button
					className={`panel-container-header${openSection.includes("history") ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("history")}
				>
					<p>Last 24 hours</p>
					<Icon name="arrow-down" />
				</button>
				<div ref={historyRef} className={`panel-sub-container accordion${openSection.includes("history") ? " open" : ""}`}>
					<DashboardHistory history={data.history} />
				</div>
			</div>
			<div className="panel-container dashboard">
				<button
					className={`panel-container-header${openSection.includes("stats") ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("stats")}
				>
					<p>General statistics</p>
					<Icon name="arrow-down" />
				</button>
				<div ref={statsRef} className={`panel-sub-container accordion${openSection.includes("stats") ? " open" : ""}`}>
					<DashboardStats stats={data.stats} />
				</div>
			</div>
			<div className="panel-container dashboard" id="panel-dashboard-events">
				<button
					className={`panel-container-header${openSection.includes("events") ? " open" : ""}`}
					type="button"
					onClick={() => toggleSection("events")}
				>
					<p>VATSIM events</p>
					<Icon name="arrow-down" />
				</button>
				<div className={`panel-sub-container scrollable`}>
					<DashboardEvents events={data.events} ref={eventsRef} openSection={openSection} />
				</div>
			</div>
		</>
	);
}
