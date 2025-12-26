"use client";

import { resetMap } from "@/components/Map/utils/events";
import "./SettingsPanel.css";
import { type SyntheticEvent, useEffect } from "react";
import Icon from "@/components/shared/Icon/Icon";
import { ChooseSwitch, ColorPicker, RangeSwitch, ToggleSwitch } from "@/components/shared/Input/Input";
import { storeUserSettings, useSettingsStore } from "@/storage/zustand";

export default function SettingsPanel() {
	const { resetSettings } = useSettingsStore();

	useEffect(() => {
		return () => {
			storeUserSettings();
		};
	}, []);

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">Settings</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
					<Icon name="cancel" size={24} />
				</button>
			</div>
			<div className="panel-container main scrollable" id="settings-panel">
				<GeneralSettings />
				<AirportSettings />
				<PlaneSettings />
				<SectorSettings />
				<UnitSettings />
				<button id="reset-settings" type="button" onClick={resetSettings}>
					Reset all settings
				</button>
			</div>
		</>
	);
}

function GeneralSettings() {
	const { dayNightLayer, setDayNightLayer, dayNightLayerBrightness, setDayNightLayerBrightness } = useSettingsStore();

	return (
		<>
			<div className="panel-data-separator">General</div>
			<div className="setting-item">
				<p className="setting-item-title">Day / night layer</p>
				<ToggleSwitch checked={dayNightLayer} onChange={(e) => setDayNightLayer(e.target.checked)} />
			</div>
			<div className="setting-item">
				<p className="setting-item-title">Day / night brightness</p>
				<RangeSwitch
					value={dayNightLayerBrightness}
					onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
						setDayNightLayerBrightness(newValue as number);
					}}
					style={{ width: 100 }}
				/>
			</div>
		</>
	);
}

function AirportSettings() {
	const { airportMarkers, setAirportMarkers, airportMarkerSize, setAirportMarkerSize } = useSettingsStore();

	return (
		<>
			<div className="panel-data-separator">Airports</div>
			<div className="setting-item">
				<p className="setting-item-title">Airport markers</p>
				<ToggleSwitch checked={airportMarkers} onChange={(e) => setAirportMarkers(e.target.checked)} />
			</div>
			<div className="setting-item">
				<p className="setting-item-title">Airport marker size</p>
				<RangeSwitch
					value={airportMarkerSize}
					onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
						setAirportMarkerSize(newValue as number);
					}}
					style={{ width: 100 }}
				/>
			</div>
		</>
	);
}

function PlaneSettings() {
	const { planeOverlay, setPlaneOverlay, planeMarkerSize, setPlaneMarkerSize, animatedPlaneMarkers, setAnimatedPlaneMarkers } = useSettingsStore();

	return (
		<>
			<div className="panel-data-separator">Planes</div>
			<div className="setting-item column">
				<p className="setting-item-title">Plane overlay</p>
				<ChooseSwitch options={["callsign", "telemetry-off", "full"] as const} value={planeOverlay} onChange={setPlaneOverlay} />
			</div>
			<div className="setting-item">
				<p className="setting-item-title">Plane marker size</p>
				<RangeSwitch
					value={planeMarkerSize}
					onChange={(_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
						setPlaneMarkerSize(newValue as number);
					}}
					style={{ width: 100 }}
				/>
			</div>
			<div className="setting-item">
				<p className="setting-item-title">Animated plane markers</p>
				<ToggleSwitch checked={animatedPlaneMarkers} onChange={(e) => setAnimatedPlaneMarkers(e.target.checked)} />
				<p className="setting-item-desc">Turn off to improve performance on low-end devices.</p>
			</div>
		</>
	);
}

function SectorSettings() {
	const { sectorAreas, setSectorAreas, traconColor, setTraconColor, firColor, setFirColor } = useSettingsStore();

	return (
		<>
			<div className="panel-data-separator">Sectors</div>
			<div className="setting-item">
				<p className="setting-item-title">Sector areas</p>
				<ToggleSwitch checked={sectorAreas} onChange={(e) => setSectorAreas(e.target.checked)} />
			</div>
			<div className="setting-item">
				<p className="setting-item-title">TRACON color / transparency</p>
				<ColorPicker color={traconColor} onChange={setTraconColor} />
			</div>
			<div className="setting-item">
				<p className="setting-item-title">FIR color / transparency</p>
				<ColorPicker color={firColor} onChange={setFirColor} />
			</div>
		</>
	);
}

function UnitSettings() {
	const {
		timeZone,
		setTimeZone,
		timeFormat,
		setTimeFormat,
		temperatureUnit,
		setTemperatureUnit,
		speedUnit,
		setSpeedUnit,
		verticalSpeedUnit,
		setVerticalSpeedUnit,
		windSpeedUnit,
		setWindSpeedUnit,
		altitudeUnit,
		setAltitudeUnit,
		distanceUnit,
		setDistanceUnit,
	} = useSettingsStore();

	return (
		<>
			<div className="panel-data-separator">Units</div>
			<div className="setting-item column">
				<p className="setting-item-title">Time Zone</p>
				<ChooseSwitch options={["local", "utc"] as const} value={timeZone} onChange={setTimeZone} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Clock</p>
				<ChooseSwitch options={["12h", "24h"] as const} value={timeFormat} onChange={setTimeFormat} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Temperature</p>
				<ChooseSwitch options={["celsius", "fahrenheit"] as const} value={temperatureUnit} onChange={setTemperatureUnit} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Speed</p>
				<ChooseSwitch options={["knots", "kmh", "mph", "ms"] as const} value={speedUnit} onChange={setSpeedUnit} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Vertical Speed</p>
				<ChooseSwitch options={["fpm", "ms"] as const} value={verticalSpeedUnit} onChange={setVerticalSpeedUnit} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Wind Speed</p>
				<ChooseSwitch options={["knots", "kmh", "mph", "ms"] as const} value={windSpeedUnit} onChange={setWindSpeedUnit} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Altitude</p>
				<ChooseSwitch options={["feet", "meters"] as const} value={altitudeUnit} onChange={setAltitudeUnit} />
			</div>
			<div className="setting-item column">
				<p className="setting-item-title">Distance</p>
				<ChooseSwitch options={["km", "miles", "nm"] as const} value={distanceUnit} onChange={setDistanceUnit} />
			</div>
		</>
	);
}
