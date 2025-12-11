import type { ControllerLong } from "@sr24/types/vatsim";
import "./ControllerInfo.css";
import type { SimAwareTraconFeature, StaticAirport } from "@sr24/types/db";
import { getControllerColor } from "@/components/Map/components/Overlay/Overlays";

function getControllerName(facility: number, tracon: SimAwareTraconFeature | null, airport: StaticAirport | null): string {
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
			return tracon?.properties.name || "Unknown Approach";
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
	tracon,
	openSection,
	ref,
}: {
	controllers: ControllerLong[];
	airport: StaticAirport | null;
	tracon: SimAwareTraconFeature | null;
	openSection: string | null;
	ref: React.Ref<HTMLDivElement>;
}) {
	const sortedControllers = controllers?.sort((a, b) => b.facility - a.facility);

	return (
		<div ref={ref} className={`panel-sub-container accordion${openSection === "controllers" ? " open" : ""}`}>
			<div className="panel-section-title">
				<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
					<title>Controllers</title>
					<path
						fillRule="evenodd"
						d="M21.737 13.539c.061-.308.061-.554.061-.862 0-3.57-2.861-6.462-6.393-6.462-.852 0-1.644.185-2.375.493-.852-1.17-2.192-1.908-3.653-1.908-2.436 0-4.445 2.03-4.445 4.492 0 1.231.487 2.4 1.4 3.262-.852.8-1.4 1.907-1.4 3.138 0 2.339 1.888 4.247 4.201 4.247h1.34c.365 0 .609-.247.609-.616 0-.37-.244-.615-.61-.615H9.134c-1.644 0-2.983-1.354-2.983-3.016 0-1.6 1.278-2.892 2.8-3.015v.062c0 .43.062.922.122 1.353a.596.596 0 0 0 .61.493h.121a.64.64 0 0 0 .487-.739c-.06-.492-.06-.861-.06-1.17 0-2.891 2.313-5.23 5.175-5.23s5.176 2.339 5.176 5.23c0 .247 0 .493-.061.74-.914.123-1.705.615-2.253 1.353-.183.308-.122.677.122.862.243.184.67.123.852-.123a1.91 1.91 0 0 1 1.583-.862c1.096 0 1.948.923 1.948 1.97s-.791 1.969-1.887 1.969h-1.888c-.365 0-.608.246-.608.615 0 .37.243.615.608.615h1.827c1.766 0 3.166-1.415 3.166-3.2.122-1.476-.913-2.707-2.253-3.076ZM9.133 11.385c-.609 0-1.217.123-1.705.369-.73-.615-1.217-1.539-1.217-2.523 0-1.785 1.461-3.262 3.227-3.262.974 0 1.948.493 2.557 1.231-1.461.923-2.496 2.4-2.862 4.185m6.394 3.385c-.183-.309-.548-.431-.792-.247-.304.185-.426.554-.243.8l1.583 3.015h-2.618a.64.64 0 0 0-.549.308.56.56 0 0 0 0 .616l2.314 4.43a.64.64 0 0 0 .548.308c.122 0 .183 0 .305-.061.304-.185.426-.554.243-.862l-1.826-3.508h2.618a.72.72 0 0 0 .548-.307.56.56 0 0 0 0-.616zm-1.34-9.785a.55.55 0 0 0 .426-.185l1.34-1.354a.6.6 0 0 0 0-.861.584.584 0 0 0-.852 0l-1.34 1.353a.6.6 0 0 0 0 .862.55.55 0 0 0 .426.185M9.438 2.892c.365 0 .609-.246.609-.615V.615c0-.369-.244-.615-.61-.615-.365 0-.608.246-.608.615v1.723c0 .308.243.554.609.554M4.932 3.938 3.532 2.4a.584.584 0 0 0-.853 0 .664.664 0 0 0-.06.862l1.4 1.538a.69.69 0 0 0 .487.185.65.65 0 0 0 .426-.185c.183-.246.244-.615 0-.862M3.349 9.23c0-.368-.244-.615-.609-.615H.609c-.365 0-.609.247-.609.616s.244.615.609.615H2.74c.304 0 .609-.308.609-.615Zm.243 4.924-1.217 1.23a.6.6 0 0 0 0 .862.55.55 0 0 0 .426.185.55.55 0 0 0 .426-.185l1.218-1.23a.6.6 0 0 0 0-.862.584.584 0 0 0-.853 0"
						clipRule="evenodd"
					></path>
				</svg>
			</div>
			<div className="panel-section-content controllers">
				{sortedControllers.map((c) => (
					<div key={c.callsign} className="panel-controller-item" style={{ borderLeftColor: getControllerColor(c.facility) }}>
						<div className="panel-controller-title">
							<p>{c.callsign}</p>
							<p>{(c.frequency / 1000).toFixed(3)}</p>
							<p>{getControllerName(c.facility, tracon, airport)}</p>
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
