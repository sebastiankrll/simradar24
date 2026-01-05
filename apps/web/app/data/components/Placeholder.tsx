import Image from "next/image";
import "./Placeholder.css";
import simradar24Logo from "@/assets/images/logos/Simradar21_Logo.svg";

export function Placeholder({ text }: { text: string }) {
	return (
		<div id="placeholder">
			<Image src={simradar24Logo} alt="simradar24 logo" width={300} priority />
			<div id="placeholder-title">Work in progress ... Stay tuned!</div>
			<div id="placeholder-text">{text}</div>
		</div>
	);
}
