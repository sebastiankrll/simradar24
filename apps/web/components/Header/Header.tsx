"use client";

import Search from "../Search/Search";
import "./Header.css";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import simradar24Logo from "@/assets/images/logos/Simradar21_Logo.svg";
import useSettings from "@/hooks/useSettings";
import { storeUserSettings, useSettingsStore } from "@/storage/zustand";
import Icon from "../Icon/Icon";
import Navigation from "./Navigation";

export default function Header() {
	const [open, setOpen] = useState(false);
	const headerRef = useRef<HTMLElement>(null);

	const { data: session } = useSession();

	const settings = useSettingsStore();
	useSettings();

	const onThemeChange = async () => {
		settings.setTheme(settings.theme === "dark" ? "light" : "dark");

		if (session) {
			storeUserSettings();
		}
	};

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
				<a href="/">
					<Image src={simradar24Logo} alt="simradar24 logo" height={40} width={200} priority />
				</a>
			</figure>
			<Search />
			<button
				type="button"
				id="header-theme"
				onClick={() => onThemeChange()}
				aria-label="Toggle Theme"
				className={settings.theme === "dark" ? "light" : "dark"}
			>
				{<Icon name={settings.theme === "dark" ? "light-theme" : "dark-theme"} size={24} />}
			</button>
			<a href="/auth" id="header-user">
				<Icon name="user" size={18} offset={-1} />
				<span style={{ backgroundColor: session ? "var(--color-green)" : "var(--color-red)" }}></span>
			</a>
			<button type="button" id="header-nav" aria-label="Navigation" onClick={() => setOpen(!open)}>
				<Icon name={open ? "cancel" : "off-canvas"} size={24} />
			</button>
			<Navigation open={open} />
		</header>
	);
}
