import type { PilotLong } from "@sk/types/vatsim";
import flightStatusSprite from "../lib/sprites/flightStatusSprite.png";
import type { PilotPanelFetchData } from "../PilotPanel";
import { PilotAirport } from "./PilotAirport";
import { PilotProgress } from "./PilotProgress";
import { PilotTimes } from "./PilotTimes";

export function PilotStatus({ pilot, data }: { pilot: PilotLong; data: PilotPanelFetchData }) {
	const getSpriteOffset = (status: string | undefined) => {
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
	};

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
			<PilotTimes pilot={pilot} />
			<PilotProgress pilot={pilot} departure={data.departure} arrival={data.arrival} />
		</div>
	);
}
