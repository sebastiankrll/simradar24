"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";
import { useSettingsStore } from "@/storage/zustand";
import "./Bookings.css";
import { mapService } from "../lib";

export default function BookingsMap() {
	const { theme } = useTheme();
	const { dayNightLayer, dayNightLayerBrightness, airportMarkerSize, traconColor, firColor } = useSettingsStore();

	useEffect(() => {
		const map = mapService.init({ autoTrackPoints: false, disableCenterOnPageLoad: true });
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
		mapService.setSettings({ dayNightLayer, dayNightLayerBrightness, airportMarkerSize, traconColor, firColor });
	}, [dayNightLayer, dayNightLayerBrightness, airportMarkerSize, traconColor, firColor]);

	return <div id="map" />;
}
