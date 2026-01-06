import type { StaticAircraft } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { useEffect, useState } from "react";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";
import Icon from "@/components/Icon/Icon";
import { getCachedAircraft } from "@/storage/cache";

export function PilotAircraft({ pilot }: { pilot: PilotLong }) {
	const [aircraft, setAircraft] = useState<StaticAircraft | null>(null);

	useEffect(() => {
		const registration = pilot.flight_plan?.ac_reg;
		if (!registration) {
			setAircraft(null);
			return;
		}
		(async () => {
			const aircraft = await getCachedAircraft(registration);
			setAircraft(aircraft);
		})();
	}, [pilot]);

	const acType = `${aircraft?.manufacturerName || ""} ${aircraft?.model || ""}`;
	return (
		<div className="panel-sub-container sep">
			<div className="panel-section-title">
				<Icon name="aircraft" size={24} />
			</div>
			<div className="panel-section-content" id="panel-pilot-aircraft">
				<div className="panel-data-item" style={!aircraft ? { gridArea: "inherit" } : undefined}>
					<p>Aircraft type</p>
					<p>{acType.trim() ? acType : pilot.aircraft}</p>
				</div>
				{!aircraft && (
					<div className="panel-data-item">
						<p>Registration</p>
						<p>{pilot.flight_plan?.ac_reg}</p>
					</div>
				)}
				{aircraft && (
					<>
						<div className="panel-data-item">
							<p>Registration</p>
							<p>{pilot.flight_plan?.ac_reg}</p>
						</div>
						<div className="panel-data-item">
							<p>Country of reg.</p>
							<p
								className={`fflag ff-lg fflag-${aircraft?.country}`}
								id="panel-pilot-aircraft-country"
								style={{ backgroundImage: `url(${FlagSprite.src})` }}
							></p>
						</div>
						<div className="panel-data-item">
							<p>Owner</p>
							<p>{aircraft?.owner || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>Serial number (MSN)</p>
							<p>{aircraft?.serialNumber || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>Icao24</p>
							<p>{aircraft?.icao24 || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>SELCAL</p>
							<p>{aircraft?.selCal || "N/A"}</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
