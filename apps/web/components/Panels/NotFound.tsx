"use client";

import { resetMap } from "../Map/utils/events";

export default function NotFoundPanel({ title, text, disableHeader = false }: { title?: string; text?: string; disableHeader?: boolean }) {
	return (
		<>
			{disableHeader !== true && (
				<div className="panel-header">
					<button className="panel-close" type="button" onClick={() => resetMap()}>
						<svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
							<title>Close panel</title>
							<path
								fillRule="evenodd"
								d="M23.763 22.658 13.106 12 23.68 1.42a.781.781 0 0 0-1.1-1.1L12 10.894 1.42.237a.78.78 0 0 0-1.1 1.105L10.894 12 .237 22.658a.763.763 0 0 0 0 1.105.76.76 0 0 0 1.105 0L12 13.106l10.658 10.657a.76.76 0 0 0 1.105 0 .76.76 0 0 0 0-1.105"
								clipRule="evenodd"
							></path>
						</svg>
					</button>
				</div>
			)}
			<div style={{ background: "white", padding: "1rem" }}>
				<p style={{ fontWeight: 700 }}>{title || "Data not found!"}</p>
				{text || "This data does not exist or is currently unavailable."}
			</div>
		</>
	);
}
