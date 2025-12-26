// [lat, long]
export function haversineDistance(start: number[], end: number[]): number {
	const R = 3440.065;
	const toRad = (d: number) => (d * Math.PI) / 180;

	const lat1Rad = toRad(start[0]);
	const lat2Rad = toRad(end[0]);
	const dLat = lat2Rad - lat1Rad;
	const dLon = toRad(end[1] - start[1]);

	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return Math.round(R * c);
}

export function convertTime(
	date: Date | string | number | undefined,
	timeFormat: "12h" | "24h",
	timeZone: "utc" | "local",
	withUnit: boolean = true,
	localTimeZone?: string,
): string {
	if (!date) {
		return "xx:xx";
	}
	const dateObj = date instanceof Date ? date : new Date(date);

	let hour24: number;
	let minutes: string;

	if (timeZone === "utc") {
		hour24 = dateObj.getUTCHours();
		minutes = dateObj.getUTCMinutes().toString().padStart(2, "0");
	} else if (localTimeZone) {
		const formatter = new Intl.DateTimeFormat("en-US", {
			timeZone: localTimeZone,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});
		const parts = formatter.formatToParts(dateObj);
		hour24 = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
		minutes = parts.find((p) => p.type === "minute")?.value || "00";
	} else {
		hour24 = dateObj.getHours();
		minutes = dateObj.getMinutes().toString().padStart(2, "0");
	}

	if (timeFormat === "24h") {
		const hours = hour24.toString().padStart(2, "0");
		return `${hours}:${minutes}${withUnit ? (timeZone === "utc" ? " z" : "") : ""}`;
	} else {
		const hour12 = hour24 % 12 || 12;
		const period = hour24 >= 12 ? "PM" : "AM";
		return `${hour12}:${minutes}${withUnit ? `${period}${timeZone === "utc" ? " z" : ""}` : ""}`;
	}
}

export function convertDistance(km: number, unit: "km" | "miles" | "nm", withUnit: boolean = true): string | number {
	switch (unit) {
		case "km":
			return withUnit ? `${Math.round(km).toLocaleString()} km` : Math.round(km);
		case "miles":
			return withUnit ? `${Math.round(km * 0.621371).toLocaleString()} mi` : Math.round(km * 0.621371);
		case "nm":
			return withUnit ? `${Math.round(km * 0.539957).toLocaleString()} nm` : Math.round(km * 0.539957);
		default:
			return withUnit ? `${Math.round(km).toLocaleString()} km` : Math.round(km);
	}
}

export function convertSpeed(knots: number, unit: "knots" | "kmh" | "mph" | "ms", withUnit: boolean = true): string | number {
	switch (unit) {
		case "knots":
			return withUnit ? `${Math.round(knots)} kt` : Math.round(knots);
		case "kmh":
			return withUnit ? `${Math.round(knots * 1.852)} km/h` : Math.round(knots * 1.852);
		case "mph":
			return withUnit ? `${Math.round(knots * 1.15078)} mph` : Math.round(knots * 1.15078);
		case "ms":
			return withUnit ? `${Math.round((knots * 1.852) / 3.6)} m/s` : Math.round((knots * 1.852) / 3.6);
		default:
			return withUnit ? `${Math.round(knots)} kt` : Math.round(knots);
	}
}

export function convertAltitude(feet: number, unit: "feet" | "meters", withUnit: boolean = true): string | number {
	switch (unit) {
		case "feet":
			return withUnit ? `${Math.round(feet).toLocaleString()} ft` : Math.round(feet);
		case "meters":
			return withUnit ? `${Math.round(feet * 0.3048).toLocaleString()} m` : Math.round(feet * 0.3048);
		default:
			return withUnit ? `${Math.round(feet).toLocaleString()} ft` : Math.round(feet);
	}
}

export function convertVerticalSpeed(fpm: number, unit: "fpm" | "ms", withUnit: boolean = true): string | number {
	switch (unit) {
		case "fpm":
			return withUnit ? `${fpm > 0 ? "+" : ""}${Math.round(fpm).toLocaleString()} fpm` : Math.round(fpm);
		case "ms":
			return withUnit ? `${fpm > 0 ? "+" : ""}${Math.round(fpm * 0.00508).toLocaleString()} m/s` : Math.round(fpm * 0.00508);
		default:
			return withUnit ? `${fpm > 0 ? "+" : ""}${Math.round(fpm).toLocaleString()} fpm` : Math.round(fpm);
	}
}

export function convertTemperature(celsius: number | undefined, unit: "celsius" | "fahrenheit", withUnit: boolean = true): string {
	if (celsius === undefined) {
		return "N/A";
	}
	switch (unit) {
		case "celsius":
			return `${Math.round(celsius)}${withUnit ? " °C" : ""}`;
		case "fahrenheit":
			return `${Math.round((celsius * 9) / 5 + 32)}${withUnit ? " °F" : ""}`;
		default:
			return `${Math.round(celsius)}${withUnit ? " °C" : ""}`;
	}
}
