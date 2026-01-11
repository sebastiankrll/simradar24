"use client";

import type { StaticAirline, StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";
import { getCachedAirline } from "@/storage/cache";
import { dxFindAirlines, dxFindAirports } from "@/storage/dexie";
import { fetchApi } from "@/utils/api";
import Icon, { getAirlineIcon } from "../Icon/Icon";
import Spinner from "../Spinner/Spinner";

type PilotResult = {
	live: PilotLong[];
	offline: PilotLong[];
};

type QueryResult = {
	airlines: StaticAirline[];
	airports: StaticAirport[];
	pilots: PilotResult;
};

const SEARCH_HISTORY_KEY = "simradar-search-history";
const MAX_HISTORY = 10;

export default function Search() {
	const [searchValue, setSearchValue] = useState("");
	const [focused, setFocused] = useState(false);
	const [history, setHistory] = useState<string[]>([]);
	const debounced = useDebounce(searchValue, 300);

	const ref = useRef<HTMLDivElement>(null);

	const { data, isLoading } = useQuery<QueryResult>({
		queryKey: ["search", debounced],
		queryFn: async () => {
			if (debounced[0].startsWith("airline:")) {
				const query = debounced[0].split(":")[1] || "";
				const pilots = await fetchPilots(query, "airline");
				return { airlines: [], airports: [], pilots: pilots };
			}
			if (debounced[0].startsWith("route:")) {
				const route = debounced[0].split(":")[1] || "";
				const query = route.replace(" ", "");
				const pilots = await fetchPilots(query, "route");
				return { airlines: [], airports: [], pilots: pilots };
			}
			const [airlines, airports, pilots] = await Promise.all([
				dxFindAirlines(debounced[0], 10),
				dxFindAirports(debounced[0], 10),
				fetchPilots(debounced[0]),
			]);
			return { airlines, airports, pilots };
		},
		enabled: debounced[0].length > 2,
		staleTime: 10_000,
		gcTime: 60_000,
		retry: false,
	});

	useEffect(() => {
		if (focused) {
			setHistory(getSearchHistory());
		}
	}, [focused]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setFocused(false);
				setSearchValue("");
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	return (
		<div id="header-search-wrapper" ref={ref}>
			<input
				id="header-search"
				type="text"
				placeholder="Find flights, airports, airlines and more"
				value={searchValue}
				onChange={(e) => setSearchValue(e.target.value)}
				onFocus={() => setFocused(true)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						addSearchHistory(searchValue);
						setHistory(getSearchHistory());
					}
				}}
			/>
			<button type="button" id="header-search-clear" onClick={() => setSearchValue("")}>
				<Icon name="cancel" size={16} />
			</button>
			{focused && (
				<div id="header-search-results" className="scrollable">
					{isLoading && <Spinner relative />}
					{searchValue.length < 3 && history.length > 0 && (
						<>
							<div className="header-search-separator">
								<p>Search History</p>
								<button
									type="button"
									id="header-search-history-clear"
									onClick={() => {
										clearSearchHistory();
										setHistory([]);
									}}
								>
									Clear
								</button>
							</div>
							{history.map((value) => (
								<HistoryResult key={value} value={value} setValue={setSearchValue} />
							))}
						</>
					)}
					{searchValue.length < 3 && <Placeholder />}
					{data?.airlines.length === 0 && data?.airports.length === 0 && data?.pilots.live.length === 0 && data?.pilots.offline.length === 0 && (
						<p>No results found.</p>
					)}

					{data?.airlines && data?.airlines.length > 0 && (
						<div className="header-search-separator">
							<p>Airlines</p>
						</div>
					)}
					{data?.airlines.map((airline) => (
						<AirlineResult key={airline.id} airline={airline} setValue={setSearchValue} />
					))}

					{data?.airports && data?.airports.length > 0 && (
						<div className="header-search-separator">
							<p>Airports</p>
						</div>
					)}
					{data?.airports.map((airport) => (
						<AirportResult key={airport.id} airport={airport} setValue={setSearchValue} setFocused={setFocused} />
					))}

					{data?.pilots.live && data?.pilots.live.length > 0 && (
						<div className="header-search-separator">
							<p>Live Flights</p>
						</div>
					)}
					{data?.pilots.live.map((pilot) => (
						<PilotResult key={pilot.id} pilot={pilot} setValue={setSearchValue} setFocused={setFocused} />
					))}

					{data?.pilots.offline && data?.pilots.offline.length > 0 && (
						<div className="header-search-separator">
							<p>Recent Or Scheduled Flights</p>
						</div>
					)}
					{data?.pilots.offline.map((pilot) => (
						<PilotResult key={pilot.id} pilot={pilot} recent setValue={setSearchValue} setFocused={setFocused} />
					))}
				</div>
			)}
		</div>
	);
}

async function fetchPilots(query: string, path?: string): Promise<PilotResult> {
	const pilots = await fetchApi<PilotResult>(`/search${path ? `/${path}` : ""}?q=${encodeURIComponent(query)}`);
	return pilots;
}

function getSearchHistory(): string[] {
	if (typeof window === "undefined") return [];
	try {
		return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
	} catch {
		return [];
	}
}

