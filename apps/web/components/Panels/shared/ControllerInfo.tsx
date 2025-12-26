import type { ControllerLong } from "@sr24/types/vatsim";
import "./ControllerInfo.css";
import type { FIRFeature, SimAwareTraconFeature, StaticAirport } from "@sr24/types/db";
import { getControllerColor } from "@/components/Map/components/Overlay/Overlays";
import Icon from "@/components/shared/Icon/Icon";

function getControllerName(
	facility: number,
	sector: SimAwareTraconFeature | FIRFeature | undefined | null,
	airport: StaticAirport | undefined | null,
): string {
	switch (facility) {
		case -1:
			return `${airport?.city || "Unknown Airport"} ATIS`;
		case 2:
			return `${airport?.city || "Unknown Airport"} Delivery`;
		case 3:
			return `${airport?.city || "Unknown Airport"} Ground`;
		case 4:
			return `${airport?.city || "Unknown Airport"} Tower`;
		case 5:
			return sector?.properties.name || "Unknown Approach";
		case 6:
			return sector?.properties.name || "Unknown Approach";
		default:
			return "UNKNOWN";
	}
}

function getOnlineTime(logonTime: string | Date): string {
	const date = new Date(logonTime);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
	const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

	if (diffHours > 0) {
		return `${diffHours}h ${diffMinutes}m`;
	} else if (diffMinutes > 0) {
		return `${diffMinutes}m`;
	} else {
		return `0m`;
	}
}

export function ControllerInfo({
	controllers,
	airport,
	sector,
	openSection,
	ref,
}: {
	controllers: ControllerLong[];
	airport?: StaticAirport | null;
	sector?: SimAwareTraconFeature | FIRFeature | null;
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const sortedControllers = controllers?.sort((a, b) => b.facility - a.facility);

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "controllers" ? " open" : ""}`}>
			<div className="panel-section-title">
				<Icon name="hotline" size={22} />
			</div>
			<div className="panel-section-content controllers">
				{sortedControllers.map((c) => (
					<div key={c.callsign} className="panel-controller-item" style={{ borderLeftColor: getControllerColor(c.facility) }}>
						<div className="panel-controller-title">
							<p>{c.callsign}</p>
							<p>{(c.frequency / 1000).toFixed(3)}</p>
							<p>{getControllerName(c.facility, sector, airport)}</p>
						</div>
						<div className="panel-controller-content">
							<div className="panel-data-item">
								<p>Connections</p>
								<p>{c.connections}</p>
							</div>
							<div className="panel-data-item">
								<p>Time online</p>
								<p>{getOnlineTime(c.logon_time)}</p>
							</div>
							<div className="panel-data-item">
								<p>Name</p>
								<p>{c.name}</p>
							</div>
							<div className="panel-data-item">
								<p>CID</p>
								<p>{c.cid}</p>
							</div>
							<div className="panel-data-item">
								<p>Server</p>
								<p>{c.server}</p>
							</div>
							<div className="panel-data-item">
								<p>Rating</p>
								<p>{c.rating}</p>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
