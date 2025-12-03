import type { AirportLong } from "@sk/types/vatsim";
import { AirportGeneral } from "@/components/Panels/Airport/AirportGeneral";
import NotFoundPanel from "@/components/Panels/NotFound";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchAirportLong(icao: string): Promise<AirportLong | null> {
	const res = await fetch(`${API_URL}/data/airport/${icao}`, {
		cache: "no-store",
	});
	if (!res.ok) return null;
	return res.json();
}

export default async function Page(props: { params: Promise<{ icao: string }> }) {
	const params = await props.params;
	const airport = await fetchAirportLong(params.icao);

	if (!airport)
		return <NotFoundPanel title="Airport not found!" text="This airport does not exist or is currently unavailable." enableHeader={false} />;

	return <AirportGeneral initialAirport={airport} />;
}
