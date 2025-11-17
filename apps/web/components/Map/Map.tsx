'use client'

import { useEffect } from "react"
import './Map.css'
import { initMap, onMoveEnd } from "./utils/init"
import { dxInitLocalDatabase } from "@/storage/dexie"
import { wsClient } from "@/utils/ws"
import { setPilotFeatures } from "./utils/dataLayers"

dxInitLocalDatabase()

wsClient.addListener(msg => {
    // console.log(msg)
    setPilotFeatures(msg.pilots)
})

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