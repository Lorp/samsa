"use strict";
// samsa-core.js
// Version 2.0 alpha

/*

Find this on GitHub https://github.com/lorp/samsa-core
Find this on NPM https://www.npmjs.com/package/samsa-core
To update the NPM version, increment the version property in /package.json (not /src/package.json), then run `npm publish` from the root directory

A note on variable naming. You may see a few of these:

const _runCount = buf.u16; // get the data from the buffer
const runCount = _runCount & 0x7FFF; // refine the data into a useable variable

The underscore prefix is intended to mean the initial version of the variable (_runCount) that needs to be refined into a useable variable (runCount). This way we can 
accurately reflect fields described in the spec, derive some data from flags, then use them under similar name for the purpose decribed by the name.

2023-07-27: All occurrences of "??" nullish coalescing operator have been replaced (it’s not supported by something in the Figma plugin build process). The ?? lines remain as comments above their replacements.
2024-10-10: Allowed "??" and "??=" nullish operators.

*/

// expose these to the client
const SAMSAGLOBAL = {
	version: "2.0.0",
	browser: typeof window !== "undefined",
	endianness: endianness(),
	littleendian: endianness("LE"),
	bigendian: endianness("BE"),
	fingerprints: { WOFF2: 0x774f4632, TTF: 0x00010000, OTF: 0x4f54544f, true: 0x74727565 }, // 0x4f54544f/"OTTO" is for CFF fonts, 0x74727565/"true" is for Skia.ttf
	stdGlyphNames: [".notdef",".null","nonmarkingreturn","space","exclam","quotedbl","numbersign","dollar","percent","ampersand","quotesingle","parenleft","parenright","asterisk","plus","comma","hyphen","period","slash","zero","one","two","three","four","five","six","seven","eight","nine","colon","semicolon","less","equal","greater","question","at","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","bracketleft","backslash","bracketright","asciicircum","underscore","grave","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","braceleft","bar","braceright","asciitilde","Adieresis","Aring","Ccedilla","Eacute","Ntilde","Odieresis","Udieresis","aacute","agrave","acircumflex","adieresis","atilde","aring","ccedilla","eacute","egrave","ecircumflex","edieresis","iacute","igrave","icircumflex","idieresis","ntilde","oacute","ograve","ocircumflex","odieresis","otilde","uacute","ugrave","ucircumflex","udieresis","dagger","degree","cent","sterling","section","bullet","paragraph","germandbls","registered","copyright","trademark","acute","dieresis","notequal","AE","Oslash","infinity","plusminus","lessequal","greaterequal","yen","mu","partialdiff","summation","product","pi","integral","ordfeminine","ordmasculine","Omega","ae","oslash","questiondown","exclamdown","logicalnot","radical","florin","approxequal","Delta","guillemotleft","guillemotright","ellipsis","nonbreakingspace","Agrave","Atilde","Otilde","OE","oe","endash","emdash","quotedblleft","quotedblright","quoteleft","quoteright","divide","lozenge","ydieresis","Ydieresis","fraction","currency","guilsinglleft","guilsinglright","fi","fl","daggerdbl","periodcentered","quotesinglbase","quotedblbase","perthousand","Acircumflex","Ecircumflex","Aacute","Edieresis","Egrave","Iacute","Icircumflex","Idieresis","Igrave","Oacute","Ocircumflex","apple","Ograve","Uacute","Ucircumflex","Ugrave","dotlessi","circumflex","tilde","macron","breve","dotaccent","ring","cedilla","hungarumlaut","ogonek","caron","Lslash","lslash","Scaron","scaron","Zcaron","zcaron","brokenbar","Eth","eth","Yacute","yacute","Thorn","thorn","minus","multiply","onesuperior","twosuperior","threesuperior","onehalf","onequarter","threequarters","franc","Gbreve","gbreve","Idotaccent","Scedilla","scedilla","Cacute","cacute","Ccaron","ccaron","dcroat"], // 258 standard glyph names
	mvarLookup: {
		"hasc": ["OS/2","sTypoAscender"],
		"hdsc": ["OS/2","sTypoDescender"],
		"hlgp": ["OS/2","sTypoLineGap"],
		"hcla": ["OS/2","usWinAscent"],
		"hcld": ["OS/2","usWinDescent"],
		"xhgt": ["OS/2","sxHeight"],
		"cpht": ["OS/2","sCapHeight"],
		"sbxs": ["OS/2","ySubscriptXSize"],
		"sbys": ["OS/2","ySubscriptYSize"],
		"sbxo": ["OS/2","ySubscriptXOffset"],
		"sbyo": ["OS/2","ySubscriptYOffset"],
		"spxs": ["OS/2","ySuperscriptXSize"],
		"spys": ["OS/2","ySuperscriptYSize"],
		"spxo": ["OS/2","ySuperscriptXOffset"],
		"spyo": ["OS/2","ySuperscriptYOffset"],
		"strs": ["OS/2","yStrikeoutSize"],
		"stro": ["OS/2","yStrikeoutPosition"],
		"hcrs": ["hhea","caretSlopeRise"],
		"hcrn": ["hhea","caretSlopeRun"],
		"hcof": ["hhea","caretOffset"],
		"unds": ["post","underlineThickness"],
		"undo": ["post","underlinePosition"],
		"vasc": ["vhea","ascent"],
		"vdsc": ["vhea","descent"],
		"vlgp": ["vhea","lineGap"],
		"vcrs": ["vhea","caretSlopeRise"],
		"vcrn": ["vhea","caretSlopeRun"],
		"vcof": ["vhea","caretOffset"],
		"gsp0":	["gasp","0"],
		"gsp1":	["gasp","1"],
		"gsp2":	["gasp","2"],
		"gsp3":	["gasp","3"],
		"gsp4":	["gasp","4"],
		"gsp5":	["gasp","5"],
		"gsp6":	["gasp","6"],
		"gsp7":	["gasp","7"],
		"gsp8":	["gasp","8"],
		"gsp9":	["gasp","9"],
	},
};

// format codes
const U4 = 0;
const U8 = 1;
const I8 = 2;
const U16 = 3;
const I16 = 4;
const U24 = 5;
const I24 = 6;
const U32 = 7;
const I32 = 8;
const U64 = 9;
const I64 = 10;
const F1616 = 11;
const F214 = 12;
const STR = 13;
const TAG = 14;
const CHAR = 15;

const FORMATS = {

	head: {
		version: [U16,2],
		fontRevision: [U16,2],
		checkSumAdjustment: U32,
		magicNumber: U32,
		flags: U16,
		unitsPerEm: U16,
		created: I64,
		modified: I64,
		xMin: I16,
		yMin: I16,
		xMax: I16,
		yMax: I16,
		macStyle: U16,
		lowestRecPPEM: U16,
		fontDirectionHint: I16,
		indexToLocFormat: I16,
		glyphDataFormat: I16,
	},

	hhea: {
		version: [U16,2],
		ascender: I16,
		descender: I16,
		lineGap: I16,
		advanceWidthMax: U16,
		minLeftSideBearing: I16,
		minRightSideBearing: I16,
		xMaxExtent: I16,
		caretSlopeRise: I16,
		caretSlopeRun: I16,
		caretOffset: I16,
		reserved: [I16,4],
		metricDataFormat: I16,
		numberOfHMetrics: U16,
	},

	vhea: {
		version: [U32],
		_IF_10: [["version", "==", 0x00010000], {
			ascent: I16,
			descent: I16,
			lineGap: I16,
		}],
		_IF_11: [["version", "==", 0x00011000], {
			vertTypoAscender: I16,
			vertTypoDescender: I16,
			vertTypoLineGap: I16,
		}],
		advanceHeightMax: I16,
		minTop: I16,
		minBottom: I16,
		yMaxExtent: I16,
		caretSlopeRise: I16,
		caretSlopeRun: I16,
		caretOffset: I16,
		reserved: [I16,4],
		metricDataFormat: I16,
		numOfLongVerMetrics: U16,
	},
	
	maxp: {
		version: F1616,
		numGlyphs: U16,
		_IF_: [["version", ">=", 1.0], {
			maxPoints: U16,
			maxContours: U16,
			maxCompositePoints: U16,
			maxCompositeContours: U16,
			maxZones: U16,
			maxTwilightPoints: U16,
			maxStorage: U16,
			maxFunctionDefs: U16,
			maxInstructionDefs: U16,
			maxStackElements: U16,
			maxSizeOfInstructions: U16,
			maxComponentElements: U16,
			maxComponentDepth: U16,
		}],
	},
	
	post: {
		version: F1616,
		italicAngle: F1616,
		underlinePosition: I16,
		underlineThickness: I16,
		isFixedPitch: U32,
		minMemType42: U32,
		maxMemType42: U32,
		minMemType1: U32,
		maxMemType1: U32,
		_IF_: [["version", "==", 2.0], {
			numGlyphs: U16,
			glyphNameIndex: [U16, "numGlyphs"],
		}],
		_IF_2: [["version", "==", 2.5], {
			numGlyphs: U16,
			offset: [I8, "numGlyphs"],
		}],
	},

	name: {
		version: U16,
		count: U16,
		storageOffset: U16,
	},

	cmap: {
		version: U16,
		numTables: U16,
	},
	
	"OS/2": {
		version: U16,
		xAvgCharWidth: U16,
		usWeightClass: U16,
		usWidthClass: U16,
		fsType: U16,
		ySubscriptXSize: U16,
		ySubscriptYSize: U16,
		ySubscriptXOffset: U16,
		ySubscriptYOffset: U16,
		ySuperscriptXSize: U16,
		ySuperscriptYSize: U16,
		ySuperscriptXOffset: U16,
		ySuperscriptYOffset: U16,
		yStrikeoutSize: U16,
		yStrikeoutPosition: U16,
		sFamilyClass: I16,
		panose: [U8,10],
		ulUnicodeRange1: U32,
		ulUnicodeRange2: U32,
		ulUnicodeRange3: U32,
		ulUnicodeRange4: U32,
		achVendID: TAG,
		fsSelection: U16,
		usFirstCharIndex: U16,
		usLastCharIndex: U16,
		sTypoAscender: I16,
		sTypoDescender: I16,
		sTypoLineGap: I16,
		usWinAscent: U16,
		usWinDescent: U16,
		_IF_: [["version", ">=", 1], {
			ulCodePageRange1: U32,
			ulCodePageRange2: U32,
		}],
		_IF_2: [["version", ">=", 2], {
			sxHeight: I16,
			sCapHeight: I16,
			usDefaultChar: U16,
			usBreakChar: U16,
			usMaxContext: U16,
		}],
		_IF_3: [["version", ">=", 5], {
			usLowerOpticalPointSize: U16,
			usUpperOpticalPointSize: U16,
		}],
	},

	fvar: {
		version: [U16,2],
		axesArrayOffset: U16,
		reserved: U16,
		axisCount: U16,
		axisSize: U16,
		instanceCount: U16,
		instanceSize: U16
	},

	gvar: {
		version: [U16,2],
		axisCount: U16,
		sharedTupleCount: U16,
		sharedTuplesOffset: U32,
		glyphCount: U16,
		flags: U16,
		glyphVariationDataArrayOffset: U32,
	},

	avar: {
		version: [U16,2],
		reserved: U16,
		axisCount: U16,
	},

	COLR: {
		version: U16,
		numBaseGlyphRecords: U16,
		baseGlyphRecordsOffset: U32,
		layerRecordsOffset: U32,
		numLayerRecords: U16,
		_IF_: [["version", "==", 1], {
			baseGlyphListOffset: U32,
			layerListOffset: U32,
			clipListOffset: U32,
			varIndexMapOffset: U32,
			itemVariationStoreOffset: U32,
		}],
	},

	CPAL: {
		version: U16,
		numPaletteEntries: U16,
		numPalettes: U16,
		numColorRecords: U16,
		colorRecordsArrayOffset: U32,
		colorRecordIndices: [U16,"numPalettes"],
		_IF_: [["version", "==", 1], {
			paletteTypesArrayOffset: U32,
			paletteLabelsArrayOffset: U32,
			paletteEntryLabelsArrayOffset: U32,
		}],
		// colorRecords[U32, "numColorRecords", "@colorRecordsArrayOffset"], // maybe this format
	},

	STAT: {
		version: [U16,2],
		designAxisSize: U16,
		designAxisCount: U16,
		designAxesOffset: U32,
		axisValueCount: U16,
		offsetToAxisValueOffsets: U32,
	},

	MVAR: {
		version: [U16,2],
		reserved: U16,
		valueRecordSize: U16,
		valueRecordCount: U16,
		itemVariationStoreOffset: U16,
	},

	HVAR: {
		version: [U16,2],
		itemVariationStoreOffset: U32,
		advanceWidthMappingOffset: U32,
		lsbMappingOffset: U32,
		rsbMappingOffset: U32,
	},

	VVAR: {
		version: [U16,2],
		itemVariationStoreOffset: U32,
		advanceHeightMappingOffset: U32,
		tsbMappingOffset: U32,
		bsbMappingOffset: U32,
		vOrgMappingOffset: U32,
	},

	TableDirectory: {
		sfntVersion: U32,
		numTables: U16,
		searchRange: U16,
		entrySelector: U16,
		rangeShift: U16,
	},

	TableRecord: {
		tag: TAG,
		checkSum: U32,
		offset: U32,
		length: U32,
	},

	NameRecord: {
		platformID: U16,
		encodingID: U16,
		languageID: U16,
		nameID: U16,
		length: U16,
		stringOffset: U16,
	},
	
	EncodingRecord: {
		platformID: U16,
		encodingID: U16,
		subtableOffset: U32,
	},

	CharacterEncoding: {
		format: U16,
		_IF_: [["format", "<=", 6], {
			length: U16,
			language: U16,
		}],
		_IF_1: [["format", "==", 8], {
			reserved: U16,
			length: U32,
			language: U32,
		}],
		_IF_2: [["format", "==", 10], {
			reserved: U16,
			length: U32,
			language: U32,
		}],
		_IF_3: [["format", "==", 12], {
			reserved: U16,
			length: U32,
			language: U32,
		}],
		_IF_4: [["format", "==", 14], {
			length: U32,
		}],
	},
		
	GlyphHeader: {
		numberOfContours: I16,
		xMin: I16,
		yMin: I16,
		xMax: I16,
		yMax: I16,
	},

	VariationAxisRecord: {
		axisTag: TAG,
		minValue: F1616,
		defaultValue: F1616,
		maxValue: F1616,
		flags: U16,
		axisNameID: U16,
	},
	
	InstanceRecord: {
		subfamilyNameID: U16,
		flags: U16,
		coordinates: [F1616, "_ARG0_"],
		_IF_: [["_ARG1_", "==", true], {
			postScriptNameID: U16,
		}],
	},

	AxisRecord: {
		axisTag: TAG,
		axisNameID: U16,
		axisOrdering: U16,
	},

	AxisValueFormat: {
		format: U16,
		_IF_: [["format", "<", 4], {
			axisIndex: U16,
		}],
		_IF_4: [["format", "==", 4], {
			axisCount: U16,
		}],
		flags: U16,
		valueNameID: U16,
		_IF_1: [["format", "==", 1], {
			value: F1616,
		}],
		_IF_2: [["format", "==", 2], {
			value: F1616,
			rangeMinValue: F1616,
			rangeMaxValue: F1616,
		}],
		_IF_3: [["format", "==", 3], {
			value: F1616,
			linkedValue: F1616,
		}],
	},

	ItemVariationStoreHeader: {
		format: U16,
		regionListOffset: U32,
		itemVariationDataCount: U16,
		itemVariationDataOffsets: [U32, "itemVariationDataCount"],
	},

	ItemVariationData: {
		itemCount: U16,
		wordDeltaCount: U16,
		regionIndexCount: U16,
		regionIndexes: [U16, "regionIndexCount"],
	},

	WOFF2_header: {
		signature: TAG,
		flavor: U32,
		length: U32,
		numTables: U16,
		reserved: U16,
		totalSfntSize: U32,
		totalCompressedSize: U32,
		majorVersion: U16,
		minorVersion: U16,
		metaOffset: U32,
		metaLength: U32,
		metaOrigLength: U32,
		privOffset: U32,
		privLength: U32,
	},

	WOFF2_Transformed_glyf: {
		reserved: U16,
		optionFlags: U16,
		numGlyphs: U16,
		indexFormat: U16,
		nContourStreamSize: U32,
		nPointsStreamSize: U32,
		flagStreamSize: U32,
		glyphStreamSize: U32,
		compositeStreamSize: U32,
		bboxStreamSize: U32,
		instructionStreamSize: U32,
	},
};

// gvar
const GVAR_SHARED_POINT_NUMBERS = 0x8000;
const GVAR_EMBEDDED_PEAK_TUPLE = 0x8000;
const GVAR_INTERMEDIATE_REGION = 0x4000;
const GVAR_PRIVATE_POINT_NUMBERS = 0x2000;
const GVAR_DELTAS_ARE_ZERO = 0x80;
const GVAR_DELTAS_ARE_WORDS = 0x40;
const GVAR_DELTA_RUN_COUNT_MASK = 0x3f;
const GVAR_POINTS_ARE_WORDS = 0x80;
const GVAR_POINT_RUN_COUNT_MASK = 0x7f;

// COLRv1 paint types (multiple formats have the same type)
const PAINT_LAYERS = 1;
const PAINT_SHAPE = 2;
const PAINT_TRANSFORM = 3;
const PAINT_COMPOSE = 4;

// there are 4 types of paint tables: PAINT_LAYERS, PAINT_TRANSFORM, PAINT_SHAPE, PAINT_COMPOSE
// all DAG leaves are PAINT_COMPOSE
const PAINT_TYPES = [
	0,
	PAINT_LAYERS,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_COMPOSE,
	PAINT_SHAPE,
	PAINT_LAYERS,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_TRANSFORM,
	PAINT_COMPOSE,
];

const PAINT_VAR_OPERANDS = [0,0,1,1,6,6,6,6,4,4,0,0,6,6,2,2,2,2,4,4,1,1,3,3,1,1,3,3,2,2,4,4,0]; // the number of variable operands that each paint has, indexed by paint.format (prepended with a record for invalid paint.format 0) thus 33 items from 0 to 32

// constants for SVG conversion of gradient extend modes and PaintComposite modes
const SVG_GRADIENT_EXTEND_MODES = ["pad", "repeat", "reflect"];
const SVG_PAINTCOMPOSITE_MODES = [
	["-", "clear"], // COMPOSITE_CLEAR
	["-", "src"], // COMPOSITE_SRC
	["-", "dest"], // COMPOSITE_DEST
	["F", "over"], // COMPOSITE_SRC_OVER
	["F", "over"], // COMPOSITE_DEST_OVER
	["F", "in"], // COMPOSITE_SRC_IN
	["F", "in"], // COMPOSITE_DEST_IN
	["F", "out"], // COMPOSITE_SRC_OUT
	["F", "out"], // COMPOSITE_DEST_OUT
	["F", "atop"], // COMPOSITE_SRC_ATOP
	["F", "atop"], // COMPOSITE_DEST_ATOP
	["F", "xor"], // COMPOSITE_XOR
	["F", "lighter"], // COMPOSITE_PLUS (sic)
	["M", "screen"], // COMPOSITE_SCREEN
	["M", "overlay"], // COMPOSITE_OVERLAY
	["M", "darken"], // COMPOSITE_DARKEN
	["M", "lighten"], // COMPOSITE_LIGHTEN
	["M", "color-dodge"], // COMPOSITE_COLOR_DODGE
	["M", "color-burn"], // COMPOSITE_COLOR_BURN
	["M", "hard-light"], // COMPOSITE_HARD_LIGHT
	["M", "soft-light"], // COMPOSITE_SOFT_LIGHT
	["M", "difference"], // COMPOSITE_DIFFERENCE
	["M", "exclusion"], // COMPOSITE_EXCLUSION
	["M", "multiply"], // COMPOSITE_MULTIPLY
	["M", "hue"], // COMPOSITE_HSL_HUE
	["M", "saturation"], // COMPOSITE_HSL_SATURATION
	["M", "color"], // COMPOSITE_HSL_COLOR
	["M", "luminosity"], // COMPOSITE_HSL_LUMINOSITY
  ];


// table decoders are called *after* the first part has been decoded using the FORMATS[<tableTag>] definition
// - font is the SamsaFont object
// - buf is a SamsaBuffer object already set up to cover the table data only, initialized with the table's offset being p=0 and length = its length
// - return (none), but font.<tableTag> now contains more (possibly all) of the decoded table data
SAMSAGLOBAL.TABLE_DECODERS = {

	"avar": (font, buf) => {
		// avar1 and avar2
		// https://learn.microsoft.com/en-us/typography/opentype/spec/avar
		// https://github.com/harfbuzz/boring-expansion-spec/blob/main/avar2.md
		font.avar.axisSegmentMaps = [];
		console.assert(font.avar.axisCount === font.fvar.axisCount || font.avar.axisCount === 0, `fvar.axisCount (${font.fvar.axisCount}) and avar.axisCount (${font.avar.axisCount}) must match, or else avar.axisCount must be 0`);
		for (let a=0; a<font.avar.axisCount; a++) {
			const positionMapCount = buf.u16;
			font.avar.axisSegmentMaps[a] = [];
			for (let p=0; p<positionMapCount; p++) {
				font.avar.axisSegmentMaps[a].push([ buf.f214, buf.f214 ]);
			}
		}

		// avar2 only
		if (font.avar.version[0] == 2) {
			font.avar.axisIndexMapOffset = buf.u32;
			font.avar.itemVariationStoreOffset = buf.u32; // we use this key, rather that in the spec, so that it will get picked up by the ItemVariationStore decoder along with those of MVAR, HVAR, etc.
			if (font.avar.axisIndexMapOffset) {
				buf.seek(font.avar.axisIndexMapOffset);
				font.avar.axisIndexMap = buf.decodeIndexMap();
			}
			// else we must use implicit mappings later
		}
	},

	"cmap": (font, buf) => {
		// https://learn.microsoft.com/en-us/typography/opentype/spec/cmap
		// - this function works in step with SamsaFont.prototype.glyphIdFromUnicode()
		const cmap = font.cmap;
		cmap.lookup = []; // the main cmap lookup table
		cmap.encodings = {};

		buf.seek(4); // get to the start of the encodingRecords array (we already read version and numTables in the template)

		// step thru the encodingRecords
		// - we only process the encodings we care about
		const uniqueEncodings = {}; // encodings indexed by subtableOffset (if an encoding is referred to twice, we only parse it once)
		for (let t=0; t < cmap.numTables; t++) {
			const encodingRecord = buf.decode(FORMATS.EncodingRecord);
			const platEnc = (encodingRecord.platformID << 16) + encodingRecord.encodingID; // store each platform/encoding pairs as one uint32 so we can easily match them
			cmap.encodings[platEnc] = encodingRecord; // object with "uint32" keys (the key being a platform/encoding pair)
			const bufE = new SamsaBuffer(buf.buffer, buf.byteOffset + encodingRecord.subtableOffset);
			const encoding = bufE.decode(FORMATS.CharacterEncoding);
			if (uniqueEncodings[encodingRecord.subtableOffset] === undefined) {
				// uncached
				switch (encoding.format) {

					case 0: { // "Byte encoding table"
						encoding.mapping = [];
						for (let c=0; c<256; c++) {
							encoding.mapping[c] = bufE.u8;
						}
						break;
					}
	
					case 4: { // "Segment mapping to delta values"
						const segCount = bufE.u16 / 2;
						bufE.seekr(6); // skip binary search params
						encoding.segments = [];
						for (let s=0; s<segCount; s++)
							encoding.segments[s] = {end: bufE.u16};
						bufE.seekr(2); // skip reservedPad
						for (let s=0; s<segCount; s++)
							encoding.segments[s].start = bufE.u16;
						for (let s=0; s<segCount; s++)
							encoding.segments[s].idDelta = bufE.u16;
						encoding.idRangeOffsetOffset = bufE.tell() + encodingRecord.subtableOffset; // recording this absolutely makes things easier later
						for (let s=0; s<segCount; s++)
							encoding.segments[s].idRangeOffset = bufE.u16;
						break;
					}
	
					case 12: { // "Segmented coverage"
						const numGroups = bufE.u32;
						encoding.groups = [];
						for (let grp=0; grp<numGroups; grp++) {
							encoding.groups.push({ start: bufE.u32, end: bufE.u32, glyphId: bufE.u32 });
						}
						break;
					}
	
					case 14: { // "Unicode Variation Sequences"
						if (platEnc === 0x00000005) { // only valid under platEnc 0,5

							//console.log("UVS!")
							const numVarSelectorRecords = bufE.u32;
							encoding.varSelectors = {};

							// we index varSelectors by their varSelector
							for (let v=0; v<numVarSelectorRecords; v++) {
								const varSelector = bufE.u24;
								const defaultUVSOffset = bufE.u32;
								const nonDefaultUVSOffset = bufE.u32;
								const defaultUVS = [];
								const nonDefaultUVS = [];
								const tell = bufE.tell();

								if (defaultUVSOffset) {
									bufE.seek(defaultUVSOffset);
									const count = bufE.u32;
									for (let r=0; r<count; r++) {
										defaultUVS.push({ startUnicodeValue: bufE.u24, additionalCount: bufE.u8 });
									}
								}
								
								if (nonDefaultUVSOffset) {
									bufE.seek(nonDefaultUVSOffset);
									const count = bufE.u32;
									for (let r=0; r<count; r++) {
										nonDefaultUVS.push({ unicodeValue: bufE.u24, glyphId: bufE.u16 });
									}
								}

								encoding.varSelectors[varSelector] = {
									defaultUVS: defaultUVS,
									nonDefaultUVS: nonDefaultUVS,
								};

								bufE.seek(tell);

								// so now, we have e.g. varSelector == 0xfe0f, encoding.varSelectors[0xfe0f].defaultUVS == an array of { startUnicodeValue, additionalCount }
							}
						}
						break;
					}
				}

				uniqueEncodings[encodingRecord.subtableOffset] = encoding;
			}
			cmap.encodings[platEnc] = uniqueEncodings[encodingRecord.subtableOffset];
		}
	},

	"COLR": (font, buf) => {
		// https://learn.microsoft.com/en-us/typography/opentype/spec/colr
		const colr = font.COLR;
		if (colr.version <= 1) {

			// COLRv0 offsets (it would be ok to look these up live with binary search)
			colr.baseGlyphRecords = [];
			if (colr.numBaseGlyphRecords) {
				buf.seek(colr.baseGlyphRecordsOffset);
				for (let i=0; i<colr.numBaseGlyphRecords; i++)  {
					const glyphId = buf.u16;
					colr.baseGlyphRecords[glyphId] = [buf.u16, buf.u16]; // firstLayerIndex, numLayers
				}
			}

			if (colr.version == 1) {

				// COLRv1 offsets (it would be ok to look these up live with binary search)
				if (colr.baseGlyphListOffset) {
					buf.seek(colr.baseGlyphListOffset);
					colr.numBaseGlyphPaintRecords = buf.u32;
					colr.baseGlyphPaintRecords = [];
					for (let i=0; i<colr.numBaseGlyphPaintRecords; i++)  {
						const glyphId = buf.u16;
						colr.baseGlyphPaintRecords[glyphId] = colr.baseGlyphListOffset + buf.u32;
					}
				}

				// COLRv1 layerList
				// - from the spec: "The LayerList is only used in conjunction with the BaseGlyphList and, specifically, with PaintColrLayers tables; it is not required if no color glyphs use a PaintColrLayers table. If not used, set layerListOffset to NULL"
				colr.layerList = [];
				if (colr.layerListOffset) {
					buf.seek(colr.layerListOffset);
					colr.numLayerListEntries = buf.u32;
					for (let lyr=0; lyr < colr.numLayerListEntries; lyr++)
						colr.layerList[lyr] = colr.layerListOffset + buf.u32;
				}

				// COLRv1 varIndexMap
				if (colr.varIndexMapOffset) {
					buf.seek(colr.varIndexMapOffset);
					colr.varIndexMap = buf.decodeIndexMap();
				}
			}
		}
	},

	"CPAL": (font, buf) => {
		// load CPAL table fully
		// https://learn.microsoft.com/en-us/typography/opentype/spec/cpal
		const cpal = font.CPAL;
		cpal.colors = [];
		cpal.palettes = [];
		cpal.paletteEntryLabels = [];

		// decode colorRecords
		buf.seek(cpal.colorRecordsArrayOffset);
		for (let c=0; c<cpal.numColorRecords; c++) {
			cpal.colors[c] = buf.u32; // [blue, green, red, alpha as u32]
		}

		// decode paletteEntryLabels
		if (cpal.paletteEntryLabelsArrayOffset) {
			buf.seek(cpal.paletteEntryLabelsArrayOffset);
			for (let pel=0; pel<cpal.numPaletteEntries; pel++) {
				const nameId = buf.u16;
				if (nameId !== 0xffff)
					cpal.paletteEntryLabels[pel] = font.names[nameId];
			}
		}

		// decode palettes: name, type, colors
		for (let pal=0; pal<cpal.numPalettes; pal++) {
			const palette = { name: "", type: 0, colors: [] };

			// name
			if (cpal.paletteLabelsArrayOffset) {
				buf.seek(cpal.paletteLabelsArrayOffset + 2 * pal);
				const nameId = buf.u16;
				if (nameId !== 0xffff) {
					palette.name = font.names[nameId];
				}
			}

			// type
			if (cpal.paletteTypesArrayOffset) {
				buf.seek(cpal.paletteTypesArrayOffset + 2 * pal);
				palette.type = buf.u16;
			}

			// colors
			for (let e=0; e<cpal.numPaletteEntries; e++) {
				palette.colors[e] = cpal.colors[cpal.colorRecordIndices[pal] + e];
			}

			cpal.palettes.push(palette);
		}
	},

	"fvar": (font, buf) => {
		// load fvar axes and instances
		// https://learn.microsoft.com/en-us/typography/opentype/spec/fvar
		const fvar = font.fvar;
		fvar.axes = [];
		buf.seek(fvar.axesArrayOffset);
		for (let a=0; a<fvar.axisCount; a++) {
			const axis = buf.decode(FORMATS.VariationAxisRecord);
			axis.axisId = a;
			axis.name = font.names[axis.axisNameID];
			fvar.axes.push(axis);
		}
		fvar.instances = [];
		const includePostScriptNameID = fvar.instanceSize == fvar.axisCount * 4 + 6; // instanceSize determins whether postScriptNameID is included
		for (let i=0; i<fvar.instanceCount; i++) {
			const instance = buf.decode(FORMATS.InstanceRecord, fvar.axisCount, includePostScriptNameID);
			instance.name = font.names[instance.subfamilyNameID];
			fvar.instances.push(instance);
		}
	},

	"gvar": (font, buf) => {
		// decode gvar’s sharedTuples array, so we can precalculate scalars (leave the rest for JIT)
		// https://learn.microsoft.com/en-us/typography/opentype/spec/gvar
		const gvar = font.gvar;
		buf.seek(gvar.sharedTuplesOffset);
		gvar.sharedTuples = [];
		for (let t=0; t < gvar.sharedTupleCount; t++) {
			const tuple = [];
			for (let a=0; a<gvar.axisCount; a++) {
				tuple.push(buf.f214); // these are the peaks, we have to create start and end
			}
			gvar.sharedTuples.push(tuple);
		}

		// Experimental code, intended to precalculate the scalars for the sharedTuples
		// - the issue is that, occasionally (as in Bitter), some sharedTuples are intermediate so need their start and end explicitly read from the TVT for each glyph
		// - the intermediate sharedTuples cannot be precalculated
		// - the logic needs to be that IF the peak tuple is shared AND the tuple is non-intermediate, THEN we can precalculate the scalar
		// - that is equivalent to checking that flag & 0xC000 == 0
		// 
		// this.gvar.sharedRegions = [];
		// buf.seek(this.tables["gvar"].offset + this.gvar.sharedTuplesOffset);
		// for (let t=0; t < this.gvar.sharedTupleCount; t++) {
		// 	const region = [];
		// 	for (let a=0; a<this.gvar.axisCount; a++) {
		// 		const peak = buf.f214; // only the peak is stored, we create start and end
		// 		if (peak < 0) {
		// 			start = -1;
		// 			end = 0;
		// 		}
		// 		else if (peak > 0) {
		// 			start = 0;
		// 			end = 1;
		// 		}
		// 		region.push([start, peak, end]);
		// 	}
		// 	this.gvar.sharedRegions.push(region);
		// }

		// get tupleOffsets array (TODO: we could get these offsets JIT)
		buf.seek(20);
		gvar.tupleOffsets = [];
		for (let g=0; g <= font.maxp.numGlyphs; g++) { // <=
			gvar.tupleOffsets[g] = gvar.flags & 0x01 ? buf.u32 : buf.u16 * 2;
		}
	},

	"hmtx": (font, buf) => {
		// decode horizontal metrics
		// https://learn.microsoft.com/en-us/typography/opentype/spec/hmtx
		const numberOfHMetrics = font.hhea.numberOfHMetrics;
		const hmtx = font.hmtx = [];
		let g=0;
		while (g<numberOfHMetrics) {
			hmtx[g++] = buf.u16;
			buf.seekr(2); // skip over lsb, we only record advance width
		}
		while (g<font.maxp.numGlyphs) {
			hmtx[g++] = hmtx[numberOfHMetrics-1];
		}
	},

	"HVAR": (font, buf) => {
		// https://learn.microsoft.com/en-us/typography/opentype/spec/hvar
		buf.seek(font.HVAR.advanceWidthMappingOffset);
		font.HVAR.indexMap = buf.decodeIndexMap();
	},

	"MVAR": (font, buf) => {
		// decode MVAR value records
		// https://learn.microsoft.com/en-us/typography/opentype/spec/mvar
		font.MVAR.valueRecords = {};
		for (let v=0; v<font.MVAR.valueRecordCount; v++) {
			buf.seek(12 + v * font.MVAR.valueRecordSize); // we are dutifully using valueRecordSize to calculate offset, but it should always be 8 bytes
			font.MVAR.valueRecords[buf.tag] = [buf.u16, buf.u16]; // deltaSetOuterIndex, deltaSetInnerIndex
		}
	},

	"name": (font, buf) => {
		// decode name table strings
		// https://learn.microsoft.com/en-us/typography/opentype/spec/name
		const name = font.name; // font.name is the name table info directly
		font.names = []; // font.names is the names ready to use as UTF8 strings, indexed by nameID in the best platformID/encondingID/languageID match
		name.nameRecords = [];
		for (let r=0; r<name.count; r++) {
			name.nameRecords.push(buf.decode(FORMATS.NameRecord));
		}
		name.nameRecords.forEach(record => {
			buf.seek(name.storageOffset + record.stringOffset);
			record.string = buf.decodeNameString(record.length);
			if (record.platformID == 3 && record.encodingID == 1 && record.languageID == 0x0409) {
				font.names[record.nameID] = record.string; // only record 3, 1, 0x0409 for easy use
			}
		});
	},

	"post": (font, buf) => {
		const post = font.post;
		if (post.version === 2.0) {
			// this avoids duplicating string data: we will use a function to retrieve the string from the buffer
			post.pascalStringIndices = [];
			buf.seek(32 + 2 + post.numGlyphs * 2);
			while (buf.tell() < buf.byteLength) {
				post.pascalStringIndices.push(buf.tell());
				if (buf.tell() < buf.byteLength)
					buf.seekr(buf.u8);
			}
		}
	},

	"vmtx": (font, buf) => {
		// decode vertical metrics
		// https://learn.microsoft.com/en-us/typography/opentype/spec/vmtx
		const numOfLongVerMetrics = font.vhea.numOfLongVerMetrics;
		const vmtx = font.vmtx = [];
		let g=0;
		while (g<numOfLongVerMetrics) {
			vmtx[g++] = buf.u16;
			buf.seekr(2); // skip over tsb, we only record advance height
		}
		while (g<font.maxp.numGlyphs) {
			vmtx[g++] = vmtx[numOfLongVerMetrics-1];
		}
	},

	"GSUB": (font, buf) => {
		// decode GSUB
		// https://learn.microsoft.com/en-us/typography/opentype/spec/gsub
		buf.decodeGSUBGPOSheader(font.GSUB);
	},

	"GPOS": (font, buf) => {
		// decode GPOS
		// https://learn.microsoft.com/en-us/typography/opentype/spec/gpos
		buf.decodeGSUBGPOSheader(font.GPOS);
	},

	"GDEF": (font, buf) => {
		// decode GDEF
		// https://learn.microsoft.com/en-us/typography/opentype/spec/gdef
		const gdef = font.GDEF;
		gdef.version = [buf.u16, buf.u16]; // [0] is majorVersion, [1] is minorVersion
		if (gdef.version[0] == 1) {
			gdef.glyphClassDefOffset = buf.u16;
			gdef.attachListOffset = buf.u16;
			gdef.ligCaretListOffset = buf.u16;
			gdef.markAttachClassDefOffset = buf.u16;
			if (gdef.version[1] >= 2) {
				gdef.markGlyphSetsDefOffset = buf.u16;
			}
			if (gdef.version[1] >= 3) {
				gdef.itemVariationStoreOffset = buf.u32; // we use this key, rather that in the spec, so that it will get picked up by the ItemVariationStore decoder along with those of MVAR, HVAR, etc.
			}
		}
	},

	"STAT": (font, buf) => {
		const stat = font.STAT;
		if (stat.version[0] === 1) {
			if (stat.version[1] > 0) {
				stat.elidedFallbackNameID = buf.u16;
			}
			stat.designAxes = [];
			stat.designAxesSorted = [];
			stat.axisValueTables = [];
	
			// parse designAxes
			for (let a=0; a<stat.designAxisCount; a++) {
				buf.seek(stat.designAxesOffset + a * stat.designAxisSize);
				const designAxis = {
					designAxisID: a, // in case we are enumerating a sorted array
					tag:          buf.tag,
					nameID:       buf.u16,
					axisOrdering: buf.u16,
				};
				stat.designAxes.push(designAxis);
				stat.designAxesSorted[designAxis.axisOrdering] = designAxis;
			}

			// parse axisValueTables
			for (let a=0; a<stat.axisValueCount; a++) {
				buf.seek(stat.offsetToAxisValueOffsets + 2 * a);
				const axisValueOffset = buf.u16;
				buf.seek(stat.offsetToAxisValueOffsets + axisValueOffset);
				const format = buf.u16;
				if (format < 1 || format > 4)
					continue;
				const avt = {
					format: format,
					axisIndices:[buf.u16],
					flags: buf.u16,
					nameID: buf.u16,
					values: [],
				};
				switch (avt.format) {
					case 1: {
						avt.values.push(buf.f1616);
						break;
					}
					case 2: {
						avt.values.push(buf.f1616, buf.f1616, buf.f1616); // value, min, max
						break;
					}
					case 3: {
						avt.values.push(buf.f1616, buf.f1616); // value, linkedValue
						break;
					}
					case 4: {
						let axisCount = avt.axisIndices.pop(); // use the value we pushed earlier, and so empty the array
						while (axisCount--) {
							avt.axisIndices.push(buf.u16);
							avt.values.push(buf.f1616);
						}	
						break;
					}
				}
				stat.axisValueTables.push(avt);
			}	
		}
	},

}

