import type { RgbaColor } from "react-colorful";

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
	traconColor: RgbaColor;
	firColor: RgbaColor;
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
	setTraconColor: (value: RgbaColor) => void;
	setFirColor: (value: RgbaColor) => void;
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

export interface FilterValues {
	active: boolean;
	Airline: string[];
	"Aircraft Type": string[];
	"Aircraft Registration": string[];
	Departure: string[];
	Arrival: string[];
	Any: string[];
	Callsign: string[];
	Squawk: string[];
	"Barometric Altitude": { min: number; max: number };
	Groundspeed: { min: number; max: number };
	"Flight Rules": string[];
}

export interface FilterState extends FilterValues {
	setActive: (active: boolean) => void;
	setFilters: (filters: Partial<FilterValues>) => void;
	resetAllFilters: () => void;
}

export interface FilterStats {
	pilotCount: [number, number];
	setPilotCount: (count: [number, number]) => void;
}
