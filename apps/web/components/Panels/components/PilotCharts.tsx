import type { TrackPoint } from "@sk/types/vatsim";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function PilotCharts({
	trackPoints,
	openSection,
	ref,
}: {
	trackPoints: TrackPoint[];
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const data = trackPoints.map((point, _index) => ({
		name: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
		altitude: point.altitude_ms,
		speed: point.groundspeed,
	}));

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "charts" ? " open" : ""}`}>
			<div className="panel-section-title">
				<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
					<title>Charts</title>
					<path
						fillRule="evenodd"
						d="M21.125 24H2.858A2.867 2.867 0 0 1 0 21.14V2.86A2.867 2.867 0 0 1 2.858 0h18.267a2.867 2.867 0 0 1 2.858 2.86v18.28A2.867 2.867 0 0 1 21.125 24M2.875 1.168c-.947 0-1.725.761-1.725 1.726v18.28c0 .947.761 1.726 1.725 1.726h18.267c.947 0 1.725-.762 1.725-1.726V2.86c0-.947-.761-1.726-1.725-1.726zm3.417 14.826a.58.58 0 0 1-.575-.575V.575A.58.58 0 0 1 6.292 0a.57.57 0 0 1 .575.575v14.86a.567.567 0 0 1-.575.56ZM12.008 24a.58.58 0 0 1-.575-.576V9.715a.58.58 0 0 1 .575-.575.57.57 0 0 1 .576.575v13.71a.57.57 0 0 1-.575.575Zm5.7-13.71a.58.58 0 0 1-.575-.575V.575c0-.304.254-.575.575-.575a.58.58 0 0 1 .575.575v9.14a.57.57 0 0 1-.575.576Zm5.7 7.99H8.575A.58.58 0 0 1 8 17.703a.57.57 0 0 1 .575-.576h14.85c.304 0 .575.254.575.576s-.27.575-.592.575ZM7.442 12.574H.592A.58.58 0 0 1 .017 12a.58.58 0 0 1 .575-.575h6.85a.58.58 0 0 1 .575.575c-.017.322-.27.575-.575.575Zm2.283-5.703H.592a.567.567 0 0 1-.575-.559.58.58 0 0 1 .575-.575h9.133a.58.58 0 0 1 .575.575c0 .322-.27.559-.575.559M4.026 18.28H.592a.58.58 0 0 1-.575-.576.57.57 0 0 1 .575-.576H4.01c.304 0 .575.254.575.576a.567.567 0 0 1-.558.575ZM6.292 24a.58.58 0 0 1-.575-.576v-3.418c0-.305.254-.576.575-.576a.57.57 0 0 1 .575.576v3.418a.56.56 0 0 1-.575.576M12.01 4.587a.58.58 0 0 1-.575-.576V.575A.58.58 0 0 1 12.01 0a.57.57 0 0 1 .575.575v3.436c0 .322-.27.576-.575.576m11.4 2.285h-9.134a.58.58 0 0 1-.575-.576.57.57 0 0 1 .575-.575h9.133a.58.58 0 0 1 .575.575.57.57 0 0 1-.575.576Zm0 5.704h-3.417a.58.58 0 0 1-.575-.576.58.58 0 0 1 .575-.575h3.416a.58.58 0 0 1 .575.575.57.57 0 0 1-.575.575ZM17.708 24a.58.58 0 0 1-.575-.576v-9.14a.58.58 0 0 1 .575-.575c.304 0 .575.254.575.576v9.14a.56.56 0 0 1-.575.575M2.876 21.732a.583.583 0 0 1-.389-1.015l3.907-3.352L11.467 6.06a.56.56 0 0 1 .423-.321.53.53 0 0 1 .508.169l5.294 5.297 3.044-3.012c.22-.22.592-.22.812 0s.22.592 0 .812l-3.433 3.42a.58.58 0 0 1-.812 0l-5.108-5.13-4.787 10.664a.6.6 0 0 1-.152.203L3.231 21.58a.56.56 0 0 1-.355.152m12.55-9.156h-3.417a.58.58 0 0 1-.575-.576.58.58 0 0 1 .575-.575h3.416A.58.58 0 0 1 16 12a.57.57 0 0 1-.575.575Z"
						clipRule="evenodd"
					></path>
				</svg>
			</div>
			<div className="panel-section-content">
				<ResponsiveContainer width="100%" aspect={1.618} maxHeight={500}>
					<LineChart data={data} margin={{ top: 5, right: 5, bottom: 10, left: 5 }}>
						<YAxis yAxisId="alt" orientation="left" fontSize="10px" width={33} tickSize={4} tickLine={false} axisLine={false} />
						<YAxis yAxisId="spd" orientation="right" fontSize="10px" width={23} tickSize={4} tickLine={false} axisLine={false} />
						<XAxis dataKey="name" tick={false} mirror={true} axisLine={false} />
						<Line type="monotone" dataKey="altitude" yAxisId="alt" stroke="var(--color-red)" dot={false} name="Barometric Altitude (ft)" />
						<Line type="monotone" dataKey="speed" yAxisId="spd" stroke="var(--color-green)" dot={false} name="Groundspeed (kt)" />
						<Legend verticalAlign="bottom" height={5} iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
						<Tooltip wrapperStyle={{ fontSize: "10px" }} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