SAMSAGLOBAL.TABLE_ENCODERS = {

	"avar": (font, avar) => {
		// encode avar
		// https://learn.microsoft.com/en-us/typography/opentype/spec/avar

		// avar1 and avar2

		// create avar header
		const bufAvarHeader = new SamsaBuffer(new ArrayBuffer(10000));
		const majorVersion = avar.axisIndexMap && avar.ivsBuffer ? 2 : 1;
		bufAvarHeader.u16_array = [
			majorVersion,
			0, // minorVersion
			0, // reserved
			font.fvar.axisCount]; // axisCount (avar 1) or axisSegmentMapCount (avar 2), note that 0 is rejected by Apple here: use axisCount and 0 for each positionMapCount

		// avar1 per-axis segment mappings
		// - create an empty axisSegmentMaps array if none is supplied
		if (!avar.axisSegmentMaps)
			avar.axisSegmentMaps = new Array(font.fvar.axisCount).fill([]);

		console.assert(avar.axisSegmentMaps.length === font.fvar.axisCount, "avar.axisSegmentMaps.length must match fvar.axisCount");

		// - write the axisSegmentMaps
		avar.axisSegmentMaps.forEach(axisSegmentMap => {
			bufAvarHeader.u16 = axisSegmentMap.length; // write positionMapCount (=0 or >= 3)
			axisSegmentMap.forEach(segment => bufAvarHeader.f214_array = segment); // for each axis, write an array of F214 pairs [fromCoordinate, toCoordinate]
		});

		const avar1Length = bufAvarHeader.tell();
		let avar2Length;
		
		// avar2 only
		if (majorVersion === 2) {
			const axisIndexMapOffsetTell = avar1Length;
			const varStoreOffsetTell = avar1Length + 4;

			// write axisIndexMap
			// - we are using only a single IVD, so the outer index is always zero
			// - we keep it simple and always use 2 bytes (U16) for the inner index, even though axisCount is very rarely > 255
			// - the index is a simple map, as axis index will be equal to inner index
			bufAvarHeader.seek(avar1Length + 8); // skip to where we can start writing data
			const axisIndexMapOffset = bufAvarHeader.tell();
			bufAvarHeader.u8 = avar.axisIndexMap.format;
			bufAvarHeader.u8 = avar.axisIndexMap.entryFormat;
			if (avar.axisIndexMap.format === 0)
				bufAvarHeader.u16 = avar.axisIndexMap.indices.length;
			else if (avar.axisIndexMap.format === 1) {
				bufAvarHeader.u32 = avar.axisIndexMap.indices.length;
			}
			bufAvarHeader.u16_array = avar.axisIndexMap.indices;

			// write varStore
			const varStoreOffset = bufAvarHeader.tell();
			bufAvarHeader.memcpy(avar.ivsBuffer);
			avar2Length = bufAvarHeader.tell();

			// write the offsets to axisIndexMap and varStore
			bufAvarHeader.seek(axisIndexMapOffsetTell);
			bufAvarHeader.u32 = axisIndexMapOffset;
			bufAvarHeader.seek(varStoreOffsetTell);
			bufAvarHeader.u32 = varStoreOffset;

		}

		const avarFinalSize = majorVersion === 1 ? avar1Length : avar2Length;

		// attempt to decode
		// TODO: is this test code? if so, remove it
		// TODO: return avarFinalSize?
		bufAvarHeader.seek(0);
		font.avar = bufAvarHeader.decode(FORMATS["avar"])
		SAMSAGLOBAL.TABLE_DECODERS["avar"](font, bufAvarHeader);
		return new SamsaBuffer(bufAvarHeader.buffer, 0, avarFinalSize);

	},

}

// non-exported functions
function endianness (str) {
	const buf = new ArrayBuffer(2);
	const testArray = new Uint16Array(buf);
	const testDataView = new DataView(buf);
	testArray[0] = 0x1234; // LE or BE
	const result = testDataView.getUint16(0); // BE
	const endianness = result == 0x1234 ? "BE" : "LE";
	return str === undefined ? endianness : str == endianness;
}

function clamp (num, min, max) {
	if (num < min)
		num = min;
	else if (num > max)
		num = max;
	return num;
}

function inRange (num, min, max) {
	return num >= min && num <= max;
}

function validateTuple (tuple, axisCount) {
	if (!Array.isArray(tuple))
		return false;
	if (tuple.length != axisCount)
		return false;
	for (let a=0; a < axisCount; a++) {
		 if (typeof tuple[a] != "number" || !inRange(tuple[a], -1, 1))
			return false;
	}
	return true;
}

function validateTag (tag) {
	return (tag.length === 4 && [...tag].every(ch => inRange(ch.charCodeAt(0), 0x20, 0x7e)) && !tag.match(/^.* [^ ]+.*$/)); // 1. Test length; 2. Test ASCII; 3. Test no non-terminating spaces
}

function compareString (a, b) {
	return a < b ? -1 : a > b ? 1 : 0;
}

// take an object of attributes, and returning a string suitable for insertion into an XML tag (such as <svg> or <path>)
function expandAttrs (attrs) {
	let str = "";
	for (let attr in attrs) {
		if (attrs[attr] !== undefined)
			str += ` ${attr}="${attrs[attr]}"`;
	}
	return str;
}

// for GSUB and GPOS
function coverageIndexForGlyph (coverage, g) {
	let coverageIndex = -1;
	if (coverage.format === 1) {
		coverageIndex = coverage.glyphArray.indexOf(g);
	}
	else if (coverage.format === 2) {
		for (const range of coverage.glyphRanges) {
			if (g >= range.startGlyphID && g <= range.endGlyphID) {
				coverageIndex = range.startCoverageIndex + g - range.startGlyphID;
				break;
			}
		}
	}
	return coverageIndex;
}


/*

const PAINT_HANDLERS = {
	// handlers for text output
	text: (paint) => { console.log(paint); console.log("------------------------"); },


	// handlers for SVG output
	svg: [
		null, // 0 (does not exist)

		// 1: PaintColrLayers
		(paint, rendering) => {
			console.log("PaintColrLayers");
		},
		
		// 2: PaintSolid
		(paint, rendering) => {
			console.log("PaintSolid");
		},
		null, // 3: PaintVarSolid

		// 4: PaintLinearGradient
		(paint, rendering) => {
			console.log("PaintLinearGradient");
		},
		null, // 5: PaintVarLinearGradient

		// 6: PaintRadialGradient
		(paint, rendering) => {
			console.log("PaintRadialGradient");
		},
		null, // 7: PaintVarRadialGradient

		// 8: PaintSweepGradient
		(paint, rendering) => {
			console.log("PaintSweepGradient");
		},
		null, // 9: PaintVarSweepGradient

		// 10: PaintGlyph
		(paint, rendering) => {
			console.log("PaintGlyph");
		},

		// 11: PaintColrGlyph
		(paint, rendering) => {
			console.log("PaintColrGlyph");
		},

		// 12 : PaintTransform
		(paint, rendering) => {
			console.log("PaintSweepGradient");
		},
		null, // 13: PaintVarTransform

		// 14 : PaintTranslate
		(paint, rendering) => {
			console.log("PaintTranslate");
		},
		null, // 15: PaintVarTranslate

		// 16: PaintScale
		(paint, rendering) => {
			console.log("PaintScale");
		},
		null, // 17: PaintVarScale
		null, // 18: PaintScaleAroundCenter
		null, // 19: PaintVarScaleAroundCenter
		null, // 20: PaintScaleUniform
		null, // 21: PaintVarScaleUniform
		null, // 22: PaintScaleUniformAroundCenter
		null, // 23: PaintVarScaleUniformAroundCenter

		// 24: PaintRotate
		(paint, rendering) => {
			console.log("PaintRotate");
		},
		null, // 25: PaintVarRotate
		null, // 26: PaintRotateAroundCenter
		null, // 27: PaintVarRotateAroundCenter

		// 28: PaintSkew
		(paint, rendering) => {
			console.log("PaintSkew");
		},
		null, // 29: PaintVarSkew
		null, // 30: PaintSkewAroundCenter, PaintVarSkewAroundCenter
		null, // 31: PaintSkewAroundCenter, PaintVarSkewAroundCenter

		// 32: PaintComposite
		(paint, rendering) => {
			console.log("PaintComposite");
		},
	],


	// handlers for SVG output
	_svg: [
		null, // 0 (does not exist)

		// 1: PaintColrLayers
		(paint, rendering) => {
			console.log("PaintColrLayers");
		},
		
		// 2: PaintSolid
		(paint, rendering) => {
			console.log("PaintSolid");
		},
		null, // 3: PaintVarSolid

		// 4: PaintLinearGradient
		(paint, rendering) => {
			console.log("PaintLinearGradient");
		},
		null, // 5: PaintVarLinearGradient

		// 6: PaintRadialGradient
		(paint, rendering) => {
			console.log("PaintRadialGradient");
		},
		null, // 7: PaintVarRadialGradient

		// 8: PaintSweepGradient
		(paint, rendering) => {
			console.log("PaintSweepGradient");
		},
		null, // 9: PaintVarSweepGradient

		// 10: PaintGlyph
		(paint, rendering) => {
			console.log("PaintGlyph");
		},

		// 11: PaintColrGlyph
		(paint, rendering) => {
			console.log("PaintColrGlyph");
		},

		// 12 : PaintTransform
		(paint, rendering) => {
			console.log("PaintSweepGradient");
		},
		null, // 13: PaintVarTransform

		// 14 : PaintTranslate
		(paint, rendering) => {
			console.log("PaintTranslate");
		},
		null, // 15: PaintVarTranslate

		// 16: PaintScale
		(paint, rendering) => {
			console.log("PaintScale");
		},
		null, // 17: PaintVarScale
		null, // 18: PaintScaleAroundCenter
		null, // 19: PaintVarScaleAroundCenter
		null, // 20: PaintScaleUniform
		null, // 21: PaintVarScaleUniform
		null, // 22: PaintScaleUniformAroundCenter
		null, // 23: PaintVarScaleUniformAroundCenter

		// 24: PaintRotate
		(paint, rendering) => {
			console.log("PaintRotate");
		},
		null, // 25: PaintVarRotate
		null, // 26: PaintRotateAroundCenter
		null, // 27: PaintVarRotateAroundCenter

		// 28: PaintSkew
		(paint, rendering) => {
			console.log("PaintSkew");
		},
		null, // 29: PaintVarSkew
		null, // 30: PaintSkewAroundCenter, PaintVarSkewAroundCenter
		null, // 31: PaintSkewAroundCenter, PaintVarSkewAroundCenter

		// 32: PaintComposite
		(paint, rendering) => {
			console.log("PaintComposite");
		},
	],
};
Object.keys(PAINT_HANDLERS).forEach(key => {

	let lastNonNullHandler = null;
	for (let h=1; h<PAINT_HANDLERS[key].length; h++) { // skip the first entry, which is always null
		if (PAINT_HANDLERS[key][h]) {
			lastNonNullHandler = PAINT_HANDLERS[key][h];
		}
		else {
			PAINT_HANDLERS[key][h] = lastNonNullHandler;
		}	
	}
});
*/


// SamsaBuffer is a DataView subclass, constructed from an ArrayBuffer in exactly the same way as DataView
// - the extensions are:
//   * it keeps track of a memory pointer, which is incremented on read/write
//   * it keeps track of a phase, used for nibble reads/writes
//   * it has numerous decode/encode methods for converting complex data structures to and from binary
class SamsaBuffer extends DataView {
	
	constructor(buffer, byteOffset, byteLength) {
		super(buffer, byteOffset, byteLength);
		this.p = 0; // the memory pointer
		this.phase = false; // phase for nibbles

		this.getters = [];
		this.getters[U4] = () => this.u4;
		this.getters[U8] = () => this.u8;
		this.getters[I8] = () => this.i8;
		this.getters[U16] = () => this.u16;
		this.getters[I16] = () => this.i16;
		this.getters[U24] = () => this.u24;
		this.getters[I24] = () => this.i24;
		this.getters[U32] = () => this.u32;
		this.getters[I32] = () => this.i32;
		this.getters[U64] = () => this.u64;
		this.getters[I64] = () => this.i64;
		this.getters[F214] = () => this.f214;
		this.getters[F1616] = () => this.f1616;
		this.getters[TAG] = () => this.tag;
		this.getters[STR] = () => this.tag;

		this.setters = [];
		this.setters[U4] = n => this.u4 = n;
		this.setters[U8] = n => this.u8 = n;
		this.setters[I8] = n => this.i8 = n;
		this.setters[U16] = n => this.u16 = n;
		this.setters[I16] = n => this.i16 = n;
		this.setters[U24] = n => this.u24 = n;
		this.setters[I24] = n => this.i24 = n;
		this.setters[U32] = n => this.u32 = n;
		this.setters[I32] = n => this.i32 = n;
		this.setters[U64] = n => this.u64 = n;
		this.setters[I64] = n => this.i64 = n;
		this.setters[F214] = n => this.f214 = n;
		this.setters[F1616] = n => this.f1616 = n;
		this.setters[TAG] = n => this.tag = n;
		this.setters[STR] = n => this.tag = n;

		return this;
	}

	// get current position
	tell() {
		return this.p;
	}

	// seek to absolute position
	seek(p) {
		this.p = p;
	}

	// seek to relative position
	seekr(p) {
		this.p += p;
	}

	memcpy(srcSamsaBuffer=this, dstOffset=this.p, srcOffset=0, len=srcSamsaBuffer.byteLength - srcOffset, padding=0, advanceDest=true) {
		const dstArray = new Uint8Array(this.buffer, this.byteOffset + dstOffset, len);
		const srcArray = new Uint8Array(srcSamsaBuffer.buffer, srcSamsaBuffer.byteOffset + srcOffset, len);
		dstArray.set(srcArray);
		this.p += len; // advance the destination pointer (will be undone later if advanceDest is false)
		if (padding) this.padToModulo(padding);
		if (!advanceDest) this.seek(dstOffset);
	}

	// validate offset
	seekValid(p) {
		return p >= 0 && p < this.byteLength;
	}

	padToModulo(n) {
		while (this.p % n) {
			this.u8 = 0;
		}
	}

	// uint64, int64
	set u64(num) {
		this.setUint32(this.p, num >> 32);
		this.setUint32(this.p+4, num & 0xffffffff);
		this.p += 8;
	}

	get u64() {
		const ret = (this.getUint32(this.p) << 32) + this.getUint32(this.p+4);
		this.p += 8;
		return ret;
	}

	set i64(num) {
		this.setUint32(this.p, num >> 32);
		this.setUint32(this.p+4, num & 0xffffffff);
		this.p += 8;
	}

	get i64() {
		const ret = (this.getUint32(this.p) << 32) + this.getUint32(this.p+4);
		this.p += 8;
		return ret;
	}

	// uint32, int32, f16dot16
	set u32(num) {
		this.setUint32(this.p, num);
		this.p += 4;
	}

	get u32() {
		const ret = this.getUint32(this.p);
		this.p += 4;
		return ret;
	}

	set u32_array(arr) {
		for (const num of arr) {
			this.setUint32(this.p, num);
			this.p += 4;
		}
	}

	get u32_pascalArray() {
		const arr = [];
		let count = this.getUint16(this.p);
		this.p+=2;
		while (count--) {
			arr.push(this.getUint32(this.p));
			this.p+=4;
		}
		return arr;
	}
	
	set i32(num) {
		this.setInt32(this.p, num);
		this.p += 4;
	}

	set i32_array(arr) {
		for (const num of arr) {
			this.setInt32(this.p, num);
			this.p += 4;
		}
	}

	get i32() {
		const ret = this.getInt32(this.p);
		this.p += 4;
		return ret;
	}

	set f1616(num) {
		this.setInt32(this.p, num * 0x10000);
		this.p += 4;
	}

	get f1616() {
		const ret = this.getInt32(this.p) / 0x10000;
		this.p += 4;
		return ret;
	}

	// u32 for WOFF2: https://www.w3.org/TR/WOFF2/#UIntBase128
	get u32_128() {
		let accum = 0;
		for (let i = 0; i < 5; i++) {
			let data_byte = this.getUint8(this.p++);
			if (i == 0 && data_byte == 0x80) return false; // No leading 0's
			if (accum & 0xfe000000) return false; // If any of top 7 bits are set then << 7 would overflow
			accum = (accum << 7) | (data_byte & 0x7f);

			// Spin until most significant bit of data byte is false
			if ((data_byte & 0x80) == 0) {
				return accum;
			}
		}
	}

	// this was defined for VARC table 
	get u32_var() {
		let firstByte = this.u8;
		if (firstByte < 0x80) return firstByte;
		else if (firstByte < 0xc0) return ((firstByte & 0x3f) << 8) + this.u8;
		else if (firstByte < 0xe0) return ((firstByte & 0x1f) << 16) + this.u16;
		else if (firstByte < 0xf0) return ((firstByte & 0x0f) << 24) + this.u24;
		return this.u32; // firstByte == 0xfx, ignore low 4 bits of firstByte (which should be 0 anyway)
	}

	// uint24, int24
	set u24(num) {
		this.setUint16(this.p, num >> 8);
		this.setUint8(this.p+2, num & 0xff);
		this.p += 3;
	}

	get u24() {
		const ret = (this.getUint16(this.p) << 8) + this.getUint8(this.p+2);
		this.p += 3;
		return ret;
	}

	set i24(num) {
		this.setUint16(this.p, num >> 8);
		this.setUint8(this.p+2, num & 0xff);
		this.p += 3;
	}

	get i24() {
		const ret = (this.getInt16(this.p) * 256) + this.getUint8(this.p+2);
		this.p += 3;
		return ret;
	}

	// uint16, int16, f2dot14
	set u16(num) {
		this.setUint16(this.p, num);
		this.p += 2;
	}

	get u16() {
		const ret = this.getUint16(this.p);
		this.p += 2;
		return ret;
	}

	set u16_array(arr) {
		for (const num of arr) {
			this.setUint16(this.p, num);
			this.p += 2;
		}
	}

	u16_arrayOfLength(count) { // we can’t use a getter as it needs an argument
		const arr = [];
		while (count--) {
			arr.push(this.getUint16(this.p));
			this.p+=2;
		}
		return arr;
	}

	set u16_pascalArray(arr) {
		this.setUint16(arr.length);
		this.p += 2;
		for (const num of arr) {
			this.setUint16(this.p, num);
			this.p += 2;
		}
	}

	get u16_pascalArray() {
		const arr = [];
		let count = this.getUint16(this.p);
		this.p+=2;
		while (count--) {
			arr.push(this.getUint16(this.p));
			this.p+=2;
		}
		return arr;
	}

	// u16 for WOFF2: https://www.w3.org/TR/WOFF2/#255UInt16
	set u16_255(num) {
		const oneMoreByteCode1    = 255;
		const oneMoreByteCode2    = 254;
		const wordCode            = 253;
		const lowestUCode         = 253;
		if (num < 253) {
			this.u8 = num;
		}
		else if (num < 506) {
			this.u8 = oneMoreByteCode1;
			this.u8 = num - lowestUCode;
		}
		else if (num < 759) {
			this.u8 = oneMoreByteCode2;
			this.u8 = num - lowestUCode * 2;
		}
		else {
			this.u8 = wordCode;
			this.u16 = num;
		}
	}

	get u16_255() {
		const oneMoreByteCode1    = 255;
		const oneMoreByteCode2    = 254;
		const wordCode            = 253;
		const lowestUCode         = 253;
		let value;

		const code = this.u8;
		if (code == wordCode) {
			value = this.u8;
			value <<= 8;
			value |= this.u8;
		}
		else if (code == oneMoreByteCode1)  {
			value = this.u8 + lowestUCode;
		}
		else if (code == oneMoreByteCode2) {
			value = this.u8 + lowestUCode*2;
		}
		else {
			value = code;
		}
		return value;
		}

	set i16(num) {
		this.setInt16(this.p, num);
		this.p += 2;
	}

	get i16() {
		const ret = this.getInt16(this.p);
		this.p += 2;
		return ret;
	}

	set i16_array(arr) {
		for (const num of arr) {
			this.setInt16(this.p, num);
			this.p += 2;
		}
	}

	i16_arrayOfLength(count) { // we can’t use a getter as it needs an argument
		const arr = [];
		while (count--) {
			arr.push(this.getInt16(this.p));
			this.p+=2;
		}
		return arr;
	}

	set i16_pascalArray(arr) {
		this.setUint16(this.p, arr.length);
		this.p += 2;
		for (const num of arr) {
			this.setInt16(this.p, num);
			this.p += 2;
		}
	}

	get i16_pascalArray() {
		const arr = [];
		let count = this.getUint16(this.p);
		this.p+=2;
		while (count--) {
			arr.push(this.getInt16(this.p));
			this.p+=2;
		}
		return arr;
	}

	set f214(num) {
		this.setInt16(this.p, num * 0x4000);
		this.p += 2;
	}

	set f214_array(arr) {
		for (const num of arr) {
			this.setInt16(this.p, num * 0x4000);
			this.p += 2;
		}
	}

	set f214_pascalArray(arr) {
		this.setUint16(this.p, arr.length);
		this.p += 2;
		for (const num of arr) {
			this.setInt16(this.p, num * 0x4000);
			this.p += 2;
		}
	}

	get f214() {
		const ret = this.getInt16(this.p) / 0x4000;
		this.p += 2;
		return ret;
	}

	// uint8, int8
	set u8(num) {
		this.setUint8(this.p++, num);
	}

	get u8() {
		return this.getUint8(this.p++);
	}

	set u8_array(arr) {
		for (const num of arr)
			this.setUint8(this.p++, num);
	}

	set i8(num) {
		this.setInt8(this.p++, num);
	}

	set i8_array(arr) {
		for (const num of arr)
			this.setInt8(this.p++, num);
	}

	get i8() {
		return this.getInt8(this.p++);
	}

	// u4 (nibble)
	set u4(num) {
		// note that writing the high nibble does not zero the low nibble
		const byte = this.getUint8(this.p);
		if (this.phase) {
			this.setUint8(this.p++, (byte & 0xf0) | (num & 0x0f));
		}
		else {
			this.setUint8(this.p, (byte & 0x0f) | (num << 4));
		}
		this.phase = !this.phase;
	}

	get u4() {
		const byte = this.getUint8(this.p);
		this.phase = !this.phase;
		if (this.phase) {
			return (byte & 0xf0) >> 4;
		}
		else {
			this.p++;
			return byte & 0x0f;
		}
	}

	// tag
	set tag(str) {
		const length = 4;
		for (let i = 0; i < length; i++) {
			this.setUint8(this.p++, str.charCodeAt(i));
		}
	}

	get tag() {
		let ret = "";
		const length = 4;
		for (let i = 0; i < length; i++) {
			ret += String.fromCharCode(this.getUint8(this.p++));
		}
		return ret;
	}

	compare(condition) {
		const [a, comparison, b] = condition;
		switch (comparison) {
			case ">=": return a >= b;
			case "<=": return a <= b;
			case "==": return a == b;
			case "<": return a < b;
			case ">": return a > b;
			case "!=": return a != b;
		}
	}

	checkSum(offset=0, length) {
		if (length === undefined) {
			length = this.byteLength - offset;
		}
		const pSaved = this.tell();
		const mainLength = 4 * Math.floor(length/4);
		let sum = 0;
		this.seek(offset);

		// sum the memory block
		while (this.p < offset + mainLength) {
			sum += this.u32;
			sum &= 0xffffffff;
			sum >>>= 0;
		}

		// sum any trailing bytes
		while (this.p < offset + length) {
			const shift = (3 - (this.p - offset) % 4) * 8;
			sum += this.u8 << shift;
			sum >>>= 0;
		}

		sum &= 0xffffffff; // unnecessary?
		sum >>>= 0; // unnecessary?
		this.seek(pSaved);
		return sum;
	}

