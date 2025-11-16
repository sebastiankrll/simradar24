import { Feature, FeatureCollection, MultiPolygon } from "geojson";

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
    latitude: number;
    longitude: number;
}

interface SimAwareTRACONProperties {
    id: string;
    prefix: string[];
    name: string;
}

export type SimAwareTraconFeature = Feature<MultiPolygon, SimAwareTRACONProperties>
export type SimAwareTraconFeatureCollection = FeatureCollection<MultiPolygon, SimAwareTRACONProperties>

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

export type VatSpyFIRFeatureCollection = FeatureCollection<MultiPolygon, VatSpyFIRProperties>

export interface FIRProperties extends VatSpyFIRProperties {
    name: string;
    callsign_prefix: string;
}

export type FIRFeature = Feature<MultiPolygon, FIRProperties>
export type FIRFeatureCollection = FeatureCollection<MultiPolygon, FIRProperties>