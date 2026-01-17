"use client";

import type { Booking } from "@sr24/types/interface";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Spinner from "@/components/Spinner/Spinner";
import { fetchApi } from "@/utils/api";
import { init, setFeaturesByTime } from "../lib";
import { BookingsControl } from "./BookingsControls";
import BookingsMap from "./BookingsMap";

export const REPLAY_SPEEDS = [1, 2, 4, 8, 16];

export default function Bookings() {
	const { data, isLoading } = useSWR<Booking[]>("/data/bookings", fetchApi, {
		refreshInterval: 10 * 60 * 1000,
		revalidateOnFocus: false,
	});

	const [progress, setProgress] = useState(0);
	const [playing, setPlaying] = useState(false);
	const [speedIndex, setSpeedIndex] = useState(3);

	const timeline = useMemo(() => buildTimeline(data || []), [data]);

	useEffect(() => {
		if (!timeline.length) return;
		setProgress(getCurrentTimelineStep(timeline));
	}, [timeline]);

	useEffect(() => {
		if (data) {
			init(data);
		}
	}, [data]);

	useEffect(() => {
		setFeaturesByTime(timeline[progress]);
	}, [progress, timeline]);

	useEffect(() => {
		if (!playing) return;
		if (!timeline.length) return;

		const intervalMs = (STEP_MINUTES * 60 * 1000) / REPLAY_SPEEDS[speedIndex];
		const maxIndex = timeline.length - 1;

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
	}, [playing, speedIndex, timeline.length]);

	if (!data || isLoading) {
		return <Spinner />;
	}

	return (
		<div id="map-wrapper">
			<BookingsMap />
			<BookingsControl
				progress={progress}
				setProgress={setProgress}
				setNow={() => setProgress(getCurrentTimelineStep(timeline))}
				setSpeedIndex={setSpeedIndex}
				speedIndex={speedIndex}
				setPlaying={setPlaying}
				playing={playing}
				currentTime={timeline[progress]}
				max={timeline.length - 1}
			/>
		</div>
	);
}

const STEP_MINUTES = 30;

function buildTimeline(bookings: Booking[]) {
	if (!bookings.length) return [];

	const start = new Date(bookings[0].start).getTime();
	const end = new Date(bookings[bookings.length - 1].end).getTime();

	const stepMs = STEP_MINUTES * 60 * 1000;
	const timeline = [];

	for (let t = start; t <= end; t += stepMs) {
		timeline.push(t);
	}

	return timeline;
}

function getCurrentTimelineStep(timeline: number[]) {
	if (!timeline.length) return 0;

	const now = Date.now();

	const idx = timeline.findIndex((t) => t > now);
	return idx === -1 ? timeline.length - 1 : Math.max(0, idx - 1);
}
