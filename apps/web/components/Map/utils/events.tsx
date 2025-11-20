import { Feature, Map, Overlay, View } from "ol"
import { toLonLat } from "ol/proj"
import { setAirportFeatures } from "./dataLayers"
import { Pixel } from "ol/pixel"
import { Point } from "ol/geom"
import { createRoot } from "react-dom/client"
import { AirportOverlay, PilotOverlay } from "../components/Overlay/Overlays"
import { dxGetAirline, dxGetAirport } from "@/storage/dexie"
import { StaticAirline, StaticAirport } from "@sk/types/db"

export function onMoveEnd(evt: { map: Map }): void {
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

let clickedFeature: Feature<Point> | null = null
let hoveredFeature: Feature<Point> | null = null
let clickedOverlay: Overlay | null = null
let hoveredOverlay: Overlay | null = null
let hovering = false

export async function onPointerMove(
    evt: {
        pixel: Pixel;
        map: Map;
    }
): Promise<void> {
    if (hovering) return
    hovering = true

    const map = evt.map
    const pixel = evt.pixel

    const feature = map.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: function (layer) {
            return layer.get('type') === 'airport_main' || layer.get('type') === 'pilot_main'
        },
        hitTolerance: 10
    }) as Feature<Point> | undefined

    map.getTargetElement().style.cursor = feature ? 'pointer' : ''

    if (feature !== hoveredFeature && hoveredOverlay) {
        map.removeOverlay(hoveredOverlay)
        hoveredOverlay = null
    }

    if (feature && feature !== hoveredFeature && feature !== clickedFeature) {
        hoveredOverlay = await createOverlay(feature)
        map.addOverlay(hoveredOverlay)
    }

    if (feature !== hoveredFeature) {
        hoveredFeature?.set('hovered', false)
        hoveredFeature = null
    }

    feature?.set('hovered', true)
    hoveredFeature = feature || null

    hovering = false
}

export async function onClick(
    evt: {
        pixel: Pixel;
        map: Map;
    }
): Promise<void> {
    const map = evt.map
    const pixel = evt.pixel

    const feature = map.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: function (layer) {
            return layer.get('type') === 'airport_main' || layer.get('type') === 'pilot_main'
        },
        hitTolerance: 10
    }) as Feature<Point>

    if (feature !== clickedFeature && clickedOverlay) {
        map.removeOverlay(clickedOverlay)
        clickedOverlay = null
    }

    if (feature && feature !== clickedFeature) {
        clickedOverlay = await createOverlay(feature)
        map.addOverlay(clickedOverlay)
    }

    if (feature !== clickedFeature) {
        clickedFeature?.set('clicked', false)
        clickedFeature = null
    }

    feature?.set('clicked', true)
    clickedFeature = feature || null
}

async function createOverlay(feature: Feature<Point>): Promise<Overlay> {
    const element = document.createElement('div')
    const root = createRoot(element)
    const type = feature.get('type')

    let id: string | undefined

    if (type === "pilot") {
        id = feature.get('callsign') as string
        const icao = id.substring(0, 3)
        const airline = await dxGetAirline(icao) as StaticAirline | undefined

        root.render(<PilotOverlay feature={feature} airline={airline} />)
    }

    if (type === "airport") {
        id = feature.get('icao') as string
        root.render(<AirportOverlay feature={feature} />)
    }

    const overlay = new Overlay({
        element,
        id: id,
        position: feature.getGeometry()?.getCoordinates(),
        positioning: 'bottom-center',
        offset: [0, -25]
    })
    overlay.set('root', root)

    return overlay
}