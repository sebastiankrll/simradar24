"use client";

import "./BasePanel.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function BasePanel({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const [rendered, setRendered] = useState<React.ReactNode>(children);
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
		const t = setTimeout(() => {
			setRendered(children);
			setOpen(true);
			prevPath.current = type;
		}, 200);

		return () => clearTimeout(t);
	}, [children, pathname]);

	return <div className={`panel${open ? "" : " hide"}`}>{rendered}</div>;
}
