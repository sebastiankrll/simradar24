"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { ToastContainer } from "react-toastify";
import { MessageBoxCloseButton } from "../MessageBox/MessageBox";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "./utils/events";
import { initMap } from "./utils/init";
import { animatePilotFeatures } from "./utils/pilotFeatures";
import MapControls from "./components/MapControls";

export default function OMap() {
	const router = useRouter();

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

	return (
		<>
			<ToastContainer closeButton={MessageBoxCloseButton} icon={false} theme="colored" />
			<MapControls />
			<div id="map" />
		</>
	);
}
