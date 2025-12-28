import OMap from "@/app/(map)/components/Map";

export default function MapLayout({ children }: { children: React.ReactNode }) {
	return <OMap>{children}</OMap>;
}
