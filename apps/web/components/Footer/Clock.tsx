"use client";

import { useEffect, useState } from "react";

function getTime(time: Date): string {
	const hours = time.getUTCHours();
	const minutes = time.getUTCMinutes();

	const formattedHours = String(hours).padStart(2, "0");
	const formattedMinutes = String(minutes).padStart(2, "0");

	return `${formattedHours}:${formattedMinutes}`;
}

export default function Clock() {
	const [time, setTime] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => {
			setTime(new Date());
		}, 1000);

		return () => {
			clearInterval(interval);
		};
	}, []);

	return (
		<div id="footer-clock" suppressHydrationWarning>
			{getTime(time)}
			<span>UTC</span>
		</div>
	);
}
