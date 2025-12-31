import type { VatsimEvent } from "./vatsim";

export interface TrackPoint {
	id: string;
	latitude: number;
	longitude: number;
	altitude_agl: number;
	altitude_ms: number;
	groundspeed: number;
	vertical_speed: number;
	heading: number;
	timestamp: Date;
}

export interface PilotShort {
	id: string;
	callsign?: string;
	latitude?: number;
	longitude?: number;
	altitude_agl?: number;
	altitude_ms?: number;
	groundspeed?: number;
	vertical_speed?: number;
	heading?: number;
	aircraft?: string;
	transponder?: string;
	frequency?: number;
	route?: string;
	flight_rules?: "IFR" | "VFR";
	ac_reg?: string | null;
}

export interface PilotLong {
	id: string;
	cid: string;
	callsign: string;
	latitude: number;
	longitude: number;
	altitude_agl: number;
	altitude_ms: number;
	groundspeed: number;
	vertical_speed: number;
	heading: number;
	aircraft: string;
	transponder: string;
	frequency: number;
	name: string;
	server: string;
	pilot_rating: string;
	military_rating: string;
	qnh_i_hg: number;
	qnh_mb: number;
	flight_plan: PilotFlightPlan | null;
	times: PilotTimes | null;
	logon_time: Date;
	timestamp: Date;
	live: boolean;
}

export interface PilotFlightPlan {
	flight_rules: "IFR" | "VFR";
	ac_reg: string | null;
	departure: PilotAirport;
	arrival: PilotAirport;
	alternate: PilotAirport;
	filed_tas: number;
	filed_altitude: number;
	enroute_time: number;
	fuel_time: number;
	remarks: string;
	route: string;
	revision_id: number;
}

export interface PilotTimes {
	sched_off_block: Date;
	off_block: Date;
	lift_off: Date;
	touch_down: Date;
	sched_on_block: Date;
	on_block: Date;
	state: "Boarding" | "Taxi Out" | "Climb" | "Cruise" | "Descent" | "Taxi In" | "On Block";
	stop_counter: number;
}

interface PilotAirport {
	icao: string;
	latitude?: number;
	longitude?: number;
}

export interface ControllerShort {
	callsign: string;
	frequency?: number;
	facility: number;
	atis?: string[] | null;
	connections?: number;
}

export interface ControllerLong extends Required<ControllerShort> {
	cid: number;
	name: string;
	rating: number;
	server: string;
	visual_range: number;
	logon_time: Date;
	timestamp: Date;
}

export interface ControllerMerged {
	id: string;
	facility: "airport" | "tracon" | "fir";
	controllers: ControllerShort[];
}

export interface AirportShort {
	icao: string;
	dep_traffic?: AirportTraffic;
	arr_traffic?: AirportTraffic;
}

export interface AirportLong extends Required<AirportShort> {
	busiest: { departure: string; arrival: string };
	unique: { departures: number; arrivals: number };
}

export interface AirportTraffic {
	traffic_count: number;
	average_delay: number;
	flights_delayed: number;
}

export interface PilotDelta {
	updated: PilotShort[];
	added: Required<PilotShort>[];
}

export interface ControllerDelta {
	updated: ControllerMerged[];
	added: Required<ControllerMerged>[];
}

export interface AirportDelta {
	updated: AirportShort[];
	added: Required<AirportShort>[];
}

export interface WsDelta {
	pilots: PilotDelta;
	controllers: ControllerDelta;
	airports: AirportDelta;
	timestamp: Date;
}

export interface InitialData {
	pilots: Required<PilotShort>[];
	controllers: Required<ControllerMerged>[];
	airports: Required<AirportShort>[];
	timestamp: Date;
}

export interface DashboardData {
	history: DashboardHistory[];
	stats: DashboardStats;
	events: VatsimEvent[];
}

export interface DashboardHistory {
	t: Date;
	v: { pilots: number; controllers: number };
}

export interface DashboardStats {
	pilots: number;
	controllers: number;
	supervisors: number;
	busiestAirports: { icao: string; departures: number; arrivals: number }[];
	quietestAirports: { icao: string; departures: number; arrivals: number }[];
	busiestRoutes: { route: string; count: number }[];
	quietestRoutes: { route: string; count: number }[];
	busiestAircrafts: { aircraft: string; count: number }[];
	rarestAircrafts: { aircraft: string; count: number }[];
	busiestControllers: { callsign: string; count: number }[];
	quietestControllers: { callsign: string; count: number }[];
}

export interface RedisAll {
	pilots: PilotLong[];
	controllers: ControllerLong[];
	airports: AirportLong[];
	dashboard: DashboardData;
	init: InitialData;
}
