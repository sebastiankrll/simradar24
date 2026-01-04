"use client";

import Icon from "@/components/Icon/Icon";
import "./Flights.css";
import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { getCachedAirport } from "@/storage/cache";
import { useSettingsStore } from "@/storage/zustand";
import { fetchApi } from "@/utils/api";
import { convertTime } from "@/utils/helpers";
import { Replay } from "./Replay";

const LIMIT = 20;

export default function Flights({ callsign }: { callsign: string }) {
	const [open, setOpen] = useState<string | null>(null);

	const { data } = useInfiniteQuery<PilotLong[], Error, InfiniteData<PilotLong[]>, readonly [string, string], string | null>({
		queryKey: ["flights-page", callsign],
		enabled: !!callsign,
		initialPageParam: null,

		queryFn: async ({ pageParam }) => {
			const params = new URLSearchParams({
				limit: String(LIMIT),
			});

			if (pageParam) {
				params.set("cursor", pageParam);
			}

			return fetchApi<PilotLong[]>(`/data/flights/${callsign}?${params.toString()}`);
		},

		getNextPageParam: (lastPage) => {
			if (!lastPage || lastPage.length < LIMIT) return undefined;
			return lastPage[lastPage.length - 1].id;
		},

		staleTime: Infinity,
		gcTime: Infinity,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		retry: false,
	});

	return (
		<div id="flights-page">
			<h1>Flight history of {callsign}</h1>
			<table>
				<thead>
					<tr>
						<th>Date</th>
						<th>Departure</th>
						<th>Arrival</th>
						<th>Aircraft</th>
						<th>Flight Time</th>
						<th>STD</th>
						<th>ATD</th>
						<th>STA</th>
						<th>ATA</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{data?.pages.map((page, i) => (
						<Fragment key={i}>
							{page.map((p) => (
								<Row key={p.id} pilot={p} setOpen={setOpen} />
							))}
						</Fragment>
					))}
				</tbody>
			</table>
			{open && <Replay id={open} setOpen={setOpen} />}
		</div>
	);
}

function Row({ pilot, setOpen }: { pilot: PilotLong; setOpen: React.Dispatch<React.SetStateAction<string | null>> }) {
	const { timeFormat, timeZone } = useSettingsStore();

	const [data, setData] = useState<{ departure: StaticAirport | null; arrival: StaticAirport | null }>({
		departure: null,
		arrival: null,
	});
	useEffect(() => {
		(async () => {
			const [departure, arrival] = await Promise.all([
				getCachedAirport(pilot.flight_plan?.departure.icao || ""),
				getCachedAirport(pilot.flight_plan?.arrival.icao || ""),
			]);

			setData({ departure, arrival });
		})();
	}, [pilot]);

	return (
		<tr>
			<td>{getDay(pilot.times?.sched_off_block)}</td>
			<td>{pilot.flight_plan?.departure.icao || "N/A"}</td>
			<td>{pilot.flight_plan?.arrival.icao || "N/A"}</td>
			<td>{pilot.aircraft}</td>
			<td>{calculateFlightTime(pilot.times?.off_block, pilot.times?.on_block)}</td>
			<td>{convertTime(pilot.times?.sched_off_block, timeFormat, timeZone, false, data.departure?.timezone)}</td>
			<td>{convertTime(pilot.times?.off_block, timeFormat, timeZone, false, data.departure?.timezone)}</td>
			<td>{convertTime(pilot.times?.sched_on_block, timeFormat, timeZone, false, data.arrival?.timezone)}</td>
			<td>{convertTime(pilot.times?.on_block, timeFormat, timeZone, false, data.arrival?.timezone)}</td>
			<td>
				<div className="flights-page-buttons">
					<button type="button" onClick={() => setOpen(pilot.id)}>
						<Icon name="external-link" size={24} />
					</button>
				</div>
			</td>
		</tr>
	);
}

function calculateFlightTime(off_block: string | Date | undefined, on_block: string | Date | undefined): string {
	if (!off_block || !on_block) return "N/A";

	const offBlockTime = new Date(off_block);
	const onBlockTime = new Date(on_block);
	const diffMs = onBlockTime.getTime() - offBlockTime.getTime();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	return `${diffHours}h ${diffMinutes}m`;
}

function getDay(time: string | Date | undefined): string {
	if (!time) return "N/A";

	const date = new Date(time);
	const day = date.getDate();
	const month = date.toLocaleString("default", { month: "short" });

	return `${day} ${month}`;
}
