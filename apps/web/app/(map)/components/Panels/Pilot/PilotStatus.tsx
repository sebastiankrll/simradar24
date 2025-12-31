import type { PilotLong } from "@sr24/types/interface";
import flightStatusSprite from "@/assets/images/sprites/flightStatusSprite.png";
import { PilotAirport } from "./PilotAirport";
import type { PilotPanelStatic } from "./PilotPanel";
import { PilotProgress } from "./PilotProgress";
import { PilotTimes } from "./PilotTimes";

function getSpriteOffset(status: string | undefined) {
	switch (status) {
		case "Climb":
			return -30;
		case "Cruise":
			return -60;
		case "Descent":
			return -90;
		default:
			return 0;
	}
}

export function PilotStatus({ pilot, data }: { pilot: PilotLong; data: PilotPanelStatic }) {
	return (
		<div className="panel-container" id="panel-pilot-status">
			<div id="panel-pilot-route">
				<PilotAirport airport={data.departure} />
				<div id="panel-pilot-route-line"></div>
				<div
					id="panel-pilot-route-icon"
					style={{
						backgroundImage: `url(${flightStatusSprite.src})`,
						backgroundPositionY: `${getSpriteOffset(pilot.times?.state)}px`,
					}}
				></div>
				<PilotAirport airport={data.arrival} />
			</div>
			<PilotTimes pilot={pilot} departure={data.departure} arrival={data.arrival} />
			<PilotProgress pilot={pilot} departure={data.departure} arrival={data.arrival} />
		</div>
	);
}
