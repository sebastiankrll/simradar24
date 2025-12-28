"use client";

import type { StaticAirline, StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/vatsim";
import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { setHoveredPilot } from "@/app/(map)/lib/events";
import { getAirlineIcon } from "@/components/Icon/Icon";
import Spinner from "@/components/Spinner/Spinner";
import { cacheIsInitialized, getCachedAirline, getCachedAirport } from "@/storage/cache";
import { useSettingsStore } from "@/storage/zustand";
import { fetchApi } from "@/utils/api";
import { convertTime } from "@/utils/helpers";
import { getDelayColor } from "../Pilot/PilotTimes";

const LIMIT = 20;

type PageParam = { cursor?: string; backwards?: boolean };

function normalizeDirection(direction: string): "dep" | "arr" {
	const d = direction.toLowerCase();
	return d.startsWith("arr") ? "arr" : "dep";
}

export default function AirportFlights({ icao, direction }: { icao: string; direction: string }) {
	const dir = normalizeDirection(direction);

	return (
		<div className="panel-container main scrollable" id="panel-airport-flights">
			<List icao={icao} dir={dir} />
		</div>
	);
}

function List({ icao, dir }: { icao: string; dir: "dep" | "arr" }) {
	const { timeFormat, timeZone } = useSettingsStore();

	const {
		status,
		data,
		error,
		isFetching,
		isFetchingNextPage,
		isFetchingPreviousPage,
		fetchNextPage,
		fetchPreviousPage,
		hasNextPage,
		hasPreviousPage,
	} = useInfiniteQuery<PilotLong[], Error, InfiniteData<PilotLong[]>, readonly [string, string, "dep" | "arr"], PageParam>({
		queryKey: ["airport-flights", icao.toUpperCase(), dir] as const,
		queryFn: async ({ pageParam }) => {
			const params = new URLSearchParams({ direction: dir, limit: String(LIMIT) });

			if (pageParam?.cursor) {
				params.set("cursor", pageParam.cursor);
				if (pageParam.backwards) params.set("backwards", "true");
			}

			return await fetchApi<PilotLong[]>(`/data/airport/${icao.toUpperCase()}/flights?${params.toString()}`);
		},
		initialPageParam: {},
		getNextPageParam: (lastPage) => {
			if (!lastPage || lastPage.length < LIMIT) return undefined;
			const lastPilot = lastPage[lastPage.length - 1];
			return { cursor: lastPilot.id, backwards: false };
		},
		getPreviousPageParam: (firstPage, allPages) => {
			if (!firstPage || firstPage.length === 0) return undefined;
			if (allPages.length > 1 && firstPage.length < LIMIT) return undefined;
			const firstPilot = firstPage[0];
			return { cursor: firstPilot.id, backwards: true };
		},
		staleTime: 30_000,
		gcTime: 60_000,
	});

	return (
		<>
			{status === "error" ? (
				<span>Error: {error?.message || "Failed"}</span>
			) : (
				<>
					<button
						className="panel-airport-flights-page"
						type="button"
						onClick={() => fetchPreviousPage()}
						disabled={!hasPreviousPage || isFetchingPreviousPage}
					>
						{isFetchingPreviousPage ? "Loading earlier..." : hasPreviousPage ? "Load Earlier" : "No earlier"}
					</button>

					<div id="panel-airport-flights-list">
						{data?.pages.map((page, i) => (
							<Fragment key={i}>
								{page.map((p) => (
									<ListItem key={p.id} pilot={p} dir={dir} timeFormat={timeFormat} timeZone={timeZone} />
								))}
							</Fragment>
						))}
					</div>

					<button className="panel-airport-flights-page" type="button" onClick={() => fetchNextPage()} disabled={!hasNextPage || isFetchingNextPage}>
						{isFetchingNextPage ? "Loading later..." : hasNextPage ? "Load Later" : "No later"}
					</button>
					{(isFetching || status === "pending") && <Spinner />}
				</>
			)}
			<ReactQueryDevtools initialIsOpen={false} />
		</>
	);
}

function ListItem({
	pilot,
	dir,
	timeFormat,
	timeZone,
}: {
	pilot: PilotLong;
	dir: "dep" | "arr";
	timeFormat: "24h" | "12h";
	timeZone: "local" | "utc";
}) {
	const router = useRouter();

	const [data, setData] = useState<{ airline: StaticAirline | null; departure: StaticAirport | null; arrival: StaticAirport | null }>({
		airline: null,
		departure: null,
		arrival: null,
	});
	useEffect(() => {
		const airlineCode = pilot.callsign.slice(0, 3).toUpperCase();

		const loadData = async () => {
			while (!cacheIsInitialized()) {
				await new Promise((resolve) => setTimeout(resolve, 50));
			}

			const [airline, departure, arrival] = await Promise.all([
				getCachedAirline(airlineCode || ""),
				getCachedAirport(pilot.flight_plan?.departure.icao || ""),
				getCachedAirport(pilot.flight_plan?.arrival.icao || ""),
			]);

			setData({ airline, departure, arrival });
		};

		loadData();
	}, [pilot]);

	const schedTime = dir === "dep" ? pilot.times?.sched_off_block : pilot.times?.sched_on_block;
	const estTime = dir === "dep" ? pilot.times?.off_block : pilot.times?.on_block;

	return (
		<button
			className="panel-airport-flights-item"
			type="button"
			onClick={() => {
				router.push(`/pilot/${pilot.id}`);
			}}
			onPointerEnter={() => setHoveredPilot(pilot.id)}
			onPointerLeave={() => setHoveredPilot(null)}
		>
			<div className={`panel-airport-flights-delay ${getDelayColor(schedTime, estTime) ?? ""}`}></div>
			<div className="panel-airport-flights-times">
				<p>{convertTime(schedTime, timeFormat, timeZone, false, dir === "dep" ? data.departure?.timezone : data.arrival?.timezone)}</p>
				<p>{convertTime(estTime, timeFormat, timeZone, false, dir === "dep" ? data.departure?.timezone : data.arrival?.timezone)}</p>
			</div>
			<div className="panel-airport-flights-icon" style={{ backgroundColor: data.airline?.color?.[0] ?? "" }}>
				{getAirlineIcon(data.airline)}
			</div>
			<div className="panel-airport-flights-main">
				<p>{(dir === "dep" ? data.arrival : data.departure)?.name || "Unknown Airport"}</p>
				<p>{`${(dir === "dep" ? data.arrival : data.departure)?.id ? `${(dir === "dep" ? data.arrival : data.departure)?.id} / ` : ""}${(dir === "dep" ? data.arrival : data.departure)?.iata || "N/A"}`}</p>
				<p>
					<span className={pilot.live ? "green" : "grey"}>Live</span>
					{pilot.callsign}
				</p>
				<p>{pilot.aircraft}</p>
			</div>
		</button>
	);
}