	tableDirectoryEntry(table) {
		let tagU32 = 0;
		for (let c=0; c<4; c++) tagU32 += table.tag.charCodeAt(c) << (24 - c*8);
		return [tagU32, table.checkSum, table.offset, table.length];
	}

	decode(objType, arg0, arg1, arg2) { // TODO: test first for typeof objType[key] == "number" as it’s the most common
		const obj = {};
		Object.keys(objType).forEach(key => {
			if (key.startsWith("_IF_")) {
				// decode conditional block
				const condition = [...objType[key][0]];
				if (condition[0] == "_ARG0_")
					condition[0] = arg0;
				else if (condition[0] == "_ARG1_")
					condition[0] = arg1;
				else if (condition[0] == "_ARG2_")
					condition[0] = arg2;
				else
					condition[0] = obj[condition[0]];

				if (this.compare(condition)) {
					const obj_ = this.decode(objType[key][1]);
					Object.keys(obj_).forEach(key_ => {
						obj[key_] = obj_[key_];
					})
				}
			}
			else if (Array.isArray(objType[key])) {
				// decode array of similar values
				let count;
				if (Number.isInteger(objType[key][1]))
					count = objType[key][1];
				else if (objType[key][1] == "_ARG0_")
					count = arg0;
				else if (objType[key][1] == "_ARG1_")
					count = arg1;
				else if (objType[key][1] == "_ARG2_")
					count = arg2;
				else
					count = obj[objType[key][1]];

				obj[key] = [];
				for (let c=0; c<count; c++) {
					obj[key].push(this.getters[objType[key][0]]());
				}
			}
			else {
				// simple decode
				obj[key] = this.getters[objType[key]]();
			}
		});
		return obj;
	}

	encode(objType, obj, arg0, arg1, arg2) {
		Object.keys(objType).forEach(key => {
			if (key.startsWith("_IF_")) {
				// encode conditional block
				const condition = [...objType[key][0]];
				if (condition[0] == "_ARG0_")
					condition[0] = arg0;
				else if (condition[0] == "_ARG1_")
					condition[0] = arg1;
				else if (condition[0] == "_ARG2_")
					condition[0] = arg2;
				else
					condition[0] = obj[condition[0]];

				if (this.compare(condition)) {
					this.encode(objType[key][1], obj);
				}
			}
			else if (Array.isArray(objType[key])) {
				// encode array of similar values
				let count;
				if (Number.isInteger(objType[key][1]))
					count = objType[key][1];
				else if (objType[key][1] == "_ARG0_")
					count = arg0;
				else if (objType[key][1] == "_ARG1_")
					count = arg1;
				else if (objType[key][1] == "_ARG2_")
					count = arg2;
				else
					count = obj[objType[key][1]];

				for (let c=0; c<count; c++) {
					this.setters[objType[key][0]](obj[key][c]);
				}
			}
			else {
				// simple encode
				this.setters[objType[key]](obj[key]);
			}
		});
	}

	decodeArray (type, length) {
		const getter = this.getters[type];
		const array = [];
		for (let i=0; i<length; i++) {
			array.push(getter());
		}
		return array;
	}

	encodeArray (array, type, length) {
		if (length === undefined) {
			length = array.length;
		}
		const setter = this.setters[type];
		for (let i=0; i<length; i++) {
			setter(array[i]);
		}
	}

	decodeNameString(length) {
		// TODO: handle UTF-8 beyond 16 bits
		let str = "";
		for (let i=0; i<length; i+=2) {
			str += String.fromCharCode(this.u16);
		}
		return str;
	}

	encodeNameString(str) {
		// TODO: handle UTF-8 beyond 16 bits
		for (let c=0; c<str.length; c++) {
			this.u16 = str.charCodeAt(c);
		}
		// TODO: return bytelength? it may be different from str.length*2
	}

	decodeString(length) {
		// 8-bit string
		let str = "";
		for (let i=0; i<length; i++) {
			str += String.fromCharCode(this.u8);
		}
		return str;
	}

	decodePascalString() {
		return this.decodeString(this.u8);
	}

	decodeGlyph(byteLength, options={}) {

		const metrics = options.metrics ?? [0, 0, 0, 0];
		const glyphOffset = this.tell();
		const glyph = byteLength ? new SamsaGlyph(this.decode(FORMATS.GlyphHeader)) : new SamsaGlyph();
		if (options.id)
			glyph.id = options.id;

		// set offset & length
		glyph.offset = glyphOffset;
		glyph.length = byteLength;

		// set metrics from the font’s hmtx
		glyph.font = options.font;
		if (glyph.font.hmtx)	{
			metrics[1] = glyph.font.hmtx[glyph.id];
		}

		// empty glyph
		if (byteLength === 0) {
		}

		// simple glyph
		else if (glyph.numberOfContours >= 0) { // note that the spec allows for numberOfContours to be 0, in which case we have a zero-contour glyph but with the possibility of instructions to move phantom points

			glyph.endPts = this.u16_arrayOfLength(glyph.numberOfContours); // end points of each contour
			glyph.numPoints = glyph.endPts[glyph.numberOfContours -1] + 1;

			// get instructions into a SamsaBuffer
			if (glyph.instructionLength = this.u16) {
				glyph.instructions = new SamsaBuffer(this.buffer, this.byteOffset + this.tell(), glyph.instructionLength);
			}
			this.seekr(glyph.instructionLength);

			// flags
			const flags = [];
			for (let pt=0; pt<glyph.numPoints; ) {
				let flag = this.u8;
				flags[pt++] = flag;
				if (flag & 0x08) {
					const repeat = this.u8;
					for (let r=0; r<repeat; r++) 
						flags[pt++] = flag;
				}
			}

			// points
			console.assert(flags.length === glyph.numPoints, "Error in glyph decoding: flags.length (%i) != glyph.numPoints (%i) for glyph #%i", flags.length, glyph.numPoints, glyph.id);
			let x_=0, y_=0, x, y;
			flags.forEach((flag,f) => {
				// const mask = flag & 0x12;
				// x += (mask == 0x12 ? this.u8 : (mask == 0x02 ? -this.u8 : (mask == 0x00 ? this.i16 : 0)));
				// glyph.points[f] = [x, 0, flag & 0x01];

				switch (flag & 0x12) { // x
					case 0x00: x = x_ + this.i16; break;
					case 0x02: x = x_ - this.u8; break;
					case 0x10: x = x_; break;
					case 0x12: x = x_ + this.u8; break;
				}
				x_ = x;
				glyph.points[f] = [x, 0, flag & 0x01];
			});
			flags.forEach((flag,f) => {
				switch (flag & 0x24) { // y
					case 0x00: y = y_ + this.i16; break;
					case 0x04: y = y_ - this.u8; break;
					case 0x20: y = y_; break;
					case 0x24: y = y_ + this.u8; break;
				}
				y_ = y;
				glyph.points[f][1] = y;
			});
		}
		
		// composite glyph
		// - we DO add points for composite glyphs: one per component (they are the x and y offsets), and the 4 extra metrics points
		// - when we process these glyphs, we look at glyph.numberOfContours and glyph.points, but NOT glyph.numPoints
		else if (glyph.numberOfContours < 0) {

			glyph.components = [];
			let flag;

			do  {
				const component = {};
				flag = component.flags = this.u16;
				component.glyphId = this.u16;

				// offsets and matched points (ARGS_ARE_XY_VALUES, ARG_1_AND_2_ARE_WORDS)
				switch (flag & 0x0003) {
					case 0x0003: component.offset = [this.i16, this.i16]; break;
					case 0x0002: component.offset = [this.i8, this.i8]; break;
					case 0x0001: component.matchedPoints = [this.u16, this.u16]; break;
					case 0x0000: component.matchedPoints = [this.u8, this.u8]; break;
				}

				// this is cool, we store the offset as it was a point, then we can treat it as a point when acted on by the tvts
				// - I think we should push zeroes if matchedPoints
				if (component.offset) {
					glyph.points.push( [component.offset[0], component.offset[1], 0] );
				}
				else {
					glyph.points.push( [0,0,0] );
				}

				// transformation matrix (if component.transform is undefined, the matrix is [1, 0, 0, 1]): check bits 0x0008, 0x0040, 0x0080
				switch (flag & 0x00c8) {
					case 0x0008: const scale = this.f214; component.transform = [scale, 0, 0, scale]; break;
					case 0x0040: component.transform = [this.f214, 0, 0, this.f214]; break;
					case 0x0080: component.transform = [this.f214, this.f214, this.f214, this.f214]; break;
				}

				// store component
				glyph.components.push(component);

			} while (flag & 0x0020); // MORE_COMPONENTS

			// skip over composite instructions
			if (flag & 0x0100) { // WE_HAVE_INSTR
				this.seekr(glyph.instructionLength = this.u16);
			}

			// pretend these are points so they can be processed by variations
			glyph.numPoints = glyph.points.length; // no metrics points yet
		}

		// TODO: fix the metrics points
		glyph.points[glyph.numPoints]   = [metrics[0] ?? 0,               0, 0]; // H: Left side bearing point
		glyph.points[glyph.numPoints+1] = [metrics[1] ?? 0,               0, 0]; // H: Right side bearing point
		glyph.points[glyph.numPoints+2] = [              0, metrics[2] ?? 0, 0]; // V: Top side bearing point
		glyph.points[glyph.numPoints+3] = [              0, metrics[3] ?? 0, 0]; // V: Bottom side bearing point
	
		return glyph;
	}

	encodeGlyph(glyph, options = {}) {
		// Encode a glyph into a SamsaBuffer
		//
		// glyph:
		// - a SamsaGlyph object
		//
		// options:
		// - bbox: true = recalculate the bounding box of the glyph (default), false = don’t recalculate
		// - compression: 0 = don’t compress (faster), 1 = compress the glyph (slower, default), 2 = WOFF2 compression (not implemented)
		// - metrics: integer array that receives the 4 metrics points after the main points (if absent, these are not written)
		// - overlapSimple: true = flag the first point of a simple glyph as overlapping (for Apple fonts), false = don’t flag (default)
		// - bigendian: true = the method is allowed to use Int16Array, UInt16Array, Int32Array, UInt32Array, etc. for speed
		// - getMaxCompiledSize: true = return the maximum size of the compiled glyph (no compilation)
		//
		// return value:
		// - size of the compiled glyph in bytes (without padding)
		// - maximum size of the compiled glyph in bytes (without padding) if options.getMaxCompiledSize

		// set default options
		options.compression ??= 1; // standard TrueType compression
		options.bbox ??= true; // recalculate bounding box

		if (options.getMaxCompiledSize) {
			if (options.compression === 2) {
				if (glyph.numberOfContours > 0)
					return 
				else if (glyph.numberOfContours < 0)
					return 0;
				else
					return 0;				
			} else {
				if (glyph.numberOfContours > 0)
					return (5*2) + glyph.numberOfContours*2 + 2 + glyph.instructionLength + glyph.numPoints * (2+2+1);
				else if (glyph.numberOfContours < 0)
					return (5*2) + (4+4)*2 * glyph.components.length + 2 + glyph.instructionLength;
				else
					return 0;
			}
		}

		const points = glyph.points;
		const numPoints = glyph.numPoints;
		const tell = this.tell();
	
		// 1. SIMPLE glyph
		if (glyph.numberOfContours > 0) {
	
			let instructionLength = 0;
	
			// recalculate bbox
			if (options.bbox) {
				if (points && points[0]) {
					let xMin, xMax, yMin, yMax;
					[xMin,yMin] = [xMax,yMax] = points[0];
					for (let pt=1; pt<numPoints; pt++) {
						const P = points[pt][0], Q = points[pt][1];
						if (P<xMin)
							xMin=P;
						else if (P>xMax)
							xMax=P;
						if (Q<yMin)
							yMin=Q;
						else if (Q>yMax)
							yMax=Q;
					}
					glyph.xMin = Math.floor(xMin); // rounding is in case the points are not integers, thanks to variations or transforms
					glyph.yMin = Math.floor(yMin);
					glyph.xMax = Math.ceil(xMax);
					glyph.yMax = Math.ceil(yMax);
					// TODO: consider that, if this glyph is from a non-default instance, these values will in general not be integers
				}
			}

			// compression: WOFF2 method
			if (options.compression == 2) {

				// docs
				// - https://www.w3.org/TR/WOFF2/#glyf_table_format

				// - here, we use the WOFF2 method to encode flags and coordinates:
				// - numberOfContours [U16]
				// - nPoints [U16][numberOfContours] (number of points in each contour)
				// - flags [U8][numPoints] (1 byte per point, numPoints is total number of points)
				// - points (coordinate data)


				// write numberOfContours
				this.u16 = glyph.numberOfContours;

				// write nPoints array
				let prevEndPt = 0;
				this.phase = false; // set up for nibbles
				for (let c=0; c<glyph.numberOfContours; c++) {
					const contourLength = glyph.endPts[c] - prevEndPt + 1;
					const clNibble = contourLength - 4;
					
					// this is a custom encoding to save space in the contourLengths array
					// write nibbles of contourLength - 4 (contourLength == 3 is rare; contourLength == 2, 1, 0 should not exist but we still handle them inefficiently)
					// - so we handle contours of length 4 to 18 (inclusive) in one nibble
					if (clNibble >= 0 && clNibble < 15) {
						this.u4 = clNibble;
					}
					else {
						this.u4 = 15; // declaration that we will write contourLength literally in 3 nibbles (must be < 4096)
						this.u4 = contourLength & 0x0f00 >> 8;
						this.u4 = contourLength & 0x00f0 >> 4;
						this.u4 = contourLength & 0x000f;
					}

					//this.u16_255 = contourLength; // write U16_255 compressed stream [U16_255 COMPRESSION OF endPts]
					//this.u16 = glyph.endPts[c] - prevEndPt + 1; // write U16 [NO COMPRESSION OF endPts]

					/*
					// get contourLengths stats
					if (contourLengths[contourLength] === undefined)
						contourLengths[contourLength] = 0;
					else 
						contourLengths[contourLength]++;
					*/

					prevEndPt = glyph.endPts[c];
				}

				// conclude nibbling
				if (this.phase) {
					this.u4 = 0;
					this.phase = false;
				}

				// allocate flags array
				const fArray = new Uint8Array(this.buffer, this.p, numPoints);
				this.seekr(numPoints);

				// write point coordinates
				let prevPt = [0,0,1];
				for (let pt=0; pt<glyph.numPoints; pt++) {
	
					const point = glyph.points[pt];
					let dx = point[0] - prevPt[0], dxa = Math.abs(dx);
					let dy = point[1] - prevPt[1], dya = Math.abs(dy);
					let flag;
	
					// there are 5 types of dx/dy combo
					// 2 * 8 : 2-byte encodings where dx = 0 or dy = 0
					// 4 * 4 : 2-byte encodings 
					// 3 * 3 : 3-byte encodings
					// 4     : 4-byte encodings
					// 4     : 5-byte encodings
	
					// buckets 0..9: dx==0
					if (dxa == 0 && dya < 1280) {
						flag = 0;
						flag += 2 * Math.floor(dya / 256);
						if (dy > 0)
							flag++;
						this.u8 = dya % 256; // write coord data (1 byte)
					}
					// buckets 10..19: dy==0
					else if (dya == 0 && dxa < 1280) {
						flag = 10;
						flag += 2 * Math.floor(dxa / 256);
						if (dx > 0)
							flag++;
						this.u8 = dxa % 256; // write coord data (1 byte)
					}
					// buckets 20..83: dx and dy are fairly short
					else if (dxa <= 64 && dya <= 64) { // we can use nibbles for dx and dy, so 1 byte
						flag = 20;
						flag += 16 * Math.floor((dxa-1) / 16);
						flag += 4 * Math.floor((dya-1) / 16);
						if (dx > 0)
							flag++;
						if (dy > 0)
							flag += 2;
						let nibx = ((dxa-1) % 16);
						let niby = ((dya-1) % 16);
						this.u8 = (nibx << 4) | niby; // write coord data (1 byte)
					}
					// buckets 84..119: dx and dy are not quite so short
					else if (dxa <= 768 && dya <= 768) { // we can use 1 byte for dx, 1 byte for dy
						flag = 84;
						flag += 12 * Math.floor((dxa-1) / 256);
						flag += 4 * Math.floor((dya-1) / 256);
						if (dx > 0)
							flag++;
						if (dy > 0)
							flag += 2;
						this.u8 = (dxa-1) % 256; // write x coord data (1 byte)
						this.u8 = (dya-1) % 256; // write y coord data (1 byte)
					}
					// buckets 120..123
					else if (dxa < 4096 && dya < 4096) {
						flag = 120;
						if (dx > 0)
							flag++;
						if (dy > 0)
							flag += 2;
						this.u16 = dxa << 4 | dya >> 8;
						this.u8 = dya % 256;
					}
					// buckets 124..127
					else {
						flag = 124;
						if (dx > 0)
							flag++;
						if (dy > 0)
							flag += 2;
						this.u16 = dxa;
						this.u16 = dya;
					}
	
					// is the point off-curve? if so, set the flag’s most significant bit
					if (point[2] == 0)
						flag |= 0x80;
					
					// write the flag into the flag array
					fArray[pt] = flag;
	
					// update prevPt
					prevPt = point;
				}
			}

			else {
				// options.compression != 2
				this.encode(FORMATS.GlyphHeader, glyph); // new header with bbox
				this.u16_array = glyph.endPts; // write endpoints array
				this.u16 = instructionLength; // instructions (none for now)
				this.seekr(instructionLength);
		
				// write glyph points

				// compression: none
				if (options.compression === 0) {

					// write uncompressed glyph points (faster in memory and for SSD disks)
					let cx=0;
					let cy=0;

					if (options.bigendian) {
						// Int16Array method
						// - a bit faster, but does not work on LE platforms such as Mac M1
						const fArray = new Uint8Array(this, this.p);
						fArray[0] = points[0][2] | (options.overlapSimple ? 0x40 : 0x00); // set first flag byte (may also need the overlap bit)
						for (let pt=1; pt<numPoints; pt++) {
							fArray[pt] = points[pt][2];
						}

						const pArray = new Int16Array(this, this.p + numPoints); // dangerous, since Int16Array uses platform byte order (M1 Mac does)
						for (let pt=0; pt<numPoints; pt++) {
							const x = points[pt][0];
							pArray[pt] = x - cx;
							cx = x;
						}
						for (let pt=0; pt<numPoints; pt++) {	
							const y = points[pt][1];
							pArray[numPoints+pt] = y - cy;
							cy = y;
						}
						this.seekr(numPoints*5);
					}
					else {
						// DataView method
						this.u8 = points[0][2] | (options.overlapSimple ? 0x40 : 0x00); // set first flag byte (may also need the overlap bit)
						for (let pt=1; pt<numPoints; pt++) {
							this.u8 = points[pt][2]; // write 1 byte for flag
						}

						for (let pt=0; pt<numPoints; pt++) {
							const x = points[pt][0]
							this.i16 = x - cx; // write 2 bytes for dx
							cx = x;
						}

						for (let pt=0; pt<numPoints; pt++) {	
							const y = points[pt][1];
							this.i16 = y - cy; // write 2 bytes for dy
							cy = y;
						}
					}
				}

				// compression: standard TrueType compression
				else if (options.compression === 1) {

					// write compressed glyph points (slower)
					let cx=0, cy=0;
					const dx=[], dy=[], flags=[];
			
					for (let pt=0; pt<numPoints; pt++) {
						const X = dx[pt] = Math.round(points[pt][0]) - cx;
						const Y = dy[pt] = Math.round(points[pt][1]) - cy;
						let f = points[pt][2] & 0xc1; // preserve bits 0 (on-curve), 6 (overlaps), 7 (reserved)
						if (X==0)
							f |= 0x10;
						else if (X >= -255 && X <= 255)
							f |= (X > 0 ? 0x12 : 0x02);
		
						if (Y==0)
							f |= 0x20;
						else if (Y >= -255 && Y <= 255)
							f |= (Y > 0 ? 0x24 : 0x04);
		
						flags[pt] = f;
						cx = points[pt][0];
						cy = points[pt][1];
					}
		
					// overlap signal for Apple
					if (options.overlapSimple)
						flags[0] |= 0x40;
		
					// write flags with RLE
					let rpt = 0;
					for (let pt=0; pt<numPoints; pt++) {
						if (pt > 0 && rpt < 255 && flags[pt] == flags[pt-1]) {
							rpt++;
						}
						else {
							rpt = 0;
						}
		
						if (rpt<2) {
							this.u8 = flags[pt]; // write without compression (don’t compress 2 consecutive identical bytes)
						}
						else {
							const currentPos = this.tell();
							if (rpt==2) {
								this.seek(currentPos-2);
								this.u8 = flags[pt] | 0x08; // set repeat bit on the pre-previous flag byte
							}
							this.seek(currentPos-1);
							this.u8 = rpt; // write the number of repeats
						}
					}
		
					// write point coordinates
					for (let pt=0; pt<numPoints; pt++) {
						if (dx[pt] == 0)
							continue;
						if (dx[pt] >= -255 && dx[pt] <= 255)
							this.u8 = (dx[pt]>0) ? dx[pt] : -dx[pt];
						else
							this.i16 = dx[pt];
					}
					for (let pt=0; pt<numPoints; pt++) {
						if (dy[pt] == 0)
							continue;
						if (dy[pt] >= -255 && dy[pt] <= 255)
							this.u8 = (dy[pt]>0) ? dy[pt] : -dy[pt];
						else
							this.i16 = dy[pt];
					}
				}
			}

		} // simple glyph end
	
		// 2. COMPOSITE glyph
		else if (glyph.numberOfContours < 0) {

			// glyph header
			this.encode(FORMATS.GlyphHeader, glyph); // TODO: recalculate composite bbox (tricky in general, not bad for simple translations)
	
			// components
			for (let c=0; c<glyph.components.length; c++) {
				let component = glyph.components[c];
	
				// set up the flags
				let flags = 0;
				if (options.compression == 0) {
					flags |= 0x0001; // ARG_1_AND_2_ARE_WORDS
				}
				else {
					if (   (component.offset && (component.offset[0] < -128 || component.offset[0] > 127 || component.offset[1] < -128 || component.offset[1] > 127))
						|| (component.matchedPoints && (component.matchedPoints[0] > 255 || component.matchedPoints[1] > 255)) ) {
						flags |= 0x0001; // ARG_1_AND_2_ARE_WORDS
					}
				}

				if (component.offset) {
					flags |= 0x0002; // ARGS_ARE_XY_VALUES
				}
				if (c < glyph.components.length-1) {
					flags |= 0x0020; // MORE_COMPONENTS
				}
				if (component.flags & 0x0200) {
					flags |= 0x0200; // USE_MY_METRICS (copy from the original glyph)
				}
				// flag 0x0100 WE_HAVE_INSTRUCTIONS is set to zero

				// TODO: handle transforms
	
				// write this component
				this.u16 = flags;
				this.u16 = component.glyphId;
				if (flags & 0x0002) { // ARGS_ARE_XY_VALUES
					if (flags & 0x0001) { // ARG_1_AND_2_ARE_WORDS
						this.i16 = component.offset[0];
						this.i16 = component.offset[1];
					}
					else {
						this.i8 = component.offset[0];
						this.i8 = component.offset[1];
					}
				}
				else {
					if (flags & 0x0001) { // ARG_1_AND_2_ARE_WORDS
						this.u16 = component.matchedPoints[0];
						this.u16 = component.matchedPoints[1];
					}
					else {
						this.u8 = component.matchedPoints[0];
						this.u8 = component.matchedPoints[1];
					}
				}
			}
		} // composite glyph end
	
		// store metrics (for simple, composite and empty glyphs)
		if (options.metrics) {
			options.metrics[0] = points[numPoints+0][0]; // lsb point, usually 0
			options.metrics[1] = points[numPoints+1][0]; // advance point
			options.metrics[2] = points[numPoints+2][1]; // top metric, usually 0 in horizontal glyphs
			options.metrics[3] = points[numPoints+3][1]; // bottom metric, usually 0 in horizontal glyphs
		}
	
		return this.tell() - tell; // size of binary glyph in bytes

	}

	// encodeInstance is how we export a static font!
	// - TODO: instantiate MVAR, cvar, GSUB etc.
	encodeInstance(instance, options={}) {
		options.format ??= "truetype";
		options.checkSums ??= true;
		options.glyphCompression ??= true;

		const font = instance.font;
		const numGlyphs = font.maxp.numGlyphs;
		const tableListFiltered = font.tableList.filter(table => !["fvar", "gvar", "avar", "cvar", "HVAR", "VVAR", "MVAR", "STAT"].includes(table.tag)); // remove variable-specific tables
		const tableListNew = [];
		const tableDirectory = {}; // the new table directory
		const locas = [0]; // TODO: use a Uint32Array and bit-shift to divide by 2 for max performance
		const hMetrics = [];
		const outputBufU8 = new Uint8Array(this.buffer, this.byteOffset); // we can use outputBufU8[outputBuf.p] to write bytes to the current buffer position
		let indexToLocFormat;
		let checkSumTotal = 0;

		// skip the header, then write each table
		// - "glyf" must be written first, as it creates arrays used by "loca" and "hmtx"
		// - fortunately this happens naturally due to ordering by table tag
		// - this table ordering is contrary to some optimizers, such as the old CACHETT.EXE
		this.seek(12 + tableListFiltered.length * 16);
		tableListFiltered.forEach(table => {

			const tableNew = { tag: table.tag, checkSum: 0, length: 0, offset: this.tell() };
			switch (table.tag) {
				case "glyf": {
					for (let g = 0; g < numGlyphs; g++) {
						const glyph = font.glyphs[g] ?? font.loadGlyphById(g);
						const iglyph = glyph.instantiate(instance); // load & instantiate glyph, no decomposition
						this.encodeGlyph(iglyph, { bbox: true, compression: +options.glyphCompression }); // "+" converts false -> 0, true -> 1"
						hMetrics.push([Math.round(iglyph.points[iglyph.numPoints+1][0]), iglyph.xMin]); // advanceWidth, leftSideBearing
						this.padToModulo(2);
						locas.push(this.tell() - tableNew.offset); // since locas is initialized as [0], locas.length ends up as numGlyphs+1
					}
					break;
				}

				case "loca": {
					indexToLocFormat = locas[numGlyphs] >= 0x20000 ? 1 : 0;
					for (const loca of locas) if (indexToLocFormat) {this.u32 = loca;} else {this.u16 = loca/2;}
					break;
				}

				case "hmtx": {
					for (const [advanceWidth, lsb] of hMetrics) {
						this.u16 = Math.max(0, advanceWidth); // negative values are not allowed
						this.i16 = lsb; // TODO: exploit advanceWidth compression where hhea.numberOfHMetrics < numGlyphs
					}
					break;
				}
		
				default: {
					const tableBufferU8 = new Uint8Array(table.buffer.buffer, table.buffer.byteOffset, table.length);
					outputBufU8.set(tableBufferU8, this.tell()); // copy the table buffer to outputBuf
					this.seekr(table.length);
					break;
				}
			}

			// table.length = this.tell() - table.offset;
			tableNew.length = this.tell() - tableNew.offset;
			tableListNew.push(tableNew);
			tableDirectory[table.tag] = tableNew;
			this.padToModulo(4);
		});

		// store the total length... now we will fix the header and table directory
		const finalLength = this.tell();

		// fixups
		// - these write to the new font data just written to memory, and do not affect the original loaded font data
		this.seek(tableDirectory.head.offset + 50); // fix head.indexToLocFormat to the value actually used, rather the one read from the input
		this.u16 = indexToLocFormat; // either 0 or 1	
		this.seek(tableDirectory.head.offset + 8); // fix head.checkSumAdjustment to zero so we can correclty checksum
		this.u32 = 0;	
		this.seek(tableDirectory.hhea.offset + 34); // fix hhea.numberOfHMetrics
		this.u16 = hMetrics.length;

		// table checkSums
		if (options.checkSums) {
			for (const table of tableListNew) {
				checkSumTotal += table.checkSum = this.checkSum(table.offset, table.length);
				checkSumTotal &= 0xffffffff;
			}
		}

		// write final header and table directory
		this.seek(0);
		this.u32 = font.header.sfntVersion;
		this.u16 = tableListNew.length;
		this.u16_array = font.binarySearchParams(tableListNew.length); // write 3 U16s for the binary search params
		tableListNew
			.sort((a,b) => compareString(a.tag, b.tag)) // sort by tag
			.forEach(table => this.u32_array = this.tableDirectoryEntry(table)); // write 4 U32s for each table directory entry

		// final fixups
		if (options.checkSums) {
			checkSumTotal += this.checkSum(0, 12 + 16 * tableListNew.length); // add header checkSum
			checkSumTotal &= 0xffffffff;
			this.seek(tableDirectory.head.offset + 8); // write the final value into head.checkSumAdjustment
			this.u32 = ((0xB1B0AFBA - checkSumTotal) + 0x100000000) % 0xffffffff;
		}
		this.seek(finalLength);
		return finalLength; // now the buffer "this" contains the binary font, we return the length to the client (finalLength <= this.byteLength)
	}

	decodeItemVariationStore() {
		const ivsStart = this.tell();
		const ivs = this.decode(FORMATS.ItemVariationStoreHeader);
		this.seek(ivsStart + ivs.regionListOffset);

		ivs.axisCount = this.u16;
		ivs.regionCount = this.u16; // ivs.regionCount may be 0
		ivs.regions = []; // get the regions

		for (let r=0; r<ivs.regionCount; r++) {
			const region = [];
			for (let a=0; a<ivs.axisCount; a++) {
				region[a] = [ this.f214, this.f214, this.f214 ];
			}
			ivs.regions.push(region);
		}

		// decode the ItemVariationDatas
		ivs.ivds = [];
		for (let d=0; d<ivs.itemVariationDataCount; d++) {
			this.seek(ivsStart + ivs.itemVariationDataOffsets[d]);
			const ivd = {
				itemCount: this.u16, // the number of items in each deltaSet
				regionIds: [],
				deltaSets: [],
			};
			let wordDeltaCount = this.u16;
			const regionCount = this.u16;
			const longWords = wordDeltaCount & 0x8000;
			wordDeltaCount &= 0x7fff; // fix the value for use
			console.assert(ivd.itemCount >0, "ivd.itemCount should be >0 but is 0");
			console.assert(wordDeltaCount <= regionCount, "wordDeltaCount should be <= regionCount");
			console.assert(regionCount > 0, "regionCount should be >0 but is 0 (non fatal)", wordDeltaCount,  ivd);
			if (ivd.itemCount > 0 && regionCount > 0 && wordDeltaCount <= regionCount) { // skip bad IVDs (some old font builds have regionCount==0, but they seem harmless if skipped)
	
				// populate regionIndexes
				for (let r=0; r<regionCount; r++) {
					ivd.regionIds.push(this.u16);
				}

				// decode the deltaSets
				for (let d=0; d < ivd.itemCount; d++) {
					const deltaSet = [];
					let r=0;
					while (r < wordDeltaCount) { // don’t replace r with r++ here!
						deltaSet.push(longWords ? this.i32 : this.i16);
						r++;
					}
					while (r < regionCount) { // don’t replace r with r++ here!
						deltaSet.push(longWords ? this.i16 : this.i8);
						r++;
					}
					ivd.deltaSets.push(deltaSet);
				}
				ivs.ivds.push(ivd);
			}
		}
		return ivs;
	}

