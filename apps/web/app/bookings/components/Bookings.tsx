"use client";

import type { Booking } from "@sr24/types/interface";
import { useEffect } from "react";
import useSWR from "swr";
import Spinner from "@/components/Spinner/Spinner";
import { fetchApi } from "@/utils/api";
import { initDataLayers } from "../lib/map";
import BookingsControls from "./BookingsControls";
import BookingsMap from "./BookingsMap";

export default function Bookings() {
	const { data, isLoading } = useSWR<Booking[]>("/data/bookings", fetchApi, {
		refreshInterval: 10 * 60 * 1000,
		revalidateOnFocus: false,
	});

	useEffect(() => {
		if (!data) return;
		initDataLayers(data);
	}, [data]);

	if (!data || isLoading) {
		return <Spinner />;
	}

	return (
		<>
			<BookingsControls />
			<BookingsMap />
		</>
	);
}
