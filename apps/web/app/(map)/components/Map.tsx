"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import { useSettingsStore } from "@/storage/zustand";
import { MessageBoxCloseButton } from "../../../components/MessageBox/MessageBox";
import { setDataLayersSettings } from "../lib/dataLayers";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "../lib/events";
import { getMap, initMap, setMapTheme } from "../lib/init";
import { animatePilotFeatures } from "../lib/pilotFeatures";
import { setSunLayerSettings } from "../lib/sunLayer";
import Controls from "./Controls";
import Initializer from "./Initializer";
import BasePanel from "./Panels/BasePanel";

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
			<Controls />
			<div id="map" />
		</>
	);
}
