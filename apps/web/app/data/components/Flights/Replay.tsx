import type { DeltaTrackPoint, PilotLong, TrackPoint } from "@sr24/types/interface";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { decodeTrackPoints } from "@/components/Map/trackFeatures";
import Spinner from "@/components/Spinner/Spinner";
import { fetchApi } from "@/utils/api";
import { initDataLayers, updatePilot } from "../../lib/map";
import { ReplayControl } from "./ReplayControl";
import ReplayMap from "./ReplayMap";
import ReplayPanel from "./ReplayPanel";

interface ApiData {
	pilot: PilotLong;
	trackPoints?: (TrackPoint | DeltaTrackPoint)[];
}

export const REPLAY_SPEEDS = [1, 2, 4, 8, 16];

export function Replay({ id, setOpen }: { id: string; setOpen: React.Dispatch<React.SetStateAction<string | null>> }) {
	const { data, isLoading } = useSWR<ApiData>(`/data/pilot/${id}`, fetchApi, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});
	const [trackPoints, setTrackPoints] = useState<Required<TrackPoint>[]>([]);
	const [progress, setProgress] = useState(0);

	const [playing, setPlaying] = useState(false);
	const [speedIndex, setSpeedIndex] = useState(3);

	useEffect(() => {
		if (!data) return;

		const trackPoints = decodeTrackPoints(data.trackPoints, true);
		setTrackPoints(trackPoints);
		initDataLayers(data.pilot, trackPoints);
	}, [data]);

	useEffect(() => {
		updatePilot(trackPoints[progress]);
	}, [progress, trackPoints]);

	useEffect(() => {
		if (!playing) return;
		if (trackPoints.length === 0) return;

		const intervalMs = 15000 / REPLAY_SPEEDS[speedIndex];
		const maxIndex = trackPoints.length - 1;

		const interval = setInterval(() => {
			setProgress((prev) => {
				if (prev >= maxIndex) {
					setPlaying(false);
					return prev;
				}
				return prev + 1;
			});
		}, intervalMs);

		return () => clearInterval(interval);
	}, [playing, speedIndex, trackPoints.length]);

	if (!data || isLoading) {
		return <Spinner />;
	}

	return (
		<div id="map-wrapper">
			<ReplayMap />
			<ReplayPanel pilot={data.pilot} trackPoints={trackPoints} index={progress} />
			<ReplayControl
				progress={progress}
				setProgress={setProgress}
				setOpen={setOpen}
				setSpeedIndex={setSpeedIndex}
				speedIndex={speedIndex}
				setPlaying={setPlaying}
				playing={playing}
				max={trackPoints.length - 1}
			/>
		</div>
	);
}
