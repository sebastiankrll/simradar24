import { useFilterStatsStore, useFiltersStore } from "@/storage/zustand";
import "./ActiveFilters.css";
import Icon from "@/components/Icon/Icon";
import type { FilterState } from "@/types/zustand";

export default function ActiveFilters() {
	const filters = useFiltersStore();
	const filterStats = useFilterStatsStore();

	const activeFilters = getFilterValues(filters);

	if (!filters.active) return null;

	return (
		<div id="active-filters">
			<div id="active-filters-icon">
				<Icon name="filter" size={24} />
			</div>
			<div id="active-filters-count">
				<span style={{ color: "var(--color-main-text)", fontWeight: "var(--font-weight-bold)" }}>{filterStats.pilotCount[0]}</span> of{" "}
				{filterStats.pilotCount[1]} pilots
			</div>
			<div id="active-filters-selected">
				{activeFilters.map((filter) => (
					<p key={filter}>{filter}</p>
				))}
			</div>
		</div>
	);
}

function getFilterValues(filterState: FilterState): string[] {
	return Object.entries(filterState)
		.filter(([_key, value]) => Array.isArray(value) && value.length > 0)
		.map(([key]) => key);
}
