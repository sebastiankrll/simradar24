export interface PilotProperties {
    callsign: string;
    type: 'pilot';
    aircraft: string;
    heading: number;
    altitude_agl: number;
    altitude_ms: number;
    vertical_speed: number;
    groundspeed: number;
    frequency: number;
    clicked: boolean;
    hovered: boolean;
}

export interface AirportProperties {
    icao: string;
    type: 'airport';
    clicked: boolean;
    hovered: boolean;
}