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
}

interface VatsimGeneral {
    version: number;
    update_timestamp: string;
    connected_clients: number;
    unique_users: number;
}

interface VatsimPilot {
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

type VatsimPilotFlightPlan = {
    flight_rules: 'I' | 'V' | 'S';
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

interface TrackPoint {
    _id: string;
    latitude: number;
    longitude: number;
    altitude_agl: number;
    altitude_ms: number;
    groundspeed: number;
    vertical_speed: number;
    heading: number;
    connected: boolean;
    timestamp: Date;
}

interface PilotShort extends TrackPoint {
    callsign: string;
    aircraft: string;
    transponder: number;
    frequency: number;
}

interface PilotLong extends PilotShort {
    cid: number;
    name: string;
    server: string;
    pilot_rating: number;
    military_rating: number;
    qnh_i_hg: number;
    qnh_mb: number;
    flight_plan?: PilotFlightPlan;
    logon_time: Date;
    last_updated: Date;
    times: PilotTimes;
}

interface PilotFlightPlan {
    flight_rules: 'IFR' | 'VFR';
    ac_reg: string; // Registration will be used to link to aircraft data in database
    departure: string; // ICAO will be used to link to airport data in database
    arrival: string;
    alternate: string;
    filed_tas: number;
    filed_altitude: number;
    dep_time: Date;
    enroute_time: number;
    fuel_time: number;
    enroute_dist: number;
    remarks: string;
    route: string;
    revision_id: number;
}

interface PilotTimes {
    off_block: Date;
    scheduled_dep: Date;
    actual_dep: Date;
    scheduled_arr: Date;
    actual_arr: Date;
    on_block: Date;
}