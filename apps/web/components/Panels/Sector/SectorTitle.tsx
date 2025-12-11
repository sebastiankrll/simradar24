import type { SectorPanelStatic } from "./SectorPanel";

export function SectorTitle({ staticData }: { staticData: SectorPanelStatic }) {
	const type = staticData.type === "fir" ? "FIR" : staticData.type === "tracon" ? "TRACON" : "N/A";

	return (
		<div className="panel-container title-section">
			<div className="panel-title" style={{ height: 50 }}>
				<p>{staticData.feature?.properties.name || "Unknown Sector"}</p>
				<div className="panel-desc-items">
					<div className="panel-desc-item r">{type}</div>
				</div>
			</div>
		</div>
	);
}
