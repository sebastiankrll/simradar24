import { rdsPub } from "@sr24/db/redis";
import type { Booking } from "@sr24/types/interface";
import type { VatsimBooking } from "@sr24/types/vatsim";
import axios from "axios";
import { findPrefixMatch, parseAirportFacility, reduceCallsign } from "./utils/sectors.js";

const UPDATE_INTERVAL = 10 * 60 * 1000;
let lastUpdate = 0;

export async function updateBookingsData(): Promise<void> {
	const now = Date.now();
	if (now - lastUpdate < UPDATE_INTERVAL) return;

	const bookings = await axios.get<VatsimBooking[]>("https://atc-bookings.vatsim.net/api/booking").then((res) => res.data);
	const parsedBookings = parseBookings(bookings);
	rdsPub("data:bookings", parsedBookings);

	lastUpdate = now;
}

function parseBookings(bookings: VatsimBooking[]): Booking[] {
	const parsed: Booking[] = [];

	for (const booking of bookings) {
		let id: string | null = null;
		let facility: Booking["facility"] | null = null;

		const callsign = booking.callsign.toUpperCase();
		const levels = reduceCallsign(callsign);

		if (callsign.endsWith("_TWR") || callsign.endsWith("_GND") || callsign.endsWith("_DEL") || callsign.endsWith("_ATIS")) {
			id = levels[levels.length - 1];
			facility = parseAirportFacility(callsign);
		} else if (callsign.endsWith("_APP") || callsign.endsWith("_DEP")) {
			id = findPrefixMatch(levels, 5);
			if (!id) {
				id = levels[levels.length - 1];
			}
			facility = 5;
		} else {
			id = findPrefixMatch(levels, 6);
			facility = 6;
		}

		if (!id || facility === null) continue;

		const bookingEntry: Booking = {
			id,
			facility,
			callsign: booking.callsign,
			type: booking.type,
			start: booking.start,
			end: booking.end,
		};
		parsed.push(bookingEntry);
	}

	return parsed;
}
