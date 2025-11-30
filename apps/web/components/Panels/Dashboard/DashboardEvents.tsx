import type { VatsimEvent } from "@sk/types/vatsim";

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

function Events({ events, dayFilter }: { events: VatsimEvent[]; dayFilter: Date }) {
	const todaysEvents = events.filter((event) => {
		const eventDate = new Date(event.start_time);
		return (
			eventDate.getDate() === dayFilter.getDate() &&
			eventDate.getMonth() === dayFilter.getMonth() &&
			eventDate.getFullYear() === dayFilter.getFullYear()
		);
	});

	const getTimeString = (start: string, end: string) => {
		const startDate = new Date(start);
		const endDate = new Date(end);

		const startDay = String(startDate.getUTCDate()).padStart(2, "0");
		const startMonth = String(startDate.getUTCMonth() + 1).padStart(2, "0");

		return `${startDay}.${startMonth} ${startDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })} - ${endDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}z`;
	};

	return (
		<div className="panel-sub-container events">
			{todaysEvents.length === 0 ? (
				<p>No events today.</p>
			) : (
				todaysEvents.map((event) => (
					<a key={event.id} className="dashboard-event-item" href={event.link} target="_blank" rel="noreferrer">
						<p className="dashboard-event-title">{event.name}</p>
						<p>{event.airports.map((airport) => airport.icao).join(", ")}</p>
						<p>{getTimeString(event.start_time, event.end_time)}</p>
					</a>
				))
			)}
		</div>
	);
}
