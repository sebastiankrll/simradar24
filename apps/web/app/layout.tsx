import type { Metadata } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import "@/assets/images/sprites/freakflags.css";
import Footer from "@/components/shared/Footer/Footer";
import Header from "@/components/shared/Header/Header";
import { Providers } from "./providers";

export const metadata: Metadata = {
	title: "simradar21",
	description: "VATSIM tracking service",
};

const ubuntu = Ubuntu({
	subsets: ["latin"],
	weight: ["300", "400", "500", "700"],
	display: "swap",
});

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={ubuntu.className} suppressHydrationWarning>
			<body>
				<Providers>
					<Header />
					{children}
					<Footer />
				</Providers>
			</body>
		</html>
	);
}
