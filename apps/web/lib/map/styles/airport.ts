import type { FeatureLike } from "ol/Feature";
import Icon from "ol/style/Icon";
import Style from "ol/style/Style";
import sprite from "@/assets/images/sprites/airport.png";

export type AirportStyleVars = {
	size?: number;
};

const ICON_SIZE = 44;

export function getAirportStyle(vars?: AirportStyleVars) {
	const styleCache = new Map<string, Style>();

	return (feature: FeatureLike) => {
		const clicked = feature.get("clicked");
		const hovered = feature.get("hovered");
		const size = feature.get("size");

		const offset = clicked || hovered ? [ICON_SIZE, 0] : [0, 0];
		const baseScale = size === "s" ? 0.3 : size === "m" ? 0.4 : 0.5;
		const scale = Math.round(((baseScale * (vars?.size || 50)) / 50) * 100) / 100;

		const cacheKey = `${offset[0]}_${offset[1]}_${scale.toFixed(2)}`;

		if (styleCache.has(cacheKey)) {
			return styleCache.get(cacheKey);
		}

		const style = new Style({
			image: new Icon({
				src: sprite.src,
				size: [ICON_SIZE, ICON_SIZE],
				offset,
				scale,
				rotateWithView: false,
			}),
		});

		styleCache.set(cacheKey, style);
		return style;
	};
}
