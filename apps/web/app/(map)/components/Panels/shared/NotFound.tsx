"use client";

import { mapService } from "@/app/(map)/lib";
import Icon from "@/components/Icon/Icon";

export default function NotFoundPanel({ title, text, disableHeader = false }: { title?: string; text?: string; disableHeader?: boolean }) {
	return (
		<>
			{disableHeader !== true && (
				<div className="panel-header">
					<button className="panel-close" type="button" onClick={() => mapService.resetMap()}>
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
