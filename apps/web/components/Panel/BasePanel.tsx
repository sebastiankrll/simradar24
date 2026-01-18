"use client";

import Spinner from "@/components/Spinner/Spinner";
import "./BasePanel.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFiltersStore, useMapVisibilityStore } from "@/storage/zustand";

export default function BasePanel({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();

	const [open, setOpen] = useState(true);

	const prevPath = useRef<string | null>(null);

	const { isHidden } = useMapVisibilityStore();
	const { active } = useFiltersStore();

	useEffect(() => {
		const type = pathname.split("/")[1] || "";

		if (prevPath.current === null && !isHidden) {
			prevPath.current = type;
			return;
		}

		let openTimeout: NodeJS.Timeout | undefined;

		setOpen(false);
		openTimeout = setTimeout(() => setOpen(type === "" ? !isHidden : true), 300);

		prevPath.current = type;

		return () => {
			clearTimeout(openTimeout);
		};
	}, [pathname, isHidden]);

	return (
		<div className={`panel${open ? "" : " hide"}`} style={{ maxHeight: `calc(100% - ${active ? 9.5 : 7}rem)` }}>
			{!open && <Spinner />}
			{children}
		</div>
	);
}
