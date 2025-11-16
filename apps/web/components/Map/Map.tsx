'use client'

import { useEffect } from "react"
import './Map.css'
import { initMap, onMoveEnd } from "./utils/init"

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