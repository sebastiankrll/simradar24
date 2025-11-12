export interface VatsimData {
    general: VatsimGeneral;
    pilots: any[];
    controllers: any[];
    atis: any[];
    servers: any[];
    prefiles: any[];
    facilities: any[];
    ratings: any[];
    pilot_ratings: any[];
    vatsim_special_centers: any[];
}

interface VatsimGeneral {
    version: number;
    update_timestamp: string;
    connected_clients: number;
    unique_users: number;
}