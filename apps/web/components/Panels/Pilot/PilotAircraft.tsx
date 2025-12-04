import type { StaticAircraft } from "@sk/types/db";
import type { PilotLong } from "@sk/types/vatsim";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";

export function PilotAircraft({ pilot, aircraft }: { pilot: PilotLong; aircraft: StaticAircraft | undefined }) {
	const acType = `${aircraft?.manufacturerName || ""} ${aircraft?.model || ""}`;
	return (
		<div className="panel-sub-container sep">
			<div className="panel-section-title">
				<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
					<title>Aircraft</title>
					<path
						fillRule="evenodd"
						d="m7.066 24-.06-.823s-.122-1.203-.122-1.457c-.061-.38-.061-.633 3.106-3.356-.061-.886-.122-3.546-.122-4.876-1.157.317-4.142 1.837-6.7 3.23l-.73.38-.184-.887c0-.063-.182-.95-.243-1.836-.061-.38-.122-1.204 7.735-7.093 0-.886-.06-3.356 0-4.432.061-1.71 1.95-2.66 2.01-2.723L12 0l.305.127c.182.126 1.949 1.14 2.01 2.723.06 1.14 0 3.546 0 4.432 7.796 5.89 7.735 6.713 7.674 7.093a18 18 0 0 1-.243 1.836l-.183.823-.731-.38c-2.497-1.393-5.543-2.913-6.7-3.23 0 1.33-.061 3.99-.122 4.877 3.167 2.723 3.106 2.976 3.106 3.356-.06.253-.121 1.456-.121 1.456l-.061.824-.731-.254s-3.655-1.203-4.325-1.456c-.548.063-2.497.76-4.08 1.393zM12 20.96c.122 0 .122 0 3.898 1.267 0-.19.061-.38.061-.507-.365-.443-1.705-1.646-2.863-2.66l-.243-.19v-.316c.06-1.583.183-4.813.122-5.636 0-.316.121-.57.304-.696.305-.19.975-.634 7.431 2.913.061-.254.061-.507.122-.76-.487-.76-4.142-3.736-7.492-6.206l-.244-.19v-.317c0-.063.122-3.42.061-4.686 0-.633-.67-1.203-1.096-1.52-.427.317-1.036.824-1.097 1.457-.06 1.33.061 4.686.061 4.686v.317l-.243.19c-3.411 2.533-7.066 5.446-7.553 6.269 0 .253.06.506.122.76 6.456-3.547 7.126-3.103 7.43-2.913.244.126.366.443.305.696-.06.823.061 4.053.122 5.636v.317l-.244.19c-1.157 1.013-2.497 2.216-2.862 2.66 0 .126 0 .316.06.443C9.32 21.72 11.27 20.96 12 20.96"
						clipRule="evenodd"
					></path>
				</svg>
			</div>
			<div className="panel-section-content" id="panel-pilot-aircraft">
				<div className="panel-data-item" style={!aircraft ? { gridArea: "inherit" } : undefined}>
					<p>Aircraft type</p>
					<p>{acType.trim() ? acType : pilot.aircraft}</p>
				</div>
				{!aircraft && (
					<div className="panel-data-item">
						<p>Registration</p>
						<p>{pilot.flight_plan?.ac_reg}</p>
					</div>
				)}
				{aircraft && (
					<>
						<div className="panel-data-item">
							<p>Registration</p>
							<p>{pilot.flight_plan?.ac_reg}</p>
						</div>
						<div className="panel-data-item">
							<p>Country of reg.</p>
							<p
								className={`fflag ff-lg fflag-${aircraft?.country}`}
								id="panel-pilot-aircraft-country"
								style={{ backgroundImage: `url(${FlagSprite.src})` }}
							></p>
						</div>
						<div className="panel-data-item">
							<p>Owner</p>
							<p>{aircraft?.owner || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>Serial number (MSN)</p>
							<p>{aircraft?.serialNumber || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>Icao24</p>
							<p>{aircraft?.icao24 || "N/A"}</p>
						</div>
						<div className="panel-data-item">
							<p>SELCAL</p>
							<p>{aircraft?.selCal || "N/A"}</p>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
