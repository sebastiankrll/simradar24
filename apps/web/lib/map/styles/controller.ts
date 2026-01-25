import type { FeatureLike } from "ol/Feature";
import Fill from "ol/style/Fill";
import Icon from "ol/style/Icon";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import type { RgbaColor } from "react-colorful";
import sprite from "@/assets/images/sprites/airportLabel.png";

export type ControllerStyleVars = {
	firColor?: RgbaColor;
	traconColor?: RgbaColor;
	airportSize?: number;
};

export function getLabelStyle(vars?: ControllerStyleVars) {
	const styleCache = new Map<string, Style>();

	const firFill = new Fill({ color: vars?.firColor ? `rgb(${vars.firColor.r}, ${vars.firColor.g}, ${vars.firColor.b})` : "rgb(77, 95, 131)" });
	const traconFill = new Fill({
		color: vars?.traconColor ? `rgb(${vars.traconColor.r}, ${vars.traconColor.g}, ${vars.traconColor.b})` : "rgb(222, 89, 234)",
	});
	const activeFill = new Fill({ color: "rgb(234, 89, 121)" });

	return (feature: FeatureLike, resolution: number) => {
		const type = feature.get("type") as "tracon" | "fir";
		const active = !!(feature.get("clicked") || feature.get("hovered"));
		const text = feature.get("label") as string;

		if ((type === "tracon" && resolution > 3500) || (type === "fir" && resolution > 6000)) return;

		const cacheKey = `${active}_${type}`;

		let style = styleCache.get(cacheKey);
		if (!style) {
			style = new Style({
				text: new Text({
					font: "400 11px Ubuntu, sans-serif",
					fill: new Fill({ color: "white" }),
					backgroundFill: active ? activeFill : type === "fir" ? firFill : traconFill,
					padding: [3, 2, 1, 4],
					textAlign: "center",
				}),
			});
			styleCache.set(cacheKey, style);
		}

		style.getText()?.setText(text);
		return style;
	};
}

const ICON_SIZE = 44;

export function getAirportStyle(vars?: ControllerStyleVars) {
	const styleCache = new Map<string, Style>();

	return (feature: FeatureLike, resolution: number) => {
		const yOffset = feature.get("offset") as number;
		const size = feature.get("size") as "s" | "m" | "l";

		const miniFactor = getMiniFactor(size, resolution);

		const scale = Math.round(Math.min(Math.max(((vars?.airportSize || 50) / 50) * getScaleFromSize(size) * miniFactor, 0.2), 1) * 100) / 100;
		const offset = [0, yOffset * ICON_SIZE];

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

function getMiniFactor(size: "s" | "m" | "l", resolution: number): number {
	if ((size === "s" && resolution < 1000) || (size === "m" && resolution < 1500) || (size === "l" && resolution < 3500)) {
		return 1;
	}
	return 0.3;
}

function getScaleFromSize(size: "s" | "m" | "l"): number {
	switch (size) {
		case "s":
			return 0.3;
		case "m":
			return 0.4;
		default:
			return 0.5;
	}
}

export function getFirStyle(vars?: ControllerStyleVars) {
	const styleCache = new Map<string, Style>();

	const fill = new Fill({
		color: vars?.firColor ? `rgba(${vars.firColor.r}, ${vars.firColor.g}, ${vars.firColor.b}, ${vars.firColor.a})` : "rgba(77, 95, 131, 0.15)",
	});
	const activeFill = new Fill({ color: "rgba(234, 89, 121, 0.3)" });

	const stroke = new Stroke({
		color: vars?.firColor ? `rgb(${vars.firColor.r}, ${vars.firColor.g}, ${vars.firColor.b})` : "rgb(77, 95, 131)",
	});
	const activeStroke = new Stroke({ color: "rgb(234, 89, 121)" });

	return (feature: FeatureLike) => {
		const active = !!(feature.get("clicked") || feature.get("hovered"));

		const cacheKey = `${active}`;
		if (styleCache.has(cacheKey)) {
			return styleCache.get(cacheKey);
		}

		const style = new Style({
			fill: active ? activeFill : fill,
			stroke: active ? activeStroke : stroke,
		});
		styleCache.set(cacheKey, style);

		return style;
	};
}

export function getTraconStyle(vars?: ControllerStyleVars) {
	const styleCache = new Map<string, Style>();

	const fill = new Fill({
		color: vars?.traconColor
			? `rgba(${vars.traconColor.r}, ${vars.traconColor.g}, ${vars.traconColor.b}, ${vars.traconColor.a})`
			: "rgba(222, 89, 234, 0.1)",
	});
	const activeFill = new Fill({ color: "rgba(234, 89, 121, 0.3)" });

	const stroke = new Stroke({
		color: vars?.traconColor ? `rgb(${vars.traconColor.r}, ${vars.traconColor.g}, ${vars.traconColor.b})` : "rgb(222, 89, 234)",
	});
	const activeStroke = new Stroke({ color: "rgb(234, 89, 121)" });

	return (feature: FeatureLike) => {
		const active = !!(feature.get("clicked") || feature.get("hovered"));

		const cacheKey = `${active}`;
		if (styleCache.has(cacheKey)) {
			return styleCache.get(cacheKey);
		}

		const style = new Style({
			fill: active ? activeFill : fill,
			stroke: active ? activeStroke : stroke,
		});
		styleCache.set(cacheKey, style);

		return style;
	};
}
