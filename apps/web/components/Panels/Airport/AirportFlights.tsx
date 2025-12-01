export default function AirportFlights({ icao, direction }: { icao: string; direction: string }) {
	return (
		<p>
			Airport Flights Component - ICAO: {icao}, Direction: {direction}
		</p>
	);
}
