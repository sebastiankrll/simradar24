import Flights from "../../components/Flights/Flights";

export default async function FlightsLayout(
	props: Readonly<{
		children: React.ReactNode;
		params: Promise<{ reg: string }>;
	}>,
) {
	const params = await props.params;
	const registration = params.reg;
	const { children } = props;

	return <Flights registration={registration}>{children}</Flights>;
}
