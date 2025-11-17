export interface PilotProperties {
    callsign: string;
    type: 'pilot';
    aircraft: string;
    heading: number;
    altitude_ms: number;
    hover: boolean;
}