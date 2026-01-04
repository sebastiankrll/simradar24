"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { setSunLayerSettings } from "@/components/Map/sunLayer";
import { useSettingsStore } from "@/storage/zustand";
import { initMap, setDataLayersSettings, setMapTheme } from "../../lib/map";

export default function ReplayMap() {
	const { theme } = useTheme();
	const { dayNightLayer, dayNightLayerBrightness, planeMarkerSize, airportMarkerSize } = useSettingsStore();

	useEffect(() => {
		const map = initMap();
		return () => {
			map.setTarget(undefined);
		};
	}, []);

	useEffect(() => {
		setMapTheme(theme === "dark");
	}, [theme]);

	useEffect(() => {
		setSunLayerSettings(dayNightLayer, dayNightLayerBrightness);
		setDataLayersSettings(airportMarkerSize, planeMarkerSize);
	}, [dayNightLayer, dayNightLayerBrightness, planeMarkerSize, airportMarkerSize]);

	return <div id="map" />;
}
