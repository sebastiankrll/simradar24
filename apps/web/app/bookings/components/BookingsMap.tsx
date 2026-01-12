"use client";

import { useSettingsStore } from "@/storage/zustand";
import { useTheme } from "next-themes";
import { useEffect } from "react";
import { initMap, setDataLayersSettings, setMapTheme } from "../lib/map";
import { setSunLayerSettings } from "@/components/Map/sunLayer";
import "./Bookings.css";

export default function BookingsMap() {
	const { theme } = useTheme();
	const { dayNightLayer, dayNightLayerBrightness, airportMarkerSize, traconColor, firColor } = useSettingsStore();

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
		setDataLayersSettings(airportMarkerSize, traconColor, firColor);
	}, [dayNightLayer, dayNightLayerBrightness, airportMarkerSize, traconColor, firColor]);

	return <div id="map" />;
}
