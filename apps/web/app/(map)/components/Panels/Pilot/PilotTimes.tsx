import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";

export function getDelayColor(scheduled: string | Date | undefined, actual: string | Date | undefined) {
	if (!scheduled || !actual) {
		return null;
	}
	const scheduledDate = new Date(scheduled);
	const actualDate = new Date(actual);
	const delayMinutes = (actualDate.getTime() - scheduledDate.getTime()) / 60000;
	if (delayMinutes >= 30) {
		return "red";
	} else if (delayMinutes >= 15) {
		return "yellow";
	} else if (delayMinutes > 0) {
		return "green";
	}
	return "green";
}

function getTimeStatus(times: PilotLong["times"]): { off: boolean; on: boolean } {
	if (!times) {
		return { off: false, on: false };
	}
	let off = false;
	let on = false;

	const now = new Date();
	if (new Date(times.off_block) < now) {
		off = true;
	}
	if (new Date(times.on_block) < now) {
		on = true;
	}
	return { off, on };
}

export function PilotTimes({ pilot, departure, arrival }: { pilot: PilotLong; departure: StaticAirport | null; arrival: StaticAirport | null }) {
	const { timeFormat, timeZone } = useSettingsStore();
	const timeStatus = getTimeStatus(pilot.times);

	return (
		<div id="panel-pilot-times">
			<p>{convertTime(pilot.times?.sched_off_block, timeFormat, timeZone, false, departure?.timezone)}</p>
			<p className="panel-pilot-time-desc">SCHED</p>
			<p className="panel-pilot-time-desc">SCHED</p>
			<p>{convertTime(pilot.times?.sched_on_block, timeFormat, timeZone, false, arrival?.timezone)}</p>
			<p>{convertTime(pilot.times?.off_block, timeFormat, timeZone, false, departure?.timezone)}</p>
			<p className="panel-pilot-time-desc">{timeStatus.off ? "ACT" : "EST"}</p>
			<p className="panel-pilot-time-desc">{timeStatus.on ? "ACT" : "EST"}</p>
			<p className="panel-pilot-arrival-status">
				<span className={`delay-indicator ${getDelayColor(pilot.times?.sched_on_block, pilot.times?.on_block) ?? ""}`}></span>
				{convertTime(pilot.times?.on_block, timeFormat, timeZone, false, arrival?.timezone)}
			</p>
		</div>
	);
}
