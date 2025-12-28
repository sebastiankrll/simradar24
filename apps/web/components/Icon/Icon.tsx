import type { StaticAirline } from "@sr24/types/db";

export default function Icon({ name, size = 32, offset }: { name: string; size?: number; offset?: number }) {
	return (
		<svg width={size} height={size} aria-hidden="true" style={{ transform: offset ? `translateY(${offset}px)` : undefined }}>
			<use href={`/sprites/icons.svg#${name}`} />
		</svg>
	);
}

export function getAirlineIcon(airline: StaticAirline | null) {
	if (!airline?.iata) {
		return <p style={{ color: "var(--color-green)" }}>?</p>;
	}

	const color = airline.color;

	if (color && color.length > 2) {
		const letters = airline.iata.split("");

		return (
			<p style={{ background: color[0] }}>
				<span style={{ color: color[1] }}>{letters[0]}</span>
				<span style={{ color: color[2] }}>{letters[1]}</span>
			</p>
		);
	}

	return <p style={{ backgroundColor: color?.[0] || "", color: color?.[1] || "var(--color-green)" }}>{airline.iata}</p>;
}
