import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FilterState, SettingState, SettingValues } from "@/types/zustand";

const defaultSettings: SettingValues = {
	theme: "dark" as const,
	dayNightLayer: true as const,
	dayNightLayerBrightness: 50 as const,
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

export function getSettingValues(): SettingValues {
	const s = useSettingsStore.getState();
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

export async function storeUserSettings(): Promise<void> {
	try {
		await fetch("/user/settings", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(getSettingValues()),
		});
	} catch (err) {
		console.error("Failed to save settings:", err);
	}
}

export async function fetchUserSettings(): Promise<void> {
	try {
		const res = await fetch("/user/settings", { cache: "no-store" });
		if (!res.ok) {
			return;
		}

		const data = await res.json();
		useSettingsStore.getState().setSettings(data.settings);
	} catch (err) {
		console.error("Failed to load settings:", err);
	}
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

export const useFiltersStore = create<FilterState>()(
	persist(
		(set) => ({
			active: false,
			Airline: [],
			"Aircraft Type": [],
			"Aircraft Registration": [],
			Departure: [],
			Arrival: [],
			Any: [],
			"VATSIM ID": [],
			"Pilot Name": [],
			"Flight Callsign": [],
			Status: [],
			Squawk: [],
			"Barometric Altitude": [],
			Groundspeed: [],
			"Flight Rules": [],
			"Station Callsign": [],
			"Station Type": [],

			setFilters: (filters) => set({ ...filters }),
			setActive: (value) => set({ active: value }),
			resetAllFilters: () =>
				set({
					Airline: [],
					"Aircraft Type": [],
					"Aircraft Registration": [],
					Departure: [],
					Arrival: [],
					Any: [],
					"VATSIM ID": [],
					"Pilot Name": [],
					"Flight Callsign": [],
					Status: [],
					Squawk: [],
					"Barometric Altitude": [],
					Groundspeed: [],
					"Flight Rules": [],
					"Station Callsign": [],
					"Station Type": [],
				}),
		}),
		{
			name: "user-filters",
		},
	),
);
