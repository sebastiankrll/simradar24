"use client";

import { useEffect, useState } from "react";
import { initCache } from "@/storage/cache";
import "./Initializer.css";
import { usePathname } from "next/navigation";
import type { StatusMap } from "@/types/initializer";

function getInitializerText(status: StatusMap): string {
	if (!status.airports) {
		return "Downloading airport data ...";
	} else if (!status.firs) {
		return "Downloading VAT-Spy data ...";
	} else if (!status.tracons) {
		return "Downloading SimAware data ...";
	} else if (!status.airlines) {
		return "Downloading airline data ...";
	} else if (!status.cache) {
		return "Initializing local cache ...";
	} else if (!status.map) {
		return "Setting up map ...";
	} else {
		return "Initialization complete!";
	}
}

export default function Initializer() {
	const [open, setOpen] = useState(true);
	const [visible, setVisible] = useState(true);
	const [status, setStatus] = useState<StatusMap>({});
	const pathname = usePathname();

	useEffect(() => {
		initCache(setStatus, pathname);
		return () => {};
	}, [pathname]);

	useEffect(() => {
		if (status.airports && status.firs && status.tracons && status.airlines && status.cache && status.map) {
			setOpen(false);
			setTimeout(() => setVisible(false), 500);
		}
	}, [status]);

	if (!visible) {
		return null;
	}

	return (
		<div id="initializer" className={open ? "open" : ""}>
			<span id="initializer-progress" style={{ width: `${(Object.keys(status).length / 6) * 100}%` }}></span>
			<p id="initializer-title">Initializing data ...</p>
			<p id="initializer-disclaimer">This can take up to a minute during the first load.</p>
			<p id="initializer-text">{getInitializerText(status)}</p>
		</div>
	);
}
