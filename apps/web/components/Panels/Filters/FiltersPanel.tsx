"use client";

import { resetMap } from "@/components/Map/utils/events";
import Icon from "@/components/shared/Icon/Icon";
import "./Filters.css";
import { useState } from "react";
import type { MultiValue } from "react-select";
import { multiStyles, Select, type SelectOptionType, singleStyles } from "@/components/shared/Select/Select";

const FILTER_OPTIONS_MAPPING = {
	airline: ["Airline", "Callsign"],
	aircraft: ["Aircraft Type", "Aircraft Registration"],
	airport: ["Airport", "Route"],
	user: ["VATSIM ID", "Pilot Name"],
	flight: ["Status", "Squawk", "Barometric Altitude", "Groundspeed", "Flight Rules"],
	atc: ["Callsign", "Station Type"],
};

const sample: SelectOptionType[] = [
	{ value: "chocolate", label: "Chocolate" },
	{ value: "strawberry", label: "Strawberry" },
	{ value: "vanilla", label: "Vanilla" },
	{ value: "mint", label: "Mint" },
	{ value: "cookie dough", label: "Cookie Dough" },
	{ value: "rocky road", label: "Rocky Road" },
	{ value: "pistachio", label: "Pistachio" },
	{ value: "coffee", label: "Coffee" },
];

const categoryOptions = [
	{ value: "airline", label: "Airline" },
	{ value: "aircraft", label: "Aircraft" },
	{ value: "airport", label: "Airport" },
	{ value: "user", label: "User" },
	{ value: "flight", label: "Flight" },
	{ value: "atc", label: "ATC" },
];

export default function FiltersPanel() {
	const [options, setOptions] = useState<string[]>([]);
	const [inputs, setInputs] = useState<string[]>([]);

	const handleCategoryChange = (option: SelectOptionType | null) => {
		const category = option?.value as keyof typeof FILTER_OPTIONS_MAPPING;
		setOptions(FILTER_OPTIONS_MAPPING[category] || []);
	};

	const handleFilterAdd = (option: string) => {
		if (inputs.includes(option)) {
			setInputs((prevInputs) => prevInputs.filter((input) => input !== option));
			return;
		}
		setInputs((prevInputs) => [...prevInputs, option]);
	};

	const handleFilterRemove = (option: string) => {
		setInputs((prevInputs) => prevInputs.filter((input) => input !== option));
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
					<InputField />
					<button type="button" className="filter-button" onClick={() => handleFilterRemove(label)}>
						<Icon name="remove" size={24} />
					</button>
				</div>
			</div>
		);
	};

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
					options={categoryOptions}
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
				{inputs.length === 0 ? (
					<div className="filter-list">
						<p className="no-filters-selected">No filters added.</p>
					</div>
				) : (
					<div className="filter-list">
						{inputs.map((input) => (
							<FilterInput key={input} label={input} />
						))}
					</div>
				)}
			</div>
		</>
	);
}

function InputField() {
	const handleChange = (options: MultiValue<SelectOptionType>) => {
		//
	};

	return (
		<Select
			isMulti
			unstyled
			menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
			styles={multiStyles}
			onChange={handleChange}
			options={sample}
			placeholder={"Select filters..."}
		/>
	);
}
