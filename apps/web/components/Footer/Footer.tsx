import Clock from "./Clock";
import "./Footer.css";
import Metrics from "./Metrics";

export default function Footer() {
	return (
		<footer>
			<div className="footer-item" id="footer-main">
				<Metrics />
				<Clock />
			</div>
			<div className="footer-item" id="footer-github">
				Report a bug, request a feature, or send ❤️ on&nbsp;
				<a href="https://github.com/sebastiankrll/simradar21" rel="noopener noreferrer" target="_blank">
					GitHub
				</a>
			</div>
			<div className="footer-item" id="footer-version">
				{process.env.NEXT_PUBLIC_APP_VERSION || "dev"}
			</div>
		</footer>
	);
}
