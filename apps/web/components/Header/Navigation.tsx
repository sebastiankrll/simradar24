import { usePathname } from "next/navigation";
import "./Navigation.css";

export default function Navigation({ open }: { open: boolean }) {
	const pathname = usePathname();

	return (
		<nav className={open ? "open" : ""}>
			<div id="nav-logo-placeholder"></div>
			<ul>
				<li className={!pathname.startsWith("/data") && !pathname.startsWith("/policy") && !pathname.startsWith("/bookings") ? "active" : ""}>
					<a href="/">Map</a>
				</li>
				<li className={pathname.startsWith("/data") ? "active" : ""}>
					<a href="/data">Data</a>
				</li>
				<li className={pathname.startsWith("/bookings") ? "active" : ""}>
					<a href="/bookings">Bookings</a>
				</li>
				<li className={pathname.startsWith("/policy") ? "active" : ""}>
					<a href="/policy">Policy</a>
				</li>
			</ul>
		</nav>
	);
}
