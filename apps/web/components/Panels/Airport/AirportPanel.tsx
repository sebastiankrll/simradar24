"use client";

import type { AirportLong } from "@sk/types/vatsim";
import { resetMap } from "@/components/Map/utils/events";
import "./AirportPanel.css";
import type { StaticAirport } from "@sk/types/db";
import { useEffect, useState } from "react";
import { getCachedAirport } from "@/storage/cache";
import { AirportTitle } from "./AirportTitle";

export interface AirportPanelStatic {
	airport: StaticAirport | null;
}

export default function AirportPanel({ initialAirport }: { initialAirport: AirportLong }) {
	const [airport, setAirport] = useState<AirportLong>(initialAirport);
	const [data, setData] = useState<AirportPanelStatic>({
		airport: null,
	});

	const [shared, setShared] = useState(false);
	const onShareClick = () => {
		navigator.clipboard.writeText(`${window.location.origin}/airport/${airport.icao}`);
		setShared(true);
		setTimeout(() => setShared(false), 2000);
	};

	useEffect(() => {
		Promise.all([getCachedAirport(initialAirport.icao)]).then(([airport]) => {
			setData({ airport });
		});
	}, [initialAirport]);

	return (
		<>
			<div className="panel-header">
				<div className="panel-id">{airport.icao}</div>
				<button className="panel-close" type="button" onClick={() => resetMap()}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Close panel</title>
						<path
							fillRule="evenodd"
							d="M23.763 22.658 13.106 12 23.68 1.42a.781.781 0 0 0-1.1-1.1L12 10.894 1.42.237a.78.78 0 0 0-1.1 1.105L10.894 12 .237 22.658a.763.763 0 0 0 0 1.105.76.76 0 0 0 1.105 0L12 13.106l10.658 10.657a.76.76 0 0 0 1.105 0 .76.76 0 0 0 0-1.105"
							clipRule="evenodd"
						></path>
					</svg>
				</button>
			</div>
			<AirportTitle staticAirport={data.airport} />
			<div className="panel-container main scrollable"></div>
			<div className="panel-navigation">
				<button className={`panel-navigation-button`} type="button" onClick={() => {}}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>General</title>
						<path
							fillRule="evenodd"
							d="m12.006 24-.442-.497c-.245-.284-6.214-7.097-8.04-12.538A7 7 0 0 1 3 8.505v-.308C3 3.68 7.037 0 12.006 0 16.974 0 21 3.679 21 8.197v.272a8.5 8.5 0 0 1-.524 2.508c-1.826 5.43-7.784 12.242-8.04 12.526zm0-22.817c-4.329 0-7.842 3.146-7.842 7.014v.272c.029.696.178 1.38.442 2.023 1.489 4.4 5.98 9.971 7.4 11.675 1.408-1.704 5.899-7.275 7.377-11.64a7.2 7.2 0 0 0 .454-2.129v-.2c0-3.869-3.514-7.015-7.831-7.015m0 13.33a5.4 5.4 0 0 1-3.032-.934 5.53 5.53 0 0 1-2.01-2.49 5.63 5.63 0 0 1-.31-3.205 5.58 5.58 0 0 1 1.493-2.84 5.43 5.43 0 0 1 2.794-1.519 5.37 5.37 0 0 1 3.153.316c.997.42 1.85 1.13 2.45 2.043.599.912.919 1.985.919 3.082a5.68 5.68 0 0 1-1.622 3.9 5.5 5.5 0 0 1-3.835 1.648Zm0-9.912A4.276 4.276 0 0 0 8.97 5.88a4.4 4.4 0 0 0-.93 1.416 4.43 4.43 0 0 0 0 3.34c.215.53.531 1.011.93 1.416a4.3 4.3 0 0 0 1.393.947c.52.219 1.079.332 1.643.332a4.33 4.33 0 0 0 3.02-1.303 4.47 4.47 0 0 0 1.273-3.074c0-1.159-.452-2.27-1.256-3.09a4.27 4.27 0 0 0-3.037-1.286V4.6Z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>General</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => {}}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Departures</title>
						<path
							fillRule="evenodd"
							d="M.061 15.706a.6.6 0 0 0-.06.272c0 .1.026.197.077.281a.5.5 0 0 0 .212.197c1.206.63 1.911.98 2.473 1.257l.504.25v.001l.356.175c.412.201.843.412 1.523.762l.015.008.016.005c.32.098.66.112.99.041.326-.07.633-.22.892-.438l15.21-9.694a6 6 0 0 0 1.089-.84c.333-.27.556-.658.622-1.084a1.67 1.67 0 0 0-.27-1.202.53.53 0 0 0-.206-.206l-.009-.005c-.84-.407-1.439-.567-2.106-.447-.648.117-1.343.496-2.382 1.086l-.003.002-4.922 2.92q-.722-.118-1.522-.236l-.072-.01c-.583-.089-1.189-.18-1.806-.284h-.002l-1.113-.176h-.003c-1.45-.228-2.965-.467-4.461-.713a1.5 1.5 0 0 0-.638.027 1.6 1.6 0 0 0-.575.28l-.683.45a.91.91 0 0 0-.497.737v.019a.66.66 0 0 0 .337.574l5.422 3.199-2.565 1.652-1.726-.1-1.982-.11h-.003a.6.6 0 0 0-.322.083l-.006.004L.25 15.49l-.005.003a.6.6 0 0 0-.184.213m4.037-.111 1.831.107a.7.7 0 0 0 .443-.114l3.226-2.041.004-.003a.78.78 0 0 0 .257-1.007.7.7 0 0 0-.255-.268l-.002-.001-5.399-3.21.296-.174.009-.005c.126-.083.193-.12.247-.137a.35.35 0 0 1 .173-.004c.95.147 1.903.3 2.84.451l.056.01c.918.147 1.821.293 2.694.428 1.268.196 2.465.382 3.524.556l.01.001a.6.6 0 0 0 .228-.017l.077-.015a.6.6 0 0 0 .171-.056l.012-.007 5.02-2.987c.987-.537 1.522-.824 1.966-.915.405-.083.743-.005 1.325.267a.5.5 0 0 1 .05.151c.007.062 0 .14-.052.244-.11.223-.414.55-1.144 1.022L6.457 17.578l-.009.006c-.266.19-.463.268-.6.296a.53.53 0 0 1-.248 0c-.803-.42-1.235-.63-1.772-.893l-.18-.087c-.496-.243-1.055-.516-1.997-.996l.627-.423z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>Departures</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => {}}>
					<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
						<title>Arrivals</title>
						<path
							fillRule="evenodd"
							d="M.384 7.883a.55.55 0 0 0-.23.145.52.52 0 0 0-.126.534c.416 1.286.673 2.025.877 2.613.065.187.125.359.182.528v.001l.131.372c.152.43.31.879.548 1.6l.005.017.008.014c.157.294.388.544.67.728.279.181.6.293.933.326l17.424 4.04c.44.113.893.176 1.348.188a1.7 1.7 0 0 0 1.188-.31c.34-.247.57-.612.64-1.02a.53.53 0 0 0-.004-.287l-.003-.01c-.312-.875-.623-1.407-1.177-1.796-.538-.376-1.29-.605-2.43-.93l-.004-.001-5.49-1.456c-.283-.394-.59-.808-.91-1.237l-.043-.059a115 115 0 0 1-1.08-1.47l-.665-.908-.002-.002c-.864-1.18-1.769-2.415-2.655-3.64a1.6 1.6 0 0 0-.468-.431 1.6 1.6 0 0 0-.6-.212l-.792-.173a.9.9 0 0 0-.86.16l-.007.005-.006.007a.64.64 0 0 0-.158.634l1.617 6.034-2.951-.669-1.149-1.286-1.322-1.475-.002-.003a.6.6 0 0 0-.284-.169l-.008-.002-1.862-.416-.006-.001a.56.56 0 0 0-.277.017m2.926 2.772 1.217 1.366c.1.12.239.201.392.233l3.685.867.005.001a.77.77 0 0 0 .69-.2.72.72 0 0 0 .192-.679v-.002L7.895 6.216l.33.088.01.003c.146.031.219.053.268.08a.34.34 0 0 1 .125.119c.57.772 1.136 1.55 1.693 2.315l.033.046c.545.75 1.082 1.488 1.605 2.197.76 1.03 1.475 2.003 2.102 2.87l.006.008q.073.09.173.149l.065.044a.6.6 0 0 0 .16.082l.012.003 5.606 1.481c1.066.325 1.642.505 2.018.755.343.228.527.52.75 1.119a.5.5 0 0 1-.07.14.4.4 0 0 1-.204.132c-.231.075-.671.087-1.512-.102l-17.46-4.057-.01-.002c-.32-.056-.512-.142-.628-.219a.54.54 0 0 1-.175-.175c-.277-.856-.436-1.306-.634-1.867l-.067-.187c-.182-.518-.388-1.1-.721-2.097l.734.151z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>Arrivals</p>
				</button>
				<button className={`panel-navigation-button`} type="button" onClick={() => onShareClick()}>
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
						<title>Share</title>
						<path
							fillRule="evenodd"
							d="M22.681 10.01v12.746H1.32V10.01H0V24h24V10.01zM11.34 2.363v14.673h1.32V2.301l4.549 4.165.923-.87L12 0 5.868 5.596l.923.87 4.55-4.103Z"
							clipRule="evenodd"
						></path>
					</svg>
					<p>{shared ? "Copied!" : "Share"}</p>
				</button>
			</div>
		</>
	);
}
