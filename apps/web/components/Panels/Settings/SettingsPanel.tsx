"use client";

import { resetMap } from "@/components/Map/utils/events";
import "./SettingsPanel.css";
import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";
import { useSettingsStore } from "@/storage/zustand";

export default function SettingsPanel() {
	const settings = useSettingsStore();
	const { theme, setTheme } = useTheme();

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">Settings</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Close panel</title>
						<path
							fillRule="evenodd"
							d="M23.763 22.658 13.106 12 23.68 1.42a.781.781 0 0 0-1.1-1.1L12 10.894 1.42.237a.78.78 0 0 0-1.1 1.105L10.894 12 .237 22.658a.763.763 0 0 0 0 1.105.76.76 0 0 0 1.105 0L12 13.106l10.658 10.657a.76.76 0 0 0 1.105 0 .76.76 0 0 0 0-1.105"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
			</div>
			<div className="panel-container main scrollable" id="settings-panel">
				<div className="panel-data-separator">General</div>
				<div className="setting-item">
					<p className="setting-item-title">Dark mode</p>
					<ToggleSwitch checked={theme === "dark"} onChange={(e) => setTheme(e.target.checked ? "dark" : "light")} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">Day / night layer</p>
					<ToggleSwitch checked={settings.dayNightLayer} onChange={(e) => settings.setDayNightLayer(e.target.checked)} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">Day / night brightness</p>
					<SliderSwitch value={settings.dayNightLayerBrightness} onChange={settings.setDayNightLayerBrightness} />
				</div>

				<div className="panel-data-separator">Airports</div>
				<div className="setting-item">
					<p className="setting-item-title">Airport markers</p>
					<ToggleSwitch checked={settings.airportMarkers} onChange={(e) => settings.setAirportMarkers(e.target.checked)} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">Airport marker size</p>
					<SliderSwitch value={settings.airportMarkerSize} onChange={settings.setAirportMarkerSize} />
				</div>

				<div className="panel-data-separator">Planes</div>
				<div className="setting-item column">
					<p className="setting-item-title">Plane overlay</p>
					<ChooseSwitch options={["callsign", "telemetry-off", "full"] as const} value={settings.planeOverlay} onChange={settings.setPlaneOverlay} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">Plane marker size</p>
					<SliderSwitch value={settings.planeMarkerSize} onChange={settings.setPlaneMarkerSize} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">Animated plane markers</p>
					<ToggleSwitch checked={settings.animatedPlaneMarkers} onChange={(e) => settings.setAnimatedPlaneMarkers(e.target.checked)} />
					<p className="setting-item-desc">Turn off to improve performance on low-end devices.</p>
				</div>

				<div className="panel-data-separator">Sectors</div>
				<div className="setting-item">
					<p className="setting-item-title">Sector areas</p>
					<ToggleSwitch checked={settings.sectorAreas} onChange={(e) => settings.setSectorAreas(e.target.checked)} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">TRACON color</p>
					<ColorPicker color={settings.traconColor} onChange={settings.setTraconColor} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">TRACON transparency</p>
					<SliderSwitch value={settings.traconTransparency} onChange={settings.setTraconTransparency} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">FIR color</p>
					<ColorPicker color={settings.firColor} onChange={settings.setFirColor} />
				</div>
				<div className="setting-item">
					<p className="setting-item-title">FIR transparency</p>
					<SliderSwitch value={settings.firTransparency} onChange={settings.setFirTransparency} />
				</div>

				<div className="panel-data-separator">Units</div>
				<div className="setting-item column">
					<p className="setting-item-title">Time Zone</p>
					<ChooseSwitch options={["local", "utc"] as const} value={settings.timeZone} onChange={settings.setTimeZone} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Clock</p>
					<ChooseSwitch options={["12h", "24h"] as const} value={settings.timeFormat} onChange={settings.setTimeFormat} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Temperature</p>
					<ChooseSwitch options={["celsius", "fahrenheit"] as const} value={settings.temperatureUnit} onChange={settings.setTemperatureUnit} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Speed</p>
					<ChooseSwitch options={["knots", "kmh", "mph", "ms"] as const} value={settings.speedUnit} onChange={settings.setSpeedUnit} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Vertical Speed</p>
					<ChooseSwitch options={["fpm", "ms"] as const} value={settings.verticalSpeedUnit} onChange={settings.setVerticalSpeedUnit} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Wind Speed</p>
					<ChooseSwitch options={["knots", "kmh", "mph", "ms"] as const} value={settings.windSpeedUnit} onChange={settings.setWindSpeedUnit} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Altitude</p>
					<ChooseSwitch options={["feet", "meters"] as const} value={settings.altitudeUnit} onChange={settings.setAltitudeUnit} />
				</div>
				<div className="setting-item column">
					<p className="setting-item-title">Distance</p>
					<ChooseSwitch options={["km", "miles", "nm"] as const} value={settings.distanceUnit} onChange={settings.setDistanceUnit} />
				</div>
				<button id="reset-settings" type="button" onClick={settings.resetSettings}>
					Reset all settings
				</button>
			</div>
		</>
	);
}

function ToggleSwitch({ checked, onChange }: { checked?: boolean; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
	const id = useId();

	return (
		<label className="tgl-switch" htmlFor={id}>
			<input type="checkbox" id={id} checked={checked} onChange={onChange} />
			<span className="tgl-switch-slider"></span>
		</label>
	);
}

function SliderSwitch({ value = 50, onChange, step }: { value?: number; onChange?: (value: number) => void; step?: number }) {
	const id = useId();

	return (
		<label
			className="sld-switch"
			htmlFor={id}
			style={
				{
					"--value": value,
					"--max": 100,
					"--step": step,
				} as React.CSSProperties
			}
		>
			<input
				type="range"
				id={id}
				min="0"
				max="100"
				step={step}
				value={value}
				onChange={(e) => (onChange ? onChange(Number(e.target.value)) : undefined)}
			/>
		</label>
	);
}

function ChooseSwitch<const T extends readonly string[]>({
	options,
	value,
	onChange,
}: {
	options: T;
	value?: T[number];
	onChange?: (value: T[number]) => void;
}) {
	const index = value ? (options as readonly string[]).indexOf(value as string) : 0;

	return (
		<fieldset className="choose-switch" style={{ "--count": options.length, "--index": index } as React.CSSProperties} aria-label="Options">
			<span className="choose-switch-thumb" aria-hidden="true" />
			{options.map((option, idx) => (
				<button key={option} type="button" className="choose-switch-option" aria-pressed={index === idx} onClick={() => onChange?.(option)}>
					{option}
				</button>
			))}
		</fieldset>
	);
}

function ColorPicker({ color, onChange }: { color: string; onChange: (color: string) => void }) {
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		}

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () => document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [isOpen]);

	return (
		<div className="color-picker-wrapper" ref={ref}>
			<button
				type="button"
				className="color-picker-swatch"
				style={{ backgroundColor: color, borderColor: isOpen ? "white" : "" }}
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Open color picker"
			/>
			{isOpen && (
				<div className="color-picker-popover">
					<HexColorPicker color={color} onChange={onChange} />
				</div>
			)}
		</div>
	);
}
