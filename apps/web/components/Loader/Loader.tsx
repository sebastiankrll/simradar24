"use client";

import { useEffect, useState } from "react";
import { initData } from "@/storage/cache";
import type { StatusMap } from "@/types/data";
import "./Loader.css";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import simradar24Logo from "@/assets/images/simradar24_logo.svg";
import { useSettingsStore } from "@/storage/zustand";

export default function Loader() {
	const [status, setStatus] = useState<StatusMap>({});
	const pathname = usePathname();
	const { setSettings, theme: settingsTheme } = useSettingsStore();
	const { data: session } = useSession();
	const { setTheme } = useTheme();

	useEffect(() => {
		initData(setStatus, pathname);
		return () => {};
	}, [pathname]);

	useEffect(() => {
		if (!session?.user) {
			setStatus((prev) => ({ ...prev, initUserSettings: true }));
			return;
		}

		const fetchUserSettings = async () => {
			try {
				const res = await fetch("/api/user/settings", { cache: "no-store" });
				if (!res.ok) {
					setStatus((prev) => ({ ...prev, initUserSettings: true }));
					return;
				}

				const data = await res.json();
				setSettings(data.settings);
				setStatus((prev) => ({ ...prev, initUserSettings: true }));
			} catch (err) {
				console.error("Failed to load settings:", err);
			}
		};
		fetchUserSettings();
	}, [session?.user, setSettings]);

	useEffect(() => {
		setTheme(settingsTheme);
	}, [settingsTheme, setTheme]);

	return (
		<>
			{status.indexedDB && status.initData && status.initMap ? null : (
				<div id="loader-wrapper">
					<div id="loader">
						<figure id="loader-logo">
							<Image src={simradar24Logo} alt="simradar24 logo" priority={true} />
						</figure>
						<div id="loader-title">Please wait, while the application is loading.</div>
						<div id="loader-items">
							<div className="loader-item">
								<div className={`loader-spinner`}></div>
								<p>{status.indexedDB ? "Database ready!" : "Initializing databases ..."}</p>
							</div>
							<div className="loader-item">
								<div className={`loader-spinner${status.initData ? " done" : ""}`}></div>
								<p>{status.initData ? "Initial data fetched!" : "Fetching initial data ..."}</p>
							</div>
							<div className="loader-item">
								<div className={`loader-spinner${status.initMap ? " done" : ""}`}></div>
								<p>{status.initMap ? "Map initialized!" : "Initializing map ..."}</p>
							</div>
							<div className="loader-item">
								<div className={`loader-spinner${status.initUserSettings ? " done" : ""}`}></div>
								<p>{status.initUserSettings ? "User settings loaded!" : "Loading user settings ..."}</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