	encodeItemVariationStore(ivs) {

		const ivsStart = this.tell(); // store location where we will write the ItemVariationStoreHeader
		const variationRegionListOffset = 8 + 4 * ivs.ivds.length; // seek to where we can start writing variationRegionList

		// write the region list
		this.seek(variationRegionListOffset);
		this.u16_array = [ivs.axisCount, ivs.regions.length];
		ivs.regions.forEach(region => region.forEach(dimension => this.f214_array = dimension));
		
		// write the itemVariationDatas
		const itemVariationDataOffsets = [];
		ivs.ivds.forEach((ivd, ivdIndex) => {
			itemVariationDataOffsets[ivdIndex] = this.tell();
			const wordDeltaCount = ivd.regionIds.length; // let’s do this for now
			const longWords = 0; // if set, value is 0x8000

			this.u16_array = [
				ivd.deltaSets.length, // itemCount == ivd.deltaSets.length
				wordDeltaCount | longWords, // wordDeltaCount: this can safely be set to ivd.regionIds.length (TODO: optimize to save bytes)
				ivd.regionIds.length,
				...ivd.regionIds,
			];

			ivd.deltaSets.forEach(deltaSet => {
				const wordDeltas = deltaSet.slice(0, wordDeltaCount);
				const otherDeltas = deltaSet.slice(wordDeltaCount);
				if (longWords) {
					this.i32_array = wordDeltas; this.i16_array = otherDeltas;
				}
				else {
					this.i16_array = wordDeltas; this.i8_array = otherDeltas;
				}
			});
		});

		// write the header, set the pointer to the end of the buffer, then return
		const ivsEnd = this.tell(); // when we exit, we position the pointer at the end of the IVS
		this.seek(ivsStart);
		this.u16 = 1; // format
		this.u32 = variationRegionListOffset;
		this.u16 = ivs.ivds.length; // itemVariationDataCount
		this.u32_array = itemVariationDataOffsets; // multiple ivd offsets
		this.seek(ivsEnd); // position the pointer correctly for the next write
		return ivsEnd - ivsStart; // return the size of the binary ItemVariationStore
	}

	// parser for variationIndexMap
	// - converts a compressed binary into an array of outer and inner values
	// - each element in the returned array is an array of 2 elements made of [outer, inner]
	// - deltaSetIndexMaps are always 0-based
	decodeIndexMap() {
		const indexMap = [];
		const format = this.u8;
		const entryFormat = this.u8;
		const mapCount = format === 0 ? this.u16 : this.u32;
		const itemSize = ((entryFormat & 0x30) >> 4) + 1;
		const innerBitCount = (entryFormat & 0x0f) + 1;
		const getters = [0, U8, U16, U24, U32];
		for (let m=0; m<mapCount; m++) {
			const entry = this.getters[getters[itemSize]](); // this.u8, this.u16, this.u24, this.u32
			const outer = entry >>> innerBitCount; // >>> avoids creating negative values (we want 0xffff, not -1)
			const inner = entry & ((1 << innerBitCount) - 1);
			indexMap.push([outer, inner]);
		}
		return indexMap;
	}

	// parse packed pointIds
	// - used in gvar and cvar tables
	// - https://learn.microsoft.com/en-us/typography/opentype/spec/otvarcommonformats#packed-point-numbers
	decodePointIds() {
		const pointIds = [];
		const _count = this.u8;
		const count = _count & GVAR_POINTS_ARE_WORDS ? (_count & GVAR_POINT_RUN_COUNT_MASK) * 0x0100 + this.u8 : _count;
		let pointId = 0;
		let c = 0;
		while (c < count) {
			const _runCount = this.u8;
			const runCount = (_runCount & GVAR_POINT_RUN_COUNT_MASK) + 1;
			const getter = _runCount & GVAR_POINTS_ARE_WORDS ? this.getters[U16] : this.getters[U8];
			for (let r=0; r < runCount; r++) {
				pointId += getter(); // convert delta ids into absolute ids
				pointIds.push(pointId);
			}
			c += runCount;
		}
		return pointIds;
	}

	encodePointIds(pointIds) {

		// note that the implicit "all points" encoding is intentionally not handled here, being a matter for the caller, knowing when to process an empty pointIds array
		const numPoints = pointIds.length;

		// handle 0-length arrays immediately
		if (numPoints === 0) {
			this.u8 = 0;
		}
		else if (numPoints < 0x80 && pointIds[numPoints-1] < 0x100) {
			// FAST PATH
			// - this is the common fast case, that handles all glyphs with <128 points; there are more "fast" cases but it’s expensive to test for all of them
			// - there is one run of u8s, of length numPoints
			this.u8 = numPoints; // total number of points
			this.u8 = numPoints-1; // number of points in the run (with -1 adjustment)
			const u8Packed = new Uint8Array(this.buffer, this.byteOffset + this.tell()); // we write pointIds directly to this Uint8Array
			let prevPointId = 0;
			for (let pc=0; pc < numPoints; pc++) {
				u8Packed[pc] = -prevPointId + (prevPointId = pointIds[pc]); // this order of operations allows the one-liner
			}
			this.seekr(numPoints); // make the SamsaBuffer account for the bytes we wrote
		}
		else {
			// SLOW PATH
			// - we may need u16s or multiple runs
			// - we night speed this up a little by always writing to the u8Packed array, avoiding SamsaBuffer
			if (numPoints < 0x80)
				this.u8 = numPoints; // set length byte
			else
				this.u16 = numPoints | (GVAR_POINTS_ARE_WORDS << 8); // set length bit

			// this method avoids the need to create arrays of runs
			const u8PackedTell = this.byteOffset + this.tell();
			const u8Packed = new Uint8Array(this.buffer, u8PackedTell); // this Uint8Array allows us to store and increment runSizes directly in memory
			let prevRunType = 0; // this will be 1 or 2 (representing the byte length of the items in the previous run, but initial value of 0 causes the test "thisRunType === prevRunType" to always fail)
			let runSizeTell = 0; // the write position of the runSize field of the current run
			let prevPointId = 0;
			for (let pc=0; pc < numPoints; pc++) {
				const pointId = pointIds[pc];
				const rPointId = pointId - prevPointId; // relative pointId
				const thisRunType = (rPointId < 0x100) ? 1 : 2; // byte length of the items in the run

				if (thisRunType === prevRunType && (u8Packed[runSizeTell] & GVAR_POINT_RUN_COUNT_MASK) < 0x7f) {
					// we are already in a run
					u8Packed[runSizeTell]++; // this is safe whether or not GVAR_POINTS_ARE_WORDS (bit 7) is set
				}
				else {
					// we are starting a new run
					runSizeTell = this.tell() - u8PackedTell;
					this.u8 = (thisRunType === 1) ? 0 : GVAR_POINTS_ARE_WORDS; // this field stores count-1 in bits 0..6 (hence the < 0xff check above) and the runType in bit 7
				}

				switch (thisRunType) {
					case 1: this.u8 = rPointId; break;
					case 2: this.u16 = rPointId; break;
				}				

				// for the next iteration
				prevRunType = thisRunType;
				prevPointId = pointId;
			}
		}
	}

	// parse packed deltas
	// - used in gvar and cvar tables
	// - https://learn.microsoft.com/en-us/typography/opentype/spec/otvarcommonformats#packed-deltas
	decodeDeltas(count) {
		const deltas = [];
		let d = 0;
		while (d < count) {
			const _runCount = this.u8;
			const runCount = (_runCount & GVAR_DELTA_RUN_COUNT_MASK) + 1;
			if (_runCount & GVAR_DELTAS_ARE_ZERO) {
				for (let r=0; r < runCount; r++) {
					deltas[d++] = 0;
				}
			} else {
				const getter = _runCount & GVAR_DELTAS_ARE_WORDS ? this.getters[I16] : this.getters[I8];
				for (let r=0; r < runCount; r++) {
					deltas[d++] = getter();
				}
			}
		}
		return deltas;
	}

	encodeDeltas(deltas) {
		// deltas are encoded in groups of size [1,64] (0xff & GVAR_DELTA_RUN_COUNT_MASK + 1 = 64)
		// cost of switching to a new group and back is 2 bytes
		// cost of not switching to zeroes is 2 bytes per delta if we’re in words, 1 byte per delta if we’re in bytes
		// cost of not switching to bytes is 1 byte per delta
		// - ideally we’d like to skip runs of length 1, but let’s ignore that for now
		let d, r;
		const numBytes = [];
		deltas.forEach(delta => {
			numBytes.push((delta === 0) ? 0 : (inRange(delta, -128, 127)) ? 1 : 2);
		});

		// this algo creates a new run for each distinct numBytes section, even those of length 1
		const runs = [];
		d=0;
		r=0;
		while (d<deltas.length) {
			runs[r] = [numBytes[d], 0]; // we store directly 0 to mean 1 delta, 1 to mean 2 deltas, n to mean n+1 deltas, etc.
			let d_ = d+1;
			while (d_<deltas.length && numBytes[d_] == numBytes[d] && runs[r][1] < 63) {
				runs[r][1]++; // 63 = 0x3f is the max value we will store here, meaning 64 deltas in the run
				d_++;
			}
			d = d_;
			r++;
		}

		// write the runs
		d=0;
		runs.forEach(run => {
			const [numBytes, runCount] = run;
			const _runCount = runCount | (numBytes == 2 ? GVAR_DELTAS_ARE_WORDS : 0) | (numBytes == 0 ? GVAR_DELTAS_ARE_ZERO : 0);
			this.u8(_runCount); // this incorporates runCount (bits 0-5 and the flag bits 6 and 7)
			if (numBytes > 0) { // write nothing for zero deltas
				for (let i=0; i<=runCount; i++) { // <= 0 means 1 item, 1 means 2 items, etc.
					if (numBytes == 1)
						this.i8(deltas[d++]);
					else if (numBytes == 2)
						this.i16(deltas[d++]);
				}	
			}
		});
	}

	// decodeTvts()
	// - parse the tuple variation tables (tvts), also known as "delta sets with their tuples" for this glyph
	// - we only get here from a gvar or cvar table
	decodeTvts(glyph) {
	
		const tvts = [];
		const font = glyph.font;
		const gvar = font.gvar;
		const axisCount = font.fvar.axisCount;

		const offset = gvar.tupleOffsets[glyph.id];
		const nextOffset = gvar.tupleOffsets[glyph.id+1];

		// do we have tvt data?
		if (nextOffset - offset > 0) {

			// jump to the tvt data, record the offset
			this.seek(gvar.glyphVariationDataArrayOffset + offset);
			const tvtStart = this.tell();

			// get tvts header
			const _tupleCount = this.u16;
			const tupleCount = _tupleCount & 0x0FFF;
			const offsetToSerializedData = this.u16;
			const bufS = new SamsaBuffer(this.buffer, this.byteOffset + tvtStart + offsetToSerializedData); // set up the serialized data buffer
			const sharedPointIds = _tupleCount & GVAR_SHARED_POINT_NUMBERS ? bufS.decodePointIds() : null; // get the shared pointIds

			// create all the tuples
			for (let t=0; t < tupleCount; t++) {
				this.seekr(2); // serializedDataSize (we assume serializedData is packed, so we don’t use this)
				const flags = this.u16; // tupleIndex in the spec
				const tupleIndex = flags & 0x0FFF;
				const tvt = {
					numPoints: 0,
					sharedTupleId: -1,
					peak: [],
					start: [],
					end: [],
					tents: [],
				};

				// TODO: move to a "region of tents" all-integer representation, rather than peak, start, end arrays
				// either (for a 4-axis font):
				// region = [[p0,p1,p2,p3],[s0,s1,s2,s3],[e0,e1,e2,e3]]; // fewer objects in general and maybe quicker to read
				// or
				// region = [[p0,s0,e0],[p1,s1,e1],[p2,s2,e2],[p3,s3,e3]]; // more intuitive, and usually axisCount is max 3 or 4... each subarray is a "tent"
				// also consider a single Int16Array
				// use a switch on (tvt.flags & GVAR_EMBEDDED_PEAK_TUPLE & GVAR_INTERMEDIATE_REGION)

				/*
				const tell = this.tell();
				for (let a=0; a<axisCount; a++) {
					const peak = (flags & GVAR_EMBEDDED_PEAK_TUPLE) ? gvar.sharedTuples[tupleIndex][a] : this.f214;
					tvt.tents.push(peak > 0 ? [peak, 0, 1] : [peak, -1, 0]);
				}
				if (flags & GVAR_INTERMEDIATE_REGION) {
					for (let a=0; a<axisCount; a++) {
						tvt.tents[a][1] = this.f214; // start
					}
					for (let a=0; a<axisCount; a++) {
						tvt.tents[a][2] = this.f214; // end
					}
				}
				for (const tent of tvt.tents) {
					if (!isValidTent(tent))
						tent[0] = tent[1] = tent[2] = 0;
				}			
				this.seek(tell);
				console.log(tvt.tents);
				*/
				
				if (flags & GVAR_EMBEDDED_PEAK_TUPLE) {
					for (let a=0; a<axisCount; a++) {
						tvt.peak[a] = this.f214;
					}
				}
				else {
					tvt.sharedTupleId = tupleIndex;
					tvt.peak = gvar.sharedTuples[tupleIndex]; // set the whole peak array at once, TODO: it would be better if we thought in terms of regions, and assigned complete shared regions
				}

				if (flags & GVAR_INTERMEDIATE_REGION) {
					for (let a=0; a<axisCount; a++) {
						tvt.start[a] = this.f214;
					}
					for (let a=0; a<axisCount; a++) {
						tvt.end[a] = this.f214;
					}
				}

				// TODO: all these [a] indexes are ugly, think in terms of a region instead, each region having axisCount * [start,peak,end] arrays and optionally having a pre-made scalar
				// fixups
				// I think these are ok because "An intermediate-region tuple variation table additionally has start and end n-tuples".
				// In practice, we could remove this whole block for well-formed fonts, but the spec asks us to force any invalid tuples to null
				// The first "tvt.start[a] === undefined" block seems unnecessary
				for (let a=0; a<axisCount; a++) {
					if (tvt.start[a] === undefined) { // infer starts and ends from peaks: a shared peak *can* have "embedded" start and end tuples (see Bitter variable font)
						if (tvt.peak[a] > 0) {
							tvt.start[a] = 0;
							tvt.end[a] = 1;
						}
						else {
							tvt.start[a] = -1;
							tvt.end[a] = 0;
						}
					}
					else {
						if ((tvt.start[a] > tvt.end[a]) || (tvt.start[a] < 0 && tvt.end[a] > 0)) // force null if invalid
							tvt.start[a] = tvt.end[a] = tvt.peak[a] = 0;
					}
				}

				// get pointIds and deltas from the serialized data
				const pointIds = flags & GVAR_PRIVATE_POINT_NUMBERS ? bufS.decodePointIds() : sharedPointIds; // use private point ids or use the shared point ids
				tvt.allPoints = pointIds.length === 0; // flag special case if all points are used (when unset this triggers IUP!)
				const tupleNumPoints = tvt.allPoints ? glyph.points.length : pointIds.length; // how many deltas do we need?
				const deltas = bufS.decodeDeltas(tupleNumPoints*2); // xDeltas and yDeltas are concatenated so we read them in one go
				tvt.deltas = []; // TODO: try preserving pointIds in the tvt, so we can use decoded deltas here without rewriting
				if (tvt.allPoints) {
					for (let pt=0; pt < glyph.points.length; pt++) {
						tvt.deltas[pt] = [deltas[pt], deltas[pt+tupleNumPoints]]; // xDelta, yDelta
					}
				}
				else {
					for (let pt=0, pc=0; pt < glyph.points.length; pt++) {
						// these points will be moved by IUP
						if (pt < pointIds[pc] || pc >= tupleNumPoints) {
							tvt.deltas[pt] = null;
						}
						// these points will be moved explicitly
						else {
							tvt.deltas[pt] = [deltas[pc], deltas[pc+tupleNumPoints]]; // xDelta, yDelta
							pc++;
						}
					}
					// after this, we no longer need pointIds
				}

				tvts.push(tvt); // store the tvt
			}
		}
		return tvts;
	}

	decodePaint(context = {}) {

		// readOperands()
		// - this reads all the operands for a paint
		// - we look up the number of operands needed in PAINT_VAR_OPERANDS, so we can use the same function for all paint formats
		// - the arrow function keeps "this" (the buffer) in scope
		const readOperands = (type) => {
			const count = PAINT_VAR_OPERANDS[paint.format];
			for (let i=0; i<count; i++)
				operands.push(this.getters[type]());
		};
		
		// addVariations()
		// - adds the scaled variation deltas to the operands
		// - the arrow function keeps "this" (the buffer) in scope
		const addVariations = (operands) => {
			if (paint.format % 2 === 0) // only odd-numbered paint formats have variations; we need operands
				return;
			const varIndexBase = this.u32; // we must read this even if we don’t have an instance, otherwise reading gets out of sync
			if (operands.length === 0 || varIndexBase === 0xffffffff || !context.instance) // we need operands; no variations for this paint; we need an instance
				return;
			const deltas = context.instance.deltaSets["COLR"];
			for (let i=0; i<operands.length; i++) {
				const index = varIndexBase + i;
				const [outer, inner] = colr.varIndexMapOffset ? colr.varIndexMap[index] : [index >>> 16, index & 0xffff]; // explicit or implicit mapping
				if (outer !== 0xffff && inner !== 0xffff) {
					operands[i] += deltas[outer][inner];
				}
			}
		};

		// we decode colorLine here, rather than as a method of SamsaBuffer, in order to keep paint in scope and to be able to use addVariations()
		// - the arrow function keeps "this" (the buffer) in scope
		const decodeColorLine = () => {
			const colorLine = {
				extend: this.u8, // one of EXTEND_PAD (0), EXTEND_REPEAT (1), EXTEND_REFLECT (2)
				colorStops: [],
			};
			const numStops = this.u16;
			const operands = [];
			for (let cst=0; cst<numStops; cst++) {
				const colorStop = {};
				operands[0] = this.i16; // stopOffset
				colorStop.paletteIndex = this.u16;
				operands[1] = this.i16; // alpha
				addVariations(operands);
				colorStop.stopOffset = operands[0] / 16384;
				colorStop.alpha = operands[1] / 16384;
				colorLine.colorStops.push(colorStop);
			}
			return colorLine;
		};

		const colr = context.font.COLR;
		const paint = {
			offset: this.tell(),
			format: this.u8,
			children: [],
		};
		const operands = [];

		// keep track of paintIds we have used, to avoid infinite recursion
		// - we use an Array (not a Set or anything non-LIFO), since we need to push and pop at the beginning of each decodePaint()
		// - it’s only relevant to test whether the paintId has been used in the path from root to current node
		// - multiple children of the same parent may use the same paintId, for example to fill two shapes the same way
		// - paint.offset is suitable to identify each paint
		if (context.paintIds.includes(paint.offset)) {
			console.error(`decodePaint(): infinite recursion detected: paintId ${paint.offset} is already used in this DAG`);
			return paint; // return what we have found so far
		}
		else {
			context.paintIds.push(paint.offset); // push the paintId: we’ll pop it at the end of this run throught decodePaint(), so it works well for nested paints
		}

		switch (paint.format) {
			case 1: { // PaintColrLayers
				const numLayers = this.u8;
				const firstLayerIndex = this.u32;
				for (let lyr = 0; lyr < numLayers; lyr++) {
					this.seek(colr.layerList[firstLayerIndex + lyr]);
					paint.children.push(this.decodePaint(context)); // recursive
				}
				break;
			}

			case 2: case 3: { // PaintSolid
				paint.paletteIndex = this.u16;
				readOperands(I16);
				addVariations(operands);
				paint.alpha = operands[0] / 0x4000;
				break;
			}

			case 4: case 5: case 6: case 7: case 8: case 9: { // all gradient paints
				const colorLineOffset = this.u24;
				const tell = this.tell();
				this.seek(paint.offset + colorLineOffset);
				paint.colorLine = decodeColorLine();
				this.seek(tell); // restore the data pointer
				readOperands(I16);
				addVariations(operands);
				if (paint.format < 6) { // PaintLinearGradient, PaintVarLinearGradient
					paint.points = [ [operands[0], operands[1]], [operands[2], operands[3]], [operands[4], operands[5]] ];
				}
				else if (paint.format < 8) { // PaintRadialGradient, PaintVarRadialGradient
					paint.points = [ [operands[0], operands[1]], [operands[3], operands[4] ] ];
					paint.radii = [ operands[2], operands[5] ];
				}
				else { // PaintSweepGradient, PaintVarSweepGradient
					paint.center = [operands[0], operands[1]];
					paint.startAngle = operands[2] / 0x4000 * 180;
					paint.endAngle = operands[3] / 0x4000 * 180;	
				}
				break;
			}

			case 10: { // PaintGlyph
				const nextOffset = this.u24;
				paint.glyphId = this.u16; // by assigning glyphid we get an actual shape to use
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive (but we should only get transforms, more Format 10 tables, and a fill from now on)
				break;
			}

			case 11: { // PaintColrGlyph
				const glyphId = this.u16;
				this.seek(colr.baseGlyphPaintRecords[glyphId]);
				paint.children.push(this.decodePaint(context)); // recursive
				break;
			}

			case 12: case 13: { // PaintTransform, PaintVarTransform
				const nextOffset = this.u24;
				const transformOffset = this.u24;
				const tell = this.tell();
				this.seek(paint.offset + transformOffset);
				readOperands(I32);
				addVariations(operands);
				this.seek(tell);
				paint.matrix = [ operands[0]/0x10000, operands[1]/0x10000, operands[2]/0x10000, operands[3]/0x10000, operands[4]/0x10000, operands[5]/0x10000 ];
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive
				break;
			}

			case 14: case 15: { // PaintTranslate, PaintVarTranslate
				const nextOffset = this.u24;
				readOperands(I16);
				addVariations(operands);
				paint.translate = [ operands[0], operands[1] ];
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive
				break;
			}

			case 16: case 17: case 18: case 19: case 20: case 21: case 22: case 23: { // PaintScale and variant scaling formats
				const nextOffset = this.u24;
				readOperands(I16);
				addVariations(operands);
				let o = 0;
				paint.scale = [ operands[o++]/0x4000 ]; // scaleX
				if (paint.format >= 20)
					paint.scale.push(operands[o++]/0x4000);  // scaleY
				if (paint.format == 18 || paint.format == 19 || paint.format == 22 || paint.format == 23)
					paint.center = [ operands[o++], operands[o++] ]; // centerX, centerY
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive	
				break;
			}

			case 24: case 25: case 26: case 27: { // PaintRotate, PaintVarRotate, PaintRotateAroundCenter, PaintVarRotateAroundCenter
				const nextOffset = this.u24;
				readOperands(I16);
				addVariations(operands);
				paint.rotate = operands[0]/0x4000 * 180; // we store 1/180 of the rotation angle as F214
				if (paint.format >= 26) {
					paint.center = [ operands[1], operands[2] ];
				}
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive	
				break;
			}

			case 28: case 29: case 30: case 31: { // PaintSkew, PaintVarSkew, PaintSkewAroundCenter, PaintVarSkewAroundCenter
				const nextOffset = this.u24;
				readOperands(I16);
				addVariations(operands);
				paint.skew = [ operands[0]/0x4000 * 180, operands[1]/0x4000 * 180 ]; // we store 1/180 of the rotation angle as F214
				if (paint.format >= 30) {
					paint.center = [ operands[1], operands[2] ];
				}
				this.seek(paint.offset + nextOffset);
				paint.children.push(this.decodePaint(context)); // recursive	
				break;
			}

			case 32: { // PaintComposite
				const sourcePaintOffset = this.u24;
				paint.compositeMode = this.u8;
				const backdropPaintOffset = this.u24;
				this.seek(paint.offset + sourcePaintOffset);
				paint.children.push(this.decodePaint(context));
				this.seek(paint.offset + backdropPaintOffset);
				paint.children.push(this.decodePaint(context));
				break;	
			}
			
			default: {
				console.error(`Unknown paint.format ${paint.format} (must be 1 <= paint.format <= 32)`)
				break;
			}
		}

		context.paintIds.pop(); // we pop the paintId we pushed at the beginning of this decodePaint(), but might reuse the same paintId in later paints in the same glyph
		return paint; // having recursed the whole paint tree, this is now a DAG
	}

