export interface VatsimData {
	general: VatsimGeneral;
	pilots: VatsimPilot[];
	controllers: VatsimController[];
	atis: VatsimATIS[];
	servers: VatsimServers[];
	prefiles: VatsimPrefile[];
	facilities: VatsimMeta[];
	ratings: VatsimMeta[];
	pilot_ratings: VatsimMetaName[];
	military_ratings: VatsimMetaName[];
	transceivers: VatsimTransceivers[];
}

interface VatsimGeneral {
	version: number;
	update_timestamp: string;
	connected_clients: number;
	unique_users: number;
}

export interface VatsimPilot {
	cid: number;
	name: string;
	callsign: string;
	server: string;
	pilot_rating: number;
	military_rating: number;
	latitude: number;
	longitude: number;
	altitude: number;
	groundspeed: number;
	transponder: string;
	heading: number;
	qnh_i_hg: number;
	qnh_mb: number;
	flight_plan?: VatsimPilotFlightPlan;
	logon_time: string;
	last_updated: string;
}

export interface VatsimPilotFlightPlan {
	flight_rules: "I" | "V" | "S";
	aircraft: string;
	aircraft_faa: string;
	aircraft_short: string;
	departure: string;
	cruise_tas: string;
	altitude: string;
	arrival: string;
	alternate: string;
	deptime: string;
	enroute_time: string;
	fuel_time: string;
	remarks: string;
	route: string;
	revision_id: number;
	assigned_transponder: string;
}

interface VatsimController {
	cid: number;
	name: string;
	callsign: string;
	frequency: string;
	facility: number;
	rating: number;
	server: string;
	visual_range: number;
	text_atis: string[] | null;
	last_updated: string;
	logon_time: string;
}

interface VatsimATIS extends VatsimController {
	atis_code: string;
}

interface VatsimServers {
	ident: string;
	hostname_or_ip: string;
	location: string;
	name: string;
	client_connections_allowed: boolean;
	is_sweatbox: boolean;
}

interface VatsimPrefile {
	cid: number;
	name: string;
	callsign: string;
	flight_plan: VatsimPilotFlightPlan;
	last_updated: string;
}

interface VatsimMetaBase {
	id: number;
}

interface VatsimMeta extends VatsimMetaBase {
	short: string;
	long: string;
}

interface VatsimMetaName extends VatsimMetaBase {
	short_name: string;
	long_name: string;
}

export interface VatsimTransceivers {
	callsign: string;
	transceivers: VatsimTransceiver[];
}

interface VatsimTransceiver {
	id: string;
	frequency: number;
	latDeg: number;
	lonDeg: number;
	heightMslM: number;
	heightAglM: number;
}

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
	ghost?: boolean;
}

export interface PilotLong extends Required<PilotShort> {
	cid: number;
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
	ac_reg: string | null; // Registration will be used to link to aircraft data in database
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
	facility?: number;
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
	dep_traffic: AirportTraffic;
	arr_traffic: AirportTraffic;
}

export interface AirportLong extends AirportShort {
	busiest: { departure: string; arrival: string };
	unique: { departures: number; arrivals: number };
	metar: string | null;
	taf: string | null;
}

export interface AirportTraffic {
	traffic_count: number;
	average_delay: number;
	flights_delayed: number;
}

export interface PilotDelta {
	updated: PilotShort[];
	added: PilotShort[];
}

export interface ControllerDelta {
	updated: ControllerMerged[];
	added: ControllerMerged[];
}

export interface AirportDelta {
	updated: AirportShort[];
	added: AirportShort[];
}

export interface WsAll {
	pilots: PilotShort[];
	controllers: ControllerMerged[];
	airports: AirportShort[];
}

export interface WsDelta {
	pilots: PilotDelta;
	controllers: ControllerDelta;
	airports: AirportDelta;
}

export interface VatsimEventData {
	data: VatsimEvent[];
}

export interface VatsimEvent {
	id: number;
	type: "Event" | "Contoller Examination" | "VASOPS Event";
	name: string;
	link: string;
	organisers: VatsimEventOrganiser[];
	airports: VatsimEventAirport[];
	routes: VatsimEventRoute[];
	start_time: string;
	end_time: string;
	short_description: string;
	description: string;
	banner: string;
}

interface VatsimEventOrganiser {
	region: string | null;
	division: string | null;
	subdivision: string | null;
	organized_by_vatsim: boolean;
}

interface VatsimEventAirport {
	icao: string;
}

interface VatsimEventRoute {
	departure: string;
	arrival: string;
	route: string;
}

export interface DashboardData {
	history: { t: Date; v: { pilots: number; controllers: number } }[];
	stats: DashboardStats;
	events: VatsimEvent[];
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
