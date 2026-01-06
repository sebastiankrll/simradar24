import Flights from "../../components/Flights/Flights";

export default async function FlightsLayout(
	props: Readonly<{
		children: React.ReactNode;
		params: Promise<{ callsign: string }>;
	}>,
) {
	const params = await props.params;
	const callsign = params.callsign;
	const { children } = props;

	return <Flights callsign={callsign}>{children}</Flights>;
}
