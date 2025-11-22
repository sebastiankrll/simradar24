"use client";

import { useEffect } from "react";
import "./Map.css";
import { dxInitLocalDatabase } from "@/storage/dexie";
import { wsClient } from "@/utils/ws";
import { setPilotFeatures } from "./utils/dataLayers";
import { onClick, onMoveEnd, onPointerMove, updateOverlays } from "./utils/events";
import { initMap } from "./utils/init";

dxInitLocalDatabase();

wsClient.addListener((msg) => {
	// console.log(msg)
	console.time("setPilotFeatures");
	setPilotFeatures(msg.pilots);
	console.timeEnd("setPilotFeatures");
    updateOverlays()
});

export default function OMap() {
	useEffect(() => {
		const map = initMap();
		map.on("moveend", onMoveEnd);
		map.on("pointermove", onPointerMove);
		map.on("click", onClick);

		return () => {
			map.un("moveend", onMoveEnd);
			map.un("pointermove", onPointerMove);
			map.un("click", onClick);
			map.setTarget(undefined);
		};
	}, []);

	return <div id="map" />;
}
