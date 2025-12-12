"use client";

import "./Footer.css";

export default function Footer() {
	return (
		<footer>
			<div className="footer-item" id="footer-clients">
				<span>1249</span>visitors online
			</div>
			<div className="footer-item" id="footer-timestamp">
				<span></span>18:27:20z
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
