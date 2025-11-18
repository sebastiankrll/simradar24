import WebGLVectorLayer from "ol/layer/WebGLVector"
import VectorSource from "ol/source/Vector"
import { webglConfig } from "../lib/webglConfig"
import VectorLayer from "ol/layer/Vector"
import Style, { StyleLike } from "ol/style/Style"
import Feature, { FeatureLike } from "ol/Feature"
import Text from "ol/style/Text"
import Fill from "ol/style/Fill"
import { Map as OMap } from "ol"
import { dxGetAllAirports } from "@/storage/dexie"
import { Point } from "ol/geom"
import { fromLonLat, transformExtent } from "ol/proj"
import RBush from "rbush"
import { PilotShort } from "@sk/types/vatsim"
import { AirportProperties, PilotProperties } from "@/types/ol"

const airportMainSource = new VectorSource()
const pilotMainSource = new VectorSource()

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

    const pilotShadowLayer = new WebGLVectorLayer({
        source: pilotMainSource,
        style: webglConfig.pilot_shadow,
        properties: {
            type: 'pilot_shadow'
        },
        zIndex: 4
    })

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

interface IndexedAirportFeature {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    size: string;
    feature: Feature<Point>;
}

const rbush = new RBush<IndexedAirportFeature>()

export async function initAirportFeatures(map: OMap) {
    const airports = await dxGetAllAirports()

    const items: IndexedAirportFeature[] = airports.map(a => {
        const feature = new Feature({
            geometry: new Point(fromLonLat([a.longitude, a.latitude]))
        })
        feature.setProperties({
            icao: a.id,
            type: 'airport',
            clicked: false,
            hovered: false
        } as AirportProperties)

        return {
            minX: a.longitude,
            minY: a.latitude,
            maxX: a.longitude,
            maxY: a.latitude,
            size: a.size,
            feature: feature
        }
    })
    rbush.load(items)
    setAirportFeatures(map)
}

export function setAirportFeatures(map: OMap): void {
    const resolution = map.getView().getResolution()
    const visibleSizes = getVisibleSizes(resolution)
    if (visibleSizes.length === 0) {
        airportMainSource.clear()
        return
    }

    const [minX, minY, maxX, maxY] = transformExtent(map.getView().calculateExtent(map.getSize()), 'EPSG:3857', 'EPSG:4326')
    const featuresByExtent = rbush.search({ minX, minY, maxX, maxY })
    const featuresBySize = featuresByExtent.filter(f => visibleSizes.includes(f.size))

    airportMainSource.clear()
    airportMainSource.addFeatures(featuresBySize.map(f => f.feature))
}

function getVisibleSizes(resolution: number | undefined): string[] {
    if (!resolution) return ["large_airport"]
    if (resolution < 500) return ["heliport", "small_airport", "medium_airport", "large_airport"]
    if (resolution < 1500) return ["medium_airport", "large_airport"]
    if (resolution < 10000) return ["large_airport"]
    return []
}

const pilotFeatureMap = new Map<string, Feature<Point>>()

export function setPilotFeatures(pilotsShort: PilotShort[]): void {
    const newCallsigns = new Set(pilotsShort.map(p => p.callsign))

    pilotFeatureMap.forEach((feature, callsign) => {
        if (!newCallsigns.has(callsign)) {
            pilotMainSource.removeFeature(feature)
            pilotFeatureMap.delete(callsign)
        }
    })

    pilotsShort.forEach(p => {
        const feature = pilotFeatureMap.get(p.callsign)
        const coords = fromLonLat([p.longitude, p.latitude])

        if (feature) {
            const geom = feature.getGeometry()
            geom?.setCoordinates(coords)

            feature.set('heading', p.heading / 180 * Math.PI)
            feature.set('altitude_agl', p.altitude_ms)
        } else {
            const newFeature = new Feature({
                geometry: new Point(coords),
            })
            newFeature.setProperties({
                callsign: p.callsign,
                type: 'pilot',
                aircraft: p.aircraft,
                heading: p.heading / 180 * Math.PI,
                altitude_agl: p.altitude_agl,
                altitude_ms: p.altitude_ms,
                vertical_speed: p.vertical_speed,
                groundspeed: p.groundspeed,
                frequency: p.frequency,
                clicked: false,
                hovered: false
            } as PilotProperties)

            pilotMainSource.addFeature(newFeature)
            pilotFeatureMap.set(p.callsign, newFeature)
        }
    })
}