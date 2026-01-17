"use client";

import type { Session } from "next-auth";
import { signIn, signOut } from "next-auth/react";
import "./Auth.css";
import Image from "next/image";
import NavigraphLandscape from "@/assets/images/logos/Navigraph_Logo_Landscape.webp";
import NavigraphSquare from "@/assets/images/logos/Navigraph_Logo_Square.webp";
import Icon from "@/components/Icon/Icon";

async function onDeleteAccount() {
	if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;

	try {
		const res = await fetch("/user", { method: "DELETE" });
		if (!res.ok) throw new Error("Failed to delete account");

		await signOut({ redirect: true, callbackUrl: "/" });
	} catch (err) {
		console.error(err);
		alert("Failed to delete account. Please try again.");
	}
}

function stripNumbersIfMixed(name: string): string {
	const trimmed = name.trim();

	// Only numbers → return as-is (after trim)
	if (/^\d+$/.test(trimmed)) {
		return trimmed;
	}

	// Has at least one letter AND one number → remove all numbers
	if (/[a-zA-Z]/.test(trimmed) && /\d/.test(trimmed)) {
		return trimmed.replace(/\d+/g, "").trim();
	}

	return trimmed;
}

export default function Auth({ session }: { session: Session | null }) {
	return (
		<main id="auth-page">
			<div id="auth-bg"></div>
			<a href="/" id="auth-close">
				<Icon name="cancel" />
			</a>
			<div id="auth-logins">
				<div id="auth-title">{session?.vatsim ? `Hi, ${stripNumbersIfMixed(session.vatsim.name)}!` : "Welcome!"}</div>
				<p>Connect VATSIM to sync settings between devices and access personalized features.</p>
				<button type="button" id="vatsim-login" className="auth-login-button" onClick={() => signIn("vatsim")} disabled={!!session?.vatsim}>
					{session?.vatsim ? "VATSIM Connected!" : "Connect VATSIM"}
					{session?.vatsim && (
						<span>
							<Icon name="select" />
						</span>
					)}
				</button>
				<p>Connect Navigraph to access up-to-date navigational data.</p>
				<button type="button" id="navigraph-login" className="auth-login-button" onClick={() => signIn("navigraph")} disabled={!!session?.navigraph}>
					<Image src={session?.navigraph ? NavigraphSquare : NavigraphLandscape} alt="Navigraph Logo" height={32} />
					{session?.navigraph && <p>Connected!</p>}
					{session?.navigraph && (
						<span>
							<Icon name="select" />
						</span>
					)}
				</button>
				{session && (
					<div id="auth-logouts">
						<button type="button" id="sign-out" className="auth-logout-button" onClick={() => signOut()} disabled={!session}>
							Sign Out
						</button>
						&#8739;
						<button type="button" id="delete-account" className="auth-logout-button" onClick={() => onDeleteAccount()} disabled={!session}>
							Delete Account
						</button>
					</div>
				)}
			</div>
		</main>
	);
}
