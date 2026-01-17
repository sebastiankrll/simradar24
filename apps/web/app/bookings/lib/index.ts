import type { Booking, ControllerMerged, ControllerShort } from "@sr24/types/interface";
import { MapService } from "@/lib/map/MapService";
import { getCachedAirport } from "@/storage/cache";

export const mapService = new MapService();

let cachedBookings: Booking[] = [];

export function init(bookings: Booking[]): void {
	cachedBookings = bookings;
	setFeaturesByTime(Date.now());
}

export async function setFeaturesByTime(time: number): Promise<void> {
	const currentBookings = cachedBookings.filter(({ start, end }) => {
		const startTime = Date.parse(start);
		const endTime = Date.parse(end);

		return startTime <= time && time < endTime;
	});

	const controllersMerged = parseBookings(currentBookings);
	const staticAirports = await Promise.all(controllersMerged.filter((c) => c.facility === "airport").map((c) => getCachedAirport(c.id)));
	mapService.setFeatures({ controllers: controllersMerged, airports: staticAirports.filter((a): a is NonNullable<typeof a> => a !== null) });
}

function parseBookings(bookings: Booking[]): ControllerMerged[] {
	const controllersMerged = new Map<string, ControllerMerged>();

	for (const booking of bookings) {
		if (!controllersMerged.has(booking.id)) {
			controllersMerged.set(booking.id, {
				id: booking.id,
				facility: getFacilityType(booking.facility),
				controllers: [],
			});
		}
		const merged = controllersMerged.get(booking.id);
		if (!merged) continue;

		const controllerShort: ControllerShort = {
			callsign: booking.callsign,
			facility: booking.facility,
		};
		merged.controllers.push(controllerShort);
	}

	return Array.from(controllersMerged.values());
}

function getFacilityType(facility: number): "airport" | "tracon" | "fir" {
	if (facility === 5) {
		return "tracon";
	} else if (facility === 6) {
		return "fir";
	} else {
		return "airport";
	}
}
