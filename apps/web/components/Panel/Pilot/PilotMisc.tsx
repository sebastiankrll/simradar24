import type { PilotLong, TrackPoint } from "@sr24/types/interface";
import type { Coordinate } from "ol/coordinate";
import { toLonLat } from "ol/proj";
import Icon from "@/components/Icon/Icon";

export function PilotMisc({ pilot, trackPoint }: { pilot: PilotLong; trackPoint?: TrackPoint }) {
	const coordinates: Coordinate = trackPoint ? toLonLat(trackPoint.coordinates) : [pilot.latitude, pilot.longitude];

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
					<p>{coordinates[1].toFixed(6)}</p>
				</div>
				<div className="panel-data-item">
					<p>Longitude</p>
					<p>{coordinates[0].toFixed(6)}</p>
				</div>
			</div>
		</div>
	);
}
