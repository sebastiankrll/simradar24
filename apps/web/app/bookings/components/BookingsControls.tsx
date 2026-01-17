import type { SyntheticEvent } from "react";
import Icon from "@/components/Icon/Icon";
import { RangeSwitch } from "@/components/Input/Input";
import { REPLAY_SPEEDS } from "./Bookings";
import "@/components/Map/ReplayControl/ReplayControl.css";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";

export function BookingsControl({
	progress,
	setProgress,
	setNow,
	setSpeedIndex,
	speedIndex,
	setPlaying,
	playing,
	currentTime,
	max,
}: {
	progress: number;
	setProgress: React.Dispatch<React.SetStateAction<number>>;
	setNow: () => void;
	setSpeedIndex: React.Dispatch<React.SetStateAction<number>>;
	speedIndex: number;
	setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
	playing: boolean;
	currentTime: number | undefined;
	max: number;
}) {
	const { timeFormat, timeZone } = useSettingsStore();

	return (
		<div id="replay-control">
			<button type="button" className="replay-button" onClick={() => setPlaying((prev) => !prev)}>
				<Icon name={playing ? "pause" : "play"} size={24} />
			</button>
			<button
				type="button"
				className="replay-button"
				style={{ width: 48 }}
				onClick={() => setSpeedIndex((prev) => (prev === REPLAY_SPEEDS.length - 1 ? 0 : prev + 1))}
			>
				{REPLAY_SPEEDS[speedIndex]}
			</button>
			<button type="button" className="replay-button" style={{ width: 48 }} onClick={() => setNow()}>
				Now
			</button>
			<RangeSwitch
				value={progress}
				onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
					setProgress(newValue as number);
				}}
				min={0}
				max={max}
			/>
			<div id="replay-info">{`${getShortDate(currentTime)} ${convertTime(currentTime, timeFormat, timeZone)}`}</div>
		</div>
	);
}

function getShortDate(time: number | undefined): string {
	if (time === undefined) return "";
	const date = new Date(time);
	return date.toISOString().split("T")[0];
}
