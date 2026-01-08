import OMap from "@/app/(map)/components/Map";
import Clock from "@/components/Footer/Clock";
import Footer from "@/components/Footer/Footer";
import Metrics from "@/components/Footer/Metrics";
import Header from "@/components/Header/Header";

export default function MapLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<OMap>{children}</OMap>
			<Footer>
				<div className="footer-item" id="footer-main">
					<Metrics />
					<Clock />
				</div>
			</Footer>
		</>
	);
}
