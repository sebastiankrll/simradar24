import type { PilotLong } from "@sr24/types/interface";
import { getAirlineIcon } from "@/components/Icon/Icon";
import type { PilotPanelStatic } from "../../../app/(map)/components/Panels/Pilot/PilotPanel";

export function PilotTitle({ pilot, data }: { pilot: PilotLong; data: PilotPanelStatic }) {
	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = data.airline?.iata ? data.airline.iata + callsignNumber : pilot?.callsign;

	return (
		<div className="panel-container title-section">
			<div className="panel-icon" style={{ backgroundColor: data.airline?.color?.[0] ?? "" }}>
				{getAirlineIcon(data.airline)}
			</div>
			<div className="panel-title">
				<p>{data.airline?.name}</p>
				<div className="panel-desc-items">
					<div className="panel-desc-item r">{flightNumber}</div>
					<div className="panel-desc-item g">{pilot.aircraft}</div>
				</div>
			</div>
		</div>
	);
}
