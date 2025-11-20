import { rdsSetSingle } from "@sk/db/redis";
import { StaticAirline } from "@sk/types/db";
import { readFileSync } from "fs";
import { resolve } from "path";

const PATH = './src/lib/airline_DB.json'

export async function updateAirlines(): Promise<void> {
    try {
        const airlines: StaticAirline[] = JSON.parse(readFileSync(resolve(PATH), "utf8"))
        await rdsSetSingle("static_airlines:all", airlines)
        await rdsSetSingle("static_airlines:version", "1.0.0")
    } catch {
        console.log("❌ No airlines_DB.json found in ./lib")
    }
}