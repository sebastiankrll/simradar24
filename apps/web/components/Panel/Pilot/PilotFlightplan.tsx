import type { PilotLong } from "@sr24/types/interface";
import Icon from "@/components/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import { convertDistance, haversineDistance } from "@/utils/helpers";
import type { PilotPanelStatic } from "../../../app/(map)/components/Panels/Pilot/PilotPanel";

export function PilotFlightplan({
	pilot,
	data,
	openSection,
	ref,
}: {
	pilot: PilotLong;
	data: PilotPanelStatic;
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const { distanceUnit } = useSettingsStore();

	const distKm =
		data.departure && data.arrival
			? haversineDistance([data.departure.latitude, data.departure.longitude], [data.arrival.latitude, data.arrival.longitude])
			: null;

	// Enroute time from seconds to hh:mm forma
	const enrouteTime = pilot.flight_plan?.enroute_time
		? (() => {
				const totalMinutes = Math.floor(pilot.flight_plan.enroute_time / 60);
				const hours = Math.floor(totalMinutes / 60);
				const minutes = totalMinutes % 60;
				return `${hours}h ${minutes}m`;
			})()
		: "N/A";

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "info" ? " open" : ""}`}>
			<div className="panel-section-title">
				<Icon name="documents" size={24} />
			</div>
			<div className="panel-section-content">
				<div className="panel-sub-container">
					<div className="panel-data-item">
						<p>Great circle distance</p>
						<p>{distKm !== null ? `${convertDistance(distKm, distanceUnit)}` : "N/A"}</p>
					</div>
					<div className="panel-data-item">
						<p>Enroute time</p>
						<p>{enrouteTime}</p>
					</div>
				</div>
				<div className="panel-sub-container" id="panel-pilot-flightplan">
					<div className="panel-data-item">
						<p>Flight plan</p>
						<p>{pilot.flight_plan?.route || "No flight plan filed"}</p>
					</div>
					<div className="panel-data-item">
						<p>Remarks</p>
						<p>{pilot.flight_plan?.remarks || "N/A"}</p>
					</div>
					<div className="panel-data-item">
						<p>Flight rules</p>
						<p>{pilot.flight_plan?.flight_rules || "N/A"}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
