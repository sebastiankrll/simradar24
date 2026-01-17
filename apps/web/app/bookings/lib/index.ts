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

	const controllers = parseBookings(currentBookings);
	const staticAirports = await Promise.all(
		controllers.filter((c) => c.facility === "airport").map((c) => getCachedAirport(c.id.replace(/^airport_/, ""))),
	);

	mapService.setStore({ controllers });
	mapService.setFeatures({
		controllers,
		airports: staticAirports.filter((a): a is NonNullable<typeof a> => a !== null),
		sunTime: new Date(time),
	});
}

function parseBookings(bookings: Booking[]): ControllerMerged[] {
	const controllersMerged = new Map<string, ControllerMerged>();

	for (const booking of bookings) {
		const id = `${getFacilityType(booking.facility)}_${booking.id}`;

		if (!controllersMerged.has(id)) {
			controllersMerged.set(id, {
				id,
				facility: getFacilityType(booking.facility),
				controllers: [],
			});
		}
		const merged = controllersMerged.get(id);
		if (!merged) continue;

		const controllerShort: ControllerShort = {
			callsign: booking.callsign,
			facility: booking.facility,
			booking: {
				start: booking.start,
				end: booking.end,
				type: booking.type,
			},
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
