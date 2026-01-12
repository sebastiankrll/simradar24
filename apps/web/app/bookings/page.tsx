import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";
import Bookings from "./components/Bookings";
import Initializer from "@/components/Initializer/Initializer";

export default async function Page() {
	return (
		<>
			<Header />
			<main id="bookings-page">
				<Initializer />
				<Bookings />
			</main>
			<Footer />
		</>
	);
}
