import SectorPanel from "@/components/Panels/Sector/SectorPanel";

export default async function Page(props: { params: Promise<{ callsign: string }> }) {
	const params = await props.params;
	const callsign = params.callsign.toUpperCase();

	return <SectorPanel callsign={callsign} />;
}
