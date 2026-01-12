import { rdsSub } from "@sr24/db/redis";
import type { Booking } from "@sr24/types/interface";

class BookingsStore {
	bookings: Booking[] = [];

	async start() {
		await rdsSub("data:bookings", (data) => {
			const parsed: Booking[] = JSON.parse(data);
			this.bookings = parsed;
		});
	}
}

export const bookingsStore = new BookingsStore();
await bookingsStore.start();