function addSearchHistory(value: string) {
	if (!value.trim()) return;

	const history = getSearchHistory().filter((item) => item.toLowerCase() !== value.toLowerCase());
	history.unshift(value);
	localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function clearSearchHistory() {
	localStorage.removeItem(SEARCH_HISTORY_KEY);
}

function Placeholder() {
	return (
		<>
			<div className="header-search-separator">
				<p>Search Tips</p>
			</div>
			<div id="header-search-placeholder">
				<p>Type at least 3 characters to search.</p>
				<p>
					<strong>Advanced search:</strong>
					<br />
					Use <code>airline:&lt;code&gt;</code> to search for flights by airline code. E.g., <code>airline:AAL</code> for American Airlines flights.
					<br />
					Use <code>route:&lt;ICAO&gt;-&lt;ICAO&gt;</code> to search for flights by route. E.g., <code>route:KLAX-KJFK</code> for flights from Los
					Angeles to New York.
				</p>
			</div>
		</>
	);
}

function HistoryResult({ value, setValue }: { value: string; setValue: (value: string) => void }) {
	return (
		<button className="search-item" type="button" onClick={() => setValue(value)}>
			<Icon name="history" size={16} />
			<p>{value}</p>
		</button>
	);
}

function AirlineResult({ airline, setValue }: { airline: StaticAirline; setValue: (value: string) => void }) {
	return (
		<button className="search-item" type="button" onClick={() => setValue(`airline:${airline.id}`)}>
			<div className="search-icon" style={{ backgroundColor: airline.color?.[0] ?? "" }}>
				{getAirlineIcon(airline)}
			</div>
			<div className="search-info">
				<div className="search-title">{airline.name}</div>
				<div className="search-tags">
					<span
						style={{ background: "var(--color-red)", padding: "0px 2px", color: "white" }}
					>{`${airline.id}${airline.iata ? ` / ${airline.iata}` : ""}`}</span>
					<Icon name="hotline" size={12} />
					<span>{airline.callsign}</span>
				</div>
			</div>
		</button>
	);
}

function AirportResult({
	airport,
	setValue,
	setFocused,
}: {
	airport: StaticAirport;
	setValue: (value: string) => void;
	setFocused: (focused: boolean) => void;
}) {
	const router = useRouter();
	const pathname = usePathname();

	return (
		<button
			className="search-item"
			type="button"
			onClick={() => {
				setValue("");
				setFocused(false);
				addSearchHistory(airport.id);
				if (pathname.startsWith("/data")) {
					window.location.href = `/airport/${airport.id}`;
					return;
				}
				router.push(`/airport/${airport.id}`);
			}}
		>
			<div className="search-icon">
				<div className={`fflag ff-lg fflag-${airport.country}`} style={{ backgroundImage: `url(${FlagSprite.src})` }}></div>
			</div>
			<div className="search-info">
				<div className="search-title">{airport.name}</div>
				<div className="search-tags">
					<span
						style={{ background: "var(--color-red)", padding: "0px 2px", color: "white" }}
					>{`${airport.id}${airport.iata ? ` / ${airport.iata}` : ""}`}</span>
				</div>
			</div>
		</button>
	);
}

function PilotResult({
	pilot,
	recent = false,
	setValue,
	setFocused,
}: {
	pilot: PilotLong;
	recent?: boolean;
	setValue: (value: string) => void;
	setFocused: (focused: boolean) => void;
}) {
	const [airline, setAirline] = useState<StaticAirline | null>(null);
	const router = useRouter();
	const pathname = usePathname();

	const callsignNumber = pilot.callsign.slice(3);
	const flightNumber = airline?.iata ? `${airline.iata}${callsignNumber}` : pilot?.callsign;

	useEffect(() => {
		const airlineCode = pilot.callsign.slice(0, 3).toUpperCase();

		(async () => {
			const cached = await getCachedAirline(airlineCode);
			setAirline(cached);
		})();
	}, [pilot]);

	return (
		<button
			className="search-item"
			type="button"
			onClick={() => {
				setValue("");
				setFocused(false);
				addSearchHistory(pilot.callsign);
				if (pathname.startsWith("/data") && recent) {
					router.push(`/data/flights/${pilot.callsign}`);
					return;
				}
				if (pathname.startsWith("/data") && !recent) {
					window.location.href = `/pilot/${pilot.id}`;
					return;
				}
				if (!pathname.startsWith("/data") && recent) {
					window.location.href = `/data/flights/${pilot.callsign}`;
					return;
				}
				router.push(`/pilot/${pilot.id}`);
			}}
		>
			<div className="search-icon" style={{ backgroundColor: airline?.color?.[0] ?? "" }}>
				{getAirlineIcon(airline)}
			</div>
			<div className="search-info pilot">
				<div className="search-title">{flightNumber}</div>
				<div style={{ textAlign: "right", fontSize: "var(--font-size-small)" }}>
					{recent ? null : `${pilot.flight_plan?.departure.icao ?? "N/A"} \u2013 ${pilot.flight_plan?.arrival.icao ?? "N/A"}`}
				</div>
				<div className="search-tags">
					<span style={{ background: "var(--color-red)" }} className="bg">
						{pilot.callsign}
					</span>
					<span className={`live-tag ${pilot.live}`}>{pilot.live}</span>
				</div>
				<div style={{ textAlign: "right", fontSize: "var(--font-size-small)" }}>{!recent && pilot.aircraft}</div>
			</div>
		</button>
	);
}
