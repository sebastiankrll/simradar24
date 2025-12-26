import { usePathname } from "next/navigation";
import "./Navigation.css";

export default function Navigation({ open }: { open: boolean }) {
	const pathname = usePathname();

	return (
		<nav className={open ? "open" : ""}>
			<div id="nav-logo-placeholder"></div>
			<ul>
				<li className={pathname !== "/policy" ? "active" : ""}>
					<a href="/">Map</a>
				</li>
				<li className={pathname === "/policy" ? "active" : ""}>
					<a href="/policy">Policy</a>
				</li>
			</ul>
		</nav>
	);
}
