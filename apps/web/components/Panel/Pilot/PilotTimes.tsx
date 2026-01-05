import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";
import { getDelayColorFromDates } from "../utils";

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
				<span className={`delay-indicator ${getDelayColorFromDates(pilot.times?.sched_on_block, pilot.times?.on_block) ?? ""}`}></span>
				{convertTime(pilot.times?.on_block, timeFormat, timeZone, false, arrival?.timezone)}
			</p>
		</div>
	);
}
