import BreadCrumb from "@/components/Breadcrumb/Breadcrumb";
import Footer from "@/components/Footer/Footer";

export default function DataLayout({ children }: { children: React.ReactNode }) {
	return (
		<section id="data-page">
			<BreadCrumb />
			{children}
			<Footer />
		</section>
	);
}
