import type { PilotLong } from "@sr24/types/vatsim";
import Icon from "@/components/Icon/Icon";

export function PilotUser({ pilot, openSection, ref }: { pilot: PilotLong; openSection: string | null; ref: React.Ref<HTMLDivElement> }) {
	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "pilot" ? " open" : ""}`}>
			<div className="panel-section-title">
				<Icon name="user" size={24} />
			</div>
			<div className="panel-section-content" id="panel-pilot-user">
				<div className="panel-data-item">
					<p>Name</p>
					<p>{pilot.name}</p>
				</div>
				<div className="panel-data-item">
					<p>Vatsim ID</p>
					<p>{pilot.cid}</p>
				</div>
				<div className="panel-data-item">
					<p>Rating</p>
					<p>{pilot.pilot_rating}</p>
				</div>
			</div>
		</div>
	);
}
