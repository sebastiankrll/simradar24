"use client";

import Icon from "@/components/Icon/Icon";
import "./FiltersPanel.css";
import { type SyntheticEvent, useCallback, useEffect, useState } from "react";
import type { MultiValue } from "react-select";
import { resetMap } from "@/app/(map)/lib/events";
import { applyMapFilters } from "@/app/(map)/lib/filters";
import { RangeSwitch } from "@/components/Input/Input";
import { multiStyles, Select, type SelectOptionType, singleStyles } from "@/components/Select/Select";
import { getFilterValues } from "@/storage/filter";
import { useFiltersStore } from "@/storage/zustand";

const FILTER_OPTIONS_MAPPING = {
	Airline: ["Airline", "Callsign"],
	Aircraft: ["Aircraft Type", "Aircraft Registration"],
	Airport: ["Departure", "Arrival", "Any"],
	Flight: ["Barometric Altitude", "Groundspeed", "Squawk", "Flight Rules"],
};
const FIXED_OPTIONS = {
	"Flight Rules": [
		{ value: "IFR", label: "IFR" },
		{ value: "VFR", label: "VFR" },
	],
};
const SIMPLE_FILTERS = ["Aircraft Registration", "Callsign", "Squawk"];
const UPPERCASE_FILTERS = ["Aircraft Registration", "Callsign"];
const RANGE_FILTERS = ["Barometric Altitude", "Groundspeed"];

export default function FiltersPanel() {
	const { setFilters, setActive, resetAllFilters } = useFiltersStore();

	const [options, setOptions] = useState<string[]>([]);
	const [inputs, setInputs] = useState<string[]>([]);
	const [filterValues, setFilterValues] = useState<Record<string, any>>({});

	const handleCategoryChange = useCallback((option: SelectOptionType | null) => {
		const category = option?.value as keyof typeof FILTER_OPTIONS_MAPPING;
		setOptions(FILTER_OPTIONS_MAPPING[category] || []);
	}, []);

	const handleFilterAdd = useCallback((option: string) => {
		setInputs((prev) => {
			if (prev.includes(option)) return prev.filter((i) => i !== option);
			return [...prev, option];
		});
		setFilterValues((prev) => {
			const copy = { ...prev };
			if (copy[option]) delete copy[option];
			return copy;
		});
	}, []);

	const handleFilterRemove = useCallback((option: string) => {
		setInputs((prev) => prev.filter((i) => i !== option));
		setFilterValues((prev) => {
			const copy = { ...prev };
			delete copy[option];
			return copy;
		});
	}, []);

	const handleInputValueChange = useCallback((label: string, value: any) => {
		setFilterValues((prev) => ({
			...prev,
			[label]: value,
		}));
	}, []);

	const handleSaveAndApply = () => {
		setFilters(filterValues);
		setActive(true);
		applyMapFilters(filterValues);
	};

	const handleClearAll = () => {
		setInputs([]);
		setFilterValues({});
		resetAllFilters();
		setActive(false);
		applyMapFilters({});
	};

	useEffect(() => {
		const state = useFiltersStore.getState();
		const activeInputs = Object.entries(state)
			.filter(([_key, value]) => Array.isArray(value) && value.length > 0)
			.map(([key]) => key);
		if (activeInputs.length === 0) return;

		setInputs(activeInputs);
		const values: Record<string, any> = {};
		activeInputs.forEach((key) => {
			values[key] = state[key as keyof typeof state];
		});
		setFilterValues(values);
	}, []);

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">Filters</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
					<Icon name="cancel" size={24} />
				</button>
			</div>

			<div className="panel-container main scrollable" id="filters-panel">
				<div className="panel-data-separator">Add filters</div>
				<Select
					unstyled
					menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
					styles={singleStyles}
					onChange={handleCategoryChange}
					options={Object.keys(FILTER_OPTIONS_MAPPING).map((key) => ({ value: key, label: key }))}
					id="filter-select"
					placeholder="Select a filter category..."
				/>
				{options.length === 0 ? (
					<div className="filter-list">
						<p className="no-filters-selected">No category selected. Use the dropdown above to choose a filter category.</p>
					</div>
				) : (
					<div className="filter-list">
						{options.map((option) => (
							<FilterOption key={option} label={option} selected={inputs.includes(option)} onToggle={handleFilterAdd} />
						))}
					</div>
				)}

				<div className="panel-data-separator">Manage filters</div>
				<div id="filter-actions">
					<button
						type="button"
						className="filter-action"
						id="filter-apply"
						onClick={handleSaveAndApply}
						disabled={Object.keys(filterValues).length === 0}
					>
						Save & Apply
					</button>
					<button type="button" className="filter-action" style={{ background: "var(--color-red)" }} onClick={handleClearAll}>
						Clear All
					</button>
				</div>

				{inputs.length === 0 ? (
					<div className="filter-list">
						<p className="no-filters-selected">No filters added.</p>
					</div>
				) : (
					<div className="filter-list" style={{ gap: "6px" }}>
						{inputs.map((input) =>
							RANGE_FILTERS.includes(input) ? (
								<FilterRange
									key={input}
									label={input}
									value={filterValues[input] || [0, input === "Barometric Altitude" ? 50000 : 1000]}
									onChange={handleInputValueChange}
									onRemove={handleFilterRemove}
								/>
							) : (
								<FilterSelect
									key={input}
									label={input}
									value={filterValues[input] || null}
									onChange={handleInputValueChange}
									onRemove={handleFilterRemove}
									fixedOptions={FIXED_OPTIONS[input as keyof typeof FIXED_OPTIONS]}
								/>
							),
						)}
					</div>
				)}
			</div>
		</>
	);
}