	// decode WOFF2
	// - given WOFF2 data, return a SamsaBuffer (a subclass of DataView) that contains an OFF font
	// - requires a brotli argument, an object with a decompress() method that turns a compressed Buffer into a decompressed Buffer
	// Options:
	// - ignoreChecksums: boolean, default false
	// - ignoreInstructions: boolean, default false
	// - packPoints: boolean, default true (false means larger files but faster OFF creation)
	// - Uint8Array: boolean, default false (true means return a Uint8Array instead of a SamsaBuffer)
	// - tables: if not undefined, it must be an empty array that will receive the table array created in the method
	// - tableDirectory: if not undefined, it must be an empty object that will receive the tableDiretory object created in the method
	decodeWOFF2(options = {}) {

		// we need a bufferObject
		if (!options.bufferObject) {
			return null;
		}

		// we need either a brotli key or a brotliDecompress key
		let decompressFunction;
		if (options.brotli)
			decompressFunction = options.brotli.decompress;
		else if (options.brotliDecompress)
			decompressFunction = options.brotliDecompress;
		else {
			return null;
		}

		// normalize options
		if (options.ignoreChecksums === undefined)
			options.ignoreChecksums = false;
		if (options.ignoreInstructions === undefined)
			options.ignoreInstructions = false;
		if (options.packPoints === undefined)
			options.packPoints = true;

		// read WOFF2 header
		const WOFF2_TABLE_TAGS = ["cmap","head","hhea","hmtx","maxp","name","OS/2","post","cvt ","fpgm","glyf","loca","prep","CFF ","VORG","EBDT","EBLC","gasp","hdmx","kern","LTSH","PCLT","VDMX","vhea","vmtx","BASE","GDEF","GPOS","GSUB","EBSC","JSTF","MATH","CBDT","CBLC","COLR","CPAL","SVG ","sbix","acnt","avar","bdat","bloc","bsln","cvar","fdsc","feat","fmtx","fvar","gvar","hsty","just","lcar","mort","morx","opbd","prop","trak","Zapf","Silf","Glat","Gloc","Feat","Sill"];
		const signature = this.tag;

		// check signature
		if (signature !== "wOF2") {
			console.error("!!!!!!!!!! !!!!!!!!!! Not a WOFF2 file !!!!!!!!!! !!!!!!!!!!");
			return -1;
		}

		// read header (48 bytes)
		this.seekr(-4);
		const header = this.decode(FORMATS.WOFF2_header);

		// read table directory
		const tables = [];
		const tableDirectory = {};
		for (let t=0; t<header.numTables; t++) {
			const table = {};
			let nullTransform = false;
			let flags = this.u8;
			const transformationVersion = (flags & 0xc0) >> 6; // 0..3
			table.tag = (flags & 0x3f) == 0x3f ? this.tag : WOFF2_TABLE_TAGS[flags & 0x3f];
			table.origLength = this.u32_128;
			if (["glyf","loca"].includes(table.tag)) {
				if (transformationVersion == 3)
					nullTransform = true;
			}
			else if (transformationVersion == 0)
				nullTransform = true;
		
			table.transformLength = nullTransform ? 0 : this.u32_128;
		
			// store table in tables array and in tableDirectory object, so we can access by index or by tag
			tables.push(table);
			tableDirectory[table.tag] = table;
		}

		// decompress all the brotli data in compressedBuffer into a single decompressedBuffer
		const compressedBufferStart = this.tell();
		const compressedBuffer = options.bufferObject.from(this.buffer, compressedBufferStart, header.totalCompressedSize); // Buffer, not SamsaBuffer
		const decompressedBuffer = decompressFunction(compressedBuffer); // Buffer, not SamsaBuffer
		
		let locaBuffer;
		let indexToLocFormat = 0; // this, after possibly being set to 1, will be written to head.indexToLocFormat (0=16-bit, 1=32-bit)

		// slice the decompressedBuffer into a SamsaBuffer for each table
		let offset = 0;
		tables.forEach(table => {
			if (table.tag !== "loca") { // loca never has data
				let lengthToUse = table.transformLength ? table.transformLength : table.origLength;
				table.buffer = new SamsaBuffer(decompressedBuffer.buffer, offset, lengthToUse);
				offset += lengthToUse;
			}
		});

		// create SamsaBuffer for output font and a Uint8Array view on it
		const outputBuf = new SamsaBuffer(new ArrayBuffer(5000000)); // hmm, we should allocate more intelligently
		const outputBufU8 = new Uint8Array(outputBuf.buffer); // we can use outputBufU8[outputBuf.p] to write bytes to the current buffer position
		
		// skip header for now, we’ll write it later
		outputBuf.seek(12 + tables.length * 16);
		
		// write each table to outputBuf
		tables.forEach(table => {
			
			table.offset = outputBuf.tell();
			table.checkSum = 0;
			
			switch (table.tag) {
		
				case "glyf": {
					const glyfHeader = table.buffer.decode(FORMATS.WOFF2_Transformed_glyf);
		
					// set up loca buffer: initially we populate as u16, only switching to u32 if we overflow
					tableDirectory.loca.length = (glyfHeader.numGlyphs+1) * 2; // sic 2
					locaBuffer = new SamsaBuffer(new ArrayBuffer(4 * (glyfHeader.numGlyphs+1))); // sic 4
					locaBuffer.u16 = 0;
					
					// set up the parallel streams
					const bufs = {};
					const bufTypes = ["nContour","nPoints","flag","glyph","composite","bbox","instruction"];
					let bufOffset = table.buffer.byteOffset + 36;
					bufTypes.forEach((bufType, b) => {
						const streamSize = glyfHeader[bufType + "StreamSize"]; // WARNING: constructs object property names
						if (streamSize > 0) {
							bufs[bufType] = new SamsaBuffer(table.buffer.buffer, bufOffset, streamSize);
							bufOffset += streamSize;
						}
					});

					// short variable names for common bufs
					const gBuf = bufs.glyph;
			
					const bboxBitmapSize = 4 * Math.ceil(glyfHeader.numGlyphs / 32); // WOFF2 spec: "The total number of bytes in bboxBitmap is equal to 4 * floor((numGlyphs + 31) / 32)"
					bufs.bboxValues = new SamsaBuffer(bufs.bbox.buffer, bufs.bbox.byteOffset + bboxBitmapSize);
					
					const maxNumPoints = 100; // we allow this to grow in those rare occasions
					const unpackedMax = new DataView(new ArrayBuffer(5 * maxNumPoints)); // allocating here means we don’t need to allocate for each glyph
		
					// loop through all glyphs
					let bboxByte;
					for (	let g=0,
							bit=0x80;
				
							g<glyfHeader.numGlyphs;
		
							g++,
							bit = bit == 0x01 ? 0x80 : bit >> 1) { // advance the bit index mask (0x80->0x40->0x20->0x10->0x08->0x04->0x02->0x01->0x80...)
			
						// numberOfContours
						const numberOfContours = bufs.nContour.i16;
						let instructionLength = 0;
						let xMin, yMin, xMax, yMax;
		
						// start writing the glyf data
						const glyphStart = outputBuf.tell();
			
						// is the bbox embedded?
						// - if so, get it now
						// - if not, calculate it after decoding all the points of a simple glyph
						// - it’s an error to have this bit set for empty or composite glyphs
						if (bit == 0x80)
							bboxByte = bufs.bbox.u8; // only read a byte full of bits if we are at the start of that byte
						const bboxIsEmbedded = bboxByte & bit;
						if (bboxIsEmbedded) {
							[xMin, yMin, xMax, yMax] = bufs.bboxValues.i16_arrayOfLength(4);
						}
		
						// skip empty glyphs
						// console.assert(!(numberOfContours < 0 && glyfHeader.compositeStreamSize == 0), "We have a composite glyph but the composite stream is empty.");
						if (numberOfContours !== 0) {
			
							// write numberOfContours and leave space for bbox
							outputBuf.i16 = numberOfContours;
							outputBuf.seekr(8); // skip over the bbox, we write it later
				
							// SIMPLE GLYPH
							if (numberOfContours > 0) {
		
								// transform the nPoints data into an endPts array
								let numPoints = 0;
								for (let c=0; c<numberOfContours; c++) {
									numPoints += bufs.nPoints.u16_255;
									outputBuf.u16 = numPoints - 1; // endPts entry
								}
			
								// create the arrays that we’ll complete
								const glyfFlags = [];
								const dxArray = [];
								const dyArray = [];
		
								// usually we can use the previously allocated unpackedMax, but if the number of points is greater than maxNumPoints, we allocate a new buffer
								const unpacked = numPoints <= maxNumPoints ? unpackedMax : new DataView(new ArrayBuffer(5 * numPoints));
								const unpackedU8 = new Uint8Array(unpacked.buffer, 0, 5 * numPoints); // this is trimmed to exact length so that we can use it with .set() later; note that 5 = 1+2+2 (flag + dx + dy)
		
								// decode the mtx-transformed glyf data into regular glyf data
								// - it would likely be quicker to have all 128 possibilities as individual functions?
								let cx = 0, cy = 0;
								for (let pt=0; pt<numPoints; pt++) {
		
									let flag = bufs.flag.u8;
									let f = 1 - (flag >> 7); // f is the flags byte we build for glyf (on-curve polarity is inverse between glyf and mtx)
									flag = flag & 0x7f; // clear the curve flag

									// this decision tree is faster than the lookup array of 128 functions
									let dx = 0, dy = 0;
									let xSign = 0, ySign = 0;
									let xDelta = 0, yDelta = 0;
									let base, xy;
			
									if (flag < 10) {
										// x = 0, y is 8-bit
										ySign = (flag & 0x01) ? 1 : -1;
										yDelta = (flag >> 1) * 256;
										dy = ySign * (yDelta + gBuf.u8);
									}
									else if (flag < 20) {
										// x is 8-bit, y = 0
										xSign = (flag & 0x01) ? 1 : -1;
										xDelta = ((flag - 10) >> 1) * 256;
										dx = xSign * (xDelta + gBuf.u8);
									}
									else {
										xSign = (flag & 0x01) ? 1 : -1;
										ySign = (flag & 0x02) ? 1 : -1;
										let x, y;
			
										if (flag < 84) {
											// x and y are 4-bit
											base = flag - 20;
											xDelta = ((base >> 4)) * 16 + 1;
											yDelta = ((base % 16) >> 2) * 16 + 1;
											xy = gBuf.u8;
											x = xy >> 4;
											y = xy & 0x0f;
										}
										else if (flag < 120) {
											// x and y are 8-bit
											base = flag - 84;
											xDelta = Math.floor(base / 12) * 256 + 1;
											yDelta = ((base % 12) >> 2) * 256 + 1;
											x = gBuf.u8;
											y = gBuf.u8;
										}
										else if (flag < 124) {
											// x and y are 12-bit
											x = gBuf.u8 << 4;
											xy = gBuf.u8;
											x += xy >> 4;
											y = gBuf.u8 + ((xy & 0x0f) << 8);
										}
										else {
											// x and y are 16-bit
											x = gBuf.u16;
											y = gBuf.u16;
										}
										dx = xSign * (xDelta + x);
										dy = ySign * (yDelta + y);
									}
			
									// update the absolute point values
									cx += dx;
									cy += dy;
			
									// update bbox
									if (!bboxIsEmbedded) {
										if (pt == 0) {
											xMin = xMax = cx;
											yMin = yMax = cy;
										}
										else {
											if (cx < xMin) xMin = cx; // this is much faster than Math.min()
											if (cy < yMin) yMin = cy;
											if (cx > xMax) xMax = cx;
											if (cy > yMax) yMax = cy;
										}
									}
			
									// prepare dxArray and dyArray for decompressed buffer: note that we do not push 0 values!
									if (options.packPoints) {
										if (dx==0)
											f |= 0x10;
										else {
											if (dx >= -255 && dx <= 255)
												f |= (dx > 0 ? 0x12 : 0x02);
											dxArray.push(dx);
										}
		
										if (dy==0)
											f |= 0x20;
										else {
											if (dy >= -255 && dy <= 255)
												f |= (dy > 0 ? 0x24 : 0x04);
											dyArray.push(dy);
										}
		
										glyfFlags[pt] = f; // the curve bit is already set
									}
									else {
										// write to a buffer here, copy it to outputBuf later
										// - we already know the relative positions of f, dx and dy so we can write them all now without intermediate storage
										unpackedU8[pt] = f;
										unpacked.setInt16(pt * 2 + numPoints,     dx);
										unpacked.setInt16(pt * 2 + numPoints * 3, dy);
									}
								}
		
								// handle instructions
								instructionLength = gBuf.u16_255; // always read instructionLength from the glyph stream
								if (instructionLength == 0 || options.ignoreInstructions) {
									// no instructions
									outputBuf.u16 = 0;
								}
								else {
									// yes instructions
									outputBuf.u16 = instructionLength;
									const instrBuf = new Uint8Array(bufs.instruction.buffer, bufs.instruction.byteOffset + bufs.instruction.tell(), instructionLength);
									outputBufU8.set(instrBuf, outputBuf.tell()); // copy instrBuf to the output stream at location outputBuf.tell()
									bufs.instruction.seekr(instructionLength); // update source pointer
									outputBuf.seekr(instructionLength); // update target pointer
								}
		
								// we have all the flags and all the dx and dy values
								if (options.packPoints) {

									// 1. write flags with RLE
									let rpt = 0;
									outputBuf.u8 = glyfFlags[0]; // means we don’t check pt>0 in the loop
									for (let pt=1; pt<numPoints; pt++) {
										if (glyfFlags[pt] == glyfFlags[pt-1] && rpt < 255) {
											rpt++;
										}
										else {
											rpt = 0;
										}
						
										if (rpt<2) {
											outputBuf.u8 = glyfFlags[pt]; // write without compression (don’t compress 2 consecutive identical bytes)
										}
										else {
											const currentPos = outputBuf.tell();
											if (rpt==2) {
												outputBuf.seek(currentPos-2);
												outputBuf.u8 = glyfFlags[pt] | 0x08; // set repeat bit on the pre-previous flag byte
											}
											outputBuf.seek(currentPos-1);
											outputBuf.u8 = rpt; // write the number of repeats
										}
									}
		
									// 2. write x or y coordinates (dxArray and dyArray only contain non-zero values, so we avoid a check here!)
									const writePoint = v => {
										const va = Math.abs(v);
										if (va < 256)
											outputBuf.u8 = va;
										else
											outputBuf.i16 = v;
									};
									dxArray.forEach(writePoint);
									dyArray.forEach(writePoint);
								}
								else {
									outputBufU8.set(unpackedU8, outputBuf.tell());
									outputBuf.seekr(unpackedU8.length);
								}
							}
						
							// COMPOSITE GLYPH
							else if (numberOfContours == -1) {
								// composite is a simple copy operation, but we need to find out how many bytes to copy
								// - format here is identical to regular glyf format, so there is no decoding (except for instructionLength format and location of instructions)
								const compGlyphStart = bufs.composite.tell();
								let compGlyphSize = 0;
								let flags;
								let weHaveInstructions = false;
								do {
									flags = bufs.composite.u16;
									let compSize = 6; // the minimum size of a component: flags (2 bytes), glyphId (2 bytes), arg0 (1 byte), arg1 (1 byte)
									if (flags & 0x0001) // ARG_1_AND_2_ARE_WORDS
										compSize += 2;
									if (flags & 0x0008) // WE_HAVE_A_SCALE
										compSize += 2;
									else if (flags & 0x0040) // WE_HAVE_AN_X_AND_Y_SCALE
										compSize += 4;
									else if (flags & 0x0080) // WE_HAVE_A_TWO_BY_TWO
										compSize += 8;	
									if (flags & 0x0100) { // WE_HAVE_INSTRUCTIONS
										weHaveInstructions = true;
										if (options.ignoreInstructions) {
											bufs.composite.seekr(-2);
											bufs.composite.u16 = flags & ~0x0100; // clear the WE_HAVE_INSTRUCTIONS bit
										}
									}
			
									bufs.composite.seekr(compSize-2); // get to the start of the next component
									compGlyphSize += compSize;
								} while (flags & 0x0020); // MORE_COMPONENTS
								// now the pointer is at compGlyphStart + compGlyphSize
		
								// composite: copy glyph
								const compBuf = new Uint8Array(bufs.composite.buffer, bufs.composite.byteOffset + compGlyphStart, compGlyphSize); // set up compBuf ready for copying to the output stream
								outputBufU8.set(compBuf, outputBuf.tell()); // copy compBuf to the output stream at location outputBuf.tell()
								outputBuf.seekr(compGlyphSize); // fix the pointer after copying
			
								// composite: copy instructions
								if (weHaveInstructions) {
									instructionLength = bufs.glyph.u16_255; // "Read one 255UInt16 value from the glyph stream" (N.B. glyph stream not composite stream!)
									if (!options.ignoreInstructions) {
										outputBuf.u16 = instructionLength;
										if (instructionLength > 0) {
											const instrBuf = new Uint8Array(bufs.instruction.buffer, bufs.instruction.byteOffset + bufs.instruction.tell(), instructionLength);
											outputBufU8.set(instrBuf, outputBuf.tell()); // copy compBuf to the output stream at location outputBuf.tell()
											outputBuf.seekr(instructionLength);
											bufs.instruction.seekr(instructionLength);
										}
									}
								}
							}
			
							// write bbox for simple and composite glyphs (works for embedded or calculated bbox)
							const glyphEnd = outputBuf.tell();
							outputBuf.seek(glyphStart+2);
							outputBuf.i16_array = [xMin, yMin, xMax, yMax];
							outputBuf.seek(glyphEnd);
			
							// pad glyph to 2 bytes (all glyphs need this)
							outputBuf.padToModulo(2);
			
						} // end of non-empty glyph branch
			
						// write loca in either 16-bit or 32-bit format
						// - hmm, an algo that just stores loca in an array, then writes afterwards is probabaly just as quick for 16 bit, faster for 32 bit loca, much easier to read...
						const glyphLoca = outputBuf.tell() - table.offset;
						if (glyphLoca / 2 < 0x10000) {
							locaBuffer.u16 = glyphLoca / 2; // write 16-bit loca
						}
						else {
							// write 32-bit loca
							if (indexToLocFormat==0) {
								// transform the existing 16-bit locas into 32-bit locas: we rewrite g values, then write the (g+1)th value
								indexToLocFormat = 1;
								for (let g_ = g; g_ >= 0; g_--) { // copy IN REVERSE so we don’t overwrite
									locaBuffer.seek(2*g_);
									const longPos = locaBuffer.u16 * 2;
									locaBuffer.seek(4*g_);
									locaBuffer.u32 = longPos;
								}
								locaBuffer.seek(4*(g+1)); // now it’s in the right position for subsequent writes
							}
							locaBuffer.u32 = glyphLoca; // write 32-bit loca
						}
			
			
					} // end of glyph loop
			
					table.length = outputBuf.tell() - table.offset; // determine glyf table length (it’s the current position of outputBuf minus the offset of this table)
					tableDirectory.loca.length = locaBuffer.tell(); // determine loca table length (it’s the current position of locaBuffer)
					tableDirectory.loca.buffer = locaBuffer; // assign locaBuffer to loca table buffer so it works when being written to outputBuf in the "default" case below
					break;
				}
		
				// write any table (apart from glyf)
				// - loca is also cool here, since we’ve set up tableDirectory.loca.length and tableDirectory.loca.buffer in the "glyf" case above (and loca always succeeds glyf)
				default: {
		
					if (!table.length)
						table.length = table.origLength;
					table.offset = outputBuf.tell();
					table.checkSum = 0;
		
					// copy the table buffer to outputBuf
					const tableBufferU8 = new Uint8Array(table.buffer.buffer, table.buffer.byteOffset, table.length);
					outputBufU8.set(tableBufferU8, outputBuf.tell());
					outputBuf.seekr(table.length);
					break;
				}
			}
		
			// add padding
			outputBuf.padToModulo(4);
		});

		// store the length... we’re next going to fix the beginning
		const finalLength = outputBuf.tell();

		// FIXUPS

		// fix head.indexToLocFormat to the value actually used, rather the one read from the input
		outputBuf.seek(tableDirectory.head.offset + 50);
		outputBuf.u16 = indexToLocFormat; // either 0 or 1

		// write final header and table directory
		outputBuf.seek(0);
		outputBuf.u32 = header.flavor;
		outputBuf.u16 = tables.length;
		outputBuf.u16_array = SamsaFont.prototype.binarySearchParams(tables.length); // write 3 U16s for the binary search params
		tables
			.sort((a,b) => compareString(a.tag, b.tag)) // sort by tag
			.forEach(table => outputBuf.u32_array = this.tableDirectoryEntry(table)); // write 4 U32s for the table directory entry

		// return the tables, if requested
		if (options.tables !== undefined)
			options.tables = tables;
		if (options.tableDirectory !== undefined)
			options.tableDirectory = tableDirectory;

		// return the SamsaBuffer as either a Uint8Array or a SamsaBuffer, depending on options
		// TODO: truly release the unused memory, using TypedArray.set() to copy the required part to a new buffer (perhaps make it an option, so the caller can prioritize either speed or memory)
		return options.Uint8Array ? new Uint8Array(outputBufU8.buffer, 0, finalLength)
								  : new SamsaBuffer(outputBufU8.buffer, 0, finalLength);
	}

	// decode header of GSUB and GPOS table
	decodeGSUBGPOSheader(table) {
		table.version = [this.u16, this.u16]; // [0] is majorVersion, [1] is minorVersion
		if (table.version[0] === 1) {
			table.scriptListOffset = this.u16;
			table.featureListOffset = this.u16;
			table.lookupListOffset = this.u16;
			if (table.version[1] >= 1) {
				table.featureVariationsOffset = this.u32;
			}

			// get script list
			this.seek(table.scriptListOffset);
			table.scripts = this.decodeScriptList();

			// get features (initial data)
			this.seek(table.featureListOffset);
			table.features = this.decodeFeatures();

			// get lookup count
			this.seek(table.lookupListOffset);
			table.lookupCount = this.u16;
		}
	}

	// decode a scriptList
	// - every GPOS and GSUB table references a scriptList
	decodeScriptList() {

		const decodeLangSys = langSysOffset => {
			const tell = this.tell();
			this.seek(scriptListOffset + langSysOffset);
			this.seekr(2); // lookupOrderOffset (reserved, so always null)
			const langSys = {
				requiredFeatureIndex: this.u16,
				featureIndices: [],
			};
			const featureIndexCount = this.u16;
			for (let f=0; f<featureIndexCount; f++) {
				langSys.featureIndices.push(this.u16);
			}
			this.seek(tell); // restore the data pointer
			return langSys;
		};

		const scriptListOffset = this.tell();
		const scripts = {}; // we index by script tag, e.g. "latn", "DFLT"
		const scriptCount = this.u16;
		for (let s=0; s<scriptCount; s++) {
			const scriptTag = this.tag, scriptOffset = this.u16;
			const tell = this.tell();
			this.seek(scriptListOffset + scriptOffset);
			const defaultLangSysOffset = this.u16;
			scripts[scriptTag] = {
				dflt: defaultLangSysOffset ? decodeLangSys(scriptOffset + defaultLangSysOffset) : null, // we index by language tag, e.g. "dflt", "TRK ", "MOL "
			};
			const langSysCount = this.u16;
			for (let l=0; l<langSysCount; l++) {
				const langTag = this.tag, langSysOffset = this.u16;
				scripts[scriptTag][langTag] = decodeLangSys(scriptOffset + langSysOffset);
			}
			this.seek(tell);
		}

		return scripts;
	}

	// decode a set of features
	// - every GPOS and GSUB table references a set of features
	decodeFeatures() {
		const featureListOffset = this.tell();
		const features = [];
		const featureCount = this.u16;
		for (let f=0; f<featureCount; f++) {
			const feature = { tag: this.tag };
			const offset = this.u16;
			const tell = this.tell();
			this.seek(featureListOffset + offset);
			this.seekr(2); // ignore featureParamsOffset
			feature.lookupIndices = this.u16_pascalArray;
			features.push(feature);
			this.seek(tell);
		}
		return features;
	}

	// decode coverage for a GSUB or GPOS lookup
	decodeCoverage() {
		const coverage = { format: this.u16 };
		switch (coverage.format) {
			case 1: {
				coverage.glyphArray = this.u16_pascalArray;
				break;
			}
			case 2: {
				const rangeCount = this.u16;
				coverage.glyphRanges = [];
				for (let r=0; r<rangeCount; r++) {
					coverage.glyphRanges.push({ startGlyphID: this.u16, endGlyphID: this.u16, startCoverageIndex: this.u16 });
				}
				break;
			}
		}
		return coverage;
	}

}


//-------------------------------------------------------------------------------
// SamsaFont
// - let’s keep this pure, and leave fancy loading from URL or path to special purpose functions
// - buf: a SamsaBuffer containing the font (required)
// - options: various
// - TODO: at some point we need it to work without loading all the glyphs into memory, so they stay in a file, e.g. options.glyphsOnDemand = true
function SamsaFont(buf, options = {}) {

	let valid = true;

	buf.seek(0);
	this.buf = buf; // SamsaBuffer
	this.tables = {};
	this.tableList = [];
	this.glyphs = [];
	this.ItemVariationStores = {}; // keys will be "avar", "MVAR", "COLR", "CFF2", "HVAR", "VVAR"... they all get recalculated when a new instance is requested
	this.metadata = options.metadata || {};

	// font header
	this.header = buf.decode(FORMATS.TableDirectory);

	// validate the table header
	if (this.header.numTables > 100) {
		valid = false;
		console.error("ERROR: Too many tables:", this.header.numTables);
	}
	else if (12 + this.header.numTables * 16 > buf.length) {
		valid = false;
		console.error(`ERROR: Buffer too small to hold table directory of ${this.header.numTables} tables.`);
	}
	else {
		// create table directory
		for (let t=0; t<this.header.numTables; t++) {
			const table = buf.decode(FORMATS.TableRecord);
			
			// validate the table record
			if (!validateTag(table.tag)) {
				valid = false;
				console.error(`ERROR: Table tag is not valid: (${table.tag}).`);
			}
			else if (table.offset < 12 + this.header.numTables * 16 || table.offset + table.length > buf.length) {
				valid = false;
				console.error("ERROR: Table record references memory beyond valid part of the binary.");
			}
			else {
				this.tableList.push(this.tables[table.tag] = table);
			}
		}
	}

	// assign the buffer attribute to each table
	if (options.tableBuffers) {
		// the caller is supplying the buffers for the tables (unusual)
		this.tableList.forEach(table => {
			table.buffer = options.tableBuffers[table.tag]; // fine to assign the others as undefined
		});
	}
	else {
		// the tables are to be found in the supplied buffer in the normal way
		this.tableList.forEach(table => {
			table.buffer = this.bufferFromTable(table.tag);
		});	
	}

	if (!valid) {
		return null;
	}

	// load tables in the following order
	const requestTables = ["name","cmap","OS/2","maxp","head","hhea","hmtx","vhea","vmtx","post","fvar","gvar","avar","COLR","CPAL","MVAR","HVAR","VVAR","STAT","GDEF","GPOS","GSUB","BASE"];
	const requireTables = ["name","cmap","OS/2","maxp","head","hhea","hmtx","post"];

	requestTables.forEach(tag => {
		if (!this.tables[tag] && requireTables.includes(tag)) {
			console.assert(this.tables[tag], "ERROR: Missing required table: ", tag);
		}

		if (this.tables[tag]) {
			//console.log(tag)
			// decode first part of table (or create an empty object)
			const tbuf = this.tables[tag]?.buffer;
			if (tbuf) {
				this[tag] = FORMATS[tag] ? tbuf.decode(FORMATS[tag]) : {};
				this[tag].buffer = tbuf;

				// decode more of the table
				if (SAMSAGLOBAL.TABLE_DECODERS[tag]) {
					SAMSAGLOBAL.TABLE_DECODERS[tag](this, tbuf);
				}
			}	
		}
	});

	// load ItemVariationStores
	const ivsTags = ["avar", "MVAR", "HVAR", "VVAR", "COLR", "GDEF" ];
	ivsTags.forEach(tag => {
		if (this[tag] && this[tag].itemVariationStoreOffset) { // if itemVariationStoreOffset == 0 (legitimate at least in avar), do nothing
			buf.seek(this.tables[tag].offset + this[tag].itemVariationStoreOffset);
			this[tag].itemVariationStore = this.ItemVariationStores[tag] = buf.decodeItemVariationStore();
			console.assert(this[tag].itemVariationStore.axisCount == this.fvar.axisCount, "axisCount mismatch in ItemVariationStore");
		}
	});

	// options.allGlyphs: load all glyphs
	if (options.allGlyphs) {
		let offset = 0;
		// we should do this differently if the font is only lightly loaded, e.g. from a big file that we don’t want to load in full
		for (let g=0; g<this.maxp.numGlyphs; g++) {
			this.buf.seek(this.tables.loca.offset + (g+1) * (this.head.indexToLocFormat ? 4 : 2));
			const nextOffset = this.head.indexToLocFormat ? buf.u32 : buf.u16 * 2;
			buf.seek(this.tables.glyf.offset + offset);
			this.glyphs[g] = buf.decodeGlyph(nextOffset - offset, { id: g, font: this }); // if nextOffset == offset, nothing is read from buf
			offset = nextOffset;
		}

		// options.allTVTs: load all TVTs?
		if (options.allTVTs && this.gvar) {
			const gvar = this.gvar;
			for (let g=0; g<this.maxp.numGlyphs; g++) {

				if (!this.glyphs[g].font)
					console.log(this.glyphs[g]);

				this.glyphs[g].tvts = gvar.buffer.decodeTvts(this.glyphs[g]); // returns tvts array if we have it, otherwise []
			}
		}
	}
}

SamsaFont.prototype.validateChecksums = function () {
	// TODO: make this work with the head table, with the purer version of the the checkSum function, perhaps using an array of the offsets of the U32s to ignore
	const errors = [];
	font.tableList.forEach(table => {
		let actualSum = font.buf.checkSum(table.offset, table.length, table.tag == "head");
		if (table.checkSum !== actualSum) {
			errors.push([table.tag, table.table.checkSum, actualSum]);
		}
	});
	return errors;
}

SamsaFont.prototype.bufferFromTable = function (tag) {
	return new SamsaBuffer(this.buf.buffer, this.tables[tag].offset, this.tables[tag].length);
}

SamsaFont.prototype.getGlyphName = function (glyphId) {
	let name = null;
	if (!this.post) {
		return null;
	}
	if (this.post.version === 2.0) {
		const index = this.post.glyphNameIndex[glyphId];
		if (index < 258) {
			name = SAMSAGLOBAL.stdGlyphNames[index];
		}
		else {
			this.post.buffer.seek(this.post.pascalStringIndices[index - 258]);
			name = this.post.buffer.decodePascalString();
		}
	}
	return name;
}

// given an ivs and a tuple, returns a 2d array of values that need to be added to the items they apply to
// - although delta values are always integers, interpolated deltas are in general floating point
SamsaFont.prototype.itemVariationStoreInstantiate = function (ivs, tuple) {
	const scalars = this.getVariationScalars(ivs, tuple); // get the region scalars: we get this only ONCE per instance
	const interpolatedDeltas = []; // a 2d array made of (ivd.deltaSets.length) arrays of interpolated delta values
	ivs.ivds.forEach((ivd, i) => {
		interpolatedDeltas[i] = [];
		ivd.deltaSets.forEach(deltaSet => {
			let d = 0;
			deltaSet.forEach((delta, r) => d += scalars[ivd.regionIds[r]] * delta); // this is where the good stuff happens!
			interpolatedDeltas[i].push(d);
		});
	});
	return interpolatedDeltas;
}

// process ItemVariationStore to get scalars for an instance (including avar2)
// - the returned scalars[n] array contains a scalar for each region (therefore regions.length == scalars.length)
//SamsaFont.prototype.getVariationScalars = function (regions, tuple) {
SamsaFont.prototype.getVariationScalars = function (ivs, tuple) {
	const scalars = [];
	const regions = ivs.regions;
	regions.forEach(region => { // for each region...
		// ... go thru each of the axisCount linearRegions in the region
		let S = 1;
		for (let a=0; a < ivs.axisCount; a++) {
			const [start, peak, end] = region[a];
			if (peak !== 0) { // does the linearRegion participate in the calculation?
				const v = tuple[a]; // v is the a’th normalized axis value from the tuple
				if (v == 0) {
					S = 0;
					break; // zero scalar, which makes S=0, so quit loop (maybe this is more common than the v==peak case, so should be tested first)
				}
				else if (v !== peak) { // we could let the v==peak case fall through, but it’s common so worth testing first
					const vMstart = v - start, vMend = v - end; // precalculating these speeds things up a bit
					if (vMstart < 0 || vMend > 0) {
						S = 0;
						break; // zero scalar, which makes S=0, so quit loop (maybe this is more common than the v==peak case, so should be tested first)
					}
					else if (v < peak)
						S *= vMstart / (peak - start);
					else if (v > peak) // because we already tested all other possibilities (including v==peak) we could remove this test and just have "else"
						S *= vMend / (peak - end);
				}
			}
		}
		scalars.push(S);
	});
	return scalars;
}

SamsaFont.prototype.loadGlyphById = function (glyphId, cache = true) {
	const buf = this.buf;
	buf.seek(this.tables.loca.offset + glyphId * (this.head.indexToLocFormat ? 4 : 2));
	const offsets = this.head.indexToLocFormat ? [buf.u32, buf.u32] : [buf.u16 * 2, buf.u16 * 2];
	buf.seek(this.tables.glyf.offset + offsets[0]);
	const glyph = buf.decodeGlyph(offsets[1] - offsets[0], { id: glyphId, font: this }); // offsets[1] - offsets[0] is the byteLength of the glyph
	if (cache) {
		this.glyphs[glyphId] = glyph; // preserve in the glyphs array
	}
	return glyph;
}

// SamsaFont.glyphIdFromUnicode() – returns glyphId for a given unicode code point
// uni: the code point
// return: the glyphId (0 if not found)
// Notes: Handles formats 0, 4, 12.
SamsaFont.prototype.glyphIdFromUnicode = function (uni) {

	const cmap = this.cmap;
	const tbuf = this.cmap.buffer;
	let g=0;

	// which encoding shall we use?
	const encodingsOrder = [0x0003000a, 0x00030001, 0x00000006, 0x00000003, 0x00010000]; // try encodings in this order: [3,10], [3,1], [0,6], [0,3], [1,0]

	let encoding;
	for (let e=0; e<encodingsOrder.length; e++) {
		if (cmap.encodings[encodingsOrder[e]]) {
			encoding = cmap.encodings[encodingsOrder[e]];
			break;
		}
	}
	
	if (encoding) {
		switch (encoding.format) {

			case 0: { // "Byte encoding table"
				g = encoding.mapping[uni] ?? 0;
				break;
			}

			case 4: { // "Segment mapping to delta values"
				// algo: https://learn.microsoft.com/en-us/typography/opentype/spec/cmap#format-4-segment-mapping-to-delta-values
				let s, segment;
				for (s=0; s<encoding.segments.length; s++) { // ideally this would be a binary search on segment.end (and could quite easily be done directly on the undecoded blob)
					segment = encoding.segments[s];
					if (uni >= segment.start && uni <= segment.end) {
						break;
					}
				}

				if (s < encoding.segments.length - 1) {
					if (segment.idRangeOffset) {
						tbuf.seek(encoding.idRangeOffsetOffset + s * 2 + segment.idRangeOffset + (uni - segment.start) * 2);
						g = tbuf.u16;
						if (g > 0)
							g += segment.idDelta;
					}
					else {
						g = uni + segment.idDelta;
					}								
					g %= 0x10000;
				}
				break;
			}

			case 12: { // "Segmented coverage"
				for (let grp=0; grp<encoding.groups.length; grp++) {
					const group = encoding.groups[grp];
					if (uni >= group.start && uni <= group.end) {
						g = group.glyphId + uni - group.start;
						break;
					}
				}
				break;
			}

			default:
				break;
		}
	}

	return g;
}


// utility functions
// - these don’t use the font at all, but it’s a way to get them exported
SamsaFont.prototype.linearGradientFromThreePoints = function (points) {
	const
		[p0, p1, p2] = points,
		d1 = [p1[0] - p0[0], p1[1] - p0[1]],
		d2 = [p2[0] - p0[0], p2[1] - p0[1]],
		dotProd = d1[0] * d2[0] + d1[1] * d2[1],
		rotLengthSquared = d2[0] * d2[0] + d2[1] * d2[1],
		magnitude = dotProd / rotLengthSquared;

	return [p1[0] - magnitude * d2[0], p1[1] - magnitude * d2[1]];
}

SamsaFont.prototype.hexColorFromU32 = function (num) {
	let hex = ((((num & 0xff000000) >>> 16) | (num & 0x00ff0000) | ((num & 0x0000ff00) << 16) | num & 0x000000ff) >>> 0).toString(16).padStart(8, "0");
	if (hex.endsWith("ff"))
		hex = hex.substring(0, 6);
	if (hex[0] == hex[1] && hex[2] == hex[3] && hex[4] == hex[5] && (hex.length == 8 ? hex[6] == hex[7] : true))
		hex = hex[0] + hex[2] + hex[4] + (hex.length == 8 ? hex[6] : "");
	return "#" + hex;
}

SamsaFont.prototype.u32FromHexColor = function (hex, opacity=1) {
	if (hex[0] == "#") {
		hex = hex.substring(1);
	}
	if (hex.match(/^[0-9a-f]{3,8}$/i) && hex.length == 3 || hex.length == 4 || hex.length == 6 || hex.length == 8) {
		if (hex.length <= 4) {
			hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] + (hex.length == 4 ? hex[3] + hex[3] : "");
		}
		if (hex.length == 6) {
			hex += (opacity * 255).toString(16).padStart(2,"0");
		}
		return parseInt(hex.substring(4,6), 16) * 0x1000000 + parseInt(hex.substring(2,4), 16) * 0x10000 + parseInt(hex.substring(0,2), 16) * 0x100 + parseInt(hex.substring(6,8), 16);
	}
	else {
		return 0x000000ff; // back to black
	}
}

SamsaFont.prototype.binarySearchParams = function (num) {
	let sr=1, es=0, rs;
	while (sr*2 <= num) {
		sr*=2;
		es++;
	}
	sr *= 16;
	rs = (16*num)-sr;
	return [sr, es, rs]; // searchRange, entrySelector, rangeShift
}



