import type { Feature, FeatureCollection, MultiPolygon } from "geojson";

export interface OurAirportsCsv {
	id: string;
	ident: string;
	type: string;
	name: string;
	latitude_deg: string;
	longitude_deg: string;
	elevation_ft: string;
	continent: string;
	iso_country: string;
	iso_region: string;
	municipality: string;
	scheduled_service: string;
	icao_code: string;
	iata_code: string;
	gps_code: string;
	local_code: string;
	home_link: string;
	wikipedia_link: string;
	keywords: string;
}

export interface StaticAirport {
	id: string;
	iata: string;
	size: string;
	name: string;
	city: string;
	country: string;
	latitude: number;
	longitude: number;
	timezone: string;
}

interface SimAwareTRACONProperties {
	id: string;
	prefix: string[] | string;
	name: string;
	label_lat?: number;
	label_lon?: number;
}

export type SimAwareTraconFeature = Feature<MultiPolygon, SimAwareTRACONProperties>;

export interface VatSpyDat {
	icao: string;
	name: string;
	callsign_prefix: string;
	fir_bound: string;
}

interface VatSpyFIRProperties {
	id: string;
	oceanic: "0" | "1";
	label_lon: string;
	label_lat: string;
	region: string;
	division: string;
}

export type VatSpyFIRFeatureCollection = FeatureCollection<MultiPolygon, VatSpyFIRProperties>;

export interface FIRProperties extends VatSpyFIRProperties {
	name: string;
	callsign_prefix: string;
}

export type FIRFeature = Feature<MultiPolygon, FIRProperties>;

export interface StaticAirline {
	id: string;
	iata: string;
	name: string;
	callsign: string;
	country: string;
	color?: string[];
}

export interface StaticAircraft {
	icao24: string;
	built: string;
	manufacturerName: string;
	model: string;
	owner: string;
	registration: string;
	selCal: string;
	serialNumber: string;
	typecode: string;
	country: string;
}

export interface StaticAircraftType {
	name: string;
	iata: string;
	icao: string;
}
