"use client";

import Icon from "@/components/Icon/Icon";
import { resetMap } from "../../app/(map)/lib/events";

export default function NotFoundPanel({ title, text, disableHeader = false }: { title?: string; text?: string; disableHeader?: boolean }) {
	return (
		<>
			{disableHeader !== true && (
				<div className="panel-header">
					<button className="panel-close" type="button" onClick={() => resetMap()}>
						<Icon name="cancel" size={24} />
					</button>
				</div>
			)}
			<div style={{ background: "var(--color-bg)", padding: "1rem" }}>
				<p style={{ fontWeight: 700 }}>{title || "Data not found!"}</p>
				{text || "This data does not exist or is currently unavailable."}
			</div>
		</>
	);
}
