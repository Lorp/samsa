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

	// {
	// 	name: "Mutator Sans",
	// 	url: "data:font/truetype;base64,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",
	// 	filename: "MutatorSans.ttf",
	// 	preload: true,
	// },

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
		url: "fonts/Zycon.ttf"
	},
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
	{id: "panel-about", side: "left"},
	{id: "panel-glyphs", side: "right"},
];
