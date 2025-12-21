"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import { useSettingsStore } from "@/storage/zustand";
import Initializer from "../Initializer/Initializer";
import BasePanel from "../Panels/BasePanel";
import { MessageBoxCloseButton } from "../shared/MessageBox/MessageBox";
import MapControls from "./components/MapControls";
import { setDataLayersSettings } from "./utils/dataLayers";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "./utils/events";
import { getMap, initMap, setMapTheme } from "./utils/init";
import { animatePilotFeatures } from "./utils/pilotFeatures";
import { setSunLayerSettings } from "./utils/sunLayer";

export default function OMap({ children }: { children?: React.ReactNode }) {
	const router = useRouter();

	const { theme } = useTheme();
	const {
		dayNightLayer,
		dayNightLayerBrightness,
		airportMarkers,
		airportMarkerSize,
		planeMarkerSize,
		animatedPlaneMarkers,
		sectorAreas,
		traconColor,
		firColor,
	} = useSettingsStore();

	useEffect(() => {
		setNavigator((href) => router.push(href));

		const map = initMap();
		map.on(["moveend"], onMoveEnd);
		map.on("pointermove", onPointerMove);
		map.on("click", onClick);

		return () => {
			map.un(["moveend"], onMoveEnd);
			map.un("pointermove", onPointerMove);
			map.un("click", onClick);
			map.setTarget(undefined);
		};
	}, [router]);

	useEffect(() => {
		setMapTheme(theme === "dark");
	}, [theme]);

	useEffect(() => {
		if (!animatedPlaneMarkers) return;

		const map = getMap();
		if (!map) return;

		let animationFrameId = 0;
		const animate = () => {
			animatePilotFeatures(map);
			animationFrameId = window.requestAnimationFrame(animate);
		};
		animationFrameId = window.requestAnimationFrame(animate);

		return () => {
			window.cancelAnimationFrame(animationFrameId);
		};
	}, [animatedPlaneMarkers]);

	useEffect(() => {
		setSunLayerSettings(dayNightLayer, dayNightLayerBrightness);
		setDataLayersSettings(airportMarkers, airportMarkerSize, planeMarkerSize, sectorAreas, traconColor, firColor);
	}, [dayNightLayer, dayNightLayerBrightness, airportMarkers, airportMarkerSize, planeMarkerSize, sectorAreas, traconColor, firColor]);

	return (
		<>
			<ToastContainer closeButton={MessageBoxCloseButton} icon={false} theme="colored" />
			<Initializer />
			<BasePanel>{children}</BasePanel>
			<MapControls />
			<div id="map" />
		</>
	);
}
