import { Map, View } from "ol"
import { initBaseLayer } from "./baseLayer"
import { initSunLayer } from "./sunLayer"
import { fromLonLat, toLonLat, transformExtent } from "ol/proj"
import { initDataLayers, setAirportFeatures } from "./dataLayers"

export function initMap(): Map {
    const savedView = localStorage.getItem("mapView")
    const initialCenter = [0, 0]
    const initialZoom = 2

    let center = initialCenter
    let zoom = initialZoom

    if (savedView) {
        try {
            const parsed = JSON.parse(savedView) as { center: [number, number]; zoom: number }
            center = parsed.center
            zoom = parsed.zoom
        } catch {
            // fallback to default
        }
    }

    const baseLayer = initBaseLayer()
    const sunLayer = initSunLayer()
    const dataLayers = initDataLayers()

    const map = new Map({
        target: "map",
        layers: [
            baseLayer,
            sunLayer,
            ...dataLayers
        ],
        view: new View({
            center: fromLonLat(center),
            zoom,
            maxZoom: 18,
            minZoom: 3,
            extent: transformExtent([-190, -80, 190, 80], 'EPSG:4326', 'EPSG:3857')
        }),
        controls: []
    })

    return map
}

export async function onMoveEnd(evt: { map: Map }) {
    const map = evt.map
    const view: View = map.getView()
    if (!view) return

    const center = toLonLat(view.getCenter() || [0, 0])
    const zoom = view.getZoom() || 2

    localStorage.setItem(
        "mapView",
        JSON.stringify({ center, zoom })
    )

    setAirportFeatures(map)
}