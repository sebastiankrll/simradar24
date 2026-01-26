import type { FlatStyleLike } from "ol/style/flat";

const lightStyle: FlatStyleLike = {
	"fill-color": [0, 0, 0, 0.15],
};

const darkStyle: FlatStyleLike = {
	"fill-color": [77, 95, 131, 0.2],
};

export const sunStyles = {
	light: lightStyle,
	dark: darkStyle,
};
