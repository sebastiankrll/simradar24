"use client";

import type { StaticAircraft } from "@sr24/types/db";
import { useEffect, useState } from "react";
import FlagSprite from "@/assets/images/sprites/flagSprite42.png";
import { getCachedAircraft } from "@/storage/cache";

export default function Aircraft({ registration }: { registration: string }) {
	const [aircraft, setAircraft] = useState<StaticAircraft | null>(null);

	useEffect(() => {
		(async () => {
			const aircraft = await getCachedAircraft(registration);
			setAircraft(aircraft);
		})();
	}, [registration]);

	const acType = `${aircraft?.manufacturerName || ""} ${aircraft?.model || ""}`;

	return (
		<div id="flights-page-aircraft">
			<h1>Aircraft details for registration {registration}</h1>
			<table>
				<thead>
					<tr>
						<th>Aircraft Type</th>
						<th>Registration</th>
						<th>Country of Reg.</th>
						<th>Owner</th>
						<th>Serial Number</th>
						<th>ICAO24</th>
						<th>SELCAL</th>
						<th>AGE</th>
						<th>Details</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>{acType.trim() ? acType : "N/A"}</td>
						<td>{aircraft?.registration || "N/A"}</td>
						<td>
							{aircraft?.country ? (
								<span
									className={`fflag ff-lg fflag-${aircraft?.country}`}
									style={{ backgroundImage: `url(${FlagSprite.src})`, width: 28, height: 18 }}
								></span>
							) : (
								"N/A"
							)}
						</td>
						<td>{aircraft?.owner || "N/A"}</td>
						<td>{aircraft?.serialNumber || "N/A"}</td>
						<td>{aircraft?.icao24 || "N/A"}</td>
						<td>{aircraft?.selCal || "N/A"}</td>
						<td>N/A</td>
						<td>
							{aircraft ? (
								<a href={`https://www.flightradar24.com/data/aircraft/${aircraft?.registration || ""}`} target="_blank" rel="noopener noreferrer">
									View on FR24
								</a>
							) : (
								"N/A"
							)}
						</td>
					</tr>
				</tbody>
			</table>
			<p style={{ fontSize: "var(--font-size-small)" }}>
				<strong>Note:</strong> The current aircraft database is very limited and may not include all aircraft details or aircrafts. This is due to the
				limited availability of open-source data sources. I hope to improve this in the future, contributions and data sources are welcome.
			</p>
		</div>
	);
}
