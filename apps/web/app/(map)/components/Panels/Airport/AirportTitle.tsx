import type { StaticAirport } from "@sr24/types/db";
import { useEffect, useState } from "react";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";

function formatLocalTime(tz: string): string {
	const now = new Date();

	const time = new Intl.DateTimeFormat("en-US", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(now);

	const date = new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		timeZone: tz,
	}).format(now);

	return `${time} | ${date}`;
}

export function AirportTitle({ staticAirport }: { staticAirport: StaticAirport | null }) {
	const [time, setTime] = useState<string>("N/A");

	useEffect(() => {
		if (!staticAirport?.timezone) {
			setTime("N/A");
			return;
		}

		const updateTime = () => {
			setTime(formatLocalTime(staticAirport.timezone));
		};

		updateTime();
		const interval = setInterval(updateTime, 1000);

		return () => clearInterval(interval);
	}, [staticAirport]);

	return (
		<div className="panel-container title-section">
			<div className="panel-icon">
				<div className={`fflag ff-lg fflag-${staticAirport?.country}`} style={{ backgroundImage: `url(${FlagSprite.src})` }}></div>
			</div>
			<div className="panel-title">
				<p>{staticAirport?.name || "Unknown Airport"}</p>
				<div className="panel-desc-items">
					<div className="panel-desc-item r">{staticAirport?.iata || "N/A"}</div>
					<div className="panel-desc-item g">{time}</div>
				</div>
			</div>
		</div>
	);
}
