import type { SettingState, SettingValues } from "@sr24/types/db";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const defaultSettings: SettingValues = {
	theme: "dark" as const,
	dayNightLayer: true as const,
	dayNightLayerBrightness: 35 as const,
	airportMarkers: true as const,
	airportMarkerSize: 50 as const,
	planeOverlay: "full" as const,
	planeMarkerSize: 50 as const,
	animatedPlaneMarkers: true as const,
	sectorAreas: true as const,
	traconColor: "rgba(222, 89, 234, 1)" as const,
	traconTransparency: 10 as const,
	firColor: "rgba(77, 95, 131, 1)" as const,
	firTransparency: 10 as const,
	timeZone: "utc" as const,
	timeFormat: "24h" as const,
	temperatureUnit: "celsius" as const,
	speedUnit: "knots" as const,
	verticalSpeedUnit: "fpm" as const,
	windSpeedUnit: "knots" as const,
	altitudeUnit: "feet" as const,
	distanceUnit: "nm" as const,
};

export function getSettingValues(s: SettingState): SettingValues {
	return {
		theme: s.theme,
		dayNightLayer: s.dayNightLayer,
		dayNightLayerBrightness: s.dayNightLayerBrightness,
		airportMarkers: s.airportMarkers,
		airportMarkerSize: s.airportMarkerSize,
		planeOverlay: s.planeOverlay,
		planeMarkerSize: s.planeMarkerSize,
		animatedPlaneMarkers: s.animatedPlaneMarkers,
		sectorAreas: s.sectorAreas,
		traconColor: s.traconColor,
		traconTransparency: s.traconTransparency,
		firColor: s.firColor,
		firTransparency: s.firTransparency,
		timeZone: s.timeZone,
		timeFormat: s.timeFormat,
		temperatureUnit: s.temperatureUnit,
		speedUnit: s.speedUnit,
		verticalSpeedUnit: s.verticalSpeedUnit,
		windSpeedUnit: s.windSpeedUnit,
		altitudeUnit: s.altitudeUnit,
		distanceUnit: s.distanceUnit,
	};
}

export const useSettingsStore = create<SettingState>()(
	persist(
		(set) => ({
			...defaultSettings,

			setTheme: (value) => set({ theme: value }),
			setDayNightLayer: (value) => set({ dayNightLayer: value }),
			setDayNightLayerBrightness: (value) => set({ dayNightLayerBrightness: value }),
			setAirportMarkers: (value) => set({ airportMarkers: value }),
			setAirportMarkerSize: (value) => set({ airportMarkerSize: value }),
			setPlaneOverlay: (value) => set({ planeOverlay: value }),
			setPlaneMarkerSize: (value) => set({ planeMarkerSize: value }),
			setAnimatedPlaneMarkers: (value) => set({ animatedPlaneMarkers: value }),
			setSectorAreas: (value) => set({ sectorAreas: value }),
			setTraconColor: (value) => set({ traconColor: value }),
			setTraconTransparency: (value) => set({ traconTransparency: value }),
			setFirColor: (value) => set({ firColor: value }),
			setFirTransparency: (value) => set({ firTransparency: value }),
			setTimeZone: (value) => set({ timeZone: value }),
			setTimeFormat: (value) => set({ timeFormat: value }),
			setTemperatureUnit: (value) => set({ temperatureUnit: value }),
			setSpeedUnit: (value) => set({ speedUnit: value }),
			setVerticalSpeedUnit: (value) => set({ verticalSpeedUnit: value }),
			setWindSpeedUnit: (value) => set({ windSpeedUnit: value }),
			setAltitudeUnit: (value) => set({ altitudeUnit: value }),
			setDistanceUnit: (value) => set({ distanceUnit: value }),

			setSettings: (settings) => set({ ...settings }),
			resetSettings: () => set({ ...defaultSettings }),
		}),
		{
			name: "user-settings",
		},
	),
);
