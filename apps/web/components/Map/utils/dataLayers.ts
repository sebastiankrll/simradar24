import WebGLVectorLayer from "ol/layer/WebGLVector"
import VectorSource from "ol/source/Vector"
import { webglConfig } from "../lib/webglConfig"
import VectorLayer from "ol/layer/Vector"
import Style, { StyleLike } from "ol/style/Style"
import Feature, { FeatureLike } from "ol/Feature"
import Text from "ol/style/Text"
import Fill from "ol/style/Fill"
import { Map } from "ol"
import { dxGetAirportsByExtent } from "@/storage/dexie"
import { Point } from "ol/geom"
import { fromLonLat } from "ol/proj"

const airportMainSource = new VectorSource()

export function initDataLayers(): (WebGLVectorLayer | VectorLayer)[] {
    const firSource = new VectorSource()
    const firLayer = new WebGLVectorLayer({
        source: firSource,
        style: webglConfig.fir,
        properties: {
            type: 'fir'
        },
        zIndex: 1
    })

    const traconSource = new VectorSource()
    const traconLayer = new WebGLVectorLayer({
        source: traconSource,
        style: webglConfig.fir,
        properties: {
            type: 'tracon'
        },
        zIndex: 2
    })

    const trackSource = new VectorSource()
    const trackLayer = new VectorLayer({
        source: trackSource,
        properties: {
            type: 'track'
        },
        zIndex: 3
    })

    const pilotShadowSource = new VectorSource()
    const pilotShadowLayer = new WebGLVectorLayer({
        source: pilotShadowSource,
        style: webglConfig.pilot_shadow,
        properties: {
            type: 'pilot_shadow'
        },
        zIndex: 4
    })

    const pilotMainSource = new VectorSource()
    const pilotMainLayer = new WebGLVectorLayer({
        source: pilotMainSource,
        style: webglConfig.pilot_main,
        properties: {
            type: 'pilot_main'
        },
        zIndex: 5
    })
    // mapStorage.layerInit = new Date()

    const airportLabelSource = new VectorSource()
    const airportLabelLayer = new WebGLVectorLayer({
        source: airportLabelSource,
        style: webglConfig.airport_label,
        properties: {
            type: 'airport_label'
        },
        zIndex: 6
    })

    const airportMainLayer = new WebGLVectorLayer({
        source: airportMainSource,
        style: webglConfig.airport_main,
        properties: {
            type: 'airport_main'
        },
        zIndex: 7
    })

    const airportTopSource = new VectorSource()
    const airportTopLayer = new WebGLVectorLayer({
        source: airportTopSource,
        style: webglConfig.airport_top,
        properties: {
            type: 'airport_top'
        },
        zIndex: 8
    })

    const firLabelSource = new VectorSource()
    const firLabelLayer = new VectorLayer({
        source: firLabelSource,
        style: getFirLabelLayerStyle as StyleLike | undefined,
        properties: {
            type: 'fir_label'
        },
        zIndex: 9
    })

    return [
        firLayer,
        traconLayer,
        trackLayer,
        pilotShadowLayer,
        pilotMainLayer,
        airportLabelLayer,
        airportMainLayer,
        airportTopLayer,
        firLabelLayer
    ]
}

function getFirLabelLayerStyle(feature: FeatureLike, resolution: number): StyleLike | undefined {
    let maxResolution = 4000

    if (feature.get('type') === 'tracon') { maxResolution = 3000 }
    if (resolution >= maxResolution) return

    return new Style({
        text: new Text({
            text: feature.get('desc'),
            font: '600 12px Manrope, sans-serif',
            fill: new Fill({ color: 'white' }),
            backgroundFill: feature.get('hover') === 0 ? new Fill({ color: 'rgb(77, 95, 131)' }) : new Fill({ color: 'rgb(234, 89, 121)' }),
            padding: [4, 3, 2, 5],
            textAlign: 'center'
        }),
    })
}

export async function setAirportFeatures(map: Map): Promise<void> {
    const view = map.getView()
    const resolution = view.getResolution()

    const airports = await dxGetAirportsByExtent(view.calculateExtent(map.getSize()), resolution)
    const features = airports.map(a => new Feature({
        geometry: new Point(fromLonLat([a.longitude, a.latitude])),
        name: a.feature.name,
        type: a.size,
        id: a.id,
    }))
    airportMainSource.clear()
    airportMainSource.addFeatures(features)
}