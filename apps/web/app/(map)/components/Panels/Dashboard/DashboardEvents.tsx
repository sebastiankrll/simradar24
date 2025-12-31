import type { VatsimEvent } from "@sr24/types/interface";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";

export function DashboardEvents({ events, ref, openSection }: { events: VatsimEvent[]; ref: React.Ref<HTMLDivElement>; openSection: string[] }) {
	return (
		<div ref={ref} className={`panel-section-content accordion${openSection.includes("events") ? " open" : ""}`}>
			<div className="panel-data-separator">Todays events</div>
			<Events events={events} dayFilter={new Date()} />
			<div className="panel-data-separator">Tomorrows events</div>
			<Events events={events} dayFilter={new Date(Date.now() + 86400000)} />
		</div>
	);
}

function getDurationString(start: string, end: string, timeFormat: "12h" | "24h", timeZone: "utc" | "local"): string {
	const startDate = new Date(start);
	const endDate = new Date(end);

	const startDay = String(startDate.getUTCDate()).padStart(2, "0");
	const startMonth = String(startDate.getUTCMonth() + 1).padStart(2, "0");

	return `${startDay}.${startMonth} ${convertTime(startDate, timeFormat, timeZone, false)} - ${convertTime(endDate, timeFormat, timeZone, false)}`;
}

function Events({ events, dayFilter }: { events: VatsimEvent[]; dayFilter: Date }) {
	const { timeZone, timeFormat } = useSettingsStore();

	const todaysEvents = events.filter((event) => {
		const eventDate = new Date(event.start_time);
		return (
			eventDate.getDate() === dayFilter.getDate() &&
			eventDate.getMonth() === dayFilter.getMonth() &&
			eventDate.getFullYear() === dayFilter.getFullYear()
		);
	});

	return (
		<div className="panel-sub-container events">
			{todaysEvents.length === 0 ? (
				<p>No events today.</p>
			) : (
				todaysEvents.map((event) => (
					<a key={event.id} className="dashboard-event-item" href={event.link} target="_blank" rel="noreferrer">
						<p className="dashboard-event-title">{event.name}</p>
						<p>{event.airports.map((airport) => airport.icao).join(", ")}</p>
						<p>{getDurationString(event.start_time, event.end_time, timeFormat, timeZone)}</p>
					</a>
				))
			)}
		</div>
	);
}
