import "./Footer.css";

export default function Footer({ children }: Readonly<{ children?: React.ReactNode }>) {
	return (
		<footer>
			{children}
			<div className="footer-item" id="footer-github">
				Report a bug, request a feature, or send ❤️ on&nbsp;
				<a href="https://github.com/sebastiankrll/simradar21" rel="noopener noreferrer" target="_blank">
					GitHub
				</a>
			</div>
			<div className="footer-item" id="footer-version">
				{process.env.NEXT_PUBLIC_APP_RELEASE || "dev"}
			</div>
		</footer>
	);
}
