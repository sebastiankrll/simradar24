import type { PilotLong } from "@sr24/types/vatsim";
import Icon from "@/components/Icon/Icon";

export function PilotMisc({ pilot }: { pilot: PilotLong }) {
	return (
		<div className="panel-sub-container sep">
			<div className="panel-section-title">
				<Icon name="compass" size={24} />
			</div>
			<div className="panel-section-content" id="panel-pilot-user">
				<div className="panel-data-item">
					<p>Server</p>
					<p>{pilot.server}</p>
				</div>
				<div className="panel-data-item">
					<p>Transponder</p>
					<p>{pilot.transponder}</p>
				</div>
				<div className="panel-data-item">
					<p>Latitude</p>
					<p>{pilot.latitude}</p>
				</div>
				<div className="panel-data-item">
					<p>Longitude</p>
					<p>{pilot.longitude}</p>
				</div>
			</div>
		</div>
	);
}
