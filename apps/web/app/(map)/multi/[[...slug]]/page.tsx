import DashboardPanel from "../../components/Panels/Dashboard/DashboardPanel";

export default async function Page(props: { params: Promise<{ ids: string }> }) {
	const params = await props.params;
	const ids = params.ids;

	if (!ids) {
		return <DashboardPanel />;
	}

	return <p>{ids}</p>;
}
