'use client'

import { Map as oMap, View } from "ol"
import { fromLonLat, toLonLat, transformExtent } from "ol/proj"
import { useEffect } from "react"
import './Map.css'
import { MapLibreLayer } from "@geoblocks/ol-maplibre-layer"
import { StyleSpecification } from "maplibre-gl"
import mapLibreStyle from './positron.json'

export default function Map() {
    useEffect(() => {
        const map = initMap()
        map.on('moveend', onMoveEnd)

        return () => {
            map.un('moveend', onMoveEnd)
            map.setTarget(undefined)
        }
    }, [])

    return (
        <>
            <div id="map" />
        </>
    )
}

function initMap(): oMap {
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

    const mbLayer = new MapLibreLayer({
        mapLibreOptions: {
            style: mapLibreStyle as StyleSpecification,
        },
        properties: { type: 'base' }
    })

    const map = new oMap({
        target: "map",
        layers: [mbLayer],
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

function onMoveEnd(evt: { map: oMap }) {
    const map = evt.map
    const view: View = map.getView()
    if (!view) return

    const center = toLonLat(view.getCenter() || [0, 0])
    const zoom = view.getZoom() || 2

    localStorage.setItem(
        "mapView",
        JSON.stringify({ center, zoom })
    )
}