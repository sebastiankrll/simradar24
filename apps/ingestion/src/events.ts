import { rdsSetSingle } from "@sk/db/redis";
import type { VatsimEventData } from "@sk/types/vatsim";
import axios from "axios";

const VATSIM_EVENT_URL = "https://my.vatsim.net/api/v2/events/latest";

export async function updateVatsimEvents(): Promise<void> {
    const response = await axios.get<VatsimEventData>(VATSIM_EVENT_URL);
    const vatsimEvents = response.data.data;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const activeEvents = vatsimEvents.filter((event) => {
        const eventDate = new Date(event.start_time);
        return eventDate >= today && eventDate < tomorrow;
    });

    await rdsSetSingle("dashboard:events", activeEvents);
}
