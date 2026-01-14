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
	if (zoom > 7.5) return ["heliport", "small_airport", "medium_airport", "large_airport"];
	if (zoom > 6.5) return ["medium_airport", "large_airport"];
	if (zoom > 4.5) return ["large_airport"];
	return [];
}
