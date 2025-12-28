import type { DashboardData } from "@sr24/types/vatsim";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useSettingsStore } from "@/storage/zustand";
import { convertTime } from "@/utils/helpers";

export function DashboardHistory({ history }: { history: DashboardData["history"] }) {
	const { timeZone, timeFormat } = useSettingsStore();

	const data = history.map((point) => ({
		name: convertTime(point.t, timeFormat, timeZone),
		controllers: point.v.controllers,
		pilots: point.v.pilots,
	}));

	return (
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
	);
}
