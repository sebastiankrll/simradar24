"use client";

import { resetMap } from "@/components/Map/utils/events";
import Icon from "@/components/shared/Icon/Icon";
import "./FiltersPanel.css";
import { useEffect, useState } from "react";
import { multiStyles, Select, type SelectOptionType, singleStyles } from "@/components/shared/Select/Select";
import { getFilterValues } from "@/storage/filter";
import { useFiltersStore } from "@/storage/zustand";

const FILTER_OPTIONS_MAPPING = {
	airline: ["Airline"],
	aircraft: ["Aircraft Type", "Aircraft Registration"],
	airport: ["Departure", "Arrival", "Any"],
	user: ["VATSIM ID", "Pilot Name"],
	flight: ["Flight Callsign", "Status", "Squawk", "Barometric Altitude", "Groundspeed", "Flight Rules"],
	atc: ["Station Callsign", "Station Type"],
};
const CATEGORY_OPTIONS = [
	{ value: "airline", label: "Airline" },
	{ value: "aircraft", label: "Aircraft" },
	{ value: "airport", label: "Airport" },
	{ value: "user", label: "User" },
	{ value: "flight", label: "Flight" },
	{ value: "atc", label: "ATC" },
];
const FIXED_OPTIONS = {
	Status: [
		{ value: "on-ground", label: "On Ground" },
		{ value: "in-air", label: "In Air" },
	],
	"Flight Rules": [
		{ value: "IFR", label: "IFR" },
		{ value: "VFR", label: "VFR" },
	],
	"Station Type": [
		{ value: "ATIS", label: "ATIS" },
		{ value: "Delivery", label: "Delivery" },
		{ value: "Ground", label: "Ground" },
		{ value: "Tower", label: "Tower" },
		{ value: "Approach", label: "Approach" },
		{ value: "Center", label: "Center" },
	],
};

export default function FiltersPanel() {
	const [options, setOptions] = useState<string[]>([]);
	const [inputs, setInputs] = useState<string[]>([]);
	const [filterValues, setFilterValues] = useState<Record<string, any>>({});

	const filters = useFiltersStore();

	const handleCategoryChange = (option: SelectOptionType | null) => {
		const category = option?.value as keyof typeof FILTER_OPTIONS_MAPPING;
		setOptions(FILTER_OPTIONS_MAPPING[category] || []);
	};

	const handleFilterAdd = (option: string) => {
		if (inputs.includes(option)) {
			setInputs((prevInputs) => prevInputs.filter((input) => input !== option));
			setFilterValues((prev) => {
				const copy = { ...prev };
				delete copy[option];
				return copy;
			});
			return;
		}
		setInputs((prevInputs) => [...prevInputs, option]);
	};

	const handleFilterRemove = (option: string) => {
		setInputs((prevInputs) => prevInputs.filter((input) => input !== option));
		setFilterValues((prev) => {
			const copy = { ...prev };
			delete copy[option];
			return copy;
		});
	};

	const handleInputValueChange = (filter: string, value: any) => {
		setFilterValues((prev) => ({
			...prev,
			[filter]: value,
		}));
	};

	const handleSaveAndApply = () => {
		filters.setFilters(filterValues);
		filters.setActive(true);
	};

	const handleClearAll = () => {
		setInputs([]);
		setFilterValues({});
		filters.resetAllFilters();
		filters.setActive(false);
	};

	const FilterOption = ({ label }: { label: string }) => {
		return (
			<div className="filter-option">
				<p>{label}</p>
				<button type="button" className="filter-button" onClick={() => handleFilterAdd(label)}>
					<Icon name={inputs.includes(label) ? "remove" : "add"} size={24} />
				</button>
			</div>
		);
	};

	const FilterInput = ({ label }: { label: string }) => {
		return (
			<div className="filter-input-wrapper">
				<p>{label}</p>
				<div className="filter-input">
					<InputField
						filter={label}
						fixedOptions={FIXED_OPTIONS[label as keyof typeof FIXED_OPTIONS]}
						value={filterValues[label] || null}
						onChange={(value: any) => handleInputValueChange(label, value)}
					/>
					<button type="button" className="filter-button" onClick={() => handleFilterRemove(label)}>
						<Icon name="remove" size={24} />
					</button>
				</div>
			</div>
		);
	};

	useEffect(() => {
		const filters = useFiltersStore.getState();
		const activeInputs = Object.entries(filters)
			.filter(([_key, value]) => Array.isArray(value) && value.length > 0)
			.map(([key]) => key);
		setInputs(activeInputs);

		const values: Record<string, any> = {};
		activeInputs.forEach((key) => {
			values[key] = filters[key as keyof typeof filters];
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
					options={CATEGORY_OPTIONS}
					id="filter-select"
					placeholder={"Select a filter category..."}
				/>
				{options.length === 0 ? (
					<div className="filter-list">
						<p className="no-filters-selected">No category selected. Use the dropdown above to choose a filter category.</p>
					</div>
				) : (
					<div className="filter-list">
						{options.map((option) => (
							<FilterOption key={option} label={option} />
						))}
					</div>
				)}
				<div className="panel-data-separator">Manage filters</div>
				<div id="filter-actions">
					<button type="button" className="filter-action" style={{ background: "var(--color-green)" }} onClick={handleSaveAndApply}>
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
						{inputs.map((input) => (
							<FilterInput key={input} label={input} />
						))}
					</div>
				)}
			</div>
		</>
	);
}

const SIMPLE_FILTERS = ["Aircraft Registration", "VATSIM ID", "Pilot Name", "Flight Callsign", "Squawk", "Station Callsign"];
const UPPERCASE_FILTERS = ["Aircraft Registration", "VATSIM ID", "Flight Callsign", "Station Callsign"];

function InputField({
	filter,
	fixedOptions,
	value,
	onChange,
}: {
	filter: string;
	fixedOptions?: SelectOptionType[];
	value: any;
	onChange: (value: any) => void;
}) {
	const [inputValue, setInputValue] = useState("");
	const [options, setOptions] = useState<SelectOptionType[]>(fixedOptions || []);

	const handleInputChange = async (val: string) => {
		setInputValue(val);

		if (SIMPLE_FILTERS.includes(filter) && val !== "") {
			setOptions([{ value: val, label: UPPERCASE_FILTERS.includes(filter) ? val.toUpperCase() : val }]);
			return;
		}
		if (val === "") {
			setOptions([]);
			return;
		}

		const results = await getFilterValues(filter, val);
		if (results.length === 0) {
			setOptions([{ value: val, label: UPPERCASE_FILTERS.includes(filter) ? val.toUpperCase() : val }]);
			return;
		}
		setOptions(
			results.map((result) => ({
				value: result.value,
				label: UPPERCASE_FILTERS.includes(filter) ? result.label.toUpperCase() : result.label,
			})),
		);
	};

	return (
		<Select
			isMulti
			unstyled
			inputValue={inputValue}
			onInputChange={handleInputChange}
			menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
			styles={multiStyles}
			options={fixedOptions || options}
			noOptionsMessage={() => null}
			placeholder={"Type to search ..."}
			value={value}
			onChange={onChange}
		/>
	);
}
