"use client";

import "./Footer.css";
import type { WsDelta } from "@sr24/types/vatsim";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { fetchApi } from "@/utils/api";
import { wsClient } from "@/utils/ws";

interface Metrics {
	connectedClients: number;
	rateLimitedClients: number;
	totalMessages: number;
	avgMessagesPerClient: number;
	timestamp: string;
}

const WS_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3002";

function getTimestamp(date: Date | string): string {
	return `${new Date(date).toISOString().split("T")[1].split(".")[0]}z`;
}

export default function Footer() {
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

		return () => {
			wsClient.removeListener(handleMessage);
		};
	}, []);

	return (
		<footer>
			<div className="footer-item" id="footer-clients">
				<span>{isLoading ? "..." : (metrics?.connectedClients ?? "0")}</span>visitors online
			</div>
			<div className="footer-item" id="footer-timestamp">
				<span style={{ background: stale ? "var(--color-red)" : "", animationDuration: stale ? "1s" : "" }}></span>
				{timestamp}
			</div>
			<div className="footer-item" id="footer-github">
				Report a bug, request a feature, or send ❤️ on&nbsp;
				<a href="https://github.com/sebastiankrll/simradar21" rel="noopener noreferrer" target="_blank">
					GitHub
				</a>
			</div>
			<div className="footer-item" id="footer-version">
				v0.0.1
			</div>
		</footer>
	);
}
