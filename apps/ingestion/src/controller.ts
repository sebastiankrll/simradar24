import { ControllerLong, VatsimData } from "./types/vatsim.js";

export function mapControllers(vatsimData: VatsimData): void {
    const controllersLong: ControllerLong[] = vatsimData.controllers.map(controller => {

        return {
            // v ControllerShort v
            callsign: controller.callsign,
            frequency: parseFrequencyToHz(controller.frequency),
            facility: controller.facility,
            atis: controller.text_atis,
            connections: 0, // TODO: Get total pilot connections
            // v ControllerLong v
            cid: controller.cid,
            name: controller.name,
            rating: controller.rating,
            server: controller.server,
            visual_range: controller.visual_range,
            logon_time: new Date(controller.logon_time),
            timestamp: new Date(controller.last_updated)
        }
    })

    // console.log(controllersLong[0])
}

// "120.180 -> 120180000
function parseFrequencyToHz(freq: string): number {
    const num = Number(freq)
    if (isNaN(num)) return 122_800_000

    return Math.round(num * 1_000_000)
}