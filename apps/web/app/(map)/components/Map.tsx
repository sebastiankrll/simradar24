"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Clock from "@/components/Footer/Clock";
import Footer from "@/components/Footer/Footer";
import Metrics from "@/components/Footer/Metrics";
import { useSettingsStore } from "@/storage/zustand";
import { setSunLayerSettings } from "../../../components/Map/sunLayer";
import BasePanel from "../../../components/Panel/BasePanel";
import { setDataLayersSettings } from "../lib/dataLayers";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "../lib/events";
import { getMap, initMap, setMapTheme } from "../lib/init";
import { animatePilotFeatures } from "../lib/pilotFeatures";
import Controls from "./Controls";
import Initializer from "./Initializer";

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
			<Initializer />
			<BasePanel>{children}</BasePanel>
			<Controls />
			<div id="map" />
			<Footer>
				<div className="footer-item" id="footer-main">
					<Metrics />
					<Clock />
				</div>
			</Footer>
		</>
	);
}
