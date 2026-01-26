import type { FeatureLike } from "ol/Feature";
import Fill from "ol/style/Fill";
import Icon from "ol/style/Icon";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import sprite from "@/assets/images/sprites/aircrafts.png";

export type PilotStyleVars = {
	size?: number;
	theme?: boolean;
};

const ICON_SIZE = 94;

export function getPilotStyle(vars?: PilotStyleVars) {
	const styleCache = new Map<string, Style>();
	const textFill = new Fill({ color: "#26aa6d" });
	const activeFill = new Fill({ color: "rgb(234, 89, 121)" });

	return (feature: FeatureLike, resolution: number) => {
		const aircraft = feature.get("aircraft");
		const active = !!(feature.get("clicked") || feature.get("hovered"));
		const heading = feature.get("heading") || 0;
		const altitude_agl = feature.get("altitude_agl") || 0;
		const callsign = feature.get("callsign") || "N/A";

		const offsetX = active ? ICON_SIZE : 0;
		const [offsetY, sizePx] = spriteOffsets.get(aircraft) ?? [0, 50];
		const interp = zoomInterplation(resolution);

		const scale = Math.round(Math.min(Math.max(((vars?.size || 50) / 50) * interp, 0.2), 1) * 100) / 100;
		const rotation = (heading / 180) * Math.PI;

		const cacheKey = `${offsetX}_${offsetY}_${scale.toFixed(2)}_${rotation.toFixed(2)}`;

		let style = styleCache.get(cacheKey);

		if (!style) {
			style = new Style({
				image: new Icon({
					src: sprite.src,
					size: [ICON_SIZE, ICON_SIZE],
					offset: [offsetX, offsetY],
					scale,
					rotation,
					rotateWithView: true,
					declutterMode: "none",
				}),
				text: new Text({
					font: "500 11px Ubuntu, sans-serif",
					fill: active ? activeFill : textFill,
					offsetY: scale * sizePx * 0.6,
					textAlign: "center",
					declutterMode: "declutter",
				}),
			});

			styleCache.set(cacheKey, style);
		}

		if ((resolution < 750 && altitude_agl > resolution) || resolution < 50) {
			style.getText()?.setText(callsign);
		} else {
			style.getText()?.setText("");
		}

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

		const [offsetY, _sizePx] = spriteOffsets.get(aircraft) ?? [0, 50];
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
	["A10", [0, 55]],
	["A124", [94, 106]],
	["A225", [188, 120]],
	["A306", [282, 91]],
	["A30B", [282, 91]],
	["A310", [376, 84]],
	["A318", [470, 70]],
	["A19N", [564, 72]],
	["A319", [564, 72]],
	["A20N", [658, 75]],
	["A320", [658, 75]],
	["A21N", [752, 82]],
	["A321", [752, 82]],
	["A332", [846, 96]],
	["A338", [846, 96]],
	["A333", [940, 101]],
	["A339", [940, 101]],
	["A337", [1034, 100]],
	["A342", [1128, 96]],
	["A343", [1222, 101]],
	["A345", [1316, 105]],
	["A346", [1410, 112]],
	["A359", [1504, 104]],
	["A35K", [1598, 110]],
	["A388", [1692, 112]],
	["A400", [1786, 83]],
	["A5", [1880, 48]],
	["AC50", [1974, 52]],
	["AC56", [1974, 52]],
	["AC68", [1974, 52]],
	["AC6L", [1974, 52]],
	["AC80", [1974, 52]],
	["AC90", [1974, 52]],
	["AC95", [1974, 52]],
	["AEST", [1974, 52]],
	["AC11", [1974, 52]],
	["AN12", [2068, 73]],
	["AN72", [2162, 68]],
	["AT3T", [2256, 53]],
	["AT5T", [2256, 53]],
	["AT6T", [2256, 53]],
	["AT8T", [2256, 53]],
	["AT43", [2350, 61]],
	["AT44", [2350, 61]],
	["AT45", [2350, 61]],
	["AT46", [2350, 61]],
	["AT72", [2444, 65]],
	["AT73", [2444, 65]],
	["AT75", [2444, 65]],
	["AT76", [2444, 65]],
	["B2", [2538, 87]],
	["B350", [2632, 54]],
	["B36T", [2632, 54]],
	["B461", [2726, 64]],
	["B462", [2820, 67]],
	["RJ85", [2820, 67]],
	["B463", [2914, 69]],
	["RJ1H", [2914, 69]],
	["B52", [3008, 90]],
	["B734", [3102, 74]],
	["B735", [3102, 74]],
	["B736", [3196, 71]],
	["B37M", [3290, 74]],
	["B737", [3290, 74]],
	["B38M", [3384, 77]],
	["B738", [3384, 77]],
	["B39M", [3478, 80]],
	["B739", [3478, 80]],
	["B741", [3572, 107]],
	["B742", [3572, 107]],
	["B743", [3572, 107]],
	["B744", [3572, 107]],
	["B748", [3666, 113]],
	["B752", [3760, 85]],
	["B753", [3854, 92]],
	["B762", [3948, 86]],
	["B763", [4042, 92]],
	["B764", [4136, 98]],
	["B772", [4230, 101]],
	["B77L", [4230, 101]],
	["B773", [4324, 101]],
	["B77W", [4324, 101]],
	["B788", [4418, 94]],
	["B789", [4512, 100]],
	["B78X", [4606, 105]],
	["BCS1", [4700, 73]],
	["BCS3", [4794, 77]],
	["BE10", [4888, 51]],
	["BE20", [4888, 51]],
	["BE30", [4888, 51]],
	["BE99", [4888, 51]],
	["BE9L", [4888, 51]],
	["BE9T", [4888, 51]],
	["BE19", [4982, 47]],
	["BE23", [4982, 47]],
	["BE24", [4982, 47]],
	["BE33", [4982, 47]],
	["BE35", [4982, 47]],
	["BE36", [4982, 47]],
	["BL17", [4982, 47]],
	["BL8", [4982, 47]],
	["CRUZ", [4982, 47]],
	["GC1", [4982, 47]],
	["P28A", [4982, 47]],
	["P28B", [4982, 47]],
	["P28R", [4982, 47]],
	["P28T", [4982, 47]],
	["BE50", [5076, 51]],
	["BE55", [5076, 51]],
	["BE58", [5076, 51]],
	["BE60", [5076, 51]],
	["BE65", [5076, 51]],
	["BE70", [5076, 51]],
	["BE76", [5076, 51]],
	["BE77", [5076, 51]],
	["BE80", [5076, 51]],
	["BE95", [5076, 51]],
	["BT36", [5076, 51]],
	["BLCF", [5170, 108]],
	["C130", [5264, 76]],
	["C30J", [5264, 76]],
	["C120", [5358, 48]],
	["C140", [5358, 48]],
	["C150", [5358, 48]],
	["C152", [5358, 48]],
	["C160", [5358, 48]],
	["C162", [5358, 48]],
	["C170", [5358, 48]],
	["C172", [5358, 48]],
	["C175", [5358, 48]],
	["C177", [5358, 48]],
	["C180", [5358, 48]],
	["C182", [5358, 48]],
	["C185", [5358, 48]],
	["C188", [5358, 48]],
	["C195", [5358, 48]],
	["C206", [5358, 48]],
	["C207", [5358, 48]],
	["C210", [5358, 48]],
	["C240", [5358, 48]],
	["C72R", [5358, 48]],
	["C77R", [5358, 48]],
	["C82R", [5358, 48]],
	["CH7A", [5358, 48]],
	["CH7B", [5358, 48]],
	["COUR", [5358, 48]],
	["HUSK", [5358, 48]],
	["L8", [5358, 48]],
	["M5", [5358, 48]],
	["P210", [5358, 48]],
	["P32R", [5358, 48]],
	["P32T", [5358, 48]],
	["P46T", [5358, 48]],
	["S108", [5358, 48]],
	["T210", [5358, 48]],
	["C17", [5452, 90]],
	["C25A", [5546, 53]],
	["C25B", [5546, 53]],
	["C25C", [5546, 53]],
	["C25M", [5546, 53]],
	["C510", [5546, 53]],
	["C525", [5546, 53]],
	["C303", [5640, 49]],
	["C310", [5640, 49]],
	["C320", [5640, 49]],
	["C335", [5640, 49]],
	["C340", [5640, 49]],
	["C402", [5640, 49]],
	["C404", [5640, 49]],
	["C414", [5640, 49]],
	["C421", [5640, 49]],
	["C425", [5640, 49]],
	["C441", [5640, 49]],
	["F406", [5640, 49]],
	["C650", [5734, 56]],
	["C680", [5734, 56]],
	["C68A", [5734, 56]],
	["C700", [5828, 61]],
	["C750", [5828, 61]],
	["CRJ1", [5922, 65]],
	["CRJ2", [5922, 65]],
	["CRJ9", [6016, 74]],
	["CRJX", [6110, 74]],
	["DA40", [6204, 49]],
	["DA42", [6204, 49]],
	["DV20", [6204, 49]],
	["FDCT", [6204, 49]],
	["NAVI", [6204, 49]],
	["RV12", [6204, 49]],
	["DC10", [6298, 93]],
	["DC91", [6392, 70]],
	["DC93", [6392, 70]],
	["DC95", [6392, 70]],
	["DH8D", [6486, 71]],
	["E170", [6580, 68]],
	["E75L", [6580, 68]],
	["E75S", [6580, 68]],
	["E190", [6674, 74]],
	["E195", [6674, 74]],
	["E290", [6674, 74]],
	["E295", [6674, 74]],
	["F15", [6768, 58]],
	["F16", [6862, 54]],
	["F18H", [6956, 56]],
	["F18S", [6956, 56]],
	["F22", [7050, 58]],
	["K35R", [7144, 79]],
	["MD11", [7238, 99]],
	["MD81", [7332, 83]],
	["MD82", [7332, 83]],
	["MD83", [7332, 83]],
	["MD87", [7332, 83]],
	["MD88", [7332, 83]],
	["MD90", [7332, 83]],
]);
