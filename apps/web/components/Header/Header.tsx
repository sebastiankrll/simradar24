"use client";

import Search from "./Search";
import "./Header.css";
import Image from "next/image";
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import simradar24Logo from "@/assets/images/simradar24_logo.svg";
import Navigation from "./Navigation";

export default function Header() {
	const [open, setOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);
	const { data: session } = useSession();

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
				setOpen(false);
			}
		}

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [open]);

	return (
		<header ref={headerRef}>
			<figure id="header-logo">
				<Image src={simradar24Logo} alt="simradar24 logo" height={40} width={200} priority />
			</figure>
			<Search />
			{session ? (
				<button type="button" id="header-user" onClick={() => signOut()}>
					👤
				</button>
			) : (
				<button type="button" id="header-user" onClick={() => signIn("vatsim")}>
					🔒
				</button>
			)}
			<button type="button" id="header-nav" aria-label="Navigation" onClick={() => setOpen(!open)}>
				{open ? "✕" : "☰"}
			</button>
			<Navigation open={open} />
		</header>
	);
}
