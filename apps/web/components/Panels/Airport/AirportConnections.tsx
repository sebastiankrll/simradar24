import type { AirportLong } from "@sr24/types/vatsim";
import Icon from "@/components/shared/Icon/Icon";
import { getDelayColor } from "./AirportStatus";

export function AirportConnections({ airport }: { airport: AirportLong | undefined }) {
	return (
		<div className="panel-sub-container sep">
			<div className="panel-section-title">
				<Icon name="network" size={24} />
			</div>
			<div className="panel-section-content" id="panel-airport-connections">
				<div className="panel-data-separator">Departures</div>
				<div className="panel-sub-container airport-connections">
					<div className="panel-data-item">
						<p>Total</p>
						<p>{airport?.dep_traffic.traffic_count || 0}</p>
					</div>
					<div className="panel-data-item">
						<p>Delayed</p>
						<p>{airport?.dep_traffic.flights_delayed || 0}</p>
					</div>
					<div className="panel-data-item">
						<p>Avg. Delay</p>
						<p>
							<span className={`delay-indicator ${airport ? getDelayColor(airport.dep_traffic.average_delay) : ""}`}></span>
							{`${airport?.dep_traffic.average_delay || 0} min`}
						</p>
					</div>
					<div className="panel-data-item">
						<p>Busiest Route</p>
						<p>{airport?.busiest.departure || "N/A"}</p>
					</div>
					<div className="panel-data-item">
						<p>Connections</p>
						<p>{airport?.unique.departures || 0}</p>
					</div>
				</div>
				<div className="panel-data-separator">Arrivals</div>
				<div className="panel-sub-container airport-connections">
					<div className="panel-data-item">
						<p>Total</p>
						<p>{airport?.arr_traffic.traffic_count || 0}</p>
					</div>
					<div className="panel-data-item">
						<p>Delayed</p>
						<p>{airport?.arr_traffic.flights_delayed || 0}</p>
					</div>
					<div className="panel-data-item">
						<p>Avg. Delay</p>
						<p>
							<span className={`delay-indicator ${airport ? getDelayColor(airport.arr_traffic.average_delay) : ""}`}></span>
							{`${airport?.arr_traffic.average_delay || 0} min`}
						</p>
					</div>
					<div className="panel-data-item">
						<p>Busiest Route</p>
						<p>{airport?.busiest.arrival || "N/A"}</p>
					</div>
					<div className="panel-data-item">
						<p>Connections</p>
						<p>{airport?.unique.arrivals || 0}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
