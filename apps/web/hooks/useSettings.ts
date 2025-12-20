"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSettingsStore } from "@/storage/zustand";

export default function useSettings() {
	const { setTheme } = useTheme();
	const { theme: settingsTheme, setSettings } = useSettingsStore();
	const { data: session } = useSession();

	useEffect(() => {
		setTheme(settingsTheme);
	}, [settingsTheme, setTheme]);

	useEffect(() => {
		if (!session) return;

		const fetchUserSettings = async () => {
			try {
				const res = await fetch("/user/settings", { cache: "no-store" });
				if (!res.ok) {
					return;
				}

				const data = await res.json();
				setSettings(data.settings);
			} catch (err) {
				console.error("Failed to load settings:", err);
			}
		};

		fetchUserSettings();
	}, [setSettings, session]);
}
