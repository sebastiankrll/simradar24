import type { VatsimEvent } from "@sr24/types/vatsim";
import { useState } from "react";
import { mapService } from "@/app/(map)/lib";
import Icon from "@/components/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";

export function DashboardEvents({ events, ref, openSection }: { events: VatsimEvent[]; ref: React.Ref<HTMLDivElement>; openSection: string[] }) {
	const [activeEvent, setActiveEvent] = useState<number | null>(null);

	return (
		<div ref={ref} className={`panel-section-content accordion${openSection.includes("events") ? " open" : ""}`}>
			<div className="panel-data-separator">Todays events</div>
			<Events events={events} dayFilter={new Date()} activeEvent={activeEvent} setActiveEvent={setActiveEvent} />
			<div className="panel-data-separator">Tomorrows events</div>
			<Events events={events} dayFilter={new Date(Date.now() + 86400000)} activeEvent={activeEvent} setActiveEvent={setActiveEvent} />
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

function Events({
	events,
	dayFilter,
	activeEvent,
	setActiveEvent,
}: {
	events: VatsimEvent[];
	dayFilter: Date;
	activeEvent: number | null;
	setActiveEvent: React.Dispatch<React.SetStateAction<number | null>>;
}) {
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
					<div key={event.id} className={`dashboard-event-item${activeEvent === event.id ? " active" : ""}`}>
						<div className="dashboard-event-content">
							<p className="dashboard-event-title">{event.name}</p>
							<p>{event.airports.map((airport) => airport.icao).join(", ")}</p>
							<p>{getDurationString(event.start_time, event.end_time, timeFormat, timeZone)}</p>
						</div>
						<div className="dashboard-event-buttons">
							<button
								type="button"
								className="dashboard-event-button"
								onClick={() => {
									if (activeEvent === event.id) {
										setActiveEvent(null);
										mapService.unfocusFeatures();
									} else {
										setActiveEvent(event.id);
										mapService.focusFeatures({ airports: event.airports.map((airport) => airport.icao), hideLayers: ["pilot", "controller"] });
										mapService.fitFeatures({ airports: event.airports.map((airport) => airport.icao), rememberView: false });
									}
								}}
							>
								<Icon name={activeEvent === event.id ? "cancel" : "tour"} size={24} />
							</button>
							<a href={event.link} className="dashboard-event-button" target="_blank" rel="noreferrer">
								<Icon name="share-android" size={24} />
							</a>
						</div>
					</div>
				))
			)}
		</div>
	);
}
