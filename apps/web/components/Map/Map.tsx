'use client'

import { useEffect } from "react"
import './Map.css'
import { initMap, onMoveEnd } from "./utils/init"
import { dxInitLocalDatabase } from "@/storage/dexie"

export default function Map() {
    useEffect(() => {
        dxInitLocalDatabase()
        
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