//////////////////////////////////
//  tupleFromFvs()
// - fvs is an object where axis tags are keys and axis values are values
// - returns: a tuple of length this.axisCount, with values normalized but *without* avar mapping
//////////////////////////////////
SamsaFont.prototype.tupleFromFvs = function (fvs) {

	let tuple = [];
	let valid = true;
	if (!this.fvar)
		return tuple;

	this.fvar.axes.forEach((axis,a) => {
		const val = (!fvs || fvs[axis.axisTag] === undefined) ? axis.defaultValue : 1 * fvs[axis.axisTag];
		let n; // normalized value
		if (val == axis.defaultValue)
			n = 0;
		else if (val > axis.defaultValue) {
			if (val > axis.maxValue) // by using > rather than >= here we ensure clamping works properly
				n = 1;
			else
				n = axis.maxValue==axis.defaultValue? 0 : (val - axis.defaultValue) / (axis.maxValue - axis.defaultValue);
		}
		else { // val < axis.defaultValue
			if (val < axis.minValue)
				n = -1;
			else
				n = axis.minValue==axis.defaultValue? 0 : (axis.defaultValue - val) / (axis.minValue - axis.defaultValue);
		}
		tuple[a] = n;
	});

	return valid ? tuple : Array(this.fvar.axisCount).fill(0);
}

//////////////////////////////////
//  fvsFromTuple()
// - tuple is an array of axis values that have been transformed by avar1 mappings, but not avar2 mappings
// - returns: an fvs-style object where axis tags are keys and axis values are values
//////////////////////////////////
SamsaFont.prototype.fvsFromTuple = function (tuple) {
	let fvs = {};
	if (!this.fvar)
		return fvs;

	this.fvar.axes.forEach((axis,a) => {
		const n = tuple[a];
		let val = axis.defaultValue;
		if (n > 0)
			val += n * (axis.maxValue - axis.defaultValue);
		else if (n < 0)
			val += n * (axis.minValue - axis.defaultValue);
		fvs[axis.axisTag] = val;
	});
	return fvs;
}


//////////////////////////////////
//  instance()
// - return an instance of the font, based on the supplied axisSettings (if any)
//////////////////////////////////
SamsaFont.prototype.instance = function (axisSettings={}) {
	return new SamsaInstance(this, axisSettings);
}

// convenience functions
SamsaFont.prototype.axes = function () {
	return this.fvar ? this.fvar.axes : [];
}

SamsaFont.prototype.instances = function () {
	return this.fvar ? this.fvar.instances : [];
}

SamsaFont.prototype.fvsFromCoordinates = function (coordinates) { // note that coordinates here are not normalized, so directly from the user or the fvar table
	const fvs = {};
	if (this.fvar) {
		this.fvar.axes.forEach((axis,a) => {
			if (coordinates === undefined)
				fvs[axis.axisTag] = axis.defaultValue; // set coordinates == undefined to get a default fvs (of course you can use an empty object for this)
			else
				fvs[axis.axisTag] = coordinates[a];
		});
	}
	return fvs;
}

SamsaFont.prototype.coordinatesFromFvs = function (axisSettings) {
	const coordinates = [];
	if (this.fvar) {
		this.fvar.axes.forEach((axis,a) => {
			coordinates[a] = axisSettings[axis.axisTag] ?? axis.defaultValue;
		});
	}
	return coordinates;
}


//-------------------------------------------------------------------------------
// SamsaInstance
// - font is a SamsaFont
// - userTuple is an initial tuple, *before* processing by avar
function SamsaInstance(font, axisSettings={}, options={}) {

	this.font = font;
	if (options.name)
		this.name = options.name;
	if (options.ppem)
		this.ppem = options.ppem;
	const {avar, gvar} = font; // destructure table data objects
	this.axisSettings = {...axisSettings};
	this.coordinates = font.coordinatesFromFvs(axisSettings); // the coordinates of the instance in user space
	this.userTuple = font.tupleFromFvs(axisSettings); // the original tuple untransformed by avar
	this.tuple = [...this.userTuple]; // this tuple gets transformed by avar
	const tuple = this.tuple;
	this.glyphs = [];
	this.deltaSets = {}; // deltaSets from ItemVariationStore: keys are "MVAR", "COLR" etc. Note that each set of deltas corresponds to different types of default item.
	this.sharedScalars = []; // scalars for the sharedTuples are calculated just once per instance
	const axisCount = font.fvar ? font.fvar.axisCount : 0;

	// validate tuple
	if (!validateTuple (tuple, axisCount)) {
		return undefined;
	}

	// round tuple to the nearest 1/16384 (ensures we get exactly 0, 1, -1 when we are off by a tiny amount)
	// - the spec: "Convert the final, normalized 16.16 coordinate value to 2.14 by this method: add 0x00000002, and sign-extend shift to the right by 2." https://learn.microsoft.com/en-us/typography/opentype/spec/otvaroverview#coordinate-scales-and-normalization
	for (let a=0; a<axisCount; a++) {
		tuple[a] = Math.round(tuple[a] * 16384) / 16384;
	}

	// set isDefault
	this.isDefault = true;
	for (let v of tuple) {
		if (v) {
			this.isDefault = false;
			break;
		}
	}		

	// avar mappings must come first! since all subsequent variation operation use the tuple remapped by avar
	// - the tuple supplied to the SamsaInstance() constructor is modified here (maybe it should be a copy)
	// - maybe encapsulate avar transform in a function
	if (avar) {

		// avar1
		// - transform tuple into avar-v1-mapped tuple, one axis at a time
		avar.axisSegmentMaps.forEach((map,a) => {
			let n = tuple[a];
			for (let m=0; m<map.length; m++) {
				if (map[m][0] >= n) {
					if (map[m][0] == n)
						n = map[m][1];
					else
						n = map[m-1][1] + (map[m][1] - map[m-1][1]) * ( ( n - map[m-1][0] ) / ( map[m][0] - map[m-1][0] ) );
					break;
				}
			}
			tuple[a] = n;
		});
		this.avar1Tuple = [...tuple]; // save the avar1-transformed tuple

		// avar2
		// - instantiate the avar2 ItemVariationStore
		if (avar.itemVariationStore) {

			// avar2 mappings
			const deltas = font.itemVariationStoreInstantiate(avar.itemVariationStore, tuple);
			
			// each entry in axisIndexMap defines how a particular axis gets influenced by the region scalars
			// - axisId is given by index in axisIndexMap
			// - note that some axes may not have avar2 transformations: they either have entry==[0xffff,0xffff] or their axisId is >= axisIndexMap.length
			// - index identifies the value in the 2d array interpolatedDeltas (the same indexing that identifies the ivd and the deltaSet within the ivd)
			// - we iterate through all axes, since it could be that this.avar.axisIndexMap.length < this.axisCount yet the last entry in this.axisCount is not 0xffff/0xffff, this must be repeated
			for (let a=0; a<axisCount; a++) {
				let outer, inner;
				if (avar.axisIndexMap) {
					[outer, inner] = avar.axisIndexMap[ Math.min(a, avar.axisIndexMap.length - 1) ]; // use the a’th entry or the last entry of axisIndexMap
				}
				else { // implicit axisIndexMap
					outer = a >> 16; // yes, I know this will always be 0
					inner = a & 0xffff; // yes, I know this will always be a
				}
				if (outer !== 0xffff && inner !== 0xffff) { // if this entry is non-null... (hmm, might be nicer to have created a sparse array in the first place, skipping nulls and thus avoiding this check)
					tuple[a] += Math.round(deltas[outer][inner]) / 0x4000; // add the interpolated delta to tuple[a]; note that the spec provides an integer method for rounding
					tuple[a] = clamp(tuple[a], -1, 1); // clamp the result to [-1,1]
				}
			}
		}
	}

	
	// instantiate the item variation stores
	// TODO: fix the logic of where this comes... it should probably happen only if(font.avar) rather than within if there are any ItemVariationStores
	// then instantiate the other item variation stores
	Object.keys(font.ItemVariationStores).forEach(key => {

		if (key != "avar") { // we already handled the avar2 ItemVariationStore, if it exists
			const deltaSets = font.itemVariationStoreInstantiate(font.ItemVariationStores[key], tuple); // does this need to stick around? no for MVAR, as we can get the new values
			
			// each ivs has its own way of mapping indices; the mapping can maybe be done JIT...
			switch (key) {
				case "MVAR" : {
					this.MVAR = {};
					Object.keys(font.MVAR.valueRecords).forEach(tag => { // would be slightly more efficient if we store font.MVAR.valueRecords as an array of arrays: [tag, outer, inner], then we can just .forEach() easily
						const [outer, inner] = font.MVAR.valueRecords[tag];
						this.MVAR[tag] = deltaSets[outer][inner]; // e.g. instance.MVAR["xhgt"] = deltaSets[1,15]; // yields delta to add to OS/2.sxHeight for this instance
					});
					break;
				}

				default: {
					this.deltaSets[key] = deltaSets; // TODO: shouldn’t this be deltas, not deltaSets?
					break;
				}
			}
			// note that some itemVariationStore tables (COLR, HVAR) might be large, and it would be better for just a portion to be instantiated on demand
		}
	});

	// calculate instance.sharedScalars (they’re derived from gvar’s shared tuples using the current user tuple)
	// - this caching should marginally speed things up
	// - we index by the same ids used within the per-glyph tvt data deeper in gvar
	// - note this calculation must come after avar calculation
	if (gvar) {
		gvar.sharedTuples.forEach(sharedTuple => {

			let S=1;
			for (let a=0; a<axisCount; a++) { // each element of sharedTuple is -1, 0 or 1 (it records peaks only, with implicit start and end
				if (sharedTuple[a] == 0) // no effect, peak = 0 means do nothing, in other words *= 1
					continue;
				else if (tuple[a] == 0 || sharedTuple[a] * tuple[a] < 0) { // 1) if any of the contributing axes are zero, the scalar is zero; 2) if their signs are different, the scalar is zero
					S = 0;
					break;
				}
				S *= tuple[a]; // the only option left: the simple tent means that the scalar for each axis is equal to the absolute axis value (we fix the sign of S later, after potentially multiple sign flips)
			}
			this.sharedScalars.push(S >= 0 ? S : -S); // fix the sign, then append to this instance’s sharedScalars array
			// TODO: we *can* use sharedScalars like this (they work as is in many fonts) but only in general if they are all non-intermediate, this have peak values -1, 0 or 1 (Bitter variable font violates this, for example)
			// - because the start and end are not local but embedded deep in gvar, we cannot assume they are always the same values (they may very well be, and in theory we could check for this)
			// - currently we are not using sharedScalars
		});
	}

	// instantiate glyphs?
	if (options.allGlyphs) {
		for (let g=0; g<font.numGlyphs; g++) {
			this.glyphs[g] = font.glyphs[g].instantiate(tuple);
		}
	}
	else if (options.glyphIds) {
		options.glyphIds.forEach(g => {
			this.glyphs[g] = font.glyphs[g].instantiate(tuple);
		});
	}
}

// SamsaInstance.glyphAdvance() - return the advance of a glyph
// - we need this method in SamsaInstance, not SamsaGlyph, because SamsaGlyph might not be loaded (and we don’t need to load it, because we have hmtx and HVAR)
// - if we have a variable font and HVAR is not present, we must load the glyph in order to know its variable advance
// - replace it with glyphMetrics() ?
// - maybe we can have a SamsaGlyph.glyphAdvance() method too, which calls this method with its own instance (if it has one).
SamsaInstance.prototype.glyphAdvance = function (glyphId) {
	const font = this.font;
	const advance = [0,0];
	const glyph = font.glyphs[glyphId] || font.loadGlyphById(glyphId);
	const iglyph = glyph.instantiate(this); // we do not need to decompose 

	if (iglyph) {
		// get the advance from SamsaGlyph
		const numPoints = iglyph.numPoints;
		advance[0] = iglyph.points[numPoints+1][0]; // horizontal advance
		advance[1] = iglyph.points[numPoints+2][1]; // vertical advance
	}
	else {
		// TODO: modify the advance using HVAR, VVAR
		// HVAR and VVAR should already be instantiated
		advance[0] = font.hmtx ? font.hmtx[glyphId] : 0;
		advance[1] = font.vmtx ? font.vmtx[glyphId] : 0;

		if (font.HVAR) {
			const [outer, inner] = font.HVAR.indexMap[glyphId];
			const deltas = font.ItemVariationStores["HVAR"];
			advance[0] += deltas[outer][inner];
		}
	}

	return advance;
}

// SamsaInstance.glyphLayoutFromString()
// input: a string or an array of glyphIds
// - return: a GlyphLayout object which is an array of GlyphPlacement objects, each GlyphPlacement pointing to a glyph and an absolute xy offset
// Examples:
// instance.glyphLayoutFromString("hello") // gets the layout for the string "hello"
// instance.glyphLayoutFromString("hello", { liga: false, dlig: true }) // gets the layout for the string "hello", with features liga off and dlig on
// instance.glyphLayoutFromString([234,55]) // gets the layout for the glyph run [234,55]
// - a complete implementation would process OpenType Layout features
SamsaInstance.prototype.glyphLayoutFromString = function (input, userFeatures) {
	const font = this.font;
	const cmap = font.cmap;
	let glyphRun = [];
	const uvsEncoding = cmap.encodings[0x00000005]; // find Unicode Variation Sequence encoding, if any

	// main loop to get initial glyph run
	if (typeof input === "string") {
		const characters = [...input]; // this is a Unicode codepoint array, so items are 21-bit not 16-bit (note that string.length would treat surrogate pairs as 2 characters)
		for (let c=0; c < characters.length; c++) {
			const char = characters[c]; // current character
			const uni = char.codePointAt(0); // current codepoint, an integer <= 0x10FFFF
			if (uni >= 0xfe00 && uni <= 0xfe0f) continue; // let’s ignore variation selectors (we don’t want .notdef to be displayed)
			if (uvsEncoding && uvsEncoding.format === 14 && c < characters.length - 1) {} // possible Unicode Variation Selector follows (potentially forces emoji or text presentation)	
			glyphRun.push(font.glyphIdFromUnicode(uni));
		}	
	}

	// input is already an array of glyphIds
	else if (Array.isArray(input)) {
		glyphRun = input;
	}

	// shape the glyph run in GSUB and GPOS to yield a glyph layout array
	// - this is the equivalent of HarfBuzz hb_shape()
	glyphRun = this.glyphRunGSUB(glyphRun, { userFeatures: userFeatures }); // to specify script and language, use properties on options, e.g. script: "latn", language: "TRK "
	const glyphLayout = this.glyphLayoutSimple(glyphRun); // initial simple layout array from glyph advance widths
	const glyphLayoutFinal = this.glyphLayoutGPOS(glyphLayout); // returns the input if there is no GPOS table

	// it’s ready!
	return glyphLayoutFinal;
}


// SamsaInstance.glyphLayoutSimple()
// - return a simple glyph layout array from a glyph run, based only on glyph advance widths
SamsaInstance.prototype.glyphLayoutSimple = function (glyphRun) {
	const layout = [];
	let x = 0, y = 0;
	glyphRun.forEach(glyphId => {
		const [dx, dy] = this.glyphAdvance(glyphId); // glyphAdvance() is responsible for decoding and instantiating the glyph if necessary
		layout.push({ id: glyphId, ax: x, ay: y, dx: dx, dy: dy }); // an array of glyphPlacement objects, similar format to HarfBuzz
		x += dx; // horizontal advance
		y += dy; // vertical advance
	});
	return layout;
}


// SamsaInstance.glyphRunGSUB()
// - process a glyph run with GSUB
// - inputRun is an array of glyph ids
// - options.userFeatures is an object of user features with feature tags as keys and boolean as value, e.g. { "ss01": true, "liga": false }
// - options.script is a 4-character string, e.g. "latn", "cyrl", "DFLT" (can be undefined)
// - options.language is a 4-character string, e.g. "AZE ", "MOL ", "TRK " (can be undefined, will be ignored if script is undefined)
// - return value is the output run (an array of glyph ids)
// Docs:
// - GSUB spec: https://learn.microsoft.com/en-us/typography/opentype/spec/gsub
// - OpenType Layout Common Table Formats: https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2
// - Excellent discussion on feature/lookup processing order: https://typedrawers.com/discussion/3436/order-of-execution-of-opentype-features
SamsaInstance.prototype.glyphRunGSUB = function (inputRun, options={}) {

	const
		RIGHT_TO_LEFT             = 0x0001,
		IGNORE_BASE_GLYPHS        = 0x0002,
		IGNORE_LIGATURES          = 0x0004,
		IGNORE_MARKS              = 0x0008,
		USE_MARK_FILTERING_SET    = 0x0010,
		MARK_ATTACHMENT_TYPE_MASK = 0xFF00;

	// general setup
	const font = this.font;
	const gsub = font.GSUB;
	if (!gsub) return inputRun; // no GSUB table, so no transformation
	const buf = gsub.buffer;
	let run = [...inputRun]; // initialize the run array, which will mutate to become the output run that we return from the function

	// which script and language are active?
	const script = options.script && gsub.scripts[options.script] ? gsub.scripts[options.script] : gsub.scripts["DFLT"];
	if (!script) return inputRun; // no script, no transformation, in case the requested script is not supported and there is no DFLT script
	const langSys = options.language && script[options.language] ? script[options.language] : script["dflt"];
	const requestedFeatures = options.userFeatures || {}; // object with keys as feature tags for keys, true/false for values
	const lookupGroups = [[], [], []]; // we have initial group, normal group, and custom group

	// features are defined by the spec to be on by default: the integer denotes which group they are in (0=initial, 1=normal, 2=custom)
	const featureGroups = {

		// initial lookup group
		ccmp: 0,
		rvrn: 0,
		
		// normal lookup group
		abvm: 1,
		blwm: 1,
		calt: 1,
		clig: 1,
		curs: 1,
		dist: 1,
		kern: 1,
		liga: 1,
		locl: 1,
		mark: 1,
		mkmk: 1,
		rlig: 1,
		rclt: 1,
	};

	// add any requested features that are not in the default feature groups to final group, and remove any that are explicitly turned off
	Object.keys(requestedFeatures).forEach(tag => {
		// activate a user-requested feature
		if (requestedFeatures[tag] && featureGroups[tag] === undefined) {
			featureGroups[tag] = 2; // if it’s not already in the list, add it to group 2 (which happen last)
		}
		// disable a system-requested feature
		else if (requestedFeatures[tag] === false && featureGroups[tag] !== undefined) {
			featureGroups[tag] = undefined;
		}
	});

	// lookups setup (this becomes a sparse array)
	const lookups = [];

	// get Feature Variations
	const featureVariations = [];
	if (gsub.featureVariationsOffset) {
		buf.seek(gsub.featureVariationsOffset);
		const version = [buf.u16, buf.u16];
		if (version[0] === 1 && version[1] === 0) {
			const featureVariationRecordCount = buf.u32;
			for (let fvr=0; fvr<featureVariationRecordCount; fvr++) {
				const featureVariation = { conditions: [], substitutions: [] };
				const conditionSetOffset = buf.u32;
				const featureTableSubstitutionOffset = buf.u32;
				const tell = buf.tell();

				// get conditions
				if (conditionSetOffset) {
					buf.seek(gsub.featureVariationsOffset + conditionSetOffset);
					const conditionOffsets = buf.u32_pascalArray;
					conditionOffsets.forEach(offset => {
						buf.seek(gsub.featureVariationsOffset + conditionSetOffset + offset);
						const format = buf.u16;
						if (format === 1) {
							featureVariation.conditions.push({ axisIndex: buf.u16, min: buf.f214, max: buf.f214 }); // axisIndex, filterRangeMinValue, filterRangeMaxValue
						}
					});
				}

				// get substitutions
				if (featureTableSubstitutionOffset) {
					buf.seek(gsub.featureVariationsOffset + featureTableSubstitutionOffset);
					const version = [buf.u16, buf.u16];
					if (version[0] === 1 && version[1] === 0) {
						const count = buf.u16;
						for (let fts=0; fts<count; fts++) {
							const substitution = { featureIndex: buf.u16, lookups: [] };
							const alternateFeatureOffset = buf.u32;
							const tell2 = buf.tell(); // init tell2
							buf.seek(gsub.featureVariationsOffset + featureTableSubstitutionOffset + alternateFeatureOffset);
							buf.seekr(2); // featureParams, always 0
							substitution.lookups = buf.u16_pascalArray;
							featureVariation.substitutions.push(substitution);
							buf.seek(tell2); // return to tell2
						}
					}	
				}

				featureVariations.push(featureVariation); // store this featureVariation
				buf.seek(tell); // return to tell
			}
		}
	}

	// note that these lookups are specific to GSUB
	function decodeLookup(lookupListIndex) {

		// function getCoverageFrom

		if (lookupListIndex >= gsub.lookupCount)
			return false;

		buf.seek(gsub.lookupListOffset + 2 + 2 * lookupListIndex);
		const lookupOffset = buf.u16;
		buf.seek(gsub.lookupListOffset + lookupOffset);
		const lookup = { type: buf.u16, flag: buf.u16, subtables: [] };
		const subtableOffsets = buf.u16_pascalArray;
		subtableOffsets.forEach(sto => {
			const subtableOffset = gsub.lookupListOffset + lookupOffset + sto;
			buf.seek(subtableOffset);
			const subtable = { format: buf.u16 };
			if (lookup.type <= 4) {

				switch (lookup.type) {

					// LookupType 1: Single Substitution Subtable
					case 1: {
						subtable.coverageOffset = buf.u16;
						if (subtable.format === 1) {
							subtable.deltaGlyphID = buf.i16; // note i16
						}
						else if (subtable.format == 2) {
							subtable.substituteGlyphIDs = buf.u16_pascalArray;
						}
						break;
					}

					// LookupType 2: Multiple Substitution Subtable
					case 2: {
						subtable.coverageOffset = buf.u16;
						if (subtable.format === 1) {
							subtable.sequences = [];
							const sequenceOffsets = buf.u16_pascalArray;
							sequenceOffsets.forEach(offset => {
								buf.seek(subtableOffset + offset);
								subtable.sequences.push(buf.u16_pascalArray);
							});
							break;
						}
						break;
					}

					// LookupType 3: Alternate Substitution Subtable
					case 3: {
						subtable.coverageOffset = buf.u16;
						if (subtable.format === 1) {
							subtable.alternateSets = [];
							const alternateSetOffsets = buf.u16_pascalArray;
							alternateSetOffsets.forEach(offset => {
								buf.seek(subtableOffset + offset);
								subtable.alternateSets.push(buf.u16_pascalArray);
							});
						}
						break;
					}

					// LookupType 4: Ligature Substitution Subtable
					case 4: {
						subtable.coverageOffset = buf.u16;
						if (subtable.format === 1) {
							subtable.ligatureSets = []; // a ligature set is a set of ligatures that share the same first glyph (e.g. ffl, ff, fi, fl)
							const ligSetOffsets = buf.u16_pascalArray;
							ligSetOffsets.forEach(offset => {
								buf.seek(subtableOffset + offset);
								const ligSet = [];
								const ligOffsets = buf.u16_pascalArray;
								ligOffsets.forEach(offset2 => {
									buf.seek(subtableOffset + offset + offset2);
									ligSet.push({
										ligatureGlyph: buf.u16,
										componentGlyphIDs: buf.u16_arrayOfLength(buf.u16 - 1), // -1 because componentCount includes the initial glyph
									 });
								});
								subtable.ligatureSets.push(ligSet);
							});
						}
						break;
					}

					// LookupType 5: Contextual Substitution
					case 5: {
						// TODO
						break;
					}

					// LookupType 6: Chained Contexts Substitution
					case 6: {
						// TODO
						/*
						if (subtable.format == 1) {
							subtable.coverage = buf.decodeCoverage();
							subtable.classDef = buf.decodeClassDef();
							subtable.classSet = [];
							const classSetOffsets = buf.u16_pascalArray;
							classSetOffsets.forEach(offset => {
								buf.seek(subtableOffset + offset);
								subtable.classSet.push(buf.u16_pascalArray);
							});
						}
						*/
						break;

					}
				}

				// get coverage for this lookup
				if (subtable.coverageOffset) {
					buf.seek(subtableOffset + subtable.coverageOffset);
					subtable.coverage = buf.decodeCoverage();
				}
			}
			lookup.subtables.push(subtable);
		})
		if (lookup.flag & USE_MARK_FILTERING_SET)
			lookup.markFilteringSet = buf.u16;
		
		return lookup;
	}

	// now we are live

	// get lookups required for featureVariations: altLookupsForFeatureIndex
	const altLookupsForFeatureIndex = []; // sparse array
	featureVariations.forEach(featureVariation => {
		if (featureVariation.conditions.every(condition => inRange(this.tuple[condition.axisIndex], condition.min, condition.max))) { // if all conditions are satisfied...
			featureVariation.substitutions.forEach(substitution => altLookupsForFeatureIndex[substitution.featureIndex] = substitution.lookups ); // ...set up the alternate lookups
		}
	});

	// go thru each feature that this this langSys implements, checking if it is in a valid group
	langSys.featureIndices.forEach(index => {
		const feature = gsub.features[index];
		const groupId = featureGroups[feature.tag]; //  if groupId is 0, 1 or 2 it’s valid; if groupId is undefined, it’s invalid
		if (groupId !== undefined) {
			lookupGroups[groupId].push(...(altLookupsForFeatureIndex[index] || feature.lookupIndices)); // for this feature, use featureVariations lookups if they’re active, otherwise use its default lookupIndices
		}
	});

	// sort each lookup group: each lookupGroup becomes a sorted array of integers
	lookupGroups.forEach(lookupGroup => lookupGroup.sort((a,b) => a-b));
	

	// https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2
	// During text processing, a client applies a feature to some sequence of glyphs for a string. It then processes 
	// the lookups referenced by that feature in their lookup list order. For each lookup, the client processes that 
	// lookup over each glyph in the sequence to which the feature has been applied. After that lookup has been processed 
	// for each glyph in the sequence, it then processes the next lookup referenced by the feature in the same manner. 
	// This continues until all lookups referenced by the feature have been processed.

	// for each lookupList... (we flatten the three lookup groups into a single array of integers)
	lookupGroups.flat().forEach(lookupIndex => {

		// now apply the lookups in this lookup list (decode and cache the lookup if we don’t have it)
		const lookup = lookups[lookupIndex] || (lookups[lookupIndex] = decodeLookup(lookupIndex));

		// go thru the glyphs in the glyph run for this lookupList
		const glyphsNotCovered = {}; // TODO: keep track of glyphs that are not handled by any lookups, so we can avoid testing for them more than once; maybe have it as glyphLookups arrays (e.g. { glyph123: [ lookup1, lookup7, lookup33 ], glyph8: null } ) so each glyph can lookup which lookups it’s handled by (if any), so no need to search thru all lookups
		for (let r=0; r < run.length; r++) { // note that we modify in the loop: r, run, run.length
			
			const g = run[r];
			
			// go thru all subtables until we find one that does something for this glyph, or we run out of subtables
			let found = false;
			for (let s=0; s<lookup.subtables.length && !found; s++) {

				const subtable = lookup.subtables[s];

				// only handle lookup types 1 to 4 for the time being
				if (lookup.type <= 4) {

					// is glyph g covered by this subtable?
					const coverageIndex = coverageIndexForGlyph(subtable.coverage, g);
					if (coverageIndex !== -1) { // if g was found, we’ll now have a coverageIndex

						// Type 1: single substitution
						if (lookup.type == 1) {
							if (subtable.format == 1) {
								run[r] = (run[r] + subtable.deltaGlyphID + 0x10000) % 0x10000; // mutate the run
							}
							else if (subtable.format == 2) {
								run[r] = subtable.substituteGlyphIDs[coverageIndex];  // mutate the run
							}
							found = true;
						}

						// Type 2: multiple substitution
						else if (lookup.type == 2 && subtable.format == 1) {
							// YES: mutate the run! Note that r must be corrected
							const seq = subtable.sequences[coverageIndex];
							run.splice(r, 1, ...seq); // splice in an array (note that we are replacing one glyph)
							r += seq.length - 1; // -1 because we are replacing one glyph (e.g. if the substitition sequence is length=1, then r is already pointing at the correct place)
							found = true;
						}

						// Type 3: alternate substitution
						// - we need to know which alternate to use
						// - needs the collaboration of an application and an api to request particular alternates by id
						else if (lookup.type == 3 && subtable.format == 1) {

						}
		
						// Type 4: ligature substitution
						// - check if this and the following glyphs form a ligature: we know the ligature set by the coverageIndex
						// - find the first match (if any) in the ligatures of this ligature set
						else if (lookup.type == 4 && subtable.format == 1) {
							const ligSet = subtable.ligatureSets[coverageIndex]; // "A LigatureSet table, one for each covered glyph, specifies all the ligature strings that begin with the covered glyph."
							if (ligSet) { // always true in valid fonts
								for (let li=0; li<ligSet.length; li++) {
									const lig = ligSet[li];
									const seq = lig.componentGlyphIDs;
									if (r + seq.length < run.length) { // allows early exit, and avoids a check in the loop
										let d = 0;
										while (d < seq.length && seq[d] === run[r+d+1]) {
											d++;
										}
										if (d === seq.length) { // did we find a ligature?
											// YES: mutate the run! Note that r does not need to be corrected: in "office", r=1 before the "ffi" ligature substitution, and r=1 (correctly) after the ligature substitution, so next glyph will be "c"
											run.splice(r, seq.length+1, lig.ligatureGlyph); // splice the ligature glyphId into the array, replacing seq.length+1 items at position r (note that r is soon incremented by 1 as usual)
											found = true;
											break; // success: we can break out of the for loop // TODO: do we need to break out of the lookup subtables loop too?
										}
									}
								}
							}
						}
					}
				}
			}
		}
	});
	return run;
}


