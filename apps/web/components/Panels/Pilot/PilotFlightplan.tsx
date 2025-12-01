import type { PilotLong } from "@sk/types/vatsim";
import { haversineDistance } from "@/utils/helpers";
import type { PilotPanelStatic } from "./PilotPanel";

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
				<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
					<title>Flightplan</title>
					<path
						fillRule="evenodd"
						d="M16.824 13.162h-.798v4.132h.798zm-.648-1.771c-.1 0-.15.05-.2.098-.05.05-.05.148-.1.197-.05.098-.05.148-.05.246 0 .05.05.098.05.197 0 .098.05.148.1.197s.15.049.2.098c.05.05.1.05.2.05.099 0 .149-.05.249-.05s.15-.05.2-.098c.05-.05.099-.148.149-.197s.05-.098.05-.197c0-.098 0-.197-.05-.246-.05-.05-.1-.098-.15-.197-.05-.049-.1-.049-.2-.098-.1-.05-.149-.05-.249-.05-.05 0-.15 0-.2.05Zm7.682-5.608a.7.7 0 0 0-.15-.197c-1.496-1.082-2.095-.935-4.29-.246L14.33 7.111c-.948-.344-2.045-.738-3.143-1.131-1.646-.64-3.392-1.23-5.138-1.87-.499-.197-.798-.098-1.147.05l-.699.295c-.1.049-.499.196-.548.54-.05.197 0 .394.2.542C5.2 6.668 7.046 8.292 8.542 9.522L5.8 10.604a37 37 0 0 1-1.647-.443 95 95 0 0 1-1.845-.443c-.1-.049-.2 0-.3 0l-1.696.64c-.15.05-.299.197-.299.393-.05.197.05.345.2.443 1.346 1.033 1.995 1.525 2.594 1.919.449.344.848.64 1.596 1.18l.05.05c.25.147.548.196.798.196.3 0 .648-.098.998-.246l4.689-1.77a5.1 5.1 0 0 0-.3 1.77c0 3.149 2.595 5.707 5.787 5.707 3.193 0 5.787-2.558 5.787-5.707 0-2.115-1.148-3.935-2.893-4.919l2.793-1.033c.649-.295 2.395-.984 1.746-2.558m-2.694 8.51c0 2.608-2.145 4.723-4.789 4.723s-4.789-2.115-4.789-4.723 2.145-4.722 4.79-4.722c2.643 0 4.788 2.164 4.788 4.722m-3.242-5.46c-.5-.148-.998-.197-1.547-.197-2.045 0-3.84 1.082-4.889 2.657L5.8 13.457c-.5.246-.749.148-.898.098a11 11 0 0 0-1.547-1.18c-.449-.345-.948-.689-1.845-1.378l.698-.295 1.646.443c.549.148 1.098.295 1.746.443.15.049.3.049.4 0l3.341-1.28c.2-.098.4-.294.4-.491.05-.246-.05-.443-.2-.59C8.194 8.045 6.348 6.52 4.901 5.29l.4-.197c.25-.098.3-.098.449-.05 1.696.64 3.492 1.28 5.088 1.821 1.197.443 2.295.836 3.243 1.18.05 0 .1.05.15.05h.099c.05 0 .1 0 .15-.05l5.238-1.77c2.045-.64 2.294-.689 3.242 0 .1.295 0 .64-1.297 1.131z"
						clipRule="evenodd"
					></path>
				</svg>
			</div>
			<div className="panel-section-content">
				<div className="panel-sub-container">
					<div className="panel-data-item">
						<p>Great circle distance</p>
						<p>{distKm !== null ? `${distKm} km` : "N/A"}</p>
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
