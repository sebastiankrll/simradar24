import type { FeatureLike } from "ol/Feature";
import Icon from "ol/style/Icon";
import Style from "ol/style/Style";
import sprite from "@/assets/images/sprites/aircrafts.png";

export type PilotStyleVars = {
	size?: number;
	theme?: boolean;
};

const ICON_SIZE = 94;

export function getPilotStyle(vars?: PilotStyleVars) {
	const styleCache = new Map<string, Style>();

	return (feature: FeatureLike, resolution: number) => {
		const aircraft = feature.get("aircraft");
		const clicked = feature.get("clicked");
		const hovered = feature.get("hovered");
		const heading = feature.get("heading") || 0;

		const offsetX = clicked || hovered ? ICON_SIZE : 0;
		const offsetY = spriteOffsets.get(aircraft) ?? 0;
		const interp = zoomInterplation(resolution);

		const scale = Math.round(Math.min(Math.max(((vars?.size || 50) / 50) * interp, 0.2), 1) * 100) / 100;
		const rotation = (heading / 180) * Math.PI;

		const cacheKey = `${offsetX}_${offsetY}_${scale.toFixed(2)}_${rotation.toFixed(2)}`;
		if (styleCache.has(cacheKey)) {
			return styleCache.get(cacheKey);
		}

		const style = new Style({
			image: new Icon({
				src: sprite.src,
				size: [ICON_SIZE, ICON_SIZE],
				offset: [offsetX, offsetY],
				scale,
				rotation,
				rotateWithView: true,
			}),
		});

		styleCache.set(cacheKey, style);
		return style;
	};
}

export function getShadowStyle(vars?: PilotStyleVars) {
	const styleCache = new Map<string, Style>();

	return (feature: FeatureLike, resolution: number) => {
		const aircraft = feature.get("aircraft");
		const heading = feature.get("heading") || 0;
		const altitude_agl = feature.get("altitude_agl") || 0;
		const theme = vars?.theme || false;

		const offsetY = spriteOffsets.get(aircraft) ?? 0;
		const interp = zoomInterplation(resolution);

		const scale = Math.round(Math.min(Math.max(((vars?.size || 50) / 50) * interp, 0.2), 1) * 100) / 100;
		const rotation = (heading / 180) * Math.PI;

		const altitude = Math.round(altitude_agl / 5000) * 5000;

		const cacheKey = `${offsetY}_${scale.toFixed(3)}_${rotation.toFixed(3)}_${altitude}_${theme ? "dark" : "light"}`;

		if (styleCache.has(cacheKey)) {
			return styleCache.get(cacheKey);
		}

		const headingRad = (heading / 180) * Math.PI;
		const dx = Math.round(Math.cos(headingRad - Math.PI / 4) * Math.SQRT2 * (altitude / 5000) * 0.6);
		const dy = Math.round(Math.sin(headingRad - Math.PI / 4) * Math.SQRT2 * (altitude / 5000) * 0.6);

		const style = new Style({
			image: new Icon({
				src: sprite.src,
				size: [ICON_SIZE, ICON_SIZE],
				offset: [2 * ICON_SIZE, offsetY],
				scale,
				rotation,
				displacement: [dx, dy],
				opacity: theme ? 1 : 0.4,
				rotateWithView: true,
			}),
		});

		styleCache.set(cacheKey, style);
		return style;
	};
}

function zoomInterplation(resolution: number): number {
	if (resolution > 10000) return 0.35;
	if (resolution > 3000) return 0.4;
	if (resolution > 1.5) return 0.5;
	if (resolution >= 0) return 0.5 + ((resolution - 1.5) / 1.5) ** 2;
	return 1;
}

