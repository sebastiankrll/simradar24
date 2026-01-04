import type { PilotLong, TrackPoint } from "@sr24/types/interface";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { decodeTrackPoints } from "@/components/Map/trackFeatures";
import Spinner from "@/components/Spinner/Spinner";
import { fetchApi } from "@/utils/api";
import { initDataLayers } from "../../lib/map";
import { ReplayControl } from "./ReplayControl";
import ReplayMap from "./ReplayMap";
import ReplayPanel from "./ReplayPanel";

interface ApiData {
	pilot: PilotLong;
	trackPoints: TrackPoint[];
}

export function Replay({ id, setOpen }: { id: string; setOpen: React.Dispatch<React.SetStateAction<string | null>> }) {
	const { data, isLoading } = useSWR<ApiData>(`/data/pilot/${id}`, fetchApi, {
		revalidateIfStale: false,
		revalidateOnFocus: false,
		shouldRetryOnError: false,
	});
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		if (!data) return;
		console.log(data.trackPoints);
		const trackPoints = decodeTrackPoints(data.trackPoints, true);
		initDataLayers(data.pilot, trackPoints);
	}, [data]);

	if (!data || isLoading) {
		return <Spinner />;
	}

	return (
		<div id="map-wrapper">
			<ReplayMap />
			<ReplayPanel pilot={data.pilot} />
			<ReplayControl progress={progress} setProgress={setProgress} setOpen={setOpen} />
		</div>
	);
}
