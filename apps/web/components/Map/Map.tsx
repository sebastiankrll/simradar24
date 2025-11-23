"use client";

import { useEffect } from "react";
import "./Map.css";
import { updateCache } from "@/storage/cache";
import { dxInitDatabases } from "@/storage/dexie";
import { wsClient } from "@/utils/ws";
import { initAirportFeatures, setFeatures } from "./utils/dataLayers";
import { onClick, onMoveEnd, onPointerMove } from "./utils/events";
import { getMapView, initMap } from "./utils/init";

async function init() {
	await dxInitDatabases();
	await initAirportFeatures();

	const view = getMapView();
	if (!view) return;
	setFeatures(view.calculateExtent(), view.getZoom() || 2);
}
init();

wsClient.addListener((msg) => {
	updateCache(msg);
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