SamsaInstance.prototype.glyphLayoutGPOS = function (inputLayout, options={}) {

	function decodeValueRecord(fmt) {
		if (fmt === 0) {
			return null;
		}
		else {
			// we return an array for efficiency
			const X_PLACEMENT = 0x0001, Y_PLACEMENT = 0x0002, X_ADVANCE = 0x0004, Y_ADVANCE = 0x0008, X_PLACEMENT_DEVICE = 0x0010, Y_PLACEMENT_DEVICE = 0x0020, X_ADVANCE_DEVICE = 0x0040, Y_ADVANCE_DEVICE = 0x0080;
			return [
				fmt & X_PLACEMENT ? buf.i16 : 0,
				fmt & Y_PLACEMENT ? buf.i16 : 0,
				fmt & X_ADVANCE ? buf.i16 : 0,
				fmt & Y_ADVANCE ? buf.i16 : 0,
				fmt & X_PLACEMENT_DEVICE ? buf.u16 : 0,
				fmt & Y_PLACEMENT_DEVICE ? buf.u16 : 0,
				fmt & X_ADVANCE_DEVICE ? buf.u16 : 0,
				fmt & Y_ADVANCE_DEVICE ? buf.u16 : 0,
			];
		}
	}

	function decodeClassDef() {
		const classDef = { classFormat: buf.u16 };
		switch (classDef.classFormat) {
			case 1: {
				classDef.startGlyphID = buf.u16;
				classDef.classValueArray = buf.u16_pascalArray;
				break;
			}
			case 2: {
				classDef.classRanges = [];
				const classRangeCount = buf.u16;
				for (let i=0; i<classRangeCount; i++) {
					classDef.classRanges.push(buf.u16_arrayOfLength(3)); // startGlyphID, endGlyphID, class (faster than making an object)
				}
				break;
			}
		}
		return classDef;
	}

	function findClassForGlyph(g, classDef) {
		let classId = 0; // "Any glyph not included in the range of covered glyph IDs automatically belongs to Class 0 ... Any glyph not covered by a ClassRangeRecord is assumed to belong to Class 0" - from the spec
		switch (classDef.classFormat) {
			case 1: {
				const index = g - classDef.startGlyphID;
				if (inRange(index, 0, classDef.classValueArray.length-1)) {
					classId = classDef.classValueArray[index];
				}
				break;
			}
			case 2: {
				for (let r=0; r<classDef.classRanges.length; r++) {
					const range = classDef.classRanges[r];
					if (g <= range[1]) { // if g <= endGlyphID
						if (g >= range[0]) { // if g >= startGlyphID
							classId = range[2]; // classId = class
						}
						break;
					}
				}
				break;
			}
		}
		return classId;
	}

	function decodeSubtable(lookupType) {

		let subtable = {
			offset: buf.tell(),
			format: buf.u16,
		};

		switch (lookupType) {

			// Lookup Type 1: Single Adjustment Positioning Subtable
			case 1: {
				const coverageOffset = buf.u16;
				const valueFormat = buf.u16;

				// SinglePosFormat1: Single Adjustment Positioning Format 1: Single Positioning Value
				if (subtable.format === 1) {
					subtable.valueRecord = decodeValueRecord(valueFormat);

				}

				// SinglePosFormat2: Single Adjustment Positioning Format 2: Array of Positioning Values
				else if (subtable.format === 2) {
					subtable.valueRecords = [];
					const valueRecordCount = buf.u16;
					for (let i=0; i<valueRecordCount; i++) {
						subtable.valueRecords.push(decodeValueRecord(valueFormat));
					}
				}
				else {
					console.log("Error: unknown subtable format")
				}

				buf.seek(subtable.offset + coverageOffset);
				subtable.coverage = buf.decodeCoverage();
				break;
			}

			// Lookup Type 2: Pair Adjustment Positioning Subtable
			case 2: {
				const coverageOffset = buf.u16;
				const valueFormat1 = buf.u16;
				const valueFormat2 = buf.u16;

				switch (subtable.format) {

					// PairPosFormat1: Pair Adjustment Positioning Format 1: Adjustments for Glyph Pairs
					case 1: {
						const pairSetOffsets = buf.u16_pascalArray;
						subtable.pairSets = [];
						pairSetOffsets.forEach(offset => {
							buf.seek(subtable.offset + offset);
							const pairSet = [];
							const pairValueCount = buf.u16;
							for (let i=0; i<pairValueCount; i++) {
								const pairValueRecord = {};
								pairValueRecord.secondGlyph = buf.u16;
								pairValueRecord.pair = [ decodeValueRecord(valueFormat1), decodeValueRecord(valueFormat2) ];
								pairSet.push(pairValueRecord);
							}
							subtable.pairSets.push(pairSet);
						});
						break;
					}
					
					// PairPosFormat2: Pair Adjustment Positioning Format 2: Class Pair Adjustment
					case 2: {
						const classDef1Offset = buf.u16;
						const classDef2Offset = buf.u16;
						const class1Count = buf.u16;
						const class2Count = buf.u16;
						subtable.pairValueRecords = [];
						for (let c1=0; c1<class1Count; c1++) {
							subtable.pairValueRecords[c1] = [];
							for (let c2=0; c2<class2Count; c2++) {
								subtable.pairValueRecords[c1][c2] = [ decodeValueRecord(valueFormat1), decodeValueRecord(valueFormat2) ];
							}
						}
						buf.seek(subtable.offset + classDef1Offset);
						subtable.classDef1 = decodeClassDef();
						buf.seek(subtable.offset + classDef2Offset);
						subtable.classDef2 = decodeClassDef();
						break;
					}

					default: {
						console.log("Error: unknown subtable format")
						break;
					}
				}
				buf.seek(subtable.offset + coverageOffset);
				subtable.coverage = buf.decodeCoverage();
				break;
			}
			
			// Lookup Type 3: Cursive Attachment Positioning Subtable
			case 3: {
				const coverageOffset = buf.u16;
				buf.seek(subtable.offset + coverageOffset);
				subtable.coverage = buf.decodeCoverage();
				break;
			}

			// Lookup Type 4: Mark-to-Base Attachment Positioning Subtable
			case 4: {
				const markCoverageOffset = buf.u16;
				const baseCoverageOffset = buf.u16;
				const markClassCount = buf.u16;
				const markArrayOffset = buf.u16;
				const baseArrayOffset = buf.u16;
				buf.seek(subtable.offset + markCoverageOffset);
				subtable.markCoverage = buf.decodeCoverage();
				buf.seek(subtable.offset + baseCoverageOffset);
				subtable.baseCoverage = buf.decodeCoverage();
				break;
			}

			// Lookup Type 5: Mark-to-Ligature Attachment Positioning Subtable
			case 5: {
				break;
			}

			// Lookup Type 6: Mark-to-Mark Attachment Positioning Subtable
			case 6: {
				break;
			}

			// Lookup Type 7: Contextual Positioning Subtables
			case 7: {
				break;
			}

			// LookupType 8: Chained Contexts Positioning Subtable
			case 8: {
				break;
			}

			// LookupType 9: Extension Positioning
			case 9: {
				if (subtable.format === 1) {
					const extensionLookupType = buf.u16;
					const extensionOffset = buf.u32;				
					if (extensionLookupType !== 9) { // type 9 cannot reference type 9
						buf.seek(subtable.offset + extensionOffset);
						subtable = decodeSubtable(extensionLookupType);
						subtable.extensionLookupType = extensionLookupType;	
					}
				}
				else {
					subtable = null;
				}					
			}

			default: {
				break;
			}
		}

		return subtable;
	}

	// these lookups are specific to GPOS
	function decodeLookup(lookupListIndex) {

		buf.seek(gpos.lookupListOffset + 2 + 2 * lookupListIndex);
		const lookupOffset = buf.u16;
		buf.seek(gpos.lookupListOffset + lookupOffset);
		let lookup = { type: buf.u16, flag: buf.u16, subtables: [] };
		const subtableOffsets = buf.u16_pascalArray;
		subtableOffsets.forEach(subtableOffset => {
			buf.seek(gpos.lookupListOffset + lookupOffset + subtableOffset);
			lookup.subtables.push(decodeSubtable(lookup.type));
		});

		return lookup;
	}

	// general setup
	const font = this.font;
	const gpos = font.GPOS;

	// no GPOS table, no transformation
	if (!gpos)
		return inputLayout;
	
	const buf = gpos.buffer;
	const layout = [];
	
	// copy the input layout, so we can mutate it without affecting the input
	inputLayout.forEach(layoutItem => {
		const newLayoutItem = {};
		Object.keys(layoutItem).forEach( key => newLayoutItem[key] = layoutItem[key] );
		layout.push(newLayoutItem);
	});

	// hmm... outside of the plugin we had this one-liner working
	// inputLayout.forEach(layoutItem => {console.log(layoutItem); layout.push({...layoutItem})}); // copy the input layout, so we can mutate it without affecting the input

	// which script and language are active?
	// TODO: do this only once for both GSUB and GPOS, as part of creating a SamsaIntance (there can always be a SamsaInstance method that updates script, language & features without creating a new instance)
	const script = options.script && gpos.scripts[options.script] ? gpos.scripts[options.script] : gpos.scripts["DFLT"];
	const langSys = options.language && script[options.language] ? script[options.language] : script["dflt"];
	const requestedFeatures = options.userFeatures || {}; // object with keys as feature tags for keys, true/false for values

	// features are defined by the spec to be on by default: the integer denotes which group they are in (0=initial, 1=normal, 2=custom)
	const featureGroups = {

		// initial lookup group
		ccmp: 0,
		rvrn: 0,
		
		// normal lookup group
		abvm: 1,
		blwm: 1,
		calt: 1,
		clig: 1,
		curs: 1,
		dist: 1,
		kern: 1,
		liga: 1,
		locl: 1,
		mark: 1,
		mkmk: 1,
		rclt: 1,
		rlig: 1,
	};

	// add any requested features that are not in the default feature groups to final group, and remove any that are explicitly turned off
	Object.keys(requestedFeatures).forEach(tag => {
		// activate a user-requested feature
		if (requestedFeatures[tag] && featureGroups[tag] === undefined) {
			featureGroups[tag] = 2; // if it’s not already in the list, add it to group 2 (which happen last)
		}
		// disable a system-requested feature
		else if (requestedFeatures[tag] === false && featureGroups[tag] !== undefined) {
			featureGroups[tag] = undefined;
		}
	});


	const lookupGroups = [[], [], []]; // we have initial group, normal group, and custom group

	// lookups setup (this becomes a sparse array)
	const lookups = [];

	// go thru each feature that this this langSys implements, checking if it is in a valid group
	const altLookupsForFeatureIndex = []; // sparse array
	langSys.featureIndices.forEach(index => {
		const feature = gpos.features[index];
		const groupId = featureGroups[feature.tag]; //  if groupId is 0, 1 or 2 it’s valid; if groupId is undefined, it’s invalid
		if (groupId !== undefined) {
			lookupGroups[groupId].push(...(altLookupsForFeatureIndex[index] || feature.lookupIndices)); // for this feature, use featureVariations lookups if they’re active, otherwise use its default lookupIndices
		}
	});

	
	lookupGroups.forEach(lookupGroup => lookupGroup.sort((a,b) => a-b)); // sort each lookup group: each lookupGroup becomes a sorted array of integers
	lookupGroups.flat().forEach(lookupIndex => {
		const lookup = lookups[lookupIndex] || (lookups[lookupIndex] = decodeLookup(lookupIndex));

		// fix extension lookup type to be that of what it points to (this looks like a hack but is not!)
		if (lookup.type === 9) {
			lookup.type = lookup.subtables[0].extensionLookupType; // all extension subtables have the same lookup type
		}

		// go thru the glyphs in the glyph run for this lookupList
		for (let r=0; r < layout.length; r++) { // note that we modify in the loop: r, run, run.length
			
			const layoutItem = layout[r];
			const g = layoutItem.id;

			// from https://fontforge.org/docs/ui/dialogs/lookups.html
			// "Within a lookup, the subtables will be applied in order until one of them actually does something. Then no further subtables will be executed.
			//  Note that this is different from the way lookups behave – all active lookups will always be applied, but only one subtable in a lookup will be."

			// process all subtables until we find a pair or we run out of subtables
			let found = false;
			for (let s=0; s<lookup.subtables.length && !found; s++) {
				const subtable = lookup.subtables[s];

				// Single adjustment
				if (lookup.type == 1) {
					// TODO
				}

				// Pair adjustment
				else if (lookup.type == 2) {

					if (r+1 >= layout.length) { // we need a next glyph to have a pair to work with
						continue;
					}

					const gNext = layout[r+1].id;
					let pair;

					// get pairValueRecord, either from format 1 or format 2
					if (subtable.format === 1) {
						const coverageIndex = coverageIndexForGlyph(subtable.coverage, g); // is glyph g covered by this subtable?
						if (coverageIndex !== -1) {
							const pairSet = subtable.pairSets[coverageIndex];
							if (pairSet) {
								for (let i=0; i<pairSet.length; i++) {
									if (pairSet[i].secondGlyph === gNext) {
										pair = pairSet[i].pair;
										break;
									}
								}	
							}	
						}
					}
					else if (subtable.format === 2) {
						// find the pairValueRecord for this class pair
						const class1 = findClassForGlyph(g, subtable.classDef1);
						const class2 = findClassForGlyph(gNext, subtable.classDef2);
						pair = subtable.pairValueRecords[class1][class2];
					}

					// if we got a pair, what shall we do with it?
					if (pair) {
						// handle adjustments specified in pairValueRecord[0]
						// - adjusts positions of the current glyph and subsequent glyphs, maybe the input format should be simpler so we calculate absolute positions at the end?
						if (pair[0]) {
							const metrics = [ pair[0][0], pair[0][1], pair[0][2], pair[0][3] ]; // get the static metrics, the first 4 (of 8) items in the array
							if (this.deltaSets["GDEF"]) { // add variation deltas if they exist
								for (let m=0; m<4; m++) {
									const variationIndexOffset = pair[0][4+m];
									if (variationIndexOffset) {
										buf.seek(subtable.offset + variationIndexOffset);
										const outer = buf.u16, inner = buf.u16, deltaFormat = buf.u16; // read variationIndex
										if (deltaFormat === 0x8000) {
											metrics[m] += this.deltaSets["GDEF"][outer][inner];
										}
									}
								}
							}
							layoutItem.ax += metrics[0]; // I don’t think this happens very much... if so, does it shift the advance location too, or just the current visible glyph?
							layoutItem.ay += metrics[1]; // I don’t think this happens very much... if so, does it shift the advance location too, or just the current visible glyph?

							// if the current glyph’s advance has changed, we move all *subsequent* glyphs by the change
							// - this is inefficient, we need to just edit glyphs on their own
							if (metrics[2] || metrics[3]) {
								layoutItem.dx += metrics[2];
								layoutItem.dy += metrics[3];
								for (let r_ = r+1; r_ < layout.length; r_++) {
									layout[r_].ax += metrics[2];
									layout[r_].ay += metrics[3];
								}
							}
						}

						// TODO: handle adjustments specified in pair[1]
						if (pair[1]) {
							const metrics = [ pair[1][0], pair[1][1], pair[1][2], pair[1][3] ]; // get the static metrics, the first 4 (of 8) items in the array

							// TODO: handle adjustments to the second glyph of the pair (seems like almost all fonts touch only the first glyph)
						}

						// we can quit the loop
						found = true;
					}
				}

				// Cursive attachment
				else if (lookup.type == 3) {
					// console.log("We are at type 3");
				}

				// MarkToBase attachment
				else if (lookup.type == 4) {
					// console.log("We are at type 4");
				}

				// MarkToLigature attachment
				else if (lookup.type == 5) {
					// console.log("We are at type 5");
				}

				// MarkToMark attachment
				else if (lookup.type == 6) {
					// console.log("We are at type 6");
				}

				// Context positioning	Position one or more glyphs in context
				else if (lookup.type == 7) {
					// console.log("We are at type 7");
				}

				// Chained Context positioning
				else if (lookup.type == 8) {
					// console.log("We are at type 8");
				}
			}
		}
	});

	return layout;
}


// render text in a particular format for a given SamsaInstance
SamsaInstance.prototype.renderText = function (options={}) {

	// defaults
	// - these would be nicer with the nullish operator ??= (but somewhere in the build procedure to Figma, mullish operators are not supported)
	options.text     ??= "hello, world!";
	options.fontSize ??= 12;
	options.format   ??= "svg";

	const font = this.font;
	const upem = font.head.unitsPerEm;
	const scale = options.fontSize/upem;
	const context = {
		font: font,
		instance: this,
		color: options.color === undefined ? 0x000000ff : options.color,
		paletteId: options.paletteId === undefined ? 0 : options.paletteId,
	};
	const layout = this.glyphLayoutFromString(options.text); // process the string to get default glyph run, then process that glyph run in GSUB and GPOS, yielding the actual glyphs to position
	const glyphRunWidth = layout.length ? layout[layout.length-1].ax + layout[layout.length-1].dx : 0;

	if (options.format === "svg") {

		let innerSVGComposition = "";
		context.defs = {};

		// process layout items
		layout.forEach(layoutItem => {
			const glyph = font.glyphs[layoutItem.id];
			const iglyph = glyph.instantiate(this);
			const thisSVG = iglyph.svg(context); // gets the best possible COLR glyph, with monochrome fallback
			innerSVGComposition += `<g transform="translate(${layoutItem.ax} 0)" fill="${font.hexColorFromU32(context.color)}">` + thisSVG + "</g>";
		});
		const svgWidth = Math.ceil(glyphRunWidth * scale); // does not account for glyph parts that protrude beyond the lsb or advance width, e.g. italic f in many fonts (need to check for bbox.xMin and bbox.xMax)
		const svgHeight = 2 * Math.ceil(options.fontSize); // heuristic, seems to work ok, perhaps should be based on bbox.yMin of all glyphs or a descender metric
		const svgPreamble = options.attributes
							? `<svg${expandAttrs(options.attributes)}>` // custom attributes
							: `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">`; // auto attributes
		const svgPostamble = `</svg>`;
		const gPreamble = `<g transform="scale(${scale} ${-scale}) translate(0 ${-upem})">`;
		const gPostamble = `</g>`;
		const defs = Object.values(context.defs).join("");
		
		return svgPreamble + (defs ? `<defs>${defs}</defs>` : "") + gPreamble + innerSVGComposition + gPostamble + svgPostamble;
	}
}


//-------------------------------------------------------------------------------
// SamsaGlyph
function SamsaGlyph (init={}) {

	this.id = init.id;
	this.name = init.name;
	this.font = init.font;
	this.numPoints = init.numPoints || 0;
	this.numberOfContours = init.numberOfContours || 0;
	this.instructionLength = 0;
	this.points = init.points || [];
	this.components = init.components || [];
	this.endPts = init.endPts || [];
	this.tvts = init.tvts ? font.gvar.buffer.decodeTvts(this) : undefined; // init.tvts is boolean // TODO: this doesn’t work, move it to an options parameter?
	this.curveOrder = init.curveOrder || 2;

	this.xMin = init.xMin || 0;
	this.yMin = init.yMin || 0;
	this.xMax = init.xMax || 0;
	this.yMax = init.yMax || 0;
}


// SamsaGlyph.instantiate()
// - instantiates a glyph
// The first argument is either a SamsaInstance or a tuple
// - if it’s a SamsaInstance, then it takes that instance’s tuple and gets inserted into the glyphs array of the instance
// - if it’s a tuple, then it is a standalone glyph
SamsaGlyph.prototype.instantiate = function(arg, options={}) {

	const iglyph = new SamsaGlyph();
	const font = this.font;
	const axisCount = font.fvar ? font.fvar.axisCount : 0;
	const ignoreIUP = false;

	if (arg instanceof SamsaInstance) {
		arg.glyphs[this.id] = iglyph;
		iglyph.instance = arg;
		iglyph.tuple = arg.tuple;
	}
	else if (validateTuple (arg, axisCount)) {
		iglyph.tuple = tuple;
		// it’s a glyph without an instance... this feels dangerous, since we may need ItemVariationStore data that we are not yet calculating JIT
	}
	else {
		iglyph.tuple = Array(axisCount).fill(0);
	}

	iglyph.id = this.id;
	iglyph.name = this.name;
	iglyph.font = this.font;
	iglyph.numPoints = this.numPoints;
	iglyph.numberOfContours = this.numberOfContours;
	iglyph.instructionLength = this.instructionLength;
	iglyph.components = this.components;
	iglyph.endPts = this.endPts;
	iglyph.tvts = this.tvts ? this.tvts : this.tvts = font.gvar ? font.gvar.buffer.decodeTvts(this) : []; // an empty array means we have found no TVTS; undefined means we have not yet looked
	iglyph.curveOrder = this.curveOrder;
	iglyph.touched = []; // helpful for visualising variations
	iglyph.viz = []; // visualization data

	// instantiate points: copy the points of glyph into iglyph
	let p=this.points.length;
	while (--p >= 0) {
		const point = this.points[p];
		iglyph.points[p] = [point[0], point[1], point[2]]; // note that [...point] is slower :)
	}

	// go through each tvt (=tuple variation table) for this glyph
	this.tvts.forEach(tvt => {

		const scaledDeltas = [];
		const touched = [];
		let pt = this.points.length;
		let S;

		// initialize the scaledDeltas array to zero vectors
		while (--pt >= 0) {
			scaledDeltas[pt] = [0,0];
		}

		// sharedScalars are disabled for now
		if (1) {
			// go thru each axis, multiply a scalar S from individual scalars AS
			// - if the current designspace location is outside of this tvt’s tuple, we get S = 0 and nothing is done
			// - based on pseudocode from https://www.microsoft.com/typography/otspec/otvaroverview.htm
			S = 1
			for (let a=0; a<axisCount; a++) {
				const ua = iglyph.tuple[a];
				const [start, peak, end] = [tvt.start[a], tvt.peak[a], tvt.end[a]]; // TODO: store these as 3-element arrays
				if (peak != 0) {
					if (ua < start || ua > end) {
						S = 0;
						break;
					}
					else if (ua < peak)
						S *= (ua - start) / (peak - start);
					else if (ua > peak)
						S *= (end - ua) / (end - peak);
				}
			}
		}
		else {
			// use sharedScalars optimization
			S = iglyph.instance.sharedScalars[tvt.sharedTupleId];
		}


		// now we can move the points by S * delta
		// OPTIMIZE: it must be possible to optimize for the S==1 case, but attempts reduce speed...
		if (S != 0) {

			pt = this.points.length;
			while (--pt >= 0) {
				const delta = tvt.deltas[pt];				
				if (delta !== null && delta !== undefined) { // if not IUP
					touched[pt] = true; // touched[] is just for this tvt; newGlyph.touched[] is for all tvts (in case we want to show IUP in UI) 
					scaledDeltas[pt] = [S * delta[0], S * delta[1]];
				}
			}

			// IUP
			// - TODO: ignore this step for composites (even though it is safe because numberOfContours<0)
			// - OPTIMIZE: calculate IUP deltas when parsing, then a "deltas" variable can point either to the original deltas array or to a new scaled deltas array (hmm, rounding will be a bit different if IUP scaled deltas are always based on the 100% deltas)
			if (!tvt.allPoints && this.numberOfContours > 0 && touched.length > 0 && !ignoreIUP) { // it would be nice to check "touched.length < glyph.points.length" but that won’t work with sparse arrays, and must also think about phantom points

				// for each contour
				for (let c=0, startPt=0; c<this.numberOfContours; c++) {
				
					// OPTIMIZE: check here that the contour is actually touched
					const numPointsInContour = this.endPts[c]-startPt+1;
					let firstPrecPt = -1; // null value
					let precPt, follPt;
					for (let p=startPt; p!=firstPrecPt; ) {
						let pNext = (p-startPt+1)%numPointsInContour+startPt;
						if (touched[p] && !touched[pNext]) { // found a precPt
							// get precPt and follPt
							precPt = p;
							follPt = pNext;
							if (firstPrecPt == -1)
								firstPrecPt = precPt;
							do {
								follPt = (follPt-startPt+1) % numPointsInContour + startPt;
							} while (!touched[follPt]) // found the follPt

							// perform IUP for x(0), then for y(1)
							for (let xy=0; xy<=1; xy++) {

								// IUP spec: https://www.microsoft.com/typography/otspec/gvar.htm#IDUP
								const pA = this.points[precPt][xy];
								const pB = this.points[follPt][xy];
								const dA = scaledDeltas[precPt][xy];
								const dB = scaledDeltas[follPt][xy];

								for (let q=pNext, D, T, Q; q!=follPt; q= (q-startPt+1) % numPointsInContour + startPt) {
									Q = this.points[q][xy];
									if (pA == pB)
										D = dA == dB ? dA : 0;
									else {
										if (Q <= pA && Q <= pB)
											D = pA < pB ? dA : dB;
										else if (Q >= pA && Q >= pB)
											D = pA > pB ? dA : dB;
										else {
											T = (Q - pA) / (pB - pA); // safe for divide-by-zero
											D = (1-T) * dA + T * dB;
										}
									}
									scaledDeltas[q][xy] += D;
								}
							}
							p = follPt;
						}
						else if (pNext == startPt && firstPrecPt == -1) // failed to find a precPt, so abandon this contour
							break;
						else
							p = pNext;
					}
					startPt = this.endPts[c]+1;
				}
			} // if IUP

			// add the net deltas to the glyph
			// TODO: Try to avoid this step for points that were not moved
			// TODO: Understand whether rounding is definitely wrong here.
			// - https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview
			iglyph.points.forEach((point, pt) => {
				point[0] += scaledDeltas[pt][0];
				point[1] += scaledDeltas[pt][1];
			});
		}

		// store S and scaledDeltas so we can use them in visualization
		// - maybe we should recalculate multiple AS values and 1 S value in the GUI so we don’t add load to samsa-core
		if (options.visualization) {
			iglyph.viz.push({
				S: S,
				scaledDeltas: scaledDeltas,
			});
		}
	}); // end of processing the tvts

	// recalculate bbox
	// - TODO: fix for composites and non-printing glyphs (even though the latter don’t record a bbox)
	// iglyph.recalculateBounds();

	// attach the instantiated glyph to the instance
	if (iglyph.instance)
		iglyph.instance.glyphs[this.id] = iglyph;

	return iglyph;
}


// decompose()
// - decompose a composite glyph into a new simple glyph
// - TODO: fix this for the new paradigms :)
//SamsaGlyph.prototype.decompose = function (tuple, params) {
//SamsaGlyph.prototype.decompose = function (instance, params) {
SamsaGlyph.prototype.decompose = function (params) {

	// "this" is either a glyph (without an instance) or an instantiated glyph (with an instance)

	const font = this.font;
	let simpleGlyph = new SamsaGlyph( {
		id: this.id,
		name: this.name,
		font: font,
		curveOrder: this.curveOrder,
		endPts: [],
	} );

	if (this.instance) {
		simpleGlyph.instance = this.instance;
	}

	let offset, transform, flags;
	if (params) {
		offset = params.offset;
		transform = params.transform;
		flags = params.flags;
	}

	// simple case
	if (this.numberOfContours >= 0) {

		if (!params) // optimization for case when there’s no offset and no transform (we can make this return "this" itself: the decomposition of a simple glyph is itself)
			return this;

		// append all the points (ignore phantom points)
		for (let pt=0; pt<this.numPoints; pt++) {

			// spec: https://docs.microsoft.com/en-us/typography/opentype/spec/glyf
			let point = [ this.points[pt][0], this.points[pt][1], this.points[pt][2] ]; // needs to be a deep copy, I think

			// offset before transform
			if (offset && (flags & 0x0800)) { // SCALED_COMPONENT_OFFSET
				point[0] += offset[0];
				point[1] += offset[1];
			}

			// transform matrix?
			if (transform) {
				let x = point[0], y = point[1];
				point[0] = x * transform[0] + y * transform[1];
				point[1] = x * transform[2] + y * transform[3];
			}

			// offset after transform
			if (offset && !(flags & 0x0800)) { // SCALED_COMPONENT_OFFSET
				point[0] += offset[0];
				point[1] += offset[1];
			}

			simpleGlyph.points.push(point);
		}

		// fix up simpleGlyph
		// TODO: can these point to the original objects?
		this.endPts.forEach(endPt => {
			simpleGlyph.endPts.push(endPt + simpleGlyph.numPoints);
		});
		simpleGlyph.numPoints += this.numPoints;
		simpleGlyph.numberOfContours += this.numberOfContours;
	}

	else {
		// step thru components, adding points to simpleGlyph
		this.components.forEach((component, c) => {

			// get gc, the component glyph, instantiate if necessary
			let gc;
			if (this.instance) {
				gc = this.instance.glyphs[component.glyphId]; // attempt to get the instanted glyph
				if (!gc) { // if it’s not already instantiated, instantiate it
					const gcDefault = font.glyphs[component.glyphId] || font.loadGlyphById(component.glyphId); // fetch from binary if not already loaded
					gc = gcDefault.instantiate(this.instance); // it still needs to be decomposed
				}
			}
			else {
				gc = font.glyphs[component.glyphId] || font.loadGlyphById(component.glyphId);
			}

			const matched = component.matchedPoints;
			const newTransform = component.transform;
			let newOffset = [ this.points[c][0], this.points[c][1] ];
			if (offset) {
				newOffset[0] += offset[0];
				newOffset[1] += offset[1];
			}

			// decompose!
			// - this is the recursive step
			let decomp = gc.decompose({
				offset: newOffset,
				transform: newTransform,
				flags: component.flags,
				matched: matched,
			});

			// get delta if this component is positioned with "matched points"
			let dx=0, dy=0;
			if (matched) {
				dx = simpleGlyph.points[matched[0]][0] - decomp.points[matched[1]][0];
				dy = simpleGlyph.points[matched[0]][1] - decomp.points[matched[1]][1];
			}

			// we now have the simple glyph "decomp": no offset or transform is needed (but we may need to match points using dx,dy)
			for (let p=0; p<decomp.numPoints; p++) {
				simpleGlyph.points.push([
					decomp.points[p][0] + dx,
					decomp.points[p][1] + dy,
					decomp.points[p][2]
				]);
			}

			// fix up simpleGlyph
			decomp.endPts.forEach(endPt => {
				simpleGlyph.endPts.push(endPt + simpleGlyph.numPoints);
			});
			simpleGlyph.numPoints += decomp.numPoints;
			simpleGlyph.numberOfContours += decomp.numberOfContours;
		});
	}


	// add the 4 phantom points
	simpleGlyph.points.push([0,0,0], [this.points[this.points.length-3][0],0,0], [0,0,0], [0,0,0]);

	// return the simple glyph
	return simpleGlyph;

}

// svgPath()
// - export glyph as a string suitable for the SVG <path> "d" attribute
SamsaGlyph.prototype.svgPath = function () {

	let contours = [];
	let contour, contourLen, pt, pt_, pt__, p, startPt;
	let path = "";

	switch (this.curveOrder) {

		// quadratic curves
		case 2:

			// LOOP 1: convert the glyph contours into an SVG-compatible contours array
			startPt = 0;
			this.endPts.forEach(endPt => {
				contourLen = endPt-startPt+1; // number of points in this contour
				contour = [];

				// insert on-curve points between any two consecutive off-curve points
				for (p=startPt; p<=endPt; p++) {
					pt = this.points[p];
					pt_ = this.points[(p-startPt+1)%contourLen+startPt];
					contour.push (pt);
					if (!(pt[2] & 0x01 || pt_[2] & 0x01)) // if we have 2 consecutive off-curve points...
						contour.push ( [ (pt[0]+pt_[0])/2, (pt[1]+pt_[1])/2, 1 ] ); // ...we insert the implied on-curve point
				}

				// ensure SVG contour starts with an on-curve point
				if (!(contour[0][2] & 0x01)) // is first point off-curve?
					contour.unshift(contour.pop()); // OPTIMIZE: unshift is slow, so maybe build two arrays, "actual" and "toAppend", where "actual" starts with an on-curve

				// append this contour
				contours.push(contour);

				startPt = endPt+1;
			});

			// LOOP 2: convert contours array to an actual SVG path
			// - we’ve already fixed things in loop 1 so there are never consecutive off-curve points
			contours.forEach(contour => {
				for (p=0; p<contour.length; p++) {
					pt = contour[p];
					if (p==0)
						path += `M${pt[0]} ${pt[1]}`;
					else {
						if (pt[2] & 0x01) { // on-curve point (consume 1 point)
							path += `L${pt[0]} ${pt[1]}`;
						}
						else { // off-curve point (consume 2 points)
							pt_ = contour[(++p) % contour.length]; // increments loop variable p
							path += `Q${pt[0]} ${pt[1]} ${pt_[0]} ${pt_[1]}`;
						}
					}
				}
				path += "Z";
			});

			break;

		// cubic curves
		// - EXPERIMENTAL!
		// - for use with ttf-cubic format, cff (when we implement cff), and glyf1
		case 3:
			startPt = 0;

			// loop through each contour
			this.endPts.forEach(endPt => {

				let firstOnPt;
				contourLen = endPt-startPt+1;

				// find this contour’s first on-curve point: it is either startPt, startPt+1 or startPt+2 (else the contour is invalid)
				if      (contourLen >= 1 && this.points[startPt][2] & 0x01)
					firstOnPt = 0;
				else if (contourLen >= 2 && this.points[startPt+1][2] & 0x01)
					firstOnPt = 1;
				else if (contourLen >= 3 && this.points[startPt+2][2] & 0x01)
					firstOnPt = 2;

				if (firstOnPt !== undefined) {

					// loop through all this contour’s points
					for (p=0; p<contourLen; p++) {

						pt = this.points[startPt + (p+firstOnPt) % contourLen];
						if (p==0)
							path += `M${pt[0]} ${pt[1]}`;
						else {
							if (pt[2] & 0x01) { // on-curve point (consume 1 point)
								path += `L${pt[0]} ${pt[1]}`;
							}
							else { // off-curve point (consume 3 points)
								pt_ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								pt__ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								path += `C${pt[0]} ${pt[1]} ${pt_[0]} ${pt_[1]} ${pt__[0]} ${pt__[1]}`;
							}
							if (p == (contourLen+firstOnPt-1) % contourLen)
								path += "Z";
						}
					}
				}

				startPt = endPt+1;
			});
			break;
	}

	return path;
};

