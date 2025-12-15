import aircraftSprite from "./sprites/aircraftSprite.png";
import airportLabelSprite from "./sprites/airportLabelSprite.png";
import airportSprite from "./sprites/airportSprite.png";

export const webglConfig = {
	pilot_main: {
		"icon-src": aircraftSprite.src,
		"icon-size": [47, 47],
		"icon-offset": ["case", ["all", ["==", ["get", "clicked"], 0], ["==", ["get", "hovered"], 0]], [0, 329], [47, 329]],
		"icon-rotate-with-view": true,
		"icon-scale": ["*", ["+", 0, ["var", "size"]], ["interpolate", ["exponential", 2], ["zoom"], 16.5, 1, 18, 2 ** 1.5]],
		"icon-rotation": ["*", ["/", ["get", "heading"], 180], Math.PI],
	},
	pilot_shadow: {
		"icon-src": aircraftSprite.src,
		"icon-size": [47, 47],
		"icon-offset": ["case", ["var", "theme"], [141, 329], [94, 329]],
		"icon-rotate-with-view": true,
		"icon-opacity": ["case", ["var", "theme"], 1, 0.4],
		"icon-scale": ["*", ["+", 0, ["var", "size"]], ["interpolate", ["exponential", 2], ["zoom"], 16.5, 1, 18, 2 ** 1.5]],
		"icon-displacement": [
			"array",
			[
				"interpolate",
				["exponential", 2],
				["zoom"],
				16.5,
				[
					"interpolate",
					["linear"],
					["get", "altitude_agl"],
					3000,
					["*", ["sqrt", 2], ["cos", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]],
					45000,
					["*", 4, ["*", ["sqrt", 2], ["cos", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]]],
				],
				18,
				[
					"*",
					[
						"interpolate",
						["linear"],
						["get", "altitude_agl"],
						3000,
						["*", ["sqrt", 2], ["cos", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]],
						45000,
						["*", 4, ["*", ["sqrt", 2], ["cos", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]]],
					],
					2 ** 1.5,
				],
			],
			[
				"interpolate",
				["exponential", 2],
				["zoom"],
				16.5,
				[
					"interpolate",
					["linear"],
					["get", "altitude_agl"],
					3000,
					["*", ["sqrt", 2], ["sin", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]],
					45000,
					["*", 4, ["*", ["sqrt", 2], ["sin", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]]],
				],
				18,
				[
					"*",
					[
						"interpolate",
						["linear"],
						["get", "altitude_agl"],
						3000,
						["*", ["sqrt", 2], ["sin", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]],
						45000,
						["*", 4, ["*", ["sqrt", 2], ["sin", ["-", ["*", ["/", ["get", "heading"], 180], Math.PI], Math.PI / 4]]]],
					],
					2 ** 1.5,
				],
			],
		],
		"icon-rotation": ["*", ["/", ["get", "heading"], 180], Math.PI],
	},
	airport_main: {
		"icon-src": airportSprite.src,
		"icon-size": [32, 32],
		"icon-offset": ["case", ["all", ["==", ["get", "clicked"], 0], ["==", ["get", "hovered"], 0]], [0, 0], [32, 0]],
		"icon-scale": ["*", ["case", ["==", ["get", "size"], "s"], 0.6, ["==", ["get", "size"], "m"], 0.7, 0.8], ["+", 0, ["var", "size"]]],
		"icon-rotate-with-view": false,
	},
	airport_label: {
		"icon-src": airportLabelSprite.src,
		"icon-size": [36, 36],
		"icon-offset": [
			"case",
			[
				"any",
				["all", ["==", ["get", "size"], "s"], [">", ["zoom"], 7.5]],
				["all", ["==", ["get", "size"], "m"], [">", ["zoom"], 6.5]],
				["all", ["==", ["get", "size"], "l"], [">", ["zoom"], 4.5]],
			],
			["array", 0, ["get", "offset"]],
			["array", 36, ["get", "offset"]],
		],
		"icon-scale": [
			"case",
			[
				"any",
				["all", ["==", ["get", "size"], "s"], [">", ["zoom"], 7.5]],
				["all", ["==", ["get", "size"], "m"], [">", ["zoom"], 6.5]],
				["all", ["==", ["get", "size"], "l"], [">", ["zoom"], 4.5]],
			],
			["*", ["case", ["==", ["get", "size"], "s"], 0.6, ["==", ["get", "size"], "m"], 0.7, 0.8], ["+", 0, ["var", "size"]]],
			0.5,
		],
		"icon-rotate-with-view": false,
	},
	controller: {
		"stroke-color": ["case", ["any", ["==", ["get", "clicked"], 1], ["==", ["get", "hovered"], 1]], [234, 89, 121, 1], ["var", "stroke"]],
		"stroke-width": 1,
		"stroke-offset": 0,
		"fill-color": ["case", ["any", ["==", ["get", "clicked"], 1], ["==", ["get", "hovered"], 1]], [234, 89, 121, 0.3], ["var", "fill"]],
	},
};
