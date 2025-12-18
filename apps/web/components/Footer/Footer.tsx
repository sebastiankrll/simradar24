import Clock from "./Clock";
import "./Footer.css";
import Metrics from "./Metrics";

export default function Footer() {
	return (
		<footer>
			<Metrics />
			<Clock />
			<div className="footer-item" id="footer-policy">
				<a href="/policy">Privacy Policy & Legal</a>
			</div>
			<div className="footer-item" id="footer-github">
				Report a bug, request a feature, or send ❤️ on&nbsp;
				<a href="https://github.com/sebastiankrll/simradar21" rel="noopener noreferrer" target="_blank">
					GitHub
				</a>
			</div>
			<div className="footer-item" id="footer-version">
				v0.0.1
			</div>
		</footer>
	);
}
