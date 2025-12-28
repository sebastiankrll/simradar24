"use client";

import type { WsDelta } from "@sr24/types/vatsim";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetchApi } from "@/utils/api";
import { wsClient } from "@/utils/ws";
import Icon from "../Icon/Icon";

interface Metrics {
	connectedClients: number;
	rateLimitedClients: number;
	totalMessages: number;
	avgMessagesPerClient: number;
	timestamp: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3002";

function getTimestamp(date: Date | string): string {
	return new Date(date).toISOString().split("T")[1].split(".")[0];
}

export default function Metrics() {
	const { data: metrics, isLoading } = useSWR<Metrics>(`${WS_URL.replace("ws", "http")}/metrics`, fetchApi, { refreshInterval: 120_000 });

	const [timestamp, setTimestamp] = useState<string>("");
	const [stale, setStale] = useState<boolean>(false);

	useEffect(() => {
		setTimestamp(getTimestamp(new Date()));

		let timeoutId: NodeJS.Timeout;
		const handleMessage = (delta: WsDelta) => {
			setTimestamp(getTimestamp(delta.timestamp));
			setStale(false);

			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => {
				setStale(true);
			}, 60_000);
		};
		wsClient.addListener(handleMessage);
		console.log("Added WS listener for Metrics footer");

		return () => {
			wsClient.removeListener(handleMessage);
		};
	}, []);

	return (
		<>
			<Icon name="signal" size={16} />
			<div id="footer-clients">
				<span>{isLoading ? "..." : metrics?.connectedClients ? metrics.connectedClients + 1 : 1}</span>visitors online
			</div>
			<div id="footer-timestamp">
				<span style={{ background: stale ? "var(--color-red)" : "", animationDuration: stale ? "1s" : "" }}></span>
				{timestamp}
			</div>
		</>
	);
}