function FilterOption({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: (label: string) => void }) {
	return (
		<div className="filter-option">
			<p>{label}</p>
			<button type="button" className="filter-button" onClick={() => onToggle(label)}>
				<Icon name={selected ? "remove" : "add"} size={24} />
			</button>
		</div>
	);
}

function FilterSelect({
	label,
	value,
	onChange,
	onRemove,
	fixedOptions,
}: {
	label: string;
	value: any;
	onChange: (label: string, val: any) => void;
	onRemove: (label: string) => void;
	fixedOptions?: SelectOptionType[];
}) {
	const [inputValue, setInputValue] = useState("");
	const [options, setOptions] = useState<SelectOptionType[]>(fixedOptions || []);

	const handleInputChange = useCallback(
		async (val: string) => {
			setInputValue(val);
			if (SIMPLE_FILTERS.includes(label) && val !== "") {
				setOptions([{ value: val, label: UPPERCASE_FILTERS.includes(label) ? val.toUpperCase() : val }]);
				return;
			}
			if (!val) {
				setOptions([]);
				return;
			}
			const results = await getFilterValues(label, val);
			if (results.length === 0) {
				setOptions([{ value: val, label: UPPERCASE_FILTERS.includes(label) ? val.toUpperCase() : val }]);
				return;
			}
			setOptions(
				results.map((r) => ({
					value: r.value,
					label: UPPERCASE_FILTERS.includes(label) ? r.label.toUpperCase() : r.label,
				})),
			);
		},
		[label],
	);

	const handleChange = (newValue: MultiValue<SelectOptionType>) => {
		onChange(label, newValue);
	};

	return (
		<div className="filter-input-wrapper">
			<p>{label}</p>
			<div className="filter-input">
				<Select
					isMulti
					unstyled
					inputValue={inputValue}
					onInputChange={handleInputChange}
					menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
					styles={multiStyles}
					options={fixedOptions || options}
					noOptionsMessage={() => null}
					placeholder="Type to search ..."
					value={value}
					onChange={handleChange}
				/>
				<button type="button" className="filter-button" onClick={() => onRemove(label)}>
					<Icon name="remove" size={24} />
				</button>
			</div>
		</div>
	);
}

function FilterRange({
	label,
	value,
	onChange,
	onRemove,
}: {
	label: string;
	value: number[];
	onChange: (label: string, val: number[]) => void;
	onRemove: (label: string) => void;
}) {
	const [range, setRange] = useState<number[]>(value);

	const handleChange = (_event: Event, newValue: number | number[]) => {
		if (Array.isArray(newValue)) setRange(newValue);
	};

	const handleCommit = (_event: Event | SyntheticEvent<Element, Event>, newValue: number | number[]) => {
		if (Array.isArray(newValue)) onChange(label, newValue);
	};

	return (
		<div className="filter-input-wrapper">
			<p>{label}</p>
			<div className="filter-input">
				<RangeSwitch
					value={range}
					onChange={handleChange}
					onChangeCommitted={handleCommit}
					valueLabelDisplay="auto"
					min={0}
					max={label === "Barometric Altitude" ? 50000 : 1000}
				/>
				<button type="button" className="filter-button" onClick={() => onRemove(label)}>
					<Icon name="remove" size={24} />
				</button>
			</div>
		</div>
	);
}
