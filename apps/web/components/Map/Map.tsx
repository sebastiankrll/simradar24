"use client";

import { useEffect } from "react";
import "./Map.css";
import { useRouter } from "next/navigation";
import { onClick, onMoveEnd, onPointerMove, setNavigator } from "./utils/events";
import { initMap } from "./utils/init";

export default function OMap() {
	const router = useRouter();

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

	return <div id="map" />;
}
