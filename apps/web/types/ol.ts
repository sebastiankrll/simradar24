export interface PilotProperties {
    callsign: string;
    type: 'pilot';
    aircraft: string;
    heading: number;
    altitude_ms: number;
    active: boolean;
}

export interface AirportProperties {
    icao: string;
    type: 'airport';
    active: boolean;
}