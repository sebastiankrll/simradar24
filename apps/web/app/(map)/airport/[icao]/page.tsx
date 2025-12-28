import { AirportGeneral } from "../../components/Panels/Airport/AirportGeneral";

export default async function Page(props: { params: Promise<{ icao: string }> }) {
	const params = await props.params;
	const icao = params.icao.toUpperCase();

	return <AirportGeneral icao={icao} />;
}
