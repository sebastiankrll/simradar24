import Slider, { type SliderProps } from "@mui/material/Slider";
import { useEffect, useId, useRef, useState } from "react";
import { type RgbaColor, RgbaColorPicker } from "react-colorful";
import "./Input.css";
import { styled } from "@mui/material/styles";

export function ToggleSwitch({ checked, onChange }: { checked?: boolean; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void }) {
	const id = useId();

	return (
		<label className="tgl-switch" htmlFor={id}>
			<input type="checkbox" id={id} checked={checked} onChange={onChange} />
			<span className="tgl-switch-slider"></span>
		</label>
	);
}

export const RangeSwitch = styled(Slider)<SliderProps>(() => ({
	padding: "7px 0px",
	margin: "0px 7px",
	"& .MuiSlider-thumb": {
		backgroundColor: "var(--color-green)",
		width: 14,
		height: 14,
	},
	"& .MuiSlider-track": {
		backgroundColor: "var(--color-green)",
		border: "none",
	},
	"& .MuiSlider-rail": {
		backgroundColor: "var(--color-light-text)",
		opacity: 1,
	},
	"& .MuiSlider-valueLabel": {
		backgroundColor: "var(--color-dark-grey)",
	},
}));

export function ChooseSwitch<const T extends readonly string[]>({
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

export function ColorPicker({ color, onChange }: { color: RgbaColor; onChange: (color: RgbaColor) => void }) {
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
				style={{ backgroundColor: `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`, borderColor: isOpen ? "white" : "" }}
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Open color picker"
			/>
			{isOpen && (
				<div className="color-picker-popover">
					<RgbaColorPicker color={color} onChange={onChange} />
				</div>
			)}
		</div>
	);
}
