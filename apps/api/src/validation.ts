export function validateString(value: any, fieldName: string, minLength = 1, maxLength = 255): string {
	if (!value || typeof value !== "string") {
		throw { status: 400, message: `${fieldName} is required and must be a string` };
	}
	if (value.length < minLength || value.length > maxLength) {
		throw { status: 400, message: `${fieldName} must be between ${minLength} and ${maxLength} characters` };
	}
	return value.trim();
}

export function validateNumber(value: any, fieldName: string, min = 0, max = Infinity): number {
	const num = Number(value);
	if (Number.isNaN(num)) {
		throw { status: 400, message: `${fieldName} must be a valid number` };
	}
	if (num < min || num > max) {
		throw { status: 400, message: `${fieldName} must be between ${min} and ${max}` };
	}
	return num;
}

export function validateICAO(icao: any): string {
	const validated = validateString(icao, "ICAO", 4, 4);
	if (!/^[A-Z0-9]{4}$/.test(validated)) {
		throw { status: 400, message: "ICAO must be 4 alphanumeric characters" };
	}
	return validated;
}

export function validateCallsign(callsign: any): string {
	const validated = validateString(callsign, "Callsign", 1, 10);
	if (!/^[A-Z0-9_]+$/.test(validated)) {
		throw { status: 400, message: "Callsign must contain only uppercase letters, numbers, and underscores" };
	}
	return validated;
}
