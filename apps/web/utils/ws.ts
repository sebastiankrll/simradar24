// lib/wsClient.ts
import Pako from 'pako';
import { WsShort } from '@sk/types/vatsim';

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:5001'

type Listener = (msg: WsShort) => void

class WsClient {
    private ws: WebSocket
    private listeners: Listener[] = []

    constructor() {
        this.ws = new WebSocket(WS_URL)
        this.ws.binaryType = 'arraybuffer'

        this.ws.onopen = () => console.log('WebSocket connected')
        this.ws.onerror = (err) => console.error('WebSocket error', err)
        this.ws.onclose = () => console.log('WebSocket disconnected')

        this.ws.onmessage = (e) => {
            try {
                const compressed = new Uint8Array(e.data)
                const decompressed = Pako.ungzip(compressed, { to: 'string' })
                const parsed: WsShort = JSON.parse(decompressed)

                this.listeners.forEach(fn => fn(parsed))
            } catch (err) {
                console.error('Failed to parse message', err)
            }
        }
    }

    addListener(fn: Listener) {
        this.listeners.push(fn)
    }

    removeListener(fn: Listener) {
        this.listeners = this.listeners.filter(l => l !== fn)
    }
}

export const wsClient = new WsClient()