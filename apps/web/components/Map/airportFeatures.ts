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
