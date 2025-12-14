import { create } from "zustand";
import { persist } from "zustand/middleware";

type PlaneOverlayMode = "callsign" | "telemetry-off" | "full";
type TimeZone = "local" | "utc";
type TimeFormat = "24h" | "12h";
type TemperatureUnit = "celsius" | "fahrenheit";
type SpeedUnit = "knots" | "kmh" | "mph" | "ms";
type VerticalSpeedUnit = "fpm" | "ms";
type AltitudeUnit = "feet" | "meters";
type DistanceUnit = "km" | "miles" | "nm";

interface SettingsState {
	dayNightLayer: boolean;
	dayNightLayerBrightness: number;
	airportMarkers: boolean;
	airportMarkerSize: number;
	planeOverlay: PlaneOverlayMode;
	planeMarkerSize: number;
	animatedPlaneMarkers: boolean;
	timeZone: TimeZone;
	timeFormat: TimeFormat;
	temperatureUnit: TemperatureUnit;
	speedUnit: SpeedUnit;
	verticalSpeedUnit: VerticalSpeedUnit;
	windSpeedUnit: SpeedUnit;
	altitudeUnit: AltitudeUnit;
	distanceUnit: DistanceUnit;

	setDayNightLayer: (value: boolean) => void;
	setDayNightLayerBrightness: (value: number) => void;
	setAirportMarkers: (value: boolean) => void;
	setAirportMarkerSize: (value: number) => void;
	setPlaneOverlay: (value: PlaneOverlayMode) => void;
	setPlaneMarkerSize: (value: number) => void;
	setAnimatedPlaneMarkers: (value: boolean) => void;
	setTimeZone: (value: TimeZone) => void;
	setTimeFormat: (value: TimeFormat) => void;
	setTemperatureUnit: (value: TemperatureUnit) => void;
	setSpeedUnit: (value: SpeedUnit) => void;
	setVerticalSpeedUnit: (value: VerticalSpeedUnit) => void;
	setWindSpeedUnit: (value: SpeedUnit) => void;
	setAltitudeUnit: (value: AltitudeUnit) => void;
	setDistanceUnit: (value: DistanceUnit) => void;

	resetSettings: () => void;
}

const defaultSettings = {
	dayNightLayer: true as const,
	dayNightLayerBrightness: 50 as const,
	airportMarkers: true as const,
	airportMarkerSize: 50 as const,
	planeOverlay: "full" as const,
	planeMarkerSize: 50 as const,
	animatedPlaneMarkers: true as const,
	timeZone: "local" as const,
	timeFormat: "24h" as const,
	temperatureUnit: "celsius" as const,
	speedUnit: "knots" as const,
	verticalSpeedUnit: "fpm" as const,
	windSpeedUnit: "knots" as const,
	altitudeUnit: "feet" as const,
	distanceUnit: "km" as const,
};

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			...defaultSettings,

			setDayNightLayer: (value) => set({ dayNightLayer: value }),
			setDayNightLayerBrightness: (value) => set({ dayNightLayerBrightness: value }),
			setAirportMarkers: (value) => set({ airportMarkers: value }),
			setAirportMarkerSize: (value) => set({ airportMarkerSize: value }),
			setPlaneOverlay: (value) => set({ planeOverlay: value }),
			setPlaneMarkerSize: (value) => set({ planeMarkerSize: value }),
			setAnimatedPlaneMarkers: (value) => set({ animatedPlaneMarkers: value }),
			setTimeZone: (value) => set({ timeZone: value }),
			setTimeFormat: (value) => set({ timeFormat: value }),
			setTemperatureUnit: (value) => set({ temperatureUnit: value }),
			setSpeedUnit: (value) => set({ speedUnit: value }),
			setVerticalSpeedUnit: (value) => set({ verticalSpeedUnit: value }),
			setWindSpeedUnit: (value) => set({ windSpeedUnit: value }),
			setAltitudeUnit: (value) => set({ altitudeUnit: value }),
			setDistanceUnit: (value) => set({ distanceUnit: value }),

			resetSettings: () => set({ ...defaultSettings }),
		}),
		{
			name: "simradar21-settings",
		},
	),
);
