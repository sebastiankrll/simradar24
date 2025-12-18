import AirportPanel from "@/components/Panels/Airport/AirportPanel";

export default async function Layout(
	props: Readonly<{
		children: React.ReactNode;
		params: Promise<{ icao: string }>;
	}>,
) {
	const params = await props.params;
	const { children } = props;

	return <AirportPanel icao={params.icao}>{children}</AirportPanel>;
}
