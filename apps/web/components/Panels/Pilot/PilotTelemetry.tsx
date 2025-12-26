import type { PilotLong } from "@sr24/types/vatsim";
import Icon from "@/components/shared/Icon/Icon";
import { useSettingsStore } from "@/storage/zustand";
import { convertAltitude, convertSpeed, convertVerticalSpeed } from "@/utils/helpers";

export function PilotTelemetry({ pilot }: { pilot: PilotLong }) {
	const { altitudeUnit, speedUnit, verticalSpeedUnit } = useSettingsStore();

	let hdg = String(pilot.heading);
	if (hdg.length === 1) {
		hdg = `00${hdg}`;
	}
	if (hdg.length === 2) {
		hdg = `0${hdg}`;
	}

	return (
		<div className="panel-sub-container sep">
			<div className="panel-section-title">
				<Icon name="power" size={22} />
			</div>
			<div className="panel-section-content" id="panel-pilot-telemetry">
				<div className="panel-data-item">
					<p>Baro. Altitude</p>
					<p>{convertAltitude(Math.round(pilot.altitude_ms / 250) * 250, altitudeUnit)}</p>
				</div>
				<div className="panel-data-item">
					<p>Radar Altitude</p>
					<p>{convertAltitude(Math.round(pilot.altitude_agl / 250) * 250, altitudeUnit)}</p>
				</div>
				<div className="panel-data-item">
					<p>Vertical Speed</p>
					<p>{convertVerticalSpeed(Math.round(pilot.vertical_speed / 50) * 50, verticalSpeedUnit)}</p>
				</div>
				<div className="panel-data-item">
					<p>Track</p>
					<p>{`${hdg}°`}</p>
				</div>
				<div className="panel-data-item">
					<p>Altimeter</p>
					<p>{`${pilot.qnh_mb} hPa / ${pilot.qnh_i_hg} inHg`}</p>
				</div>
				<div className="panel-data-item">
					<p>Ground Speed</p>
					<p>{convertSpeed(pilot.groundspeed, speedUnit)}</p>
				</div>
			</div>
		</div>
	);
}
