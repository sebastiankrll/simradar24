"use client";

import { usePathname } from "next/navigation";
import "./Breadcrumb.css";
import Icon from "../Icon/Icon";

export default function BreadCrumb() {
	const pathname = usePathname();

	return (
		<ol id="breadcrumb">
			{pathname.split("/").map((segment, index) => {
				if (segment === "")
					return (
						<li key={index} className="breadcrumb-item">
							<a href="/" className={pathname === "/" ? "active" : ""}>
								Map
							</a>
						</li>
					);

				const fullPath = `/${pathname
					.split("/")
					.slice(1, index + 1)
					.join("/")}`;

				return (
					<li key={index} className="breadcrumb-item">
						<Icon name="forward" size={24} />
						<a href={fullPath} className={pathname === fullPath ? "active" : ""}>
							{segment.charAt(0).toUpperCase() + segment.slice(1)}
						</a>
					</li>
				);
			})}
		</ol>
	);
}
