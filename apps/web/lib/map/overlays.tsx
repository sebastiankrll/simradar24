import { type Feature, Overlay } from "ol";
import type { Point } from "ol/geom";
import { createRoot } from "react-dom/client";
import { AirportOverlay, PilotOverlay, SectorOverlay } from "@/components/Map/Overlays";
import { getCachedAirline, getCachedAirport, getCachedFir, getCachedTracon } from "@/storage/cache";

export async function createOverlay(feature: Feature<Point>): Promise<Overlay> {
	const element = document.createElement("div");
	const root = createRoot(element);
	const type = feature.get("type");

	let id: string | undefined;

	if (type === "pilot") {
		id = feature.get("callsign") as string;

		const icao = id.substring(0, 3);
		const airline = await getCachedAirline(icao);

		root.render(<PilotOverlay feature={feature} airline={airline} />);
	}

	if (type === "airport") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^airport_/, "") || "";

		const cachedAirport = await getCachedAirport(id);
		// const shortAirport = getAirportShort(id);
		// const controllerMerged = getControllerMerged(`airport_${id}`);
		root.render(<AirportOverlay cached={cachedAirport} short={shortAirport} merged={controllerMerged} />);
	}

	if (type === "tracon") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		let cachedTracon = await getCachedTracon(id);
		if (!cachedTracon) {
			const cachedAirport = await getCachedAirport(id);
			if (cachedAirport) {
				cachedTracon = {
					properties: {
						id: cachedAirport.id,
						name: cachedAirport.name.replace("Airport", "Radar"),
						prefix: "",
					},
					type: "Feature",
					geometry: {
						type: "MultiPolygon",
						coordinates: [],
					},
				};
			}
		}
		// const controllerMerged = getControllerMerged(`tracon_${id}`);
		root.render(<SectorOverlay cached={cachedTracon} merged={controllerMerged} />);
	}

	if (type === "fir") {
		id =
			feature
				.getId()
				?.toString()
				.replace(/^sector_/, "") || "";

		const cachedFir = await getCachedFir(id);
		// const controllerMerged = getControllerMerged(`fir_${id}`);
		root.render(<SectorOverlay cached={cachedFir} merged={controllerMerged} />);
	}

	const overlay = new Overlay({
		element,
		id: id,
		position: feature.getGeometry()?.getCoordinates(),
		positioning: "bottom-center",
		offset: [0, -25],
		insertFirst: false,
	});
	overlay.set("root", root);

	return overlay;
}
