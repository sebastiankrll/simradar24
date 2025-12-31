import type { DashboardStats as Stats } from "@sr24/types/interface";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fragment } from "react/jsx-runtime";

export function DashboardStats({ stats }: { stats: Stats }) {
	const router = useRouter();
	const [openTab, setOpenTab] = useState<"airports" | "routes" | "aircrafts" | "controllers">("airports");

	return (
		<div className="panel-section-content">
			<div className="panel-data-separator">Connections</div>
			<div className="panel-sub-container" id="panel-dashboard-connections">
				<div className="panel-data-item">
					<p>Total</p>
					<p>{stats.pilots + stats.controllers + stats.supervisors}</p>
				</div>
				<div className="panel-data-item">
					<p>Pilots</p>
					<p>{stats.pilots}</p>
				</div>
				<div className="panel-data-item">
					<p>Controllers</p>
					<p>{stats.controllers}</p>
				</div>
				<div className="panel-data-item">
					<p>Supervisors</p>
					<p>{stats.supervisors}</p>
				</div>
			</div>
			<div className="panel-sub-container sep" id="panel-dashboard-busiest">
				<div id="dashboard-stats-navigation">
					<button className={openTab === "airports" ? "active" : ""} type="button" onClick={() => setOpenTab("airports")}>
						Airports
					</button>
					<button className={openTab === "routes" ? "active" : ""} type="button" onClick={() => setOpenTab("routes")}>
						Routes
					</button>
					<button className={openTab === "aircrafts" ? "active" : ""} type="button" onClick={() => setOpenTab("aircrafts")}>
						Aircrafts
					</button>
					<button className={openTab === "controllers" ? "active" : ""} type="button" onClick={() => setOpenTab("controllers")}>
						Controllers
					</button>
				</div>
				{openTab === "airports" && <AirportStats stats={stats} router={router} />}
				{openTab === "routes" && <RouteStats stats={stats} />}
				{openTab === "aircrafts" && <AircraftStats stats={stats} />}
				{openTab === "controllers" && <ControllerStats stats={stats} />}
			</div>
		</div>
	);
}

function AirportStats({ stats, router }: { stats: Stats; router: ReturnType<typeof useRouter> }) {
	return (
		<>
			<div className="panel-data-separator">Busiest airports</div>
			<div className="dashboard-table airport">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Airport</p>
				<p className="dashboard-table-header">Departures</p>
				<p className="dashboard-table-header">Arrivals</p>
				{stats.busiestAirports.map((airport, i) => (
					<Fragment key={airport.icao}>
						<p>{i + 1}</p>
						<button className="dashboard-table-button" onClick={() => router.push(`/airport/${airport.icao}`)} type="button">
							{airport.icao}
						</button>
						<p>{airport.departures}</p>
						<p>{airport.arrivals}</p>
					</Fragment>
				))}
			</div>
			<div className="panel-data-separator">Quietest airports</div>
			<div className="dashboard-table airport">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Airport</p>
				<p className="dashboard-table-header">Departures</p>
				<p className="dashboard-table-header">Arrivals</p>
				{stats.quietestAirports.map((airport, i) => (
					<Fragment key={airport.icao}>
						<p>{i + 1}</p>
						<button className="dashboard-table-button" onClick={() => router.push(`/airport/${airport.icao}`)} type="button">
							{airport.icao}
						</button>
						<p>{airport.departures}</p>
						<p>{airport.arrivals}</p>
					</Fragment>
				))}
			</div>
		</>
	);
}

function RouteStats({ stats }: { stats: Stats }) {
	return (
		<>
			<div className="panel-data-separator">Busiest routes</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Route</p>
				<p className="dashboard-table-header">Flights</p>
				{stats.busiestRoutes.map((route, i) => (
					<Fragment key={route.route}>
						<p>{i + 1}</p>
						<p>{route.route.replace("-", " -- ")}</p>
						<p>{route.count}</p>
					</Fragment>
				))}
			</div>
			<div className="panel-data-separator">Rarest routes</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Route</p>
				<p className="dashboard-table-header">Flights</p>
				{stats.quietestRoutes.map((route, i) => (
					<Fragment key={route.route}>
						<p>{i + 1}</p>
						<p>{route.route.replace("-", " -- ")}</p>
						<p>{route.count}</p>
					</Fragment>
				))}
			</div>
		</>
	);
}

function AircraftStats({ stats }: { stats: Stats }) {
	return (
		<>
			<div className="panel-data-separator">Most flown aircrafts</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Aircraft</p>
				<p className="dashboard-table-header">Flights</p>
				{stats.busiestAircrafts.map((aircraft, i) => (
					<Fragment key={aircraft.aircraft}>
						<p>{i + 1}</p>
						<p>{aircraft.aircraft}</p>
						<p>{aircraft.count}</p>
					</Fragment>
				))}
			</div>
			<div className="panel-data-separator">Rarest aircrafts</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Aircraft</p>
				<p className="dashboard-table-header">Flights</p>
				{stats.rarestAircrafts.map((aircraft, i) => (
					<Fragment key={aircraft.aircraft}>
						<p>{i + 1}</p>
						<p>{aircraft.aircraft}</p>
						<p>{aircraft.count}</p>
					</Fragment>
				))}
			</div>
		</>
	);
}

function ControllerStats({ stats }: { stats: Stats }) {
	return (
		<>
			<div className="panel-data-separator">Busiest controllers</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Controller</p>
				<p className="dashboard-table-header">Connections</p>
				{stats.busiestControllers.map((controller, i) => (
					<Fragment key={controller.callsign}>
						<p>{i + 1}</p>
						<p>{controller.callsign}</p>
						<p>{controller.count}</p>
					</Fragment>
				))}
			</div>
			<div className="panel-data-separator">Quietest controllers</div>
			<div className="dashboard-table">
				<p className="dashboard-table-header">#</p>
				<p className="dashboard-table-header">Controller</p>
				<p className="dashboard-table-header">Connections</p>
				{stats.quietestControllers.map((controller, i) => (
					<Fragment key={controller.callsign}>
						<p>{i + 1}</p>
						<p>{controller.callsign}</p>
						<p>{controller.count}</p>
					</Fragment>
				))}
			</div>
		</>
	);
}
