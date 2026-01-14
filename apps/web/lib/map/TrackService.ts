import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

export class TrackService {
	source = new VectorSource({
		useSpatialIndex: false,
	});
	layer: VectorLayer | null = null;

	public init(): VectorLayer {
		this.layer = new VectorLayer({
			source: this.source,
			properties: {
				type: "track",
			},
			zIndex: 3,
		});
		return this.layer;
	}
}
