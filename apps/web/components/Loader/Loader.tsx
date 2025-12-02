"use client";

import { useEffect, useState } from "react";
import { initData } from "@/storage/cache";
import type { StatusMap } from "@/types/data";
import "./Loader.css";
import Image from "next/image";
import simradar24Logo from "@/assets/images/simradar24_logo.svg";
import { usePathname } from "next/navigation";

export default function Loader() {
	const [status, setStatus] = useState<StatusMap>({});
	const pathname = usePathname();

	useEffect(() => {
		initData(setStatus, pathname);
		return () => {};
	}, [pathname]);

	return (
		<>
			{status.indexedDB && status.initData && status.initMap ? null : (
				<div id="loader-wrapper">
					<div id="loader">
						<figure id="loader-logo">
							<Image src={simradar24Logo} alt="simradar24 logo" priority={true} />
						</figure>
						<div id="loader-title">Please wait, while the application is loading.</div>
						<div id="loader-items">
							<div className="loader-item">
								<div className={`loader-spinner`}></div>
								<p>{status.indexedDB ? "Database ready!" : "Initializing databases ..."}</p>
							</div>
							<div className="loader-item">
								<div className={`loader-spinner${status.initData ? " done" : ""}`}></div>
								<p>{status.initData ? "Initial data fetched!" : "Fetching initial data ..."}</p>
							</div>
							<div className="loader-item">
								<div className={`loader-spinner${status.initMap ? " done" : ""}`}></div>
								<p>{status.initMap ? "Map initialized!" : "Initializing map ..."}</p>
							</div>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
