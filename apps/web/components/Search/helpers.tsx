import type { StaticAirline, StaticAirport } from "@sr24/types/db";
import type { PilotLong } from "@sr24/types/interface";
import { fetchApi } from "@/utils/api";
import type { Match, PilotMatch, PilotResult } from "./types";

const SEARCH_HISTORY_KEY = "simradar-search-history";
const MAX_HISTORY = 10;

export async function fetchPilots(query: string, path?: string): Promise<PilotResult> {
	const pilots = await fetchApi<PilotResult>(`/search${path ? `/${path}` : ""}?q=${encodeURIComponent(query)}`);
	return pilots;
}

export function getSearchHistory(): string[] {
	if (typeof window === "undefined") return [];
	try {
		return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
	} catch {
		return [];
	}
}

export function addSearchHistory(value: string) {
	if (!value.trim()) return;

	const history = getSearchHistory().filter((item) => item.toLowerCase() !== value.toLowerCase());
	history.unshift(value);
	localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearSearchHistory() {
	localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export function getMatchFields(item: StaticAirport | StaticAirline, query: string): Match {
	const lowerQuery = query.toLowerCase();

	const match: Match = {};

	if (item.name.toLowerCase().includes(lowerQuery)) match.name = item.name;

	return match;
}

export function getPilotMatchFields(pilot: PilotLong, query: string): PilotMatch {
	const lowerQuery = query.toLowerCase();

	const match: PilotMatch = {};

	if (pilot.callsign.toLowerCase().includes(lowerQuery)) match.callsign = pilot.callsign;
	if (pilot.flight_plan?.departure.icao.toLowerCase().includes(lowerQuery)) match.departure = pilot.flight_plan.departure.icao;
	if (pilot.flight_plan?.arrival.icao.toLowerCase().includes(lowerQuery)) match.arrival = pilot.flight_plan.arrival.icao;
	if (pilot.cid.toString().includes(lowerQuery)) match.cid = pilot.cid.toString();
	if (pilot.name.toLowerCase().includes(lowerQuery)) match.name = pilot.name;

	return match;
}

export function highlightMatch(text: string, query: string): React.ReactNode {
	if (!query) return text;

	const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
	const parts = text.split(regex);

	return parts.map((part, i) =>
		regex.test(part) ? (
			<span key={i} style={{ fontWeight: "var(--font-weight-bold)", color: "var(--color-orange)" }}>
				{part}
			</span>
		) : (
			part
		),
	);
}