const spriteOffsets = new Map([
	["A10", 0],
	["A124", 94],
	["A225", 188],
	["A306", 282],
	["A30B", 282],
	["A310", 376],
	["A318", 470],
	["A19N", 564],
	["A319", 564],
	["A20N", 658],
	["A320", 658],
	["A21N", 752],
	["A321", 752],
	["A332", 846],
	["A338", 846],
	["A333", 940],
	["A339", 940],
	["A337", 1034],
	["A342", 1128],
	["A343", 1222],
	["A345", 1316],
	["A346", 1410],
	["A359", 1504],
	["A35K", 1598],
	["A388", 1692],
	["A400", 1786],
	["A5", 1880],
	["AC50", 1974],
	["AC56", 1974],
	["AC68", 1974],
	["AC6L", 1974],
	["AC80", 1974],
	["AC90", 1974],
	["AC95", 1974],
	["AEST", 1974],
	["AC11", 1974],
	["AN12", 2068],
	["AN72", 2162],
	["AT3T", 2256],
	["AT5T", 2256],
	["AT6T", 2256],
	["AT8T", 2256],
	["AT43", 2350],
	["AT44", 2350],
	["AT45", 2350],
	["AT46", 2350],
	["AT72", 2444],
	["AT73", 2444],
	["AT75", 2444],
	["AT76", 2444],
	["B2", 2538],
	["B350", 2632],
	["B36T", 2632],
	["B461", 2726],
	["B462", 2820],
	["RJ85", 2820],
	["B463", 2914],
	["RJ1H", 2914],
	["B52", 3008],
	["B734", 3102],
	["B735", 3102],
	["B736", 3196],
	["B37M", 3290],
	["B737", 3290],
	["B38M", 3384],
	["B738", 3384],
	["B39M", 3478],
	["B739", 3478],
	["B741", 3572],
	["B742", 3572],
	["B743", 3572],
	["B744", 3572],
	["B748", 3666],
	["B752", 3760],
	["B753", 3854],
	["B762", 3948],
	["B763", 4042],
	["B764", 4136],
	["B772", 4230],
	["B77L", 4230],
	["B773", 4324],
	["B77W", 4324],
	["B788", 4418],
	["B789", 4512],
	["B78X", 4606],
	["BCS1", 4700],
	["BCS3", 4794],
	["BE10", 4888],
	["BE20", 4888],
	["BE30", 4888],
	["BE99", 4888],
	["BE9L", 4888],
	["BE9T", 4888],
	["BE19", 4982],
	["BE23", 4982],
	["BE24", 4982],
	["BE33", 4982],
	["BE35", 4982],
	["BE36", 4982],
	["BL17", 4982],
	["BL8", 4982],
	["CRUZ", 4982],
	["GC1", 4982],
	["P28A", 4982],
	["P28B", 4982],
	["P28R", 4982],
	["P28T", 4982],
	["BE50", 5076],
	["BE55", 5076],
	["BE58", 5076],
	["BE60", 5076],
	["BE65", 5076],
	["BE70", 5076],
	["BE76", 5076],
	["BE77", 5076],
	["BE80", 5076],
	["BE95", 5076],
	["BT36", 5076],
	["BLCF", 5170],
	["C130", 5264],
	["C30J", 5264],
	["C120", 5358],
	["C140", 5358],
	["C150", 5358],
	["C152", 5358],
	["C160", 5358],
	["C162", 5358],
	["C170", 5358],
	["C172", 5358],
	["C175", 5358],
	["C177", 5358],
	["C180", 5358],
	["C182", 5358],
	["C185", 5358],
	["C188", 5358],
	["C195", 5358],
	["C206", 5358],
	["C207", 5358],
	["C210", 5358],
	["C240", 5358],
	["C72R", 5358],
	["C77R", 5358],
	["C82R", 5358],
	["CH7A", 5358],
	["CH7B", 5358],
	["COUR", 5358],
	["HUSK", 5358],
	["L8", 5358],
	["M5", 5358],
	["P210", 5358],
	["P32R", 5358],
	["P32T", 5358],
	["P46T", 5358],
	["S108", 5358],
	["T210", 5358],
	["C17", 5452],
	["C25A", 5546],
	["C25B", 5546],
	["C25C", 5546],
	["C25M", 5546],
	["C510", 5546],
	["C525", 5546],
	["C303", 5640],
	["C310", 5640],
	["C320", 5640],
	["C335", 5640],
	["C340", 5640],
	["C402", 5640],
	["C404", 5640],
	["C414", 5640],
	["C421", 5640],
	["C425", 5640],
	["C441", 5640],
	["F406", 5640],
	["C650", 5734],
	["C680", 5734],
	["C68A", 5734],
	["C700", 5828],
	["C750", 5828],
	["CRJ1", 5922],
	["CRJ2", 5922],
	["CRJ9", 6016],
	["CRJX", 6110],
	["DA40", 6204],
	["DA42", 6204],
	["DV20", 6204],
	["FDCT", 6204],
	["NAVI", 6204],
	["RV12", 6204],
	["DC10", 6298],
	["DC91", 6392],
	["DC93", 6392],
	["DC95", 6392],
	["DH8D", 6486],
	["E170", 6580],
	["E75L", 6580],
	["E75S", 6580],
	["E190", 6674],
	["E195", 6674],
	["E290", 6674],
	["E295", 6674],
	["F15", 6768],
	["F16", 6862],
	["F18H", 6956],
	["F18S", 6956],
	["F22", 7050],
	["K35R", 7144],
	["MD11", 7238],
	["MD81", 7332],
	["MD82", 7332],
	["MD83", 7332],
	["MD87", 7332],
	["MD88", 7332],
	["MD90", 7332],
]);
