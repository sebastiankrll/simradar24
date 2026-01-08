"use client";

import { useEffect, useState } from "react";
import "./Initializer.css";
import { dxDatabaseIsStale, dxEnsureInitialized } from "@/storage/dexie";
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
	} else if (!status.aircrafts) {
		return "Downloading aircraft data ...";
	} else {
		return "Initialization complete!";
	}
}

export default function Initializer() {
	const [open, setOpen] = useState(false);
	const [visible, setVisible] = useState(false);
	const [status, setStatus] = useState<StatusMap>({});

	useEffect(() => {
		if (dxDatabaseIsStale()) {
			setVisible(true);
			setOpen(true);
			dxEnsureInitialized(setStatus);
		}
	}, []);

	useEffect(() => {
		if (status.airports && status.firs && status.tracons && status.airlines && status.aircrafts) {
			setOpen(false);
			setTimeout(() => setVisible(false), 500);
		}
	}, [status]);

	if (!visible) {
		return null;
	}

	return (
		<div id="initializer" className={open ? "open" : ""}>
			<span id="initializer-progress" style={{ width: `${(Object.keys(status).length / 5) * 100}%` }}></span>
			<p id="initializer-title">Initializing data ...</p>
			<p id="initializer-disclaimer">This can take up to a minute during the first load.</p>
			<p id="initializer-text">{getInitializerText(status)}</p>
		</div>
	);
}
