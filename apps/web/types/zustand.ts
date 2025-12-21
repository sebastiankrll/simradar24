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

export interface FilterValues {
	active: boolean;
	Airline: string[];
	"Aircraft Type": string[];
	"Aircraft Registration": string[];
	Departure: string[];
	Arrival: string[];
	Any: string[];
	"VATSIM ID": string[];
	"Pilot Name": string[];
	"Flight Callsign": string[];
	Status: string[];
	Squawk: string[];
	"Barometric Altitude": string[];
	Groundspeed: string[];
	"Flight Rules": string[];
	"Station Callsign": string[];
	"Station Type": string[];
}

export interface FilterState extends FilterValues {
	setFilters: (filters: Partial<FilterValues>) => void;
	setActive: (value: boolean) => void;
	resetAllFilters: () => void;
}
