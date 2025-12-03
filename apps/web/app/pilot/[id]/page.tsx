import type { StaticAircraft } from "@sk/types/db";
import type { PilotLong } from "@sk/types/vatsim";
import NotFoundPanel from "@/components/Panels/NotFound";
import PilotPanel from "@/components/Panels/Pilot/PilotPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchPilotLong(id: string): Promise<PilotLong | null> {
	const res = await fetch(`${API_URL}/data/pilot/${id}`, {
		cache: "no-store",
	});
	if (!res.ok) return null;
	return res.json();
}

async function fetchAircraftByReg(reg: string): Promise<StaticAircraft | null> {
	const res = await fetch(`${API_URL}/data/aircraft/${reg}`, {
		cache: "no-store",
	});
	if (!res.ok) return null;
	return res.json();
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const pilot = await fetchPilotLong(params.id);
	const reg = pilot?.flight_plan?.ac_reg || "";
	const aircraft = reg ? await fetchAircraftByReg(reg) : null;

	if (!pilot)
		return (
			<NotFoundPanel
				title="Pilot not found!"
				text="This pilot does not exist or is currently unavailable, most likely because of an incorrect ID or disconnect."
			/>
		);

	return <PilotPanel initialPilot={pilot} aircraft={aircraft} />;
}
