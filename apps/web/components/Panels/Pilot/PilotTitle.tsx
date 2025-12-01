import type { PilotLong } from "@sk/types/vatsim";
import type { PilotPanelStatic } from "./PilotPanel";

export function PilotTitle({ pilot, data }: { pilot: PilotLong; data: PilotPanelStatic }) {
	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = data.airline?.iata ? data.airline.iata + callsignNumber : pilot?.callsign;

	return (
		<div className="panel-container title-section">
			<div className="panel-icon" style={{ backgroundColor: data.airline?.bg ?? "none" }}>
				<p
					style={{
						color: data.airline?.font ?? "var(--color-green)",
					}}
				>
					{data.airline?.iata || "?"}
				</p>
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
