import { rdsSubWsShort } from "@sk/db/redis"
import { WsShort } from "@sk/types/vatsim"
import { WebSocketServer } from "ws"
import { createGzip } from "zlib"

const wss = new WebSocketServer({
    port: 5001,
    perMessageDeflate: false
})

wss.on('connection', function connection(ws) {
    console.log('A new client connected!')
    ws.on('error', console.error)
    ws.on('message', async msg => {
        console.log(msg)
    })
})

function sendWsShort(data: WsShort) {
    const gzip = createGzip()

    gzip.write(JSON.stringify({
        event: 'ws:short',
        data: data,
    }))
    gzip.end()

    const chunks: Buffer[] = []
    gzip.on('data', chunk => {
        chunks.push(chunk)
    })

    gzip.on('end', () => {
        const compressedData = Buffer.concat(chunks)

        wss.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(compressedData)
            }
        })
    })
}

rdsSubWsShort((data: WsShort) => sendWsShort(data))