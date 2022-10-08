// samsa-config.js

// fontList
// - this is the list of fonts that appears in the Fonts panel
// - url: required
// - name: optional
// - filename: optional
// - preload: optional
//
// - url can be normal URL (absolute or relative) or data URL, i.e. base 64 encoded
// - data URLs need a filename parameter
// - on optional preload parameter forces that font to be loaded when the app starts (only one font can be preloaded)

CONFIG.fontList = [

	{
		url: "fonts/Amstelvar-Roman-VF.ttf",
	},
	{
		url: "fonts/Amstelvar-Italic-VF.ttf",
	},
	{
		url: "fonts/Amstelvar-Roman-parametric-VF.ttf",
	},
	{
		url: "fonts/Bitter-VariableFont_wght.ttf",
	},
	{
		url: "fonts/Bitter-Italic-VariableFont_wght.ttf"
	},
	{
		url: "fonts/DecovarAlpha-VF.ttf",
	},
	{
		url: "fonts/Gingham.ttf",
	},
	{
		url: "fonts/IBMPlexSansVar-Roman.ttf",
	},
	{
		url: "fonts/IBMPlexSansVar-Italic.ttf",
	},
	{
		url: "fonts/Inconsolata-VariableFont_wdth,wght.ttf",
	},
	{
		url: "fonts/LibreFranklin-VariableFont_wght.ttf",
	},
	{
		url: "fonts/LibreFranklin-Italic-VariableFont_wght.ttf",
	},
	{
		url: "fonts/Literata-VariableFont_opsz,wght.ttf"
	},
	{
		url: "fonts/Literata-Italic-VariableFont_opsz,wght.ttf"
	},
	{
		url: "fonts/MutatorSans.ttf",
	},
	{
		url: "fonts/Recursive-VariableFont_CASL,CRSV,MONO,slnt,wght.ttf",
	},
	{
		url: "fonts/SourceSansVariable-Roman.ttf",
	},
	{
		url: "fonts/SourceSansVariable-Italic.ttf",
	},
	{
		url: "fonts/SourceSerif4Variable-Roman.ttf",
	},
	{
		url: "fonts/SourceSerif4Variable-Italic.ttf",
	},
	{
		url: "https://www.axis-praxis.org/samsa/fonts/MuybridgeGX.ttf",
	},
	{
		url: "fonts/Zycon.ttf"
	},

	// this shows how to embed a font as base64, and preload it
	// {
	// 	name: "Mutator Sans",
	// 	url: "data:font/truetype;base64,AAEAAAARA ... 0000100000000",
	// 	filename: "MutatorSans.ttf",
	// 	preload: true,
	// },
];

// assigns UI panels to the left and right "panels-container" respectively
CONFIG.panels = [
	{id: "panel-info", side: "left"},
	{id: "panel-ui", side: "left"},
	{id: "panel-webfont", side: "left"},
	{id: "panel-axes", side: "left"},
	{id: "panel-stat", side: "left", open: false},
	{id: "panel-instances", side: "left"},
	{id: "panel-tvts", side: "left"},
	{id: "panel-designspace", side: "left"},
	{id: "panel-font-list", side: "left"},
	{id: "panel-media", side: "left"},
	{id: "panel-mvar", side: "left"},
	{id: "panel-about", side: "left"},
	{id: "panel-glyphs", side: "right"},
];
