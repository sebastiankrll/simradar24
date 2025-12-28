import BreadCrumb from "@/components/Breadcrumb/Breadcrumb";

export default function DataLayout({ children }: { children: React.ReactNode }) {
	return (
		<section id="data-page">
			<BreadCrumb />
			{children}
		</section>
	);
}
