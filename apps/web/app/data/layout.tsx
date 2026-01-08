import BreadCrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";
import Header from "@/components/Header/Header";

export default function DataLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header />
			<main id="data-page">
				<BreadCrumb />
				{children}
			</main>
			<Footer />
		</>
	);
}
