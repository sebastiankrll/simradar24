"use client";

import type { DashboardData } from "@sk/types/vatsim";
import { useEffect, useRef, useState } from "react";
import { setHeight } from "../helpers";
import { DashboardEvents } from "./DashboardEvents";
import { DashboardHistory } from "./DashboardHistory";
import { DashboardStats } from "./DashboardStats";
import "./DashboardPanel.css";
import useSWR from "swr";
import Spinner from "@/components/Spinner/Spinner";
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

let initialized = false;

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
		if (initialized || isLoading) return;
		initialized = true;
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
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Last 24 hours</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
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
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>General statistics</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
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
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>VATSIM events</title>
						<path
							fillRule="evenodd"
							d="M11.842 18 .237 7.26a.686.686 0 0 1 0-1.038.8.8 0 0 1 1.105 0L11.842 16l10.816-9.704a.8.8 0 0 1 1.105 0 .686.686 0 0 1 0 1.037z"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
				<div className={`panel-sub-container scrollable`}>
					<DashboardEvents events={data.events} ref={eventsRef} openSection={openSection} />
				</div>
			</div>
		</>
	);
}
