"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { fetchUserSettings, useSettingsStore } from "@/storage/zustand";

let initialized = false;

export default function useSettings() {
	const { setTheme } = useTheme();
	const settings = useSettingsStore();
	const { data: session } = useSession();

	useEffect(() => {
		setTheme(settings.theme);
	}, [settings.theme, setTheme]);

	useEffect(() => {
		if (!session || initialized) return;
		initialized = true;
		fetchUserSettings();
	}, [session]);
}
