"use client";

import { useEffect } from "react";
import "./Map.css";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Initializer from "@/components/Initializer/Initializer";
import BasePanel from "@/components/Panel/BasePanel";
import { useMapRotationStore, useSettingsStore } from "@/storage/zustand";
import { init, mapService } from "../lib";
import Controls from "./Controls";

export default function OMap({ children }: { children?: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();

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
	const { setRotation } = useMapRotationStore();

	useEffect(() => {
		const handleMoveEnd = () => {
			const rotation = map.getView().getRotation();
			setRotation(rotation);
		};

		const map = mapService.init({ onNavigate: (href) => router.push(href), autoTrackPoints: true });
		map.on("moveend", handleMoveEnd);
		mapService.addEventListeners();

		return () => {
			mapService.removeEventListeners();
			map.un("moveend", handleMoveEnd);
			map.setTarget(undefined);
		};
	}, [router, setRotation]);

	useEffect(() => {
		init(pathname);
	}, [pathname]);

	useEffect(() => {
		mapService.setTheme(theme);
	}, [theme]);

	useEffect(() => {
		mapService.setSettings({
			dayNightLayer,
			dayNightLayerBrightness,
			airportMarkers,
			airportMarkerSize,
			planeMarkerSize,
			sectorAreas,
			traconColor,
			firColor,
			animatedPlaneMarkers,
		});
	}, [
		dayNightLayer,
		dayNightLayerBrightness,
		airportMarkers,
		airportMarkerSize,
		planeMarkerSize,
		sectorAreas,
		traconColor,
		firColor,
		animatedPlaneMarkers,
	]);

	return (
		<>
			<Initializer />
			<BasePanel>{children}</BasePanel>
			<Controls />
			<div id="map" />
		</>
	);
}
