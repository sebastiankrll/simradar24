import { Feature, Map, View } from "ol"
import { toLonLat } from "ol/proj"
import { setAirportFeatures } from "./dataLayers"
import { Pixel } from "ol/pixel"
import { Point } from "ol/geom"

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

export function onPointerMove(
    evt: {
        pixel: Pixel;
        map: Map;
    }
): void {
    const map = evt.map
    const pixel = evt.pixel

    const feature = map.forEachFeatureAtPixel(pixel, f => f, {
        layerFilter: function (layer) {
            return layer.get('type') === 'airport_main' || layer.get('type') === 'pilot_main'
        },
        hitTolerance: 10
    }) as Feature<Point>

    map.getTargetElement().style.cursor = feature ? 'pointer' : ''

    if (!feature) {
        hoveredFeature?.set('active', false)
        hoveredFeature = null
        return
    }
    if (hoveredFeature) { hoveredFeature.set('active', false) }

    feature.set('active', true)
    hoveredFeature = feature
}