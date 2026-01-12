"use client";

import useSWR from "swr";
import BookingsMap from "./BookingsMap";
import { fetchApi } from "@/utils/api";
import { useEffect } from "react";
import { initDataLayers } from "../lib/map";
import Spinner from "@/components/Spinner/Spinner";
import BookingsControls from "./BookingsControls";
import { Booking } from "@sr24/types/interface";

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
