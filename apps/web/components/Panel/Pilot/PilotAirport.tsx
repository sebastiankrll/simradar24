import type { StaticAirport } from "@sr24/types/db";
import { useRouter } from "next/navigation";

export function PilotAirport({ airport }: { airport: StaticAirport | null }) {
	const router = useRouter();

	const onClick = () => {
		router.push(`/airport/${airport?.id}`);
	};

	return (
		<button className="panel-pilot-airport" type="button" onClick={onClick}>
			<div className="panel-pilot-airport-iata">{airport?.iata ?? "N/A"}</div>
			<div className="panel-pilot-airport-name">{airport?.name ?? "Not available"}</div>
		</button>
	);
}
