import Flights from "../../components/Flights/Flights";

export default async function Page(props: { params: Promise<{ callsign: string }> }) {
	const params = await props.params;
	const callsign = params.callsign;

	return <Flights callsign={callsign} />;
}
