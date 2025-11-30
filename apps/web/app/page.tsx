import type { DashboardData } from "@sk/types/vatsim";
import DashboardPanel from "@/components/Panels/Dashboard/DashboardPanel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

async function fetchDashboardData(): Promise<DashboardData | null> {
	const res = await fetch(`${API_URL}/data/dashboard`, {
		cache: "no-store",
	});
	if (!res.ok) return null;
	return res.json();
}

export default async function Page() {
	const dashboardData = await fetchDashboardData();
	if (!dashboardData) return <div className="info-panel error">Failed to load dashboard data.</div>;
	return <DashboardPanel initialData={dashboardData} />;
}
