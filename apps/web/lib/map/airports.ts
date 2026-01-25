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

export function getVisibleSizes(resolution: number): string[] {
	if (resolution < 1000) return ["s", "m", "l"];
	if (resolution < 1500) return ["m", "l"];
	if (resolution < 3500) return ["l"];
	return [];
}
