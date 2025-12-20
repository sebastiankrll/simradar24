"use client";

import Search from "./Search";
import "./Header.css";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import simradar24Logo from "@/assets/images/logos/Simradar21_Logo.svg";
import VatsimLogo from "@/assets/images/logos/VATSIM_Logo_Only.png";
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
			<button type="button" id="header-user" onClick={() => signIn("vatsim")} aria-label="Sign In/Out">
				<Image src={VatsimLogo} alt="VATSIM logo" height={30} width={30} />
				<span style={{ backgroundColor: session ? "var(--color-green)" : "var(--color-red)" }}></span>
			</button>
			<button type="button" id="header-nav" aria-label="Navigation" onClick={() => setOpen(!open)}>
				{open ? "✕" : "☰"}
			</button>
			<Navigation open={open} />
		</header>
	);
}
