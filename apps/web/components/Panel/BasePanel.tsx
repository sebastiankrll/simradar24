"use client";

import Spinner from "@/components/Spinner/Spinner";
import "./BasePanel.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMapVisibilityStore } from "@/storage/zustand";

export default function BasePanel({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [open, setOpen] = useState(true);
	const prevPath = useRef<string | null>(null);
	const { isHidden } = useMapVisibilityStore();

	useEffect(() => {
		const type = pathname.split("/")[1] || "";

		if (type === "") {
			console.log(isHidden);
			setOpen(!isHidden);
			prevPath.current = type;
			return;
		}

		if (prevPath.current === type) {
			return;
		}

		const shouldOpenImmediately = type === "" || (isHidden && prevPath.current === "");

		let openTimeout: NodeJS.Timeout | undefined;

		if (shouldOpenImmediately) {
			setOpen(true);
		} else {
			setOpen(false);
			openTimeout = setTimeout(() => setOpen(true), 300);
		}

		prevPath.current = type;

		return () => {
			clearTimeout(openTimeout);
		};
	}, [pathname, isHidden]);

	return (
		<div className={`panel${open ? "" : " hide"}`}>
			{!open && <Spinner />}
			{children}
		</div>
	);
}
