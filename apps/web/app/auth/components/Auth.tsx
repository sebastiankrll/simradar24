"use client";

import type { Session } from "next-auth";
import { signIn } from "next-auth/react";
import "./Auth.css";
import Image from "next/image";
import NavigraphLandscape from "@/assets/images/logos/Navigraph_Logo_Landscape.webp";
import NavigraphSquare from "@/assets/images/logos/Navigraph_Logo_Square.webp";
import Icon from "@/components/Icon/Icon";

export default function Auth({ session }: { session: Session | null }) {
	return (
		<main id="auth-page">
			<div id="auth-bg"></div>
			<a href="/" id="auth-close">
				<Icon name="cancel" />
			</a>
			<div id="auth-logins">
				<div id="auth-title">{session?.vatsim ? `Hi, ${session.vatsim.name}!` : "Welcome!"}</div>
				<p>Connect VATSIM to sync settings between devices and access personalized features.</p>
				<button type="button" id="vatsim-login" onClick={() => signIn("vatsim")} disabled={!!session?.vatsim}>
					{session?.vatsim ? "VATSIM Connected!" : "Connect VATSIM"}
					{session?.vatsim && (
						<span>
							<Icon name="select" />
						</span>
					)}
				</button>
				<p>Connect Navigraph to access up-to-date navigational data.</p>
				<button type="button" id="navigraph-login" onClick={() => signIn("navigraph")} disabled={!!session?.navigraph}>
					<Image src={session?.navigraph ? NavigraphSquare : NavigraphLandscape} alt="Navigraph Logo" height={32} />
					{session?.navigraph && <p>Connected!</p>}
					{session?.navigraph && (
						<span>
							<Icon name="select" />
						</span>
					)}
				</button>
			</div>
		</main>
	);
}
