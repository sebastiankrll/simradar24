import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import "@/assets/images/sprites/freakflags.css";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import Loader from "@/components/Loader/Loader";
import OMap from "@/components/Map/Map";
import BasePanel from "@/components/Panels/BasePanel";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "simradar21",
	description: "VATSIM tracking service",
};

const manrope = Manrope({
	subsets: ["latin"],
	display: "swap",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={manrope.className} suppressHydrationWarning>
			<body>
				<Providers>
					<Header />
					<Loader />
					<OMap />
					<BasePanel>{children}</BasePanel>
					<Footer />
				</Providers>
			</body>
		</html>
	);
}
