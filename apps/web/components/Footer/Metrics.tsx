"use client";

import { useEffect, useState } from "react";
import { type WsData, type WsPresence, wsClient } from "@/utils/ws";
import Icon from "../Icon/Icon";

function getTimestamp(date: Date | string): string {
	return new Date(date).toISOString().split("T")[1].split(".")[0];
}

export default function Metrics() {
	const [timestamp, setTimestamp] = useState<string>("");
	const [metrics, setMetrics] = useState<number | null>(null);
	const [stale, setStale] = useState<boolean>(false);

	useEffect(() => {
		setTimestamp(getTimestamp(new Date()));

		let timeoutId: NodeJS.Timeout;
		const handleMessage = (msg: WsData | WsPresence) => {
			if (msg.t === "presence") {
				setMetrics(msg.c);
				return;
			}

			setTimestamp(getTimestamp(msg.data.timestamp));
			setMetrics(msg.c);
			setStale(false);

			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				setStale(true);
			}, 60_000);
		};
		wsClient.addListener(handleMessage);

		return () => {
			wsClient.removeListener(handleMessage);
		};
	}, []);

	return (
		<>
			<Icon name="signal" size={16} />
			<div id="footer-clients">
				<span>{metrics || "..."}</span>visitors online
			</div>
			<div id="footer-timestamp">
				<span style={{ background: stale ? "var(--color-red)" : "", animationDuration: stale ? "1s" : "" }}></span>
				{timestamp}
			</div>
		</>
	);
}