// exportPath()
// - export glyph outline in arbitrary ways, according to the supplied SamsaContext
// - SamsaContext provides various functions, ctx.moveto(), ctx.lineto, ctx.quadto, etc.
SamsaGlyph.prototype.exportPath = function (ctx) {

	const contours = [];
	const glyph = this.numberOfContours < 0 ? this.decompose() : this;
	let contour, contourLen, pt, pt_, pt__, c, p, startPt;

	switch (this.curveOrder) {

		// quadratic curves
		case 2:

			// LOOP 1: convert the glyph contours into an SVG-compatible contours array
			startPt = 0;
			glyph.endPts.forEach(endPt => {
				
				contourLen = endPt-startPt+1; // number of points in this contour
				contour = [];

				// insert on-curve points between any two consecutive off-curve points
				for (p=startPt; p<=endPt; p++) {
					pt = glyph.points[p];
					pt_ = glyph.points[(p-startPt+1)%contourLen+startPt];
					contour.push (pt);
					if (!(pt[2] & 0x01 || pt_[2] & 0x01)) // if we have 2 consecutive off-curve points...
						contour.push ( [ (pt[0]+pt_[0])/2, (pt[1]+pt_[1])/2, 1 ] ); // ...we insert the implied on-curve point
				}

				// ensure SVG contour starts with an on-curve point
				if (!(contour[0][2] & 0x01)) // is first point off-curve?
					contour.unshift(contour.pop()); // OPTIMIZE: unshift is slow, so maybe build two arrays, "actual" and "toAppend", where "actual" starts with an on-curve

				// append this contour
				contours.push(contour);
				startPt = endPt+1;
			});

			// LOOP 2: convert contours array to an actual SVG path
			// - we’ve already fixed things in loop 1 so there are never consecutive off-curve points
			for (const contour of contours) {
				for (p=0; p<contour.length; p++) {
					pt = contour[p];
					if (p==0) {
						ctx.moveto(pt[0], pt[1]);
					}
					else {
						if (pt[2] & 0x01) { // on-curve point (consume 1 point)
							ctx.lineto(pt[0], pt[1]);
						}
						else { // off-curve point (consume 2 points)
							pt_ = contour[(++p) % contour.length]; // increments loop variable p
							ctx.quadto(pt[0], pt[1], pt_[0], pt_[1]);
						}
					}
				}
				ctx.closepath();
			}

			break;

		// cubic curves
		// - EXPERIMENTAL!
		// - for use with ttf-cubic format, cff (when we implement cff), and glyf1
		case 3:
			startPt = 0;

			// loop through each contour
			this.endPts.forEach(endPt => {

				let firstOnPt;
				contourLen = endPt-startPt+1;

				// find this contour’s first on-curve point: it is either startPt, startPt+1 or startPt+2 (else the contour is invalid)
				if      (contourLen >= 1 && this.points[startPt][2] & 0x01)
					firstOnPt = 0;
				else if (contourLen >= 2 && this.points[startPt+1][2] & 0x01)
					firstOnPt = 1;
				else if (contourLen >= 3 && this.points[startPt+2][2] & 0x01)
					firstOnPt = 2;

				if (firstOnPt !== undefined) {

					// loop through all this contour’s points
					for (p=0; p<contourLen; p++) {

						pt = this.points[startPt + (p+firstOnPt) % contourLen];
						if (p==0) {
							ctx.moveto(pt[0], pt[1]);
						}
						else {
							if (pt[2] & 0x01) { // on-curve point (consume 1 point)
								ctx.lineto(pt[0], pt[1]);
							}
							else { // off-curve point (consume 3 points)
								pt_ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								pt__ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								ctx.curveto(pt[0], pt[1], pt_[0], pt_[1], pt__[0], pt__[1]);
							}
							if (p == (contourLen+firstOnPt-1) % contourLen) {
								ctx.closepath();
							}
						}
					}
				}

				startPt = endPt+1;
			});
			break;
	}

	//return path;
};

// process paint tables for a glyph, producing a DAG (directed acyclic graph) of paint tables, that can be used to render the glyph or make a diagram of its paint structure
// - return false if there is no COLRv1 data for this glyph
// - consider returning COLRv0 data in the form of paint tables, so that only one colour "renderer" is needed
SamsaGlyph.prototype.paint = function (context={}) {
	const offset = this.findCOLR(1);

	if (!offset) {
		return false; // no COLRv1 data for this glyph
	}
	else {
		const font = this.font;
		const buf = font.bufferFromTable("COLR");

		if (context.color === undefined) context.color = 0x000000ff;
		if (!context.rendering) context.rendering = {};
		if (!context.defs) context.defs = {};
		if (!context.font) context.font = font;
		if (!context.rendering) context.rendering = {};
		context.gradientTransform = "";
		context.gradientTransformId = 0; // we add extra gradients to the defs if they are transformed
		context.paintIds = []; // keep track of the paint IDs we’ve used (must be reset for each glyph): we 
		context.lastGlyphId = null;

		// fetch the DAG of paint tables recursively
		buf.seek(offset);
		const paint = buf.decodePaint(context); // recursive (offer a non-recursive option?)
		context.paintIds = null; // we no longer need this
		return paint;
	}
}


// paintSVG() renders a COLRv1 DAG (paint tree) recursively
// - paint (required) is the root of the DAG, or subroot when called recursively
// - context (required) contains:
//   .font, a reference to the SamsaFont object
//   .color, the foreground color being used in U32 format (optional, default is 0x000000ff)
//   .defs, object to cache repeatable items in the text run:
//       - the monochrome glyph paths, identitied by p<glyphId>
//       - the gradients, identified by g<gradientId> where gradientId is actually the paint offset where the gradient definition starts
// - the function does not make use of the SamsaGlyph object at all, it’s just convenient for export
// - the main switch statement selects between the 4 paint types; paint types group paint formats together, and are stored in PAINT_TYPES; PAINT_COMPOSE is the only non-recursive paint type (paint format=32 is a special case which needs to recurse 2 paint trees before the compose operation)
// - the result of a paintSVG() still needs to be wrapped in a <svg> element, and <defs> needs to be expanded
SamsaGlyph.prototype.paintSVG = function (paint, context) {

	const font = context.font;
	const defs = context.defs;
	const palette = font.CPAL.palettes[context.paletteId || 0];
	if (context.color === undefined)
		context.color = 0x000000ff; // black
	context.depth ??= 0;
	context.depth ++;

	let svg = "+".repeat(context.depth) + `<g>`;

	switch (PAINT_TYPES[paint.format]) {

		case PAINT_LAYERS: {
			paint.children.forEach(child => {
				svg += this.paintSVG(child, context);
			});
			break;
		}

		case PAINT_SHAPE: {
			// retrieve the glyph path definition if we don't already have it, and insert it into defs
			if (!defs[`p${paint.glyphId}`]) {
				const glyph = font.glyphs[paint.glyphId] || font.loadGlyphById(paint.glyphId);
				const iglyph = glyph.instantiate(context.instance);
				const path = iglyph.svgGlyphMonochrome(0);
				defs[`p${paint.glyphId}`] = `<path id="p${paint.glyphId}" d="${path}"/>`;
			}
			context.lastGlyphId = paint.glyphId;
			svg += this.paintSVG(paint.children[0], context); // there’s only one child; this should be a fill or a gradient (or maybe another PAINT_SHAPE)
			break;
		}

		case PAINT_TRANSFORM: {
			const {scale, skew, translate, rotate, center, matrix} = paint;
			let transform = "";
			if (translate) {
				transform = `translate(${translate[0]} ${translate[1]})`;
			}
			else if (matrix) {
				transform = `matrix(${matrix.join(" ")})`;
			}
			else if (rotate) {
				transform += `rotate(${-rotate}` + (center ? ` ${center[0]} ${center[1]}` : "") +`)`; // flip sign of angle, and use the 3-argument form if there is a center
			}
			else {
				if (center) {
					transform += `translate(${center[0]} ${center[1]})`;
				}
				if (scale) {
					transform += `scale(${scale.join(" ")})`; // join() handles 1 or 2 scale operands
				}
				else if (skew) {
					transform += `skewX(${-skew[0]})skewY(${-skew[1]})`; // flip sign of angles
				}
				if (center) {
					transform += `translate(${-center[0]} ${-center[1]})`;
				}
			}

			if (context.lastGlyphId === null) {
				svg = `<g transform="${transform}">`; // rewrite <g> tag
			}
			else {
				context.gradientTransform += transform;
			}
			svg += this.paintSVG(paint.children[0], context); // there’s only one child
			break;
		}

		case PAINT_COMPOSE: {

			// PaintComposite
			if (paint.format == 32) {

				if (context.paintComposites) // are we recording?
					context.paintComposites.add(this.id);
				// console.error("Attempting PaintComposite ...");
				// console.log(paint);

				const m = paint.compositeMode;
				const [modeType, mode] = SVG_PAINTCOMPOSITE_MODES[m]; // e.g. ["F", "atop"] for COMPOSITE_SRC_ATOP or ["M", "difference"] for COMPOSITE_DIFFERENCE
				const srcDag = this.paintSVG(paint.children[0], context); // source
				const destDag = this.paintSVG(paint.children[1], context); // destination

				let svg = "";
				let src = "src";
				let dest = "dest";
				if (m >= 1 && m <= 10 && (m % 2 == 0)) {
					[src, dest] = [dest, src]; // swap src and dest for the even-numbered modes of over, in, out, atop and src and dest
				}
				
				// always push the 2 shapes as defs
				// defs.push(`<rect id="${src}" x="0" y="0" width="100" height="100" fill="#0000ff80"/>`); // src
				// defs.push(`<rect id="${dest}" x="50" y="50" width="100" height="100" fill="#ff0000"/>`); // dest

				// https://codepen.io/lorp/pen/wvRMEeY
				
				switch (modeType) {
					
					// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feComposite
					case "F": {
						defs[`filter-${m}`] = `<filter id="filter-${m}">` +
							`<feImage href="#${dest}" x="0px" y="0px" width="300px" height="300px" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" />` +
							`<feComposite in="SourceGraphic" operator="${mode}" />` +
							`</filter>`;
						svg += `<g><use href="#${src}" style="filter:url(#filter-${m})" /></g>`;
						break;
					}
					
					// https://developer.mozilla.org/en-US/docs/Web/CSS/mix-blend-mode
					case "M": {
						svg += `<g style="isolation: isolate;">` +
									`<use href="#src" style="mix-blend-mode: ${mode};" />` +
									`<use href="#dest" style="mix-blend-mode: ${mode};" />` +
								`</g>`;
						break;
					}
					
					// simple methods
					case "-": {
						if (m !== 0) svg += `<g><use href="#${src}" /></g>`; // if not COMPOSITE_CLEAR
						break;      
					}
					
				}						
			}

			// simple fill and gradient fill
			else {

				const paintFormatStatic = paint.format - paint.format % 2;

				// simple fill
				if (paintFormatStatic == 2) {
					const paletteIndex = paint.paletteIndex;
					const color = paletteIndex == 0xffff ? context.color : palette.colors[paletteIndex];
					const attrs = {
						href: `#p${context.lastGlyphId}`,
						fill: font.hexColorFromU32(color),
					}
					if (paint.alpha !== 1)
						attrs["fill-opacity"] = paint.alpha;
					svg += `<use${expandAttrs(attrs)}/>`;
				}

				// gradient fill
				else {
					let gradientId = "g" + paint.offset; // this gets modified if there is a transform

					// do we already have this gradient in the defs?
					if (!defs[gradientId] || context.gradientTransform) { // we try not to repeat gradients, but we always store them if there's a transform

						// we must store the gradient separatelt if it has a transform
						if (context.gradientTransform)
							gradientId += "-" + context.gradientTransformId;

						// set the initial attributes of the gradient element (we set more specific attributes later)
						const attrs = {
							id: gradientId,
							gradientUnits: "userSpaceOnUse",
							spreadMethod: paint.colorLine.extend ? SVG_GRADIENT_EXTEND_MODES[paint.colorLine.extend] : undefined, // we could allow "pad" here, but instead we ignore EXTEND_PAD (0) since it is default behaviour
						};

						// is there a transform to use? (the shape transform should already have been cleared)
						if (context.gradientTransform)
							attrs.gradientTransform = context.gradientTransform;

						// get the colorLine stops for all gradient types
						let stops = "";
						let gradientElement;
						for (const colorStop of paint.colorLine.colorStops) {
							const color = colorStop.paletteIndex == 0xffff ? context.color : palette.colors[colorStop.paletteIndex];
							const attrs = {
								offset: `${colorStop.stopOffset*100}%`,
								"stop-color": font.hexColorFromU32(color),
							}
							if (colorStop.alpha != 1)
								attrs["stop-opacity"] = colorStop.alpha;
							stops += `<stop${expandAttrs(attrs)}/>`;
						};

						switch (paintFormatStatic) {

							// PaintLinearGradient (4), PaintVarLinearGradient (5)
							// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/linearGradient
							case 4:
								[attrs.x1, attrs.y1] = paint.points[0];
								[attrs.x2, attrs.y2] = font.linearGradientFromThreePoints(paint.points);
								gradientElement = "linearGradient";
								break;

							// PaintRadialGradient (6), PaintVarRadialGradient (7)
							// https://developer.mozilla.org/en-US/docs/Web/SVG/Element/radialGradient
							case 6:
								[attrs.fx, attrs.fy] = paint.points[0];
								[attrs.cx, attrs.cy] = paint.points[1];
								[attrs.fr, attrs.r]  = paint.radii;
								gradientElement = "radialGradient";
								break;

							// PaintSweepGradient (8), PaintVarSweepGradient (9)
							case 8:
								console.error("PaintSweepGradient is not implemented yet");
								//console.log(paint);
								// paint.center
								// paint.startAngle
								// paint.endAngle
								gradientElement = "sweepGradient"; // invalid SVG, but at least will not break the output
								break;
						}

						// add the gradient to the defs
						defs[gradientId] = `<${gradientElement}${expandAttrs(attrs)}>${stops}</${gradientElement}>`;

						// gradientTransform housekeeping
						context.gradientTransformId++;
						context.gradientTransform = "";
					}

					// so which glyph outline we are using?
					// TODO: we’re using lastGlyphId for now, but it is unsatisfactory since we may have several consecutive format 10 tables defining a clip path (in practice this seems uncommon)
					svg += `<use href="#p${context.lastGlyphId}" fill="url(#${gradientId})" />`;
				}

			}
			context.lastGlyphId = null;
			break;
		}

		default: {
			console.error("Should not get here", paint);
			break;
		}

	}
	
	svg += "</g>";
	svg += "\n";
	context.depth --;
	return svg;
}

SamsaGlyph.prototype.svgGlyphCOLRv1 = function (context={}) {
	const result = this.findCOLR(1); // might be undefined
	if (result) {

		const paintDag = this.paint(context);

		//console.log(paintDag);
		if (paintDag) {
			const svgResult = this.paintSVG(paintDag, context); // we could bring the paintSVG function inside here, but there seems little point
			console.log(svgResult);
			return svgResult; // this is a <g> element ready to be inserted into an <svg>, but we must also remember to add the defs (paths and gradients) from the context
		}
		else {
			return false; // we didn’t find a COLRv1 glyph
		}
	}
}

SamsaGlyph.prototype.svgGlyphCOLRv0 = function (context={}) { // we need to poss the instance, right?
	const result = this.findCOLR(0); // might be undefined
	if (result) {
		const [firstLayerIndex, numLayers] = result;
		const font = this.font;
		const buf = font.bufferFromTable("COLR");
		const colr = font.COLR;
		const cpal = font.CPAL;
		const defaultColor = context.color ?? 0x000000ff; // default color // allows 0x000000000 (a valid transparent color)
		const palette = cpal.palettes[context.paletteId || 0];
		let paths = "";
		// TODO: store these paths in defs for efficient reuse
		for (let i=0; i<numLayers; i++) {
			buf.seek(colr.layerRecordsOffset + 4 * (firstLayerIndex + i));
			const glyphId = buf.u16;
			const paletteIndex = buf.u16;
			const layerGlyph = font.glyphs[glyphId];
			const iGlyph = layerGlyph.instantiate(context.instance);
			const dGlyph = iGlyph.decompose();
			if (dGlyph.numberOfContours > 0) {
				const layerColor = paletteIndex == 0xffff ? defaultColor : palette.colors[paletteIndex]; // TODO: omit fill if paletteIndex == 0xffff, and put it in the containing <g> element instead
				paths += `<path d="${dGlyph.svgPath()}" fill="${font.hexColorFromU32(layerColor)}"/>\n`; // TODO: precalculate the hex strings for the palettes? NO
			}
		}
		return paths;
	}
	else {
		return false; // we didn’t find a COLRv0 glyph
	}
}

function SamsaContext(options) {
	this.path = [];
	this.beginpath = options.beginpath;
	this.moveto = options.moveto;
	this.lineto = options.lineto;
	this.quadto = options.quadto;
	this.cubicto = options.cubicto;
	this.closepath = options.closepath;
	this.color = options.color;
	this.paletteId = options.paletteId;
	this.gradientId = options.gradientId;
	this.gradientPoints = options.gradientPoints;
	this.gradientStops = options.gradientStops;
	this.gradientType = options.gradientType;
	//this.popTransform = options.gradientTransform;
	this.ctx = options.ctx; // this is used for the actual HTML canvas context (ignored in SVG)
}


// SamsaGlyph.prototype.svgGlyphMonochrome = function () {

// 	// TODO: don’t return anything for empty glyphs, but take account of metrics
// 	return `<path d="${this.svgPath()}"/>`;

// }


SamsaGlyph.prototype.svgGlyphMonochrome = function (wrap=1) {

	// TODO: don’t return anything for empty glyphs, but take account of metrics

	//return `<path d="${this.svgPath()}"/>`;
	// this is SVG but we can do canvas too

	let ctx = new SamsaContext(DRAW_FUNCTIONS[CONTEXT_SVG]);
	this.exportPath(ctx); // complete the ctx.path string with the SVG representation of the glyph

	if (wrap)
		return `<path d="${ctx.path.join("")}"/>`;
	else
		return ctx.path.join("");

	// let ctxCanvas = new SamsaContext(DRAW_FUNCTIONS[CONTEXT_CANVAS]);
	// ctxCanvas.ctx = ctx;
	//ctxCanvas.ctx.fillStyle = "#ff0000";


	// return `<path d="${this.svgPath()}"/>`;

}


SamsaGlyph.prototype.canvasGlyphMonochrome = function (ctx) {
	let ctxSamsa = new SamsaContext(DRAW_FUNCTIONS[CONTEXT_CANVAS]);
	//ctxCanvas.ctx = ctx;
	this.exportPath(ctxSamsa); // now this.path contains multiple drawing commands

	//console.log(ctxCanvas.path);

	// fetch the drawing commands
	ctx.beginPath();

	ctxSamsa.path.forEach(cmd => {

		const op = cmd.pop();
		switch (op) {

			case "M":
				ctx.moveTo(...cmd);
				break;
			
			case "L":
				ctx.lineTo(...cmd);
				break;

			case "C":
				ctx.bezierCurveTo(...cmd);
				break;
			
			case "Q":
				ctx.quadraticCurveTo(...cmd);
				break;

			case "Z":
				ctx.closePath();
				break;
		}
	})
	ctx.fill();
}


SamsaGlyph.prototype.maxCOLR = function () {
	return this.findCOLR(1) ? 1 : this.findCOLR(0) ? 0 : undefined;
}

// does this glyph have a color glyph of the given COLR table version?
// - we could build this into the svgGlyphCOLRv1() and svgGlyphCOLRv0() methods but defining it separately makes it possible to test for presence efficiently
SamsaGlyph.prototype.findCOLR = function (version) {
	const font = this.font;
	const colr = font.COLR;
	if (colr) {
		let b=0;
		let glyphId;

		if (version == 1 && colr.version >= 1) {
			return colr.baseGlyphPaintRecords[this.id]; // returns offset to the paint record for this glyph or undefined
		}
		else if (version == 0 && colr.version >= 0) {
			return colr.baseGlyphRecords[this.id]; // returns [firstLayerIndex, numLayers] for this glyph or undefined
		}
	}
	return false;
}

// SamsaGlyph.svg()
// - we don’t want this method to supply a final svg... since we 
// - options supplies various parameters to style the resulting SVG
//     Styling is applied to the <g> element that contains the glyph.
//     Try { fill: "red" } or { fill: "red", transform: "translate(130,500) scale(0.5 -0.5)" }
//     Currently only supports class, fill, stroke, strokeWidth, transform.
//     Note that the transform property is assigned to the transform attribute, not the style attribute.
// - options.colr selects the *maximum* color format to use: 1=COLRv1, 0=COLRv0, -1=monochrome
// - options.paletteId selects a paletteId in the font
// - options.palette supplies a custom palette
SamsaGlyph.prototype.svg = function (context={}) {

	const font = this.font;

	// TODO: add a comment containin the string and glyphids that this svg represents (maybe use class or id in the <g> ?)
	let svgString = "";
	let extra = (context.class ? ` class="${context.class}"` : "")
	          + (context.fill ? ` fill="${context.fill}"` : "")
	          + (context.stroke ? ` stroke="${context.stroke}"` : "")
	          + (context.strokeWidth ? ` stroke-width="${context.strokeWidth}"` : "")
			  + (context.transform ? ` transform="${context.transform}"` : "");
	// TODO: check these style things don’t interfere with the COLRv1 styling (or maybe that’s ok)
	// TODO: completely ignore this stuff, as beyond scope of getting svg for a glyph; it should be the <g> (+ optional translate) and nothing else

	// TODO: remove this SVG wrapper so we can return multiple a glyph run in a single SVG
	// - or maybe have a look thru an array of glyphs and offsets calculated from simple metrics or OpenType layout
	svgString += `<g${extra}>`;
	svgString += `<!-- glyph ${this.id} -->`;
	
	// attempt COLRv1, then COLRv0, then monochrome for this glyph
	svgString += font.COLR ? this.svgGlyphCOLRv1(context) || this.svgGlyphCOLRv0(context) || this.svgGlyphMonochrome() : this.svgGlyphMonochrome(); // this the default auto mode // TODO: offer method to select a specific format
	// - we can provide some results info in the context

	svgString += `</g>`;
	return svgString; // shall we just leave it like this?
}



// custom processors
/*
function moveto_svg {

}

function moveto_canvas {

}

function lineto_canvas {

}

function quadto_canvas {

}

function cubicto_canvas {

}
*/


const RENDERER_SVG = 1;
const RENDERER_CANVAS = 2;

const R_MOVETO = 1;
const R_LINETO = 2;
const R_QUADTO = 3;
const R_CUBICTO = 4;
const R_ENDPATH = 5;
const R_LAYER = 6;
const R_PAINT = 7;
const R_MAX = 8;

const renderFuncs = [];
renderFuncs[RENDERER_SVG] = [];
renderFuncs[RENDERER_CANVAS] = [];

// renderFuncs[RENDERER_SVG][R_MOVETO] = (ctx, x, y) => {

// });

// renderFuncs.get(RENDERER_SVG)
// const renderFuncs[RENDERER_SVG] = new Map()

// {
// 	R_MOVETO: (ctx, x, y) => {

// 	}

// };


// WOW this is working 2023-06-22 02:25
const CONTEXT_SVG = 1;
const CONTEXT_CANVAS = 2;
const DRAW_FUNCTIONS = [];
DRAW_FUNCTIONS[CONTEXT_SVG] = {
	beginpath: function () {
		; // nothing to do
	},
	moveto: function (x, y) {
		this.path.push(`M${x} ${y}`);
	},
	lineto: function (x, y) {
		this.path.push(`L${x} ${y}`);
	},
	quadto: function (x1, y1, x, y) {
		this.path.push(`Q${x1} ${y1} ${x} ${y}`);
	},
	cubicto: function (x1, y1, x2, y2, x, y) {
		this.path.push(`C${x1} ${y1} ${x2} ${y2} ${x} ${y}`);
	},
	closepath: function () {
		this.path.push(`Z`);
	},
};
// DRAW_FUNCTIONS[CONTEXT_CANVAS] = {
// 	beginpath: function () {
// 		this.path.push(["B"]);
// 	},
// 	moveto: function (x, y) {
// 		this.path.push(["M", x, y]);
// 	},
// 	lineto: function (x, y) {
// 		this.path.push(["L", x, y]);
// 	},
// 	quadto: function (x1, y1, x, y) {
// 		this.path.push(["Q", x1, y1, x, y]);
// 		;
// 	},
// 	cubicto: function (x1, y1, x2, y2, x, y) {
// 		this.path.push(["C", x1, y1, x2, y2, x, y]);
// 	},
// 	closepath: function () {
// 		this.path.push(["F"]);
// 	},		
// };

DRAW_FUNCTIONS[CONTEXT_CANVAS] = {
	beginpath: function () {
		this.path.push(["B"]);
	},
	moveto: function (x, y) {
		this.path.push([x, y, "M"]);
	},
	lineto: function (x, y) {
		this.path.push([x, y, "L"]);
	},
	quadto: function (x1, y1, x, y) {
		this.path.push([x1, y1, x, y, "Q"]);
		;
	},
	cubicto: function (x1, y1, x2, y2, x, y) {
		this.path.push([x1, y1, x2, y2, x, y, "C"]);
	},
	closepath: function () {
		this.path.push(["F"]);
	},		
};


/*
const moveTo = [];

// SVG rendering functions
moveTo[RENDERER_SVG] = (ctx, x, y) => {
	return `M${x} ${y}`;
}
lineTo[RENDERER_SVG] = (ctx, x, y) => {
	return `L${x} ${y}`;
}
quadTo[RENDERER_SVG] = (ctx, x1, y1, x, y) => {
	return `Q${x1} ${y1} ${x} ${y}`;
}
cubicTo[RENDERER_SVG] = (ctx, x1, y1, x2, y2, x, y) => {
	return `C${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
}
endPath[RENDERER_SVG] = (ctx) => {
	return `Z`;
}
paint[RENDERER_SVG] = (ctx, paint) => {
	return `COLRv1 a whole stack of stuff`;
}
layer[RENDERER_SVG] = (ctx, glyph, color) => {
	return `COLRv0 layer`;
}
palette[RENDERER_SVG] = (ctx, palette) => {
	return `CPAL palette`;
}

// canvas rendering functions
moveTo[RENDERER_CANVAS] = (ctx, x, y) => {
	return `m x y`;
}
lineTo[RENDERER_CANVAS] = (ctx, x, y) => {
	return `l x y`;
}
*/

/*
function SamsaContext (name) {
	this.name = name;
	switch (this.name) {

		case "svg":
			this.type = RENDERER_SVG;
			break;
	
		case "canvas":
			this.type = RENDERER_CANVAS;
			break;
	
		default:
			break;
	}

}
*/

/*
const RENDERERS = {
	svg: {
		moveto: moveto_canvas,
		lineto: moveto_canvas,
		quadto: quadto_canvas,
		cubicto: cubicto_canvas,
		endpath: endpath_canvas,
	}
}
*/


// - works in browser and node
export { SamsaFont, SamsaInstance, SamsaGlyph, SamsaContext, SamsaBuffer, SAMSAGLOBAL};


/*


QUESTIONS

The child possibilities for a PaintGlyph seem problematic, see Filling Shapes https://learn.microsoft.com/en-us/typography/opentype/spec/colr#filling-shapes

So the simple idea is that any of the fill operations can be used, solid and gradient.

Finally there’s the statement:
"The child of a PaintGlyph table is not, however, limited to one of the basic fill formats. Rather, the child can be the 
root of a sub-graph that describes some graphic composition that is used as a fill. Another way to describe the relationship 
between a PaintGlyph table and its child sub-graph is that the glyph outline specified by the PaintGlyph table defines a 
bounds, or clip region, that is applied to the fill composition defined by the child sub-graph."

So the main idea this seems to support is to generate a clip region, being the intersection of all the shapes of a sequence of PaintGlyphs.

Ok so far, and doable using <defs> and <clipPath> in SVG.

But then there’s this:
"Note: Shapes can also be derived using PaintGlyph tables in combination with other tables, such as PaintTransform 
(see Transformations) or PaintComposite (see Compositing and blending)."

The problem is the wording "in combination with". It’s possible that this means those Paint tables may have been used only as *parents* of this 
PaintGlyph table. If so, that keeps things under control, but it is not clear. The phrase could include the possibility of PaintTransform and 
PaintComposite as children of PaintGlyph. PaintTransform is not a big problem: we’d need to transform the shape and presumably also any gradient 
fill. However, if we allow PaintComposite children, it interferes with PaintComposite’s ability to compose onto the canvas, since it would be used 
as a clip region instead.

For now, let’s assume a sequence of PaintGlyphs followed by a fill only. No PaintTransforms, no PaintComposites after a PaintGlyph.

# Spec suggestions

## cmap
* Clarify that multiple character mappings are not intended to be active at the same time. For example, it is not permisslble to set up a 
font to use some mappings via Format 4, then fallback to Format 13 for "last resort" glyphs. Similarly, Format 12 tables  must be complete,
and must not rely on Format 4 as fallback.

## vmtx
* Show the vMetrics field explicitly.

## COLRv1
* List the possibilities for a Paint path as a language-like tree, or maybe a kind of regex.

## gvar
* Make clear the sharedTuple array is all about peak tuples, with inferred start and end being -1, 0 and 1 as approptiate.
* Also note that the scalars derived from the sharedTuples may be calculated just once per instance.
* These two statements conflict "Note that intermediateRegion flag is independent of the embeddedPeakTuple flag..." "An intermediate-region
 tuple variation table additionally has start and end n-tuples ... these are always represented using embedded tuple records." The truth is if  
 INTERMEDIATE_REGION is set, then EMBEDDED_PEAK_TUPLE must also be set. We have a problem in that if we have an embedded peak tuple that is NOT
 an intermediate region, the setting of start and end is not defined. We assume it’s 

 ## GPOS and GSUB Extension subtables
 If you use GPOS LookupType 9: Extension Positioning or GSUB LookupType 7: Extension Substitution to point to extra subtables, the spec says 
 they must all be of the same lookup type. Does this imply that you are not allowed any subtables of that lookup type unless they are via type 9?


*/