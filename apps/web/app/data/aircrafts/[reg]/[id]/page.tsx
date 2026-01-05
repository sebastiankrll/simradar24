import { Replay } from "@/app/data/components/Flights/Replay";

export default async function Page(props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	return <Replay id={params.id} />;
}
