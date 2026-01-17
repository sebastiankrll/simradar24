export function getAirportSize(size: string): "s" | "m" | "l" {
	switch (size) {
		case "small_airport":
		case "heliport":
			return "s";
		case "medium_airport":
			return "m";
		case "large_airport":
			return "l";
		default:
			return "s";
	}
}

export function getVisibleSizes(zoom: number): string[] {
	if (zoom > 7.5) return ["s", "m", "l"];
	if (zoom > 6.5) return ["m", "l"];
	if (zoom > 4.5) return ["l"];
	return [];
}
