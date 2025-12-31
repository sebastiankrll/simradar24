import type { TrackPoint } from "@sr24/types/interface";
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Icon from "@/components/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import { convertAltitude, convertSpeed, convertTime } from "@/utils/helpers";

export function PilotCharts({
	trackPoints,
	openSection,
	ref,
}: {
	trackPoints: TrackPoint[];
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const { altitudeUnit, speedUnit, timeFormat, timeZone } = useSettingsStore();

	const data = trackPoints.map((point, _index) => ({
		name: convertTime(point.timestamp, timeFormat, timeZone),
		altitude: convertAltitude(point.altitude_ms, altitudeUnit, false),
		speed: convertSpeed(point.groundspeed, speedUnit, false),
	}));

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "charts" ? " open" : ""}`}>
			<div className="panel-section-title">
				<Icon name="stock-market" size={22} />
			</div>
			<div className="panel-section-content">
				<ResponsiveContainer width="100%" aspect={1.618} maxHeight={500}>
					<LineChart data={data} margin={{ top: 10, right: 5, bottom: 10, left: 5 }}>
						<YAxis
							yAxisId="alt"
							stroke="var(--color-main-text)"
							orientation="left"
							fontSize="10px"
							width={33}
							tickSize={4}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							yAxisId="spd"
							stroke="var(--color-main-text)"
							orientation="right"
							fontSize="10px"
							width={23}
							tickSize={4}
							tickLine={false}
							axisLine={false}
						/>
						<XAxis dataKey="name" tick={false} mirror={true} axisLine={false} />
						<Line
							type="monotone"
							dataKey="altitude"
							yAxisId="alt"
							stroke="var(--color-red)"
							dot={false}
							name={`Barometric Altitude (${altitudeUnit === "feet" ? "ft" : "m"})`}
						/>
						<Line
							type="monotone"
							dataKey="speed"
							yAxisId="spd"
							stroke="var(--color-green)"
							dot={false}
							name={`Groundspeed (${speedUnit === "knots" ? "kt" : speedUnit === "kmh" ? "km/h" : speedUnit === "mph" ? "mph" : "m/s"})`}
						/>
						<Legend verticalAlign="bottom" height={5} iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
						<Tooltip wrapperStyle={{ fontSize: "10px" }} contentStyle={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }} />
					</LineChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}
