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
			<div id="header-search-wrapper">
				<Search />
			</div>
			<button type="button" id="header-vatsim-login">
				Login with VATSIM
			</button>
		</header>
	);
}
