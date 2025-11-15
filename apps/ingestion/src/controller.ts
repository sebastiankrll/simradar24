import { ControllerLong, PilotLong, VatsimData } from "./types/vatsim.js";
import { haversineDistance } from "./utils/index.js";

export function mapControllers(vatsimData: VatsimData, pilotsLong: PilotLong[]): ControllerLong[] {
    const controllersLong: ControllerLong[] = vatsimData.controllers.map(controller => {

        return {
            // v ControllerShort v
            callsign: controller.callsign,
            frequency: parseFrequencyToKHz(controller.frequency),
            facility: controller.facility,
            atis: controller.text_atis,
            connections: 0,
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

    getConnectionsCount(vatsimData, controllersLong, pilotsLong)
    // console.log(controllersLong[0])

    return controllersLong
}

// "122.800" ==> 122800
function parseFrequencyToKHz(freq: string): number {
    const num = Number(freq.replace(".", ""))
    if (isNaN(num)) return 122_800

    return num
}

function getConnectionsCount(vatsimData: VatsimData, controllersLong: ControllerLong[], pilotsLong: PilotLong[]) {
    const controllersByFreq = new Map<number, ControllerLong[]>()

    for (const controllerLong of controllersLong) {
        const freq = controllerLong.frequency

        if (!controllersByFreq.has(freq)) { controllersByFreq.set(freq, []) }
        controllersByFreq.get(freq)!.push(controllerLong)
    }

    const pilotsByFreq = new Map<number, PilotLong[]>()
    for (const pilotLong of pilotsLong) {
        const freq = pilotLong.frequency

        if (!pilotsByFreq.has(freq)) pilotsByFreq.set(freq, [])
        pilotsByFreq.get(freq)!.push(pilotLong)
    }

    for (const [freq, controllerList] of controllersByFreq.entries()) {
        const pilotList = pilotsByFreq.get(freq) || []

        if (controllerList.length === 1) {
            controllerList[0].connections = pilotList.length
        } else {
            for (const pilot of pilotList) {
                let closestController = controllerList[0]
                let minDist = Infinity

                for (const controller of controllerList) {
                    const transceiverData = vatsimData.transceivers.find(t => t.callsign === controller.callsign)
                    const transceiverByFreq = transceiverData?.transceivers.find(t => Number(t.frequency.toString().slice(0, 6)) === freq)
                    if (!transceiverByFreq) continue

                    const dist = haversineDistance([pilot.latitude, pilot.longitude], [transceiverByFreq.latDeg, transceiverByFreq.lonDeg])
                    if (dist < minDist) {
                        minDist = dist
                        closestController = controller
                    }
                }

                closestController.connections++
            }
        }
    }
}