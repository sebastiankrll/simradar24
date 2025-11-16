import { AirportLong, ControllerLong, PilotLong, WsShort } from "@sk/types/vatsim";
import Redis from "ioredis";

const redis = new Redis()

export function rdsPubWsShort(wsShort: WsShort) {
    redis.publish("ws:short", JSON.stringify(wsShort))
    // console.log("✅ ws:short published on redis!")
}

export function rdsSubWsShort(callback: (data: WsShort) => void) {
    redis.subscribe("ws:short", (err, count) => {
        if (err) {
            console.error("Failed to subscribe: %s", err.message)
        } else {
            // console.log(`✅ Subscribed to ws:short. Currently subscribed to ${count} channel(s).`)
        }
    })

    redis.on("message", (channel, data) => {
        if (channel === "ws:short") {
            try {
                const parsed: WsShort = JSON.parse(data)
                // console.log("✅ Received new data on ws:short.")
                callback(parsed)
            } catch (err) {
                console.error("Failed to parse ws:short data", err)
            }
        }
    })
}

export async function rdsSetAll(pilotsLong: PilotLong[], controllersLong: ControllerLong[], airportsLong: AirportLong[]) {
    await rdsSetItems(pilotsLong, "pilot", p => p.callsign, "pilots:active")
    await rdsSetItems(controllersLong, "controller", c => c.callsign, "controllers:active")
    await rdsSetItems(airportsLong, "airport", a => a.icao, "airports:active")
}

type KeyExtractor<T> = (item: T) => string

async function rdsSetItems<T>(
    items: T[],
    keyPrefix: string,
    keyExtractor: KeyExtractor<T>,
    activeSetName?: string,
    ttlSeconds: number = 60
) {
    if (items.length === 0) return

    const pipeline = redis.pipeline()

    for (const item of items) {
        const key = `${keyPrefix}:${keyExtractor(item)}`
        pipeline.set(key, JSON.stringify(item))
        pipeline.expire(key, ttlSeconds)
        if (activeSetName) {
            pipeline.sadd(activeSetName, keyExtractor(item))
        }
    }

    await pipeline.exec()
    // console.log(`✅ ${items.length} items set in ${activeSetName || keyPrefix}.`)
}

export async function rdsGetSingle(query: string): Promise<string | null> {
    const data = await redis.get(query)
    if (!data) return null

    return JSON.parse(data)
}