"use client";

import dynamic from "next/dynamic";
import type { JSX } from "react";

const SelectSSR = dynamic(() => import("react-select") as any, { ssr: false }) as <
	Option = unknown,
	IsMulti extends boolean = false,
	Group extends GroupBase<Option> = GroupBase<Option>,
>(
	props: Props<Option, IsMulti, Group>,
) => JSX.Element;

import type { CSSObjectWithLabel, GroupBase, Props, StylesConfig } from "react-select";

export type SelectOptionType = { value: string; label: string };

const containerStyles = (provided: CSSObjectWithLabel): CSSObjectWithLabel => ({
	...provided,
	backgroundColor: "var(--color-dark-grey)",
	fontFamily: "inherit",
	fontSize: "var(--font-size-normal)",
	color: "inherit",
	border: "1px solid var(--color-border)",
	minHeight: "32px",
	flexGrow: 1,
	boxSizing: "border-box",
});

const controlStyles = (provided: CSSObjectWithLabel): CSSObjectWithLabel => ({
	...provided,
	minHeight: "100%",
	padding: "4px",
});

const menuStyles = (provided: CSSObjectWithLabel): CSSObjectWithLabel => ({
	...provided,
	backgroundColor: "var(--color-dark-grey)",
});

const optionStyles = (provided: CSSObjectWithLabel, state: { isFocused: boolean; isSelected: boolean }): CSSObjectWithLabel => ({
	...provided,
	padding: "4px 6px",
	backgroundColor: state.isFocused ? "var(--color-hover)" : state.isSelected ? "var(--color-hover)" : "var(--color-dark-grey)",
	fontSize: "var(--font-size-normal)",
	color: state.isFocused || state.isSelected ? "white" : "inherit",
});

export const singleStyles: StylesConfig<SelectOptionType, false> = {
	container: containerStyles,
	control: controlStyles,
	menu: menuStyles,
	option: optionStyles,
};

export const multiStyles: StylesConfig<SelectOptionType, true> = {
	container: containerStyles,
	control: controlStyles,
	valueContainer: (provided: CSSObjectWithLabel) => ({
		...provided,
		gap: "4px",
	}),
	menu: menuStyles,
	option: optionStyles,
	multiValue: (provided: CSSObjectWithLabel) => ({
		...provided,
		backgroundColor: "var(--color-green)",
		borderRadius: "2px",
		overflow: "hidden",
	}),
	multiValueLabel: (provided: CSSObjectWithLabel) => ({
		...provided,
		fontSize: "12px",
		padding: "2px 4px",
		color: "rgb(21, 27, 39)",
	}),
	multiValueRemove: (provided: CSSObjectWithLabel) => ({
		...provided,
		backgroundColor: "var(--color-red)",
		svg: {
			fill: "white",
		},
		":hover": {
			backgroundColor: "white",
			color: "var(--color-red)",
		},
		":hover svg": {
			fill: "var(--color-red)",
		},
	}),
};

export function Select<IsMulti extends boolean = false>(props: Props<SelectOptionType, IsMulti, GroupBase<SelectOptionType>>) {
	return <SelectSSR {...props} />;
}
