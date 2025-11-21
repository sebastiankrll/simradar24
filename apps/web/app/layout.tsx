import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header/Header";
import OMap from "@/components/Map/Map";

export const metadata: Metadata = {
	title: "simradar24",
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
		<html lang="en" className={manrope.className}>
			<body>
				<Header />
				<OMap />
				{children}
			</body>
		</html>
	);
}
