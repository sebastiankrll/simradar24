"use client";

import "./BasePanel.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function BasePanel({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [open, setOpen] = useState(true);
	const prevPath = useRef<string | null>(null);

	useEffect(() => {
		const type = pathname.split("/")[1] || "";
		if (prevPath.current === null) {
			prevPath.current = type;
			return;
		}
		if (prevPath.current === type) return;

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
			{!open && (
				<div id="panel-loader-wrapper">
					<div id="panel-loader"></div>
				</div>
			)}
			{children}
		</div>
	);
}
