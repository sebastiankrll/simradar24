import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/vatsim";
import { useSettingsStore } from "@/storage/zustand";
import { convertDistance, haversineDistance } from "@/utils/helpers";

function formatTimeDelta(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	return `${hours}h ${remainingMinutes}m`;
}

export function PilotProgress({ pilot, departure, arrival }: { pilot: PilotLong; departure: StaticAirport | null; arrival: StaticAirport | null }) {
	const { distanceUnit } = useSettingsStore();

	const departureDistKm = departure ? haversineDistance([departure.latitude, departure.longitude], [pilot.latitude, pilot.longitude]) : 0;
	const arrivalDistKm = arrival ? haversineDistance([arrival.latitude, arrival.longitude], [pilot.latitude, pilot.longitude]) : 0;
	const totalDistKm = departureDistKm + arrivalDistKm;
	const progress = totalDistKm > 0 ? Math.round((departureDistKm / totalDistKm) * 100) : 0;

	let timeSinceDeparture = "";
	let timeUntilArrival = "";
	const now = new Date();

	if (pilot.times) {
		if (new Date(pilot.times.off_block) > now) {
			const delta = Math.floor((new Date(pilot.times.off_block).getTime() - now.getTime()) / 60000);
			timeSinceDeparture = `in ${formatTimeDelta(delta)}`;
		} else {
			const delta = Math.floor((now.getTime() - new Date(pilot.times.off_block).getTime()) / 60000);
			timeSinceDeparture = `${formatTimeDelta(delta)} ago`;
		}

		if (new Date(pilot.times.on_block) > now) {
			const delta = Math.floor((new Date(pilot.times.on_block).getTime() - now.getTime()) / 60000);
			timeUntilArrival = `in ${formatTimeDelta(delta)}`;
		} else {
			const delta = Math.floor((now.getTime() - new Date(pilot.times.on_block).getTime()) / 60000);
			timeUntilArrival = `${formatTimeDelta(delta)} ago`;
		}
	}

	return (
		<div id="panel-pilot-progress">
			<div id="panel-pilot-progressbar">
				<div id="panel-pilot-progressbar-value" style={{ width: `${progress}%` }}></div>
				<div id="panel-pilot-progressbar-icon" style={{ left: `${Math.max(Math.min(progress, 98), 2)}%` }}></div>
			</div>
			<div id="panel-pilot-progress-data">
				<p>{`${convertDistance(departureDistKm, distanceUnit)}, ${timeSinceDeparture}`}</p>
				<p>{`${convertDistance(arrivalDistKm, distanceUnit)}, ${timeUntilArrival}`}</p>
			</div>
		</div>
	);
}
