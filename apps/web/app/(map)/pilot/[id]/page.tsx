import PilotPanel from "../../components/Panels/Pilot/PilotPanel";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const id = params.id;

	return <PilotPanel id={id} />;
}
