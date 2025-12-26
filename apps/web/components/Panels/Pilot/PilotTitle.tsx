import type { StaticAirline } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/vatsim";
import type { PilotPanelStatic } from "./PilotPanel";

export function getIcon(airline: StaticAirline | null): React.ReactNode {
	if (!airline?.iata) {
		return <p style={{ color: "var(--color-green)" }}>?</p>;
	}

	const color = airline.color;

	if (color && color.length > 2) {
		const letters = airline.iata.split("");

		return (
			<p style={{ background: color[0] }}>
				<span style={{ color: color[1] }}>{letters[0]}</span>
				<span style={{ color: color[2] }}>{letters[1]}</span>
			</p>
		);
	}

	return <p style={{ backgroundColor: color?.[0] || "", color: color?.[1] || "var(--color-green)" }}>{airline.iata}</p>;
}

export function PilotTitle({ pilot, data }: { pilot: PilotLong; data: PilotPanelStatic }) {
	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = data.airline?.iata ? data.airline.iata + callsignNumber : pilot?.callsign;

	return (
		<div className="panel-container title-section">
			<div className="panel-icon" style={{ backgroundColor: data.airline?.color?.[0] ?? "" }}>
				{getIcon(data.airline)}
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
