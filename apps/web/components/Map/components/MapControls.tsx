"use client";

import { useRouter } from "next/navigation";
import "./MapControls.css";

export default function MapControls() {
	const router = useRouter();

	return (
		<div id="map-controls">
			<button type="button" className="map-control-item">
				+
			</button>
			<button type="button" className="map-control-item">
				-
			</button>
			<button type="button" className="map-control-item" onClick={() => router.push("/settings")}>
				S
			</button>
		</div>
	);
}
