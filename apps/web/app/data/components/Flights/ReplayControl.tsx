import { type SyntheticEvent, useState } from "react";
import Icon from "@/components/Icon/Icon";
import { RangeSwitch } from "@/components/Input/Input";

const REPLAY_SPEEDS = [1, 2, 4, 8];

export function ReplayControl({
	progress,
	setProgress,
	setOpen,
}: {
	progress: number;
	setProgress: React.Dispatch<React.SetStateAction<number>>;
	setOpen: React.Dispatch<React.SetStateAction<string | null>>;
}) {
	const [speedIndex, setSpeedIndex] = useState(0);

	return (
		<div id="replay-control">
			<button type="button" className="replay-button" onClick={() => {}}>
				<Icon name="forward" size={24} />
			</button>
			<button
				type="button"
				className="replay-button"
				id="replay-speed"
				onClick={() =>
					setSpeedIndex((prev) => {
						if (prev === REPLAY_SPEEDS.length - 1) return 0;
						return prev + 1;
					})
				}
			>
				{`${REPLAY_SPEEDS[speedIndex]} x`}
			</button>
			<RangeSwitch
				value={progress}
				onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
					setProgress(newValue as number);
				}}
			/>
			<button type="button" className="replay-button" id="replay-close" onClick={() => setOpen(null)}>
				<Icon name="cancel" size={24} />
			</button>
		</div>
	);
}
