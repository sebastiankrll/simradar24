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
	bg: string | null;
	font: string | null;
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

type Theme = "light" | "dark" | "system";
type PlaneOverlayMode = "callsign" | "telemetry-off" | "full";
type TimeZone = "local" | "utc";
type TimeFormat = "24h" | "12h";
type TemperatureUnit = "celsius" | "fahrenheit";
type SpeedUnit = "knots" | "kmh" | "mph" | "ms";
type VerticalSpeedUnit = "fpm" | "ms";
type AltitudeUnit = "feet" | "meters";
type DistanceUnit = "km" | "miles" | "nm";

export interface SettingValues {
	theme: Theme;
	dayNightLayer: boolean;
	dayNightLayerBrightness: number;
	airportMarkers: boolean;
	airportMarkerSize: number;
	planeOverlay: PlaneOverlayMode;
	planeMarkerSize: number;
	animatedPlaneMarkers: boolean;
	sectorAreas: boolean;
	traconColor: string;
	traconTransparency: number;
	firColor: string;
	firTransparency: number;
	timeZone: TimeZone;
	timeFormat: TimeFormat;
	temperatureUnit: TemperatureUnit;
	speedUnit: SpeedUnit;
	verticalSpeedUnit: VerticalSpeedUnit;
	windSpeedUnit: SpeedUnit;
	altitudeUnit: AltitudeUnit;
	distanceUnit: DistanceUnit;
}

export interface SettingState extends SettingValues {
	setTheme: (value: Theme) => void;
	setDayNightLayer: (value: boolean) => void;
	setDayNightLayerBrightness: (value: number) => void;
	setAirportMarkers: (value: boolean) => void;
	setAirportMarkerSize: (value: number) => void;
	setPlaneOverlay: (value: PlaneOverlayMode) => void;
	setPlaneMarkerSize: (value: number) => void;
	setAnimatedPlaneMarkers: (value: boolean) => void;
	setSectorAreas: (value: boolean) => void;
	setTraconColor: (value: string) => void;
	setTraconTransparency: (value: number) => void;
	setFirColor: (value: string) => void;
	setFirTransparency: (value: number) => void;
	setTimeZone: (value: TimeZone) => void;
	setTimeFormat: (value: TimeFormat) => void;
	setTemperatureUnit: (value: TemperatureUnit) => void;
	setSpeedUnit: (value: SpeedUnit) => void;
	setVerticalSpeedUnit: (value: VerticalSpeedUnit) => void;
	setWindSpeedUnit: (value: SpeedUnit) => void;
	setAltitudeUnit: (value: AltitudeUnit) => void;
	setDistanceUnit: (value: DistanceUnit) => void;

	setSettings: (settings: SettingValues) => void;
	resetSettings: () => void;
}
