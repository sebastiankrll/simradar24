"use client";

import "./AirportPanel.css";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { mapService } from "@/app/(map)/lib";
import Icon from "@/components/Icon/Icon";

export default function AirportPanel({ icao, children }: { icao: string; children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();

	const [shared, setShared] = useState(false);
	const onShareClick = () => {
		navigator.clipboard.writeText(`${window.location.origin}/airport/${icao}`);
		setShared(true);
		setTimeout(() => setShared(false), 2000);
	};

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">{icao}</div>
				<button className="panel-close" type="button" onClick={() => mapService.resetMap()}>
					<Icon name="cancel" size={24} />
				</button>
			</div>
			{children}
			<div className="panel-navigation">
				<button
					className={`panel-navigation-button${pathname === `/airport/${icao}` ? " active" : ""}`}
					type="button"
					onClick={() => {
						router.push(`/airport/${icao}`);
					}}
				>
					<Icon name="geofence" size={20} />
					<p>General</p>
				</button>
				<button
					className={`panel-navigation-button${pathname === `/airport/${icao}/departures` ? " active" : ""}`}
					type="button"
					onClick={() => {
						router.push(`/airport/${icao}/departures`);
					}}
				>
					<Icon name="departure" size={20} />
					<p>Departures</p>
				</button>
				<button
					className={`panel-navigation-button${pathname === `/airport/${icao}/arrivals` ? " active" : ""}`}
					type="button"
					onClick={() => {
						router.push(`/airport/${icao}/arrivals`);
					}}
				>
					<Icon name="arrival" size={20} />
					<p>Arrivals</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => onShareClick()}>
					<Icon name="share-android" size={20} />
					<p>{shared ? "Copied!" : "Share"}</p>
				</button>
			</div>
		</>
	);
}
