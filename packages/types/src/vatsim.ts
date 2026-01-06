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

export interface VatsimPrefile {
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
