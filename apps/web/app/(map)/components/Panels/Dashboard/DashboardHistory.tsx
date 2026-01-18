import type { DashboardData } from "@sr24/types/interface";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";
import { useMemo, useState } from "react";
import { ChooseSwitch } from "@/components/Input/Input";

export function DashboardHistory({ history }: { history: DashboardData["history"] }) {
	const { timeZone, timeFormat } = useSettingsStore();
	const [mode, setMode] = useState<"24 hours" | "7 days">("24 hours");

	const filteredHistory = useMemo(() => {
		const now = Date.now();
		const cutoff = mode === "24 hours" ? now - 24 * 60 * 60 * 1000 : now - 7 * 24 * 60 * 60 * 1000;

		return history.filter(([timestamp]) => timestamp * 1000 >= cutoff);
	}, [history, mode]);

	const data = filteredHistory.map((point) => ({
		name: `${new Date(point[0] * 1000).toLocaleDateString()} ${convertTime(point[0] * 1000, timeFormat, timeZone)}`,
		pilots: point[1],
		controllers: point[2],
	}));

	return (
		<div className="panel-section-content">
			<ChooseSwitch options={["24 hours", "7 days"] as const} value={mode} onChange={setMode} />
			<ResponsiveContainer width="100%" height={150} maxHeight={500}>
				<LineChart data={data} margin={{ top: 10, right: 5, bottom: 10, left: 5 }}>
					<YAxis
						yAxisId="all"
						orientation="left"
						stroke="var(--color-main-text)"
						fontSize="10px"
						width={30}
						tickSize={4}
						tickLine={false}
						axisLine={false}
					/>
					<XAxis dataKey="name" tick={false} mirror={true} axisLine={false} />
					<Line type="monotone" dataKey="controllers" yAxisId="all" stroke="var(--color-red)" dot={false} name="Controllers" />
					<Line type="monotone" dataKey="pilots" yAxisId="all" stroke="var(--color-green)" dot={false} name="Pilots" />
					<Legend verticalAlign="bottom" height={5} iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
					<Tooltip wrapperStyle={{ fontSize: "10px" }} contentStyle={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }} />
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
