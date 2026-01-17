import { useRouter } from "next/navigation";
import { type SyntheticEvent, useState } from "react";
import Icon from "@/components/Icon/Icon";
import { RangeSwitch } from "@/components/Input/Input";
import { fitRouteToView, followPilot } from "../../lib";
import { REPLAY_SPEEDS } from "./Replay";
import "@/components/Map/ReplayControl/ReplayControl.css";

export function ReplayControl({
	progress,
	setProgress,
	setSpeedIndex,
	speedIndex,
	setPlaying,
	playing,
	onDownload,
	max,
}: {
	progress: number;
	setProgress: React.Dispatch<React.SetStateAction<number>>;
	setSpeedIndex: React.Dispatch<React.SetStateAction<number>>;
	speedIndex: number;
	setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
	playing: boolean;
	onDownload: () => void;
	max: number;
}) {
	const router = useRouter();
	const [follow, setFollow] = useState(false);

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
			<button type="button" className="replay-button" onClick={() => fitRouteToView()}>
				<Icon name="tour" size={18} />
			</button>
			<button
				type="button"
				className={`replay-button ${follow ? "active" : ""}`}
				onClick={() => {
					setFollow((prev) => !prev);
					followPilot(!follow);
				}}
			>
				<Icon name="gps" size={18} />
			</button>
			<RangeSwitch
				value={progress}
				onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
					setProgress(newValue as number);
				}}
				min={0}
				max={max}
			/>
			<button type="button" className="replay-button" onClick={() => onDownload()}>
				<Icon name="download" size={24} />
			</button>
			<button type="button" className="replay-button" id="replay-close" onClick={() => router.back()}>
				<Icon name="cancel" size={24} />
			</button>
		</div>
	);
}
