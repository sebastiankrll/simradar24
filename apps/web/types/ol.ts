export interface PilotProperties {
    callsign: string;
    type: 'pilot';
    aircraft: string;
    heading: number;
    altitude_agl: number;
    active: boolean;
}

export interface AirportProperties {
    icao: string;
    type: 'airport';
    active: boolean;
}