"use client";

import Icon from "@/components/Icon/Icon";
import "./Flights.css";
import type { StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Fragment } from "react/jsx-runtime";
import { toast } from "react-toastify";
import MessageBox from "@/components/MessageBox/MessageBox";
import { getDelayColorFromDates } from "@/components/Panel/utils";
import Spinner from "@/components/Spinner/Spinner";
import { getCachedAirport } from "@/storage/cache";
import { useSettingsStore } from "@/storage/zustand";
import { fetchApi } from "@/utils/api";
import { convertTime } from "@/utils/helpers";
import Aircraft from "./Aircraft";

const LIMIT = 20;

function getQueryKey(callsign?: string, registration?: string): readonly [string, string] {
	return ["flights-page", callsign || registration || ""];
}

export default function Flights({ children, callsign, registration }: { children: React.ReactNode; callsign?: string; registration?: string }) {
	const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery<
		PilotLong[],
		Error,
		InfiniteData<PilotLong[]>,
		readonly [string, string],
		string | null
	>({
		queryKey: getQueryKey(callsign, registration),
		enabled: !!callsign || !!registration,
		initialPageParam: null,

		queryFn: async ({ pageParam }) => {
			const params = new URLSearchParams({
				limit: String(LIMIT),
			});

			if (pageParam) {
				params.set("cursor", pageParam);
			}

			return fetchApi<PilotLong[]>(`/data/flights/${callsign ? "callsign" : "registration"}/${callsign || registration}?${params.toString()}`);
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
			{registration && <Aircraft registration={registration} />}
			<h1>
				Flight history for {callsign ? "callsign" : "aircraft"} {callsign || registration}
			</h1>
			<table>
				<colgroup>
					<col />
					{registration && <col />}
					<col />
					<col />
					<col />
					<col />
					<col width={70} />
					<col width={70} />
					<col width={70} />
					<col width={70} />
					<col width={70} />
					<col width={100} />
				</colgroup>
				<thead>
					<tr>
						<th>Date</th>
						{registration && <th>Callsign</th>}
						<th>Departure</th>
						<th>Arrival</th>
						<th>Aircraft</th>
						<th>Flight Time</th>
						<th>Status</th>
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
								<Row key={p.id} pilot={p} registration={registration} />
							))}
						</Fragment>
					))}
				</tbody>
			</table>
			<button id="flights-page-pagination" type="button" onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
				{isFetchingNextPage ? "Loading ..." : hasNextPage ? "Load more flights" : "No more flights"}
			</button>
			{isLoading && <Spinner />}
			{children}
		</div>
	);
}

function Row({ pilot, registration }: { pilot: PilotLong; registration?: string }) {
	const { timeFormat, timeZone } = useSettingsStore();
	const router = useRouter();

	const [shared, setShared] = useState(false);
	const onShareClick = () => {
		navigator.clipboard.writeText(`${window.location.origin}/data/flights/${pilot.callsign}/${pilot.id}`);
		setShared(true);
		toast.info(MessageBox, { data: { title: "Copied", message: `The link to the replay has been copied to your clipboard.` } });
		setTimeout(() => setShared(false), 2000);
	};

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
			{registration && (
				<td>
					<a className="flights-page-link" href={`/data/flights/${pilot.callsign}`}>
						{pilot.callsign}
					</a>
				</td>
			)}
			<Airport airport={data.departure} />
			<Airport airport={data.arrival} />
			<td>
				{pilot.aircraft}&nbsp;&nbsp;
				<a className="flights-page-link" href={`/data/aircrafts/${pilot.flight_plan?.ac_reg}`}>
					{pilot.flight_plan?.ac_reg || "N/A"}
				</a>
			</td>
			<td>{calculateFlightTime(pilot.times?.off_block, pilot.times?.on_block)}</td>
			<td>
				<div className={`live-tag ${pilot.live}`}>{pilot.live}</div>
			</td>
			<td>{convertTime(pilot.times?.sched_off_block, timeFormat, timeZone, false, data.departure?.timezone)}</td>
			<td>{convertTime(pilot.times?.off_block, timeFormat, timeZone, false, data.departure?.timezone)}</td>
			<td>{convertTime(pilot.times?.sched_on_block, timeFormat, timeZone, false, data.arrival?.timezone)}</td>
			<td>
				{convertTime(pilot.times?.on_block, timeFormat, timeZone, false, data.arrival?.timezone)}
				<span className={`delay-indicator ${getDelayColorFromDates(pilot.times?.sched_on_block, pilot.times?.on_block) ?? ""}`}></span>
			</td>
			<td>
				<div className="flights-page-buttons">
					<button type="button" onClick={() => onPlayClick(pilot, router, registration)} disabled={pilot.live === "pre"}>
						{pilot.live === "live" ? "Live" : <Icon name="play" size={24} />}
					</button>
					<button type="button" onClick={() => onShareClick()}>
						<Icon name={shared ? "select" : "share-android"} size={24} />
					</button>
				</div>
			</td>
		</tr>
	);
}

function onPlayClick(pilot: PilotLong, router: ReturnType<typeof useRouter>, registration?: string) {
	if (pilot.live === "live") {
		window.location.href = `/pilot/${pilot.id}`;
	} else if (pilot.live === "off") {
		router.push(`/data/${registration ? "aircrafts" : "flights"}/${registration || pilot.callsign}/${pilot.id}`);
	}
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
	const year = date.getFullYear();

	return `${day} ${month} ${year}`;
}

function Airport({ airport }: { airport: StaticAirport | null }) {
	if (!airport) return <td>N/A</td>;
	return (
		<td>
			{airport.city}&nbsp;&nbsp;
			<a className="flights-page-link" href={`/airport/${airport.id}`}>
				{airport.id}
			</a>
		</td>
	);
}
