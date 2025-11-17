'use client'

import { useEffect } from "react"
import './Map.css'
import { initMap } from "./utils/init"
import { dxInitLocalDatabase } from "@/storage/dexie"
import { wsClient } from "@/utils/ws"
import { setPilotFeatures } from "./utils/dataLayers"
import { onMoveEnd, onPointerMove } from "./utils/events"

dxInitLocalDatabase()

wsClient.addListener(msg => {
    // console.log(msg)
    setPilotFeatures(msg.pilots)
})

export default function Map() {
    useEffect(() => {
        const map = initMap()
        map.on('moveend', onMoveEnd)
        map.on('pointermove', onPointerMove)

        return () => {
            map.un('moveend', onMoveEnd)
            map.un('pointermove', onPointerMove)
            map.setTarget(undefined)
        }
    }, [])

    return (
        <>
            <div id="map" />
        </>
    )
}