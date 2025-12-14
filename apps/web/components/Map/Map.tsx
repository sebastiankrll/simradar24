"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ToastContainer } from "react-toastify";
import { useSettingsStore } from "@/storage/zustand";
import { MessageBoxCloseButton } from "../MessageBox/MessageBox";
import MapControls from "./components/MapControls";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "./utils/events";
import { initMap, setMapTheme } from "./utils/init";
import { animatePilotFeatures } from "./utils/pilotFeatures";
import { toggleSunLayer } from "./utils/sunLayer";

export default function OMap() {
	const router = useRouter();
	const { theme } = useTheme();
	const { dayNightLayer } = useSettingsStore();

	useEffect(() => {
		setNavigator((href) => router.push(href));

		const map = initMap();
		map.on(["moveend"], onMoveEnd);
		map.on("pointermove", onPointerMove);
		map.on("click", onClick);

		let animationFrameId = 0;
		const animate = () => {
			animatePilotFeatures(map);
			animationFrameId = window.requestAnimationFrame(animate);
		};
		animationFrameId = window.requestAnimationFrame(animate);

		return () => {
			map.un(["moveend"], onMoveEnd);
			map.un("pointermove", onPointerMove);
			map.un("click", onClick);
			map.setTarget(undefined);
			window.cancelAnimationFrame(animationFrameId);
		};
	}, [router]);

	useEffect(() => {
		setMapTheme(theme === "dark");
	}, [theme]);

	useEffect(() => {
		toggleSunLayer(dayNightLayer);
	}, [dayNightLayer]);

	return (
		<>
			<ToastContainer closeButton={MessageBoxCloseButton} icon={false} theme="colored" />
			<MapControls />
			<div id="map" />
		</>
	);
}
