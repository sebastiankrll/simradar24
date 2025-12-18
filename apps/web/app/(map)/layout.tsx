import OMap from "@/components/Map/Map";

export default function MapLayout({ children }: { children: React.ReactNode }) {
	return <OMap>{children}</OMap>;
}
