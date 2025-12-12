import Search from "./Search";
import "./Header.css";
import Image from "next/image";
import simradar24Logo from "@/assets/images/simradar24_logo.svg";

export default function Header() {
	return (
		<header>
			<figure id="header-logo">
				<Image src={simradar24Logo} alt="simradar24 logo" height={40} width={200} priority />
			</figure>
			<div className="header-item">
				<Search />
			</div>
		</header>
	);
}
