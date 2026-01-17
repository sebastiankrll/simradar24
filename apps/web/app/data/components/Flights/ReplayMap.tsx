"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSettingsStore } from "@/storage/zustand";
import { mapService } from "../../lib";

export default function ReplayMap() {
	const { theme } = useTheme();
	const { dayNightLayer, dayNightLayerBrightness, planeMarkerSize, airportMarkerSize } = useSettingsStore();

	useEffect(() => {
		const map = mapService.init({ autoTrackPoints: false, disableInteractions: true, disableCenterOnPageLoad: true, sunTime: new Date() });
		mapService.addEventListeners();

		return () => {
			mapService.removeEventListeners();
			map.setTarget(undefined);
		};
	}, []);

	useEffect(() => {
		mapService.setTheme(theme);
	}, [theme]);

	useEffect(() => {
		mapService.setSettings({ dayNightLayer, dayNightLayerBrightness, planeMarkerSize, airportMarkerSize });
	}, [dayNightLayer, dayNightLayerBrightness, planeMarkerSize, airportMarkerSize]);

	return <div id="map" />;
}
