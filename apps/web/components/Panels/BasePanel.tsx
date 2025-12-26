"use client";

import "./BasePanel.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Spinner from "../shared/Spinner/Spinner";

export default function BasePanel({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [open, setOpen] = useState(true);
	const prevPath = useRef<string | null>(null);

	useEffect(() => {
		const type = pathname.split("/")[1] || "";
		if (prevPath.current === null || prevPath.current === type) {
			prevPath.current = type;
			return;
		}

		setOpen(false);
		const openTimeout = setTimeout(() => {
			setOpen(true);
			prevPath.current = type;
		}, 300);

		return () => {
			clearTimeout(openTimeout);
		};
	}, [pathname]);

	return (
		<div className={`panel${open ? "" : " hide"}`}>
			{!open && <Spinner />}
			{children}
		</div>
	);
}
