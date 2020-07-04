/*

samsa-core.js

Pre-GitHub version history
2019-10-18 glyf parsing in node & browser
2019-10-18 TVTs parsing in node & browser
2019-10-18 Tons of refactoring working nicely (tvts is much clearer structure than old gvd)
2019-10-19 avar seems to be working now
2019-10-20 Finally got gvar decompiling for all fonts I throw at it. Just need to do the fake glyph.points for composites and we’re done.



Minification:
- https://www.npmjs.com/package/uglify-es // this version of uglify is ES6 compatible, earlier versions were not
- uglifyjs samsa-core.js > samsa-core.min.js

*/



// TODO:
// - rename it SamsaCONFIG
// - pass the actual config object along with the font
let CONFIG = {

	isNode: (typeof module !== 'undefined' && module.exports),
	outFileDefault: "samsa-out.ttf",

	instantiation: {
		method: "default", // sets apple overlap bit
		// method: "dummy-fvar", // does not set apple overlap bit
		// method: "no-overlap-bit", // does not set apple overlap bit
		skipTables: ["gvar","fvar","cvar","avar","STAT","MVAR","HVAR","VVAR","DSIG"],
		ignoreIUP: false,
	},

	defaultGlyph: [
		"A", "a", "Alpha", "alpha", "afii10017", "A-cy", "afii10065", "a-cy", "zero", // PostScript names: Latin, Russian, Cyrillic (or should we use the cmap? because some fonts lack ps names)
	],

	sfnt: {
		maxNumTables: 100,
		maxSize: 10000000,
	},

	glyf: {
		overlapSimple: true,
		bufferSize: 500000, // for writing to files (ignored for in-memory instantiation)
	},

	name: {
		maxSize: 50000,
	},

	deltas: {
		round: true,
	},

	postscriptNames: [".notdef",".null","nonmarkingreturn","space","exclam","quotedbl","numbersign","dollar","percent","ampersand","quotesingle","parenleft","parenright","asterisk","plus","comma","hyphen","period","slash","zero","one","two","three","four","five","six","seven","eight","nine","colon","semicolon","less","equal","greater","question","at","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","bracketleft","backslash","bracketright","asciicircum","underscore","grave","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","braceleft","bar","braceright","asciitilde","Adieresis","Aring","Ccedilla","Eacute","Ntilde","Odieresis","Udieresis","aacute","agrave","acircumflex","adieresis","atilde","aring","ccedilla","eacute","egrave","ecircumflex","edieresis","iacute","igrave","icircumflex","idieresis","ntilde","oacute","ograve","ocircumflex","odieresis","otilde","uacute","ugrave","ucircumflex","udieresis","dagger","degree","cent","sterling","section","bullet","paragraph","germandbls","registered","copyright","trademark","acute","dieresis","notequal","AE","Oslash","infinity","plusminus","lessequal","greaterequal","yen","mu","partialdiff","summation","product","pi","integral","ordfeminine","ordmasculine","Omega","ae","oslash","questiondown","exclamdown","logicalnot","radical","florin","approxequal","Delta","guillemotleft","guillemotright","ellipsis","nonbreakingspace","Agrave","Atilde","Otilde","OE","oe","endash","emdash","quotedblleft","quotedblright","quoteleft","quoteright","divide","lozenge","ydieresis","Ydieresis","fraction","currency","guilsinglleft","guilsinglright","fi","fl","daggerdbl","periodcentered","quotesinglbase","quotedblbase","perthousand","Acircumflex","Ecircumflex","Aacute","Edieresis","Egrave","Iacute","Icircumflex","Idieresis","Igrave","Oacute","Ocircumflex","apple","Ograve","Uacute","Ucircumflex","Ugrave","dotlessi","circumflex","tilde","macron","breve","dotaccent","ring","cedilla","hungarumlaut","ogonek","caron","Lslash","lslash","Scaron","scaron","Zcaron","zcaron","brokenbar","Eth","eth","Yacute","yacute","Thorn","thorn","minus","multiply","onesuperior","twosuperior","threesuperior","onehalf","onequarter","threequarters","franc","Gbreve","gbreve","Idotaccent","Scedilla","scedilla","Cacute","cacute","Ccaron","ccaron","dcroat"],

};


if (CONFIG.isNode) {
	// mappings from DataView methods to Buffer methods
	Buffer.prototype.getUint32 = Buffer.prototype.readUInt32BE;
	Buffer.prototype.getInt32  = Buffer.prototype.readInt32BE;
	Buffer.prototype.getUint16 = Buffer.prototype.readUInt16BE;
	Buffer.prototype.getInt16  = Buffer.prototype.readInt16BE;
	Buffer.prototype.getUint8  = Buffer.prototype.readUInt8;
	Buffer.prototype.getInt8   = Buffer.prototype.readInt8;

	Buffer.prototype.setUint32 = function (p,v) {this.writeUInt32BE(v,p);}
	Buffer.prototype.setInt32  = function (p,v) {this.writeInt32BE(v,p);}
	Buffer.prototype.setUint16 = function (p,v) {this.writeUInt16BE(v,p);}
	Buffer.prototype.setInt16  = function (p,v) {this.writeInt16BE(v,p);}
	Buffer.prototype.setUint8  = function (p,v) {this.writeUInt8(v,p);}
	Buffer.prototype.setInt8   = function (p,v) {this.writeInt8(v,p);}

	// add new Buffer methods
	Buffer.prototype.getTag = function (p) {
		var tag = "";
		var p_end = p + 4; // global
		var ch;
		while (p < p_end)
		{
			ch = this.readUInt8(p++);
			if (ch >= 32 && ch < 126) // valid chars in tag data type https://www.microsoft.com/typography/otspec/otff.htm
				tag += String.fromCharCode(ch);	
		}
		return tag.length == 4 ? tag : false;
	}

	Buffer.prototype.getF2DOT14 = function (p) {
		return this.getInt16(p) / 16384.0; /* signed */
	}
}


let fonts = [];
let glyph = {
	font: undefined,
	endPts: [],
	points: [],
	deltas: []
};
let newGlyph;

function getStringFromData (data, p0, length)
{
	// TODO: add a Pascal and C modes to use in parsing "post" table (use length = undefined for C, -1 for Pascal)
	var str = "";
	var p = p0;
	while (p - p0 < length) {
		str += String.fromCharCode(data.getUint8(p++));	
	}
	return str;
}

// TODO: get rid of this!
function uint8ToBase64(buffer) {
     var binary = '';
     var len = buffer.byteLength;
     for (var i = 0; i < len; i++) {
         binary += String.fromCharCode(buffer[i]);
     }
     return window.btoa( binary );
}

//////////////////////////////////
//  fvsToCSS()
//////////////////////////////////
function fvsToCSS(fvs) {

	// transforms an fvs object into a string suitable for font-variation-settings
	// - simple transormation, it doesn’t perform any checks to see if the axes are in a font or if settings are beyond axis ranges
	// - examples:
	//   {"wght": 655, "wdth": 77, "FOOB": 12345} => '"wght" 655,"wdth" 77,"FOOB" 12345'
	//   {} => 'normal'
	let fvsCSS = [];
	Object.keys(fvs).forEach(tag => {
		fvsCSS.push(`"${tag}" ${fvs[tag]}`);
	});
	return fvsCSS.length ? fvsCSS.join() : "normal";
}


DataView.prototype.getTag = function (p) {
	let ch, tag = "";
	const p_end = p + 4;
	while (p < p_end) {
		ch = this.getUint8(p++);
		if (ch >= 32 && ch < 126) // valid chars in tag data type https://www.microsoft.com/typography/otspec/otff.htm
			tag += String.fromCharCode(ch);	
	}
	return tag.length == 4 ? tag : false;
}

DataView.prototype.getF2DOT14 = function (p) {
	return this.getInt16(p) / 16384.0; // signed
}


function copyBytes(source, target, zs, zt, n) {

	// copies n bytes from source (starting at zs) to target (starting at zt)
	// - source and target are typically DataView, but they can be any TypedArray
	const src = new Uint8Array(source.buffer, source.byteOffset + zs, n);
	const tgt = new Uint8Array(target.buffer, target.byteOffset + zt, n);
	for (let i=0; i < n; i++)
		tgt[i] = src[i]; // this seems to be the quickest way to copy between two ArrayBuffers, see benchmark at https://www.measurethat.net/Benchmarks/Show/7537/0/copy-arraybuffer-dataview-vs-uint8arrayset-vs-float64ar
}


// TODO make SamsaVFInstance a proper object
function SamsaVFInstance (init) {


}


// TODO: make SamsaVFGlyph a proper object
function SamsaVFGlyph (init) {

	this.points = [];


	// methods
	this.toSVG = function (asText = false) {

		let svg = "";
		// normal case
		if (this.bezierOrder == 2) {

		}

		return svg;
	};

	this.toTTX = function () {

		// return the glyf table and/or gvar table, depending on options
		let ttx = {};

		ttx.glyf = "...";
		ttx.gvar = "...";

		return ttx;
	};

	this.toGLIF = function () {
		// UFO GLIF
		// if you want GLIF data for non-default masters, then make an instance and use the glyph from that

	};

	this.toJSON = function () {
		// remove circular object references

	};

	this.toCubic = function () {

		this.bezierOrder = 3;
	};

	// might be nice to get binary and hex versions of TTF data, per glyph, although we are normally writing to a stream
	this.toBinaryTTF = function () {

	};

}


function SamsaFont (init, config) {

	// initialize config, and update it with updates passed to constructor
	this.config = CONFIG;
	if (config) {
		Object.keys(config).forEach(k => this.config[k] = config[k] );
	}

	// general properties
	this.dateCreated = new Date();
	this.date = init.date;

	this.arrayBuffer = init.arrayBuffer;
	this.url = init.url; // for browser using a VF on a server
	this.callback = init.callback;
	this.data = undefined;
	this.fontFamily = init.fontFamily;
	this.instances = [];
	this.axes = [];
	this.instances = [];
	this.errors = [];
	this.glyphs = [];
	this.glyphOffsets = [];
	this.glyphSizes = [];
	this.tupleOffsets = [];
	this.tupleSizes = [];
	this.avar = [];

	// node-dependent properties
	if (this.config.isNode) {
		this.inFile = init.inFile;
		if (!init.outFile)
			this.outFile = this.config.outFileDefault;
	}

	this.path = init.inFile || this.url;
	this.filename = this.path.substr(this.path.lastIndexOf("/")+1); // works nicely even when there are no slashes in the name because of the -1 return :)
	this.filesize = init.filesize;

	// methods

	//////////////////////////////////
	//  load()
	//////////////////////////////////
	this.load = () => {

		if (this.config.isNode) {

			// open the font file
			try {
				this.fd = config.fs.openSync (this.inFile, "r");
			}
			catch (error) {
				this.errors.push(error);
				quit(this);
			}

			this.stat = config.fs.fstatSync(this.fd);
			this.filesize = this.stat.size;
			this.date = this.stat.birthtimeMs;
			this.parse();
		}

		else if (this.url) {
			let oReq = new XMLHttpRequest();
			oReq.open("GET", this.url, true);
			oReq.responseType = "arraybuffer";
			oReq.font = this;
			oReq.onload = function(oEvent) {

				oReq.font.data = new DataView(this.response);
				oReq.font.filesize = oReq.font.data.byteLength;
				oReq.font.parse();

			};
			oReq.send();
		}
	}

	//////////////////////////////////
	//  parse()
	//////////////////////////////////
	this.parse = () => {

		let font = this;
		let data = this.data;
		let config = this.config;
		let table; 
		let p=p_=0; // data pointers
		let node = this.config.isNode;
		let fd = this.fd;
		let read, write;
		if (node) {
			read = this.config.fs.readSync;
			write = this.config.fs.writeSync;
		}


		/////////////////////////////////////////////////////////////////////////////////
		// sfnt first 12 bytes
		if (node) {
			data = Buffer.alloc(12);
			read (fd, data, 0, 12, 0);
		}
		font.fingerprint = data.getUint32(0);
		switch (font.fingerprint) {
			case 0x00010000: // normal TrueType
			case 0x74727565: // 'true' (as in Skia.ttf)
				font.flavor = "truetype";
				break;
			case 0x4f54544f: // 'OTTO' (as in OpenType OTF fonts)
				font.flavor = "cff";
				break;
			default:
				font.errors.push ("Invalid first 4 bytes of the file. Must be one of: 0x00010000, 0x74727565, 0x4f54544f");
				break;
		}
		if (!font.errors.length)
		{
			font.numTables = data.getUint16(4);
			if (font.numTables > config.sfnt.maxNumTables)
				font.errors.push (`numTables (${font.numTables}) exceeds config.sfnt.maxNumTables (${config.sfnt.maxNumTables})`);
			else {

				/////////////////////////////////////////////////////////////////////////////////
				// get sfnt table directory
				font.tableDirectory = [];
				font.tables = {};

				if (node) {
					p = 0;
					data = Buffer.alloc(16 * font.numTables);
					read (fd, data, 0, 16 * font.numTables, 12);
				}
				else
					p = 12;

				for (var t=0; t<font.numTables; t++) {
					var tag = data.getTag (p);
					if (!tag) {
						font.errors.push ("Tag value is invalid");
						break;
					}
					font.tables[tag] = font.tableDirectory[t] = {
						id: t,
						tag: tag,
						checkSum: data.getUint32(p+4),
						offset: data.getUint32(p+8),
						length: data.getUint32(p+12),
					};
					p += 16;
				}
			}
		}

		// parse the short sfnt tables
		// - maxp must be first
		// - avar must precede fvar (because of normalizing code in fvar parsing)
		// - name must precede fvar
		// - name must precede STAT
		// - gvar isn’t short, but we only parse its header here
		["maxp", "hhea", "head", "hmtx", "OS/2", "post", "name", "avar", "fvar", "gvar", "STAT", "loca"].forEach(tag => {

			if (font.tables[tag])
				font.parseSmallTable(tag);

		});
		
		// parse glyf table: all glyphs!
		if (!node) {

			for (let g=0; g < font.numGlyphs; g++) {
				font.glyphs[g] = font.parseGlyph(g); // glyf data
				font.glyphs[g].tvts = font.parseTvts(g); // gvar data

				// delete glyph if this is a big file, to save memory
				// - which of these is better?
				// font.glyphs[g] = undefined;
				// delete font.glyphs[g]
			}
		}
		// glyf end

		// we parsed the font, get a timestamp
		font.dateParsed = new Date();
		font.callback(font);
	}

	//////////////////////////////////
	//  parseSmallTable()
	//////////////////////////////////
	this.parseSmallTable = tag => {
		let font = this;
		let data;
		let tableOffset, p=p_=0; // data pointers
		let config = this.config;
		let table = {};
		let node = this.config.isNode;
		let fd, read, write;
		if (node) {
			fd = this.fd;
			read = this.config.fs.readSync;
			write = this.config.fs.writeSync;
		}

		// set up data and pointers
		if (node) {
			data = Buffer.alloc(font.tables[tag].length);
			read (fd, data, 0, font.tables[tag].length, font.tables[tag].offset);
			p = tableOffset = 0;
		}
		else {
			data = this.data;
			p = tableOffset = font.tables[tag].offset;
		}

		// switch by tag to process each table
		switch (tag) {

			case "maxp":

				table.version = data.getUint32(p), p+=4;
				table.numGlyphs = data.getUint16(p), p+=2;
				font.numGlyphs = table.numGlyphs;
				break;


			case "hhea":

				table.majorVersion = data.getUint16(p), p+=2;
				table.minorVersion = data.getUint16(p), p+=2;
				table.ascender = data.getInt16(p), p+=2;
				table.descender = data.getInt16(p), p+=2;
				table.lineGap = data.getInt16(p), p+=2;
				table.advanceWidthMax = data.getUint16(p), p+=2;
				table.minLeftSideBearing = data.getInt16(p), p+=2;
				table.minRightSideBearing = data.getInt16(p), p+=2;
				table.xMaxExtent = data.getInt16(p), p+=2;
				table.caretSlopeRise = data.getInt16(p), p+=2;
				table.caretSlopeRun = data.getInt16(p), p+=2;
				table.caretOffset = data.getInt16(p), p+=2;
				p+=8;
				table.metricDataFormat = data.getInt16(p), p+=2;
				table.numberOfHMetrics = data.getUint16(p), p+=2;
				break;


			case "head":

				table.majorVersion = data.getUint16(p), p+=2;
				table.minorVersion = data.getUint16(p), p+=2;
				table.fontRevision = data.getUint32(p), p+=4;
				table.checkSumAdjustment = data.getUint32(p), p+=4;
				table.magicNumber = data.getUint32(p), p+=4;
				table.flags = data.getUint16(p), p+=2;
				table.unitsPerEm = data.getUint16(p), p+=2;
				p += 8;
				p += 8;
				table.xMin = data.getInt16(p), p+=2;
				table.yMin = data.getInt16(p), p+=2;
				table.xMax = data.getInt16(p), p+=2;
				table.yMax = data.getInt16(p), p+=2;
				table.macStyle = data.getUint16(p), p+=2;
				table.lowestRecPPEM = data.getUint16(p), p+=2;
				table.fontDirectionHint = data.getInt16(p), p+=2;
				table.indexToLocFormat = data.getUint16(p), p+=2;
				table.glyphDataFormat = data.getUint16(p), p+=2;

				font.unitsPerEm = table.unitsPerEm;
				break;


			case "hmtx":

				font.widths = [];
				if (font.tables['hhea'].data.numberOfHMetrics < 1)
					font.errors.push ("hhea: numberOfHMetrics must be >=1.")
				for (let m=0; m<font.numGlyphs; m++) {
					if (m < font.tables['hhea'].data.numberOfHMetrics) {
						font.widths[m] = data.getUint16(p), p+=2;
						p+=2; // skip lsb
					}
					else
						font.widths[m] = font.widths[m-1];
				}
				break;


			case "OS/2":

				table.version = data.getUint16(p), p+=2;
				table.xAvgCharWidth = data.getInt16(p), p+=2;
				table.usWeightClass = data.getUint16(p), p+=2;
				table.usWidthClass = data.getUint16(p), p+=2;
				table.fsType = data.getUint16(p), p+=2;
				table.ySubscriptXSize = data.getInt16(p), p+=2;
				table.ySubscriptYSize = data.getInt16(p), p+=2;
				table.ySubscriptXOffset = data.getInt16(p), p+=2;
				table.ySubscriptYOffset = data.getInt16(p), p+=2;
				table.ySuperscriptXSize = data.getInt16(p), p+=2;
				table.ySuperscriptYSize = data.getInt16(p), p+=2;
				table.ySuperscriptXOffset = data.getInt16(p), p+=2;
				table.ySuperscriptYOffset = data.getInt16(p), p+=2;
				table.yStrikeoutSize = data.getInt16(p), p+=2;
				table.yStrikeoutPosition = data.getInt16(p), p+=2;
				table.sFamilyClass = data.getInt16(p), p+=2;
				table.panose = [data.getUint8(p), data.getUint8(p+1), data.getUint8(p+2), data.getUint8(p+3), data.getUint8(p+4), data.getUint8(p+5), data.getUint8(p+6), data.getUint8(p+7), data.getUint8(p+8), data.getUint8(p+9)];
				p+=10;
				table.ulUnicodeRange1 = data.getUint32(p), p+=4;
				table.ulUnicodeRange2 = data.getUint32(p), p+=4;
				table.ulUnicodeRange3 = data.getUint32(p), p+=4;
				table.ulUnicodeRange4 = data.getUint32(p), p+=4;
				table.achVendID = getStringFromData (data, p, 4), p+=4;
				table.fsSelection = data.getUint16(p), p+=2;
				table.usFirstCharIndex = data.getUint16(p), p+=2;
				table.usLastCharIndex = data.getUint16(p), p+=2;
				table.sTypoAscender = data.getInt16(p), p+=2;
				table.sTypoDescender = data.getInt16(p), p+=2;
				table.sTypoLineGap = data.getInt16(p), p+=2;
				table.usWinAscent = data.getUint16(p), p+=2;
				table.usWinDescent = data.getUint16(p), p+=2;
				break;


			case "name":

				table.format = data.getUint16(p), p+=2;
				table.count = data.getUint16(p), p+=2;
				table.stringOffset = data.getUint16(p), p+=2;
				table.nameRecords = [];
				font.names = [];
				for (let n=0; n < table.count; n++) {
					let nameRecord = {};
					let str = "";
					let nameRecordStart, nameRecordEnd;

					nameRecord.platformID = data.getUint16(p), p+=2;
					nameRecord.encodingID = data.getUint16(p), p+=2;
					nameRecord.languageID = data.getUint16(p), p+=2;
					nameRecord.nameID = data.getUint16(p), p+=2;
					nameRecord.length = data.getUint16(p), p+=2;
					nameRecord.offset = data.getUint16(p), p+=2;

					nameRecordStart = tableOffset + table.stringOffset + nameRecord.offset;
					nameRecordEnd = nameRecordStart + nameRecord.length;
					if (nameRecordEnd > tableOffset + font.tables['name'].length) // safety check
						continue;

					p_ = p;
					p = nameRecordStart;
					switch (nameRecord.platformID)
					{
						case 1:
							if (nameRecord.languageID == 0)
							// TODO: treat 1,0 strings as MacRoman
								if (nameRecord.encodingID == 0)
								{
									while (p < nameRecordEnd)
										str += String.fromCharCode(data.getUint8(p)), p++;
									nameRecord.string = str;
								}
							break;

						case 3:
							if (nameRecord.languageID == 0x0409)
							{
								switch (nameRecord.encodingID)
								{
									case 0:
									case 1:
										while (p < nameRecordEnd)
											str += String.fromCharCode(data.getUint16(p)), p+=2;
										nameRecord.string = str;
										break;

									case 10:
										while (p < nameRecordEnd) {
											// this obtains the Unicode index for codes >= 0x10000
											str += (String.fromCharCode(data.getUint16(p))), p+=2;
										}
										nameRecord.string = str;
										break; // the sample text in the 2016 Zycon uses this to store an Emoji string
										// TODO: hmm, it’s the same code, because we store them like this in UTF-8
								}

							}
					}

					// set up working name strings that might be taken from Windows (3) or Macintosh (1) strings
					// the Windows strings will overwrite the Mac strings, as nameRecords are sorted by platformID as well as nameID
					if (nameRecord.hasOwnProperty('string'))
						font.names[nameRecord.nameID] = str; // sparse array

					table.nameRecords.push(nameRecord);
					p = p_; // restore pointer ready for the next nameRecord
				}
				break;


			case "post":

				font.glyphNames = []; // store the names separately because the glyph often has not been loaded
				table.format = data.getUint32(p+0);
				font.italicAngle = data.getInt32(p+4) / 65536;

				// most fonts are format 2
				if (table.format == 0x00020000) {

					// parse names data
					p = tableOffset + 32 + 2 + 2 * font.numGlyphs; // jump past header and glyphNameIndex array
					let extraNames = [];
					while (p < tableOffset + font.tables['post'].length) {
						let str="", len=data.getUint8(p++); // Pascal style strings: first byte is length, the rest is the string
						while (len--) {
							str += String.fromCharCode(data.getUint8(p++));
						}
						extraNames.push(str);
					}

					// parse glyphNameIndex array
					p = tableOffset + 32; // jump past header
					p += 2;
					for (let g=0; g<font.numGlyphs; g++) {
						let gni = data.getUint16(p + g*2);
						font.glyphNames[g] = gni < 258 ? config.postscriptNames[gni] : extraNames[gni-258];
					}
				}
				break;
			

			case "loca":

				let shortOffsets = (font.tables['head'].data.indexToLocFormat == 0);
				font.glyphOffsets[0] = 0;
				for (let g=0; g < font.numGlyphs; g++) {

					if (shortOffsets)
						font.glyphOffsets[g+1] = 2 * data.getUint16(tableOffset + 2 * (g+1));
					else
						font.glyphOffsets[g+1] = data.getUint32(tableOffset + 4 * (g+1));

					font.glyphSizes[g] = font.glyphOffsets[g+1] - font.glyphOffsets[g];
				}
				break;


			case "fvar":

				table.majorVersion = data.getUint16(p), p+=2;
				table.minorVersion = data.getUint16(p), p+=2;
				table.offsetToAxesArray = data.getUint16(p), p+=2;
				table.countSizePairs = data.getUint16(p), p+=2;
				table.axisCount = data.getUint16(p), p+=2;
				table.axisSize = data.getUint16(p), p+=2;
				table.instanceCount = data.getUint16(p), p+=2;
				table.instanceSize = data.getUint16(p), p+=2;

				// build axes
				font.axes = [];
				font.axisTagToId = {}; // TODO: better as an object where each property has value as the axis array item? and add id as an axis property
				for (let a=0; a<table.axisCount; a++)
				{
					let axis = { id: a };
					axis.tag = getStringFromData (data, p, 4), p+=4;
					axis.min = data.getInt32(p)/65536, p+=4;
					axis.default = data.getInt32(p)/65536, p+=4;
					axis.max = data.getInt32(p)/65536, p+=4;
					axis.flags = data.getUint16(p), p+=2;
					if (axis.flags & 0x0001)
						axis.hidden = true;
					axis.axisNameID = data.getUint16(p), p+=2;
					axis.name = font.names[axis.axisNameID];
					if (axis.name === undefined)
						axis.name = axis.tag; // for fonts without name table, e.g. optimized webfonts
					font.axes.push(axis);
					font.axisTagToId[axis.tag] = a;
				}

				// build instances
				// - insert default instance as well as the instances in the fvar table
				font.instances = [];
				for (let i=0; i<table.instanceCount+1; i++) { // +1 allows for default instance

					let instance = {
						id: i,
						glyphs: [],
						tuple:[],
						fvs: {},
						static: null, // if this is instantiated as a static font, this can point to the data or url
					};

					if (i>0) {
						instance.subfamilyNameID = data.getUint16(p), p+=2;
						p+=2; // skip over flags
					}

					font.axes.forEach((axis, a) => {
						instance.tuple[a] = axis.default;
						if (i==0)
							instance.tuple[a] = axis.default; // user-facing value
						else
							instance.tuple[a] = data.getInt32(p)/65536, p+=4; // user-facing value
						instance.fvs[axis.tag] = instance.tuple[a];
						instance.tuple[a] = font.axisNormalize(axis, instance.tuple[a]);
					});

					if (i==0) {
						instance.name = "Default";
						instance.type = "default"; // one of default, named, stat, custom
					}
					else {
						if (table.instanceSize == table.axisCount * 4 + 6)
							instance.postScriptNameID = data.getUint16(p), p+=2;
						instance.name = font.names[instance.subfamilyNameID]; // name table must already be parsed! (TODO: fallback if no name table)
						instance.type = "named"; // one of default, named, stat, custom
					}
					font.instances.push(instance);
				}

				font.axisCount = table.axisCount;
				break;


			case "avar":
				table.majorVersion = data.getUint16(p), p+=2;
				table.minorVersion = data.getUint16(p), p+=2;
				if (!(table.majorVersion === 1 && table.minorVersion === 0))
					break;
				p+=2
				table.axisCount = data.getUint16(p), p+=2;
				for (let a=0; a<table.axisCount; a++) { // not font.axisCount, because we have not yet parsed fvar
					font.avar[a] = [];
					let positionMapCount = data.getUint16(p); p+=2; // TODO: if positionMapCount==3 (NOOP), don’t store anything
					for (let m=0; m<positionMapCount; m++) {
						font.avar[a][m] = [data.getF2DOT14(p), data.getF2DOT14(p+2)], p+=4; // = [<fromCoordinate>,<toCoordinate>]
					}
				}
				break;


			case "gvar":

				// NOTE: this only parses the table header!
				// the main data, tuple variation tables for each glyph, is processed in SamsaVF_parseTvts()
				table.majorVersion = data.getUint16(p), p+=2;
				table.minorVersion = data.getUint16(p), p+=2;
				table.axisCount = data.getUint16(p), p+=2;
				table.sharedTupleCount = data.getUint16(p), p+=2;
				table.offsetToSharedTuples = data.getUint32(p), p+=4;
				table.glyphCount = data.getUint16(p), p+=2;
				table.flags = data.getUint16(p), p+=2;
				table.offsetToData = data.getUint32(p), p+=4;
				table.sizeofTuple = table.axisCount * 2; // sizeof (F2DOT14)
				//table.sizeofOffset = (table.flags & 0x01) ? 4 : 2;

				// get sharedTuples array - working nicely!
				table.sharedTuples = [];
				let ps = tableOffset + table.offsetToSharedTuples;
				for (let t=0; t < table.sharedTupleCount; t++) {
					let tuple = [];
					for (var a=0; a<table.axisCount; a++)
						tuple.push(data.getF2DOT14(ps)), ps+=2;
					table.sharedTuples.push (tuple);
				}

				// store tvt offsets: we create an index into the tuple store for each glyph
				font.tupleOffsets[0] = 0;
				for (let g=0; g < font.numGlyphs; g++) {
					if (table.flags & 0x01) // offsets are Offset32
						font.tupleOffsets[g+1] = data.getUint32(tableOffset + 20 + 4 * (g+1));
					else // offsets are 2*Offset16
						font.tupleOffsets[g+1] = 2 * data.getUint16(tableOffset + 20 + 2 * (g+1));
					font.tupleSizes[g] = font.tupleOffsets[g+1] - font.tupleOffsets[g];
				}
				font.sharedTuples = table.sharedTuples;
				break;


			case "STAT":

				table.majorVersion = data.getUint16(p+0);
				table.minorVersion = data.getUint16(p+2);
				let designAxisSize = data.getUint16(p+4);
				table.designAxisCount = data.getUint16(p+6);
				let designAxesOffset = data.getUint32(p+8);
				table.axisValueCount = data.getUint16(p+12);
				let offsetToAxisValueOffsets = data.getUint32(p+14);
				if (table.majorVersion >= 1 && table.minorVersion >= 1) {
					table.elidedFallbackNameID = data.getUint16(p+18);
				}
				table.designAxes = [];
				table.designAxesSorted = [];
				table.axisValueTables = [];

				// parse designAxes
				for (let a=0; a<table.designAxisCount; a++) {
					p = tableOffset + designAxesOffset + a*designAxisSize;
					let designAxis = {
						designAxisID: a, // in case we are enumerating a sorted array
						tag:          data.getTag(p),
						nameID:       data.getUint16(p+4),
						axisOrdering: data.getUint16(p+6),
					};
					table.designAxes.push(designAxis);
					table.designAxesSorted[designAxis.axisOrdering] = designAxis;
				}

				// parse axisValueTables
				for (let a=0; a<table.axisValueCount; a++) {
					p = tableOffset + offsetToAxisValueOffsets + 2*a;
					let axisValueOffset = data.getUint16(p);
					p = tableOffset + offsetToAxisValueOffsets + axisValueOffset;
					let format = data.getUint16(p);
					if (format < 1 || format > 4)
						continue;
					let axisValueTable = {
						format:      format,
						axisIndex:   data.getUint16(p+2),
						flags:       data.getUint16(p+4),
						nameID: data.getUint16(p+6),
					};
					if (axisValueTable.format >= 1 && axisValueTable.format <= 3) {
						axisValueTable.value = data.getInt32(p+8)/65536;
					}
					if (axisValueTable.format == 2) {
						axisValueTable.min = data.getInt32(p+12)/65536;
						axisValueTable.max = data.getInt32(p+16)/65536;
					}
					else if (axisValueTable.format == 3) {
						axisValueTable.linkedValue = data.getInt32(p+12)/65536;
					}
					else if (axisValueTable.format == 4) {

						axisValueTable.axisCount = axisValueTable.axisIndex;
						axisValueTable.axisIndex = []; // now array, not numeric
						axisValueTable.value = []; // now array, not numeric
						p += 8;
						for (let a=0; a < axisValueTable.axisCount; a++) {
							axisValueTable.axisIndex.push(data.getUint16(p+a*6));
							axisValueTable.value.push(data.getInt32(p+a*6+2)/65536);
						}
					}
					table.axisValueTables.push(axisValueTable);
				}
				break;

		}
		
		font.tables[tag].data = table;
	}

	//////////////////////////////////
	//  parseGlyph()
	//////////////////////////////////
	this.parseGlyph = g => {

		// parse glyph g from the given font

		let font = this;
		let node = this.config.isNode;
		let data, p;
		let offset = font.glyphOffsets[g];
		let size = font.glyphSizes[g];
		let pt;
		let glyph = {
			font: font,
			name: font.glyphNames[g],
			id: g,
			numPoints: 0,
			numContours: 0,
			instructionLength: 0,
			points: [],
			endPts: [],
			tvts: [], // tuple variable tables (see gvar spec)
		};
		let fd, read, write;
		if (node) {
			fd = this.fd;
			read = this.config.fs.readSync;
			write = this.config.fs.writeSync;
		}

		// set up data and pointers
		if (node) {
			data = Buffer.alloc(size);

			// we should compare speeds for the best optmization
			// - reading pieces of data from file when we need it
			// - reading a whole glyph into memory, then parsing from memory
			// - reading a block of data from the glyf table, loading more when needed, and parsing from memory
			// - I think it was a bit faster when we loaded all glyphs in sequence, than the present case where we load a glyph and then its tvts
			read (fd, data, 0, size, font.tables['glyf'].offset + offset);
			p = 0;
		}
		else {
			data = font.data;
			p = font.tables['glyf'].offset + offset;
		}

		// non-printing glyph
		if (size == 0) {
			glyph.numContours = 0;
		}

		// printing glyph
		else if (size > 0) {

			glyph.numContours = data.getInt16(p), p+=2;
			glyph.xMin = data.getInt16(p), p+=2;
			glyph.yMin = data.getInt16(p), p+=2;
			glyph.xMax = data.getInt16(p), p+=2;
			glyph.yMax = data.getInt16(p), p+=2;

			let flag, repeat=0, x_=0, y_=0, x, y, c, r;

			// simple glyph
			if (glyph.numContours > 0) {

				// end points of each contour
				for (c=0; c<glyph.numContours; c++)
					glyph.endPts.push(data.getUint16(p)), p+=2;
				glyph.numPoints = glyph.endPts[glyph.numContours -1] + 1;

				// instructions
				glyph.instructionLength = data.getUint16(p), p+=2;
				p += glyph.instructionLength;

				// flags
				let flags = [];
				for (pt=0; pt<glyph.numPoints; ) {
					flag = data.getUint8(p), p++;
					flags[pt++] = flag;
					if (flag & 0x08) {
						repeat = data.getUint8(p), p++;
						for (r=0; r<repeat; r++)
							flags[pt++] = flag;
					}
				}

				// points
				if (flags.length == glyph.numPoints) {
					flags.forEach(function (flag, pt) {
						switch (flag & 0x12) { // x
							case 0x00: x = x_ + data.getInt16(p); p+=2; break;
							case 0x02: x = x_ - data.getUint8(p); p++; break;
							case 0x10: x = x_; break;
							case 0x12: x = x_ + data.getUint8(p); p++; break;
						}
						glyph.points[pt] = [x_ = x];
					});
					flags.forEach(function (flag, pt) {
						switch (flag & 0x24) { // y
							case 0x00: y = y_ + data.getInt16(p), p+=2; break;
							case 0x04: y = y_ - data.getUint8(p), p++; break;
							case 0x20: y = y_; break;
							case 0x24: y = y_ + data.getUint8(p), p++; break;
						}
						glyph.points[pt].push(y_ = y, flag & 0x01);
					});
				}
			}
			
			// composite glyph
			// - we DO add points for composite glyphs: one per component (they are the x and y offsets), and the 4 extra metrics points
			// - when we process these glyphs, we look at glyph.numContours and glyph.points, but NOT glyph.numPoints
			else if (glyph.numContours < 0) {

				let flag;
				glyph.components = [];
				do  {
					let component = {};
					component.flags = flag = data.getUint16(p), p+=2;
					component.glyphId = data.getUint16(p), p+=2;

					// record offsets
					// TODO: rewrite the following 4 branches with a single "switch (flag & 0x0003) { … } " statement
					if (flag & 0x0002) { // ARGS_ARE_XY_VALUES

						if (flag & 0x0001) { // ARG_1_AND_2_ARE_WORDS
							component.offset = [data.getInt16(p), data.getInt16(p+2)], p+=4;
						}
						else {
							component.offset = [data.getInt8(p), data.getInt8(p+1)], p+=2;
						}
						glyph.points.push(component.offset); // this is cool, we store the offset as it was a point, then we can treat it as a point when acted on by the tvts
					}

					// record matched points
					// - TODO: decide how to handle these (it’s possible they are never used in VFs)
					else {
						if (flag & 0x0001) { // ARG_1_AND_2_ARE_WORDS
							component.matchedPoints = [data.getUint16(p), data.getUint16(p+2)], p+=4;
						}
						else {
							component.matchedPoints = [data.getUint8(p), data.getUint8(p+1)], p+=2;
						}
						console.log("WARNING: glyf: I don’t like the matchedPoints method for positioning components!");
					}

					// transformation matrix
					// - if component.transform is undefined, it means identity matrix is [1, 0, 0, 1]
					if (flag & 0x0008) { // WE_HAVE_A_SCALE
						component.transform = [data.getF2DOT14(p), 0, 0], p+=2;
						component.transform[3] = component.transform[0];
					}
					else if (flag & 0x0040) { // WE_HAVE_AN_X_AND_Y_SCALE
						component.transform = [data.getF2DOT14(p), 0, 0, data.getF2DOT14(p+2)], p+=4;
					}
					else if (flag & 0x0080) { // WE_HAVE_A_TWO_BY_TWO
						component.transform = [data.getF2DOT14(p), data.getF2DOT14(p+2), data.getF2DOT14(p+4), data.getF2DOT14(p+6)], p+=8;
					}

					// store component
					glyph.components.push(component);

				} while (flag & 0x0020); // MORE_COMPONENTS

				// jump over composite instructions
				if (flag & 0x0100) { // WE_HAVE_INSTR
					glyph.instructionLength = data.getUint16(p), p+=2;
					p += glyph.instructionLength;
				}
			}
			
			else { // error
				font.errors.push ("glyf: Glyph " + g + " has 0 contours, but non-zero size");
			}

		}

		// glyph metrics: assign 4 phantom points for gvar processing
		// - works on composites
		// - works on zero-contour glyphs
		// TODO: get height from vmtx table (if it exists)
		glyph.points.push([0,0], [font.widths[g], 0], [0,0], [0,0]);

		return glyph;

	}

	//////////////////////////////////
	//  parseTvts()
	//////////////////////////////////
	this.parseTvts = g => {

		// parse the tuple variation tables (tvts), also known as "delta sets with their tuples" for glyph g

		let font = this;
		let node = this.config.isNode;
		let data, p, tvtsStart;
		let offset = font.tupleOffsets[g];
		let size = font.tupleSizes[g];
		let tvts = [];
		let runLength;
		let fd, read, write;
		if (node) {
			fd = this.fd;
			read = this.config.fs.readSync;
			write = this.config.fs.writeSync;
		}

		// set up data and pointers
		if (node) {
			data = Buffer.alloc(size);
			read (fd, data, 0, size, font.tables['gvar'].offset + font.tables['gvar'].data.offsetToData + offset);
			p = 0;
		}
		else {
			data = font.data;
			p = font.tables['gvar'].offset + font.tables['gvar'].data.offsetToData + offset;
		}
		tvtsStart = p;

		// do we have data?
		if (font.tupleSizes[g] > 0) {
	/*
	<Buffer 80 03 00 10 00 0a 20 01 00 0a 20 02 00 0c 00 00 00 02 01 05 02 01 2c d4 01 d4 2c 02 01 05 02 01 d8 28 01 28 d8 81 04 d0 d0 00 d0 d0 81 00 d0 81 8b 00>
	*/

			// [[ 1a ]] get tvts header
			let tupleCount, tuplesSharePointNums, offsetToSerializedData;
			tupleCount = data.getUint16(p), p+=2;
			tuplesSharePointNums = (tupleCount & 0x8000) ? true : false; // doesn't happen in Skia
			tupleCount &= 0x0FFF;
			offsetToSerializedData = data.getUint16(p), p+=2;
			let sharedPointIds = [];
			let sharedTupleNumPoints = 0;

			// set up data pointer ps
			let ps = tvtsStart + offsetToSerializedData;


			// [[ 1b ]] get shared points - this is the first part of the serialized data (ps points to it)
			if (tuplesSharePointNums) {

				let impliedAllPoints = false;
				let tupleNumPoints = data.getUint8(ps); ps++;
				if (tupleNumPoints & 0x80)
					tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
				else
					tupleNumPoints &= 0x7F;

				if (tupleNumPoints == 0) { // allPoints: would be better to use the allPoints flag in the tuple
					impliedAllPoints = true;
					tupleNumPoints = font.glyphs[g].points.length; // we don't bother storing their IDs
				}
				else {
					let pointNum = 0, pc = 0;
					while (pc < tupleNumPoints) {
						runLength = data.getUint8(ps), ps++;
						let pointsAreWords = (runLength & 0x80) ? true : false;
						runLength = (runLength & 0x7f) +1; // 0x7f = the low 7 bits
						for (let r=0; r < runLength; r++) {
							if (pc + r > tupleNumPoints)
								break;
							let pointData;
							if (pointsAreWords)
								pointData = data.getUint16(ps), ps+=2; // TODO: THIS IS GOING WRONG!!!!!!
							else
								pointData = data.getUint8(ps), ps++;
							pointNum += pointData;
							sharedPointIds.push(pointNum);
						}
						pc += runLength;
					}
				}
				sharedTupleNumPoints = tupleNumPoints; // this sharedTupleNumPoints is tested later on (this case would have been better represented directly in the tuple as an all points tuple)
			}

			// [[ 2 ]] get each tvt
			for (let t=0; t < tupleCount; t++) {

				let tupleSize, tupleIndex, tupleIntermediate, tuplePrivatePointNumbers, tupleNumPoints, impliedAllPoints;
				let tvt = {
					peak: [],
					start: [],
					end: [],
					deltas: [],
				};

				// [[ 2a ]] get TupleVariationHeader
				tupleSize = data.getUint16(p), p+=2;
				tupleIndex = data.getUint16(p), p+=2;
				tupleEmbedded = (tupleIndex & 0x8000) ? true : false; // TODO: get rid of these true/false things
				tupleIntermediate = (tupleIndex & 0x4000) ? true : false;
				tuplePrivatePointNumbers = (tupleIndex & 0x2000) ? true : false;
				tupleIndex &= 0x0fff;

				let a, c;

				// [[ 2b ]] get tvt peaks, starts, ends that define the subset of design space
				// populate peak, start and end arrays for this tvt
				if (tupleEmbedded) {
					for (a=0; a<font.axisCount; a++) {
						tvt.peak[a] = data.getF2DOT14(p), p+=2;
					}
				}
				else {
					tvt.peak = font.sharedTuples[tupleIndex];
				}

				if (tupleIntermediate) { // this should never happen if !tupleEmbedded
					for (a=0; a<font.axisCount; a++) {
						tvt.start[a] = data.getF2DOT14(p), p+=2;
					}

					for (a=0; a<font.axisCount; a++) {
						tvt.end[a]   = data.getF2DOT14(p), p+=2;
					}
				}
				else {
					for (a=0; a<font.axisCount; a++) {
						if (tvt.peak[a] > 0) {
							tvt.start[a] = 0;
							tvt.end[a] = tvt.peak[a];
						}
						else {
							tvt.start[a] = tvt.peak[a];
							tvt.end[a] = 0;
						}
					}
				}
				// TODO? Don’t set start and end for non-intermediate tuples

				// get the packed data FOR THIS TUPLE!
				// ps is the pointer inside the serialized data
				// POINT IDS
				let pointIds = [];
				tupleNumPoints = 0;

				// TODO: should be a test for whether private point nums!!!!!!!!!!!!!
				if (!tuplePrivatePointNumbers) {
					// get the points from the sharedpointdata for this tuple
					pointIds = sharedPointIds;
					tupleNumPoints = sharedTupleNumPoints; // we could use sharedPointIds.length BUT sharedPointIds is empty (IBMPlexVariable) when the shared record is also an all points record
				}
				else {
					// get the packed point number data for this tuple
					tupleNumPoints = data.getUint8(ps), ps++; // 0x00
					if (tupleNumPoints & 0x80)
						tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
					else
						tupleNumPoints &= 0x7F;

					if (tupleNumPoints == 0) { // we have an 'all points' situation
						impliedAllPoints = true;
						tupleNumPoints = font.glyphs[g].points.length; // remember that 0 meant "all points" - we just don't bother storing their IDs
					}
					else {
						let pointNum = 0, pc = 0;
						impliedAllPoints = false;
						while (pc < tupleNumPoints) {

							runLength = data.getUint8(ps), ps++;
							let pointsAreWords = (runLength & 0x80) ? true : false;
							runLength = (runLength & 0x7f) +1; // 0x7f = the low 7 bits
							for (let r=0; r < runLength; r++) {
								if (pc + r > tupleNumPoints)
									break;

								let pointData;
								if (pointsAreWords)
									pointData = data.getUint16(ps), ps+=2; // TODO: THIS IS GOING WRONG!!!!!!
								else
									pointData = data.getUint8(ps), ps++;

								pointNum += pointData;
								pointIds.push(pointNum); // TODO: THIS IS BAD!!!!!!!!!!!!!!!!!!!! typically gives values of 32768, 34179
							}
							pc += runLength;
						}
					}
				}

	/* TODO: check that this spec clause is observed
	"Since the values in the packed data are all unsigned, point numbers will be given in increasing order. Since the packed representation can include zero values, it is possible for a given point number to be repeated in the derived point number list. In that case, there will be multiple delta values in the deltas data associated with that point number. All of these deltas must be applied cumulatively to the given point."
	*/

				// DELTAS
				// get the packed delta values for this tuple
				// note that "all points" means tupleNumPoints = font.glyphs[g].numPoints + 4
				let unpacked = [];
				while (unpacked.length < tupleNumPoints * 2) // TODO: replace with a for loop
				{
					runLength = data.getUint8(ps), ps++;
					const bytesPerNum = (runLength & 0x80) ? 0 : (runLength & 0x40) ? 2 : 1;
					runLength = (runLength & 0x3f) +1;
					let r;
					switch (bytesPerNum) {
						case 0: /*console.log(`@${ps} BPN-0 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(0); break;
						case 1: /*console.log(`@${ps} BPN-1 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(data.getInt8(ps)), ps++; break;
						case 2: /*console.log(`@${ps} BPN-2 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(data.getInt16(ps)), ps+=2; break;
					}
				}

				// tvt method 2019-10-15
				//  - working nicely for fully populated delta arrays
				//  - working nicely for sparse delta arrays 
				//  - TODO: check it works when PRIVATE_POINT_NUMBERS is not set
				//  - TODO: check it works when impliedAllPoints is true
				// console.log("pointIds:" + pointIds); // if !PRIVATE_POINT_NUMBERS, what is the state of pointIds?

				if (impliedAllPoints) {
					for (let pt=0; pt < font.glyphs[g].points.length; pt++) {
						tvt.deltas[pt] = [unpacked[pt], unpacked[pt + tupleNumPoints]];
					}
				}
				else {
					for (let pt=0, pc=0; pt < font.glyphs[g].points.length; pt++) {
						if (pt < pointIds[pc] || pc >= tupleNumPoints) {
							tvt.deltas[pt] = null; // these points will be moved by IUP
						}
						else {
							tvt.deltas[pt] = [unpacked[pc], unpacked[pc + tupleNumPoints]]; // these points will be moved explicitly
							pc++;
						}
					}
				}

				// add the tvt to the tvts array
				tvts.push(tvt);
			}
		}

		return tvts; // return the tvts array for this glyph
	}

	//////////////////////////////////
	//  exportInstance()
	//////////////////////////////////
	this.exportInstance = instance => {

		// we either write to a memory object or straight to a file

		const timerStart = new Date();
		const font = this;

		// node
		let node = font.config.isNode;
		let fd, read, write;
		let zeroBuffer;

		// memory
		let fontBuffer;

		// both
		let glyfBuffer;
		let position = 0;
		let fdw;
		const glyfBufSafetyMargin = 64;

		if (node) {
			fd = font.fd;
			read = font.config.fs.readSync;
			write = font.config.fs.writeSync;
		}

		if (!instance.filename)
			instance.filename = font.outFile;


		// [0] setup
		// - node: open file
		// - frontend: allocate memory
		if (node) {
			fdw = font.config.fs.openSync(instance.filename, "w");
			zeroBuffer = Buffer.alloc(16); // a convenient zeroed buffer in case we need to fill something with zeroes
		}
		else
			fontBuffer = new DataView(new ArrayBuffer(font.config.sfnt.maxSize));

		// set up new table array and table directory
		// - we’ll skip the variable-specific tables
		// - we’ll recompile the rest (or copy them from the source font)
		// - newTableDirectory and newTables do not share any memory with font.tableDirectory or font.tables
		let newTableDirectory = [];
		let newTables = {};
		font.tableDirectory.forEach (table => {
			if (!font.config.instantiation.skipTables.includes(table.tag)) // if this table is not in the "skipTables" list
				newTableDirectory.push(newTables[table.tag] = {	tag: table.tag } ); // add it to newTableDirectory (we’ll set length and offset later)
		});


		// [1] write header: first 12 bytes + table directory
		// - zero for now
		// - we update with actual values at the end
		let fileHeaderBuf;
		let fileHeaderSize = 12 + 16 * newTableDirectory.length; // we now know the new number of tables so we can allocate space at the start of the file
		if (node) {
			fileHeaderBuf = Buffer.alloc(fileHeaderSize);
			write (fdw, fileHeaderBuf, 0, fileHeaderSize, position);
		}
		else {
			fileHeaderBuf = fontBuffer;
		}
		position += fileHeaderSize;

		// sort tableDirectory (we can move this to the end)
		// sort new table dir by offset
		// - this is because we will write them in the order from the original font file
		// - we later sort them by tag, so that we get nice table indices to update file with new offset and length
		// - we might consider sorting tables by size here instead: this brings header tables to the front of the file and ensures loca will come before glyf; there was a Microsoft tool that did this
		newTableDirectory.sort((a,b) => font.tables[a.tag].offset - font.tables[b.tag].offset); // sort in the order of the original font’s table offsets


		// [3] write tables (same offset order as source font)
		// - newTableDirectory is ordered by original offset and only contains tables we want for static output
		let locaBuf, hmtxBuf;
		let aws = [], lsbs = []; // metrics, calculated when we instantiate each glyph
		let newLocas = [0]; // if we write in ULONG format we can write this table before glyf if we want

		newTableDirectory.forEach ((table, t) => {

			// set the new offset
			table.offset = position;
			let originalTable = font.tables[table.tag];
			let p; // the current data offset in glyfBuffer, where the binary glyph is being written in memory

			switch (table.tag) {

				case "glyf":

					// OPTIMIZE: write to a large buffer, handle overflows: the large write data size should be faster

					let glyfBufferOffset = 0;

					function flushGlyfBuffer(glyfBuffer) {

						if (p > 0) {
							write (fdw, glyfBuffer, 0, p, position + glyfBufferOffset); // flush the old buffer to disk
							glyfBufferOffset += p;
						}

						if (!glyfBuffer)
							glyfBuffer = Buffer.alloc(font.config.glyf.bufferSize); // create a new buffer
						p = 0; // reset the pointer to the start of the glyfBuffer
						return glyfBuffer;
					}

					p = 0;
					glyfBuffer = node ? flushGlyfBuffer(glyfBuffer) : new DataView(fontBuffer.buffer, position);

					for (let g=0; g<font.numGlyphs; g++) {

						// remember to delete these later!
						if (!font.glyphs[g])
							font.glyphs[g] = font.parseGlyph(g); // glyf data
						let glyph = font.glyphs[g];
						
						if (node)
							glyph.tvts = font.parseTvts(g); // gvar data, one glyph at a time for memory efficiency with very large fonts

						// apply variations to the glyph
						// - same function for all glyphs: simple, composite, zero-contour
						let iglyph = glyphApplyVariations(glyph, null, instance);

						// SIMPLE GLYPH
						if (glyph.numContours > 0) {

							// calculate max size
							let maxNewGlyphSize = 12 + glyph.instructionLength + (glyph.numContours+glyph.instructionLength) * 2 + glyph.numPoints * (2+2+1);
							maxNewGlyphSize += glyfBufSafetyMargin;

							// flush buffer if we need to
							if (node && (p + maxNewGlyphSize) > font.config.glyf.bufferSize) {
								glyfBuffer = flushGlyfBuffer(glyfBuffer); // assigns new glyfBuffer and p
							}

							let xMin,xMax,yMin,yMax;
							let pt;
							let points = iglyph.points;
							let instructionLength = 0;

							// calculate bbox
							// - we always have >0 points in a simple glyph
							if (points && points[0]) {
								[xMin,yMin] = [xMax,yMax] = points[0];
								
								for (pt=1; pt<iglyph.numPoints; pt++) {
									const P = points[pt][0], Q = points[pt][1];
									if (P<xMin) xMin=P;
									else if (P>xMax) xMax=P;
									if (Q<yMin) yMin=Q;
									else if (Q>yMax) yMax=Q;
								}
								xMin = Math.round(xMin);
								xMax = Math.round(xMax);
								yMin = Math.round(yMin);
								yMax = Math.round(yMax);
							}
							iglyph.newLsb = xMin;

							// new bbox
							glyfBuffer.setInt16(p, iglyph.numContours), p+=2;
							glyfBuffer.setInt16(p, xMin), p+=2;
							glyfBuffer.setInt16(p, yMin), p+=2;
							glyfBuffer.setInt16(p, xMax), p+=2;
							glyfBuffer.setInt16(p, yMax), p+=2;

							// endpoints
							for (let e=0; e<iglyph.numContours; e++)
								glyfBuffer.setUint16(p, iglyph.endPts[e]), p+=2;

							// instructions (none for now)
							glyfBuffer.setUint16(p, instructionLength), p+=2;
							p += instructionLength;

							// compress points
							let dx=[], dy=[], X, Y, flags=[], f, cx=cy=0;
							for (pt=0; pt<iglyph.numPoints; pt++) {
								X = dx[pt] = Math.round(points[pt][0]) - cx;
								Y = dy[pt] = Math.round(points[pt][1]) - cy;
								f = points[pt][2]; // on-curve = 1, off-curve = 0
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

								// OPTIMIZE: bring the 3 loops below into this loop to avoid multiple loops and duplicated tests
								// - either don’t compress points at all, so we can write flag, x and y easily in one loop
								// - or we write x and y into buffers and copy later
								// - config option to select compression or speed
							}
							if (font.config.glyf.overlapSimple)
								flags[0] |= 0x40; // overlap signal for Apple, see https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6AATIntro.html ('glyf' table section)

							// write flags
							for (pt=0; pt<iglyph.numPoints; pt++)
								glyfBuffer.setUint8(p, flags[pt]), p++; // compress this a bit more later if optimizing for space

							// write point coordinates
							// TODO: slightly better to work in terms of flags with a switch on 3 values
							for (pt=0; pt<iglyph.numPoints; pt++) {
								if (dx[pt] == 0)
									continue;
								if (dx[pt] >= -255 && dx[pt] <= 255)
									glyfBuffer.setUint8(p, (dx[pt]>0) ? dx[pt] : -dx[pt]), p++;
								else
									glyfBuffer.setInt16(p, dx[pt]), p+=2;
							}
							for (pt=0; pt<iglyph.numPoints; pt++) {
								if (dy[pt] == 0)
									continue;
								if (dy[pt] >= -255 && dy[pt] <= 255)
									glyfBuffer.setUint8(p, (dy[pt]>0) ? dy[pt] : -dy[pt]), p++;
								else
									glyfBuffer.setInt16(p, dy[pt]), p+=2;
							}

							// padding
							if ((glyfBufferOffset+p)%2)
								glyfBuffer.setUint8(p, 0), p++;

							// store metrics (with node, we soon lose the iglyph)
							aws[g] = iglyph.points[iglyph.numPoints+1][0]; // the x-coordinate of the numPoints+1 point
							if (aws[g] < 0)
								aws[g] = 0; // gvar may have pushed this negative, as in CrimsonPro-Italic-VariableFont_wght.ttf from wght 400..700
							lsbs[g] = iglyph.xMin;

						} // simple glyph end

						// COMPOSITE GLYPH
						else if (glyph.numContours < 0) {

							// calculate max size
							// max size of each composite glyph is:
							//      10 bytes header
							//    + 16 bytes (6..8 bytes + 0..8 bytes) for each component
							//    +  2 bytes for instruction length
							//    +  length of instructions
							let maxNewGlyphSize = 10 + 16 * iglyph.components.length + 2 + glyph.instructionLength;
							maxNewGlyphSize += glyfBufSafetyMargin;

							// flush buffer if we need to
							if (node && (p + maxNewGlyphSize) > font.config.glyf.bufferSize) {
								glyfBuffer = flushGlyfBuffer(glyfBuffer); // assigns new glyfBuffer and p
							}

							// glyph header
							// TODO: recalculate composite bbox (tricky in general, not bad for simple translations)
							glyfBuffer.setInt16(p, -1), p+=2;
							glyfBuffer.setInt16(p, glyph.xMin), p+=2;
							glyfBuffer.setInt16(p, glyph.yMin), p+=2;
							glyfBuffer.setInt16(p, glyph.xMax), p+=2;
							glyfBuffer.setInt16(p, glyph.yMax), p+=2;

							// components
							for (let c=0; c<iglyph.components.length; c++) {
								let component = iglyph.components[c];

								// set up the flags
								let flags = 0;
								flags |= 0x0001; // ARG_1_AND_2_ARE_WORDS (could compress the component a tiny bit if we cared about this)
								flags |= 0x0002; // ARGS_ARE_XY_VALUES
								if (c < iglyph.components.length-1)
									flags |= 0x0020; // MORE_COMPONENTS
								if (component.flags & 0x0200)
									flags |= 0x0200; // USE_MY_METRICS (copy from the original glyph)
								// flag 0x0100 WE_HAVE_INSTRUCTIONS is set to zero

								// write this component
								glyfBuffer.setUint16(p, flags), p+=2;
								glyfBuffer.setUint16(p, component.glyphId), p+=2;
								glyfBuffer.setInt16(p, iglyph.points[c][0]), p+=2;
								glyfBuffer.setInt16(p, iglyph.points[c][1]), p+=2;								
							}

							// padding
							if ((glyfBufferOffset+p)%2)
								glyfBuffer.setUint8(p, 0), p++;

							// store metrics (with node, we soon lose the iglyph)
							aws[g] = iglyph.points[iglyph.components.length+1][0]; // the x-coordinate of the iglyph.components.length+1 point
							if (aws[g] < 0)
								aws[g] = 0; // gvar may have pushed this negative, as in CrimsonPro-Italic-VariableFont_wght.ttf from wght 400..700
							lsbs[g] = 0; // TODO: we don’t know xMin so work out a solution to replace simple glyph’s iglyph.xMin;

						} // composite glyph end

						// EMPTY GLYPH
						else { // (glyph.numContours == 0)
							// TODO: fix metrics
							aws[g] = iglyph.points[1][0]; // the x-coordinate of the numPoints+1 point;
							lsbs[g] = 0;
						} // empty glyph end


						// release memory explicitly (might be more efficient to leave this to the garbage collector)
						if (node) {
							font.glyphs[g].tvts = undefined;
							font.glyphs[g] = undefined;
							iglyph = undefined;
						}

						// store location of *next* loca
						if (node)
							newLocas[g+1] = glyfBufferOffset + p;
						else
							newLocas[g+1] = p;

						// OPTIMIZE: write locations directly to locaBuf
					}

					// final flush
					// - this is the only disk write for glyf tables with length < font.config.glyf.bufferSize
					if (node)
						glyfBuffer = flushGlyfBuffer(glyfBuffer);

					// update table.length
					table.length = newLocas[font.numGlyphs];
					position += table.length;

					break;


				case "loca":

					// write zeroes for now, update with real values at the end
					// use long offsets so that we know already the size of the table

					table.length = 4 * (font.numGlyphs+1);
					if (node) {
						locaBuf = Buffer.alloc(table.length); // zeroed data
						write (fdw, locaBuf, 0, table.length, table.offset);
					}
					else {
						locaBuf = new DataView(fontBuffer.buffer, position);
					}
					position += table.length;
					// remember to tweak head.indexToLocFormat = 1
					break;


				case "hmtx":

					// write zeroes for now, update with real values at the end
					// write all values in full even for monospace fonts

					table.length = 4 * font.numGlyphs;
					if (node) {
						hmtxBuf = Buffer.alloc(table.length); // zeroed data
						write (fdw, hmtxBuf, 0, table.length, table.offset);
					}
					else {
						hmtxBuf = new DataView(fontBuffer.buffer, position);
					}
					position += table.length;
					// remember to tweak hhea.numberOfHMetrics = font.numGlyphs
					break;


				case "name":
					// allocate max possible space needed
					// - TODO: calculate size of nameBuf accurately, then we can:
					//         delete config.name.maxSize
					//         write directly into font file in frontend mode

					const nameBuf = new DataView(new ArrayBuffer(font.config.name.maxSize));
					let newNames = [];

					// generate a subfamilyName from axis settings if this instance does not have a name
					let subfamilyName = instance.name;
					if (subfamilyName === undefined) {
						subfamilyName = "";
						let fvs = font.tupleToFvs(instance.tuple);
						Object.keys(fvs).forEach(tag => {
							subfamilyName += `${tag} ${fvs[tag]} `;
						});
						subfamilyName = subfamilyName.trim(); // e.g. "wght 500 wdth 98"
					}

					// get names from the variable font
					// - remember that font.names is generally sparse, so newNames.length!=nameID
					font.names.forEach ((name, nameID) => {
						if (instance.type != "default") {
							switch (nameID) {
								case 2: // subfamily name: update to the current instance name or subfamilyName calculated above
								case 17:
									name = subfamilyName;
									if (!font.names[17])
										newNames.push([17, name]); // add typographic subfamily name if it’s not there
									break;
								case 4: // full font name: append current instance name
									name = `${font.names[4]} ${subfamilyName}`;
									break;
								case 6: // postscript name: append subfamilyName
									name = `${font.names[6]}-${subfamilyName.replace(" ", "")}`; // remove spaces
									break;
							}
						}
						newNames.push([nameID, name]);
					});

					// add typographic family name if it’s not there
					if (!font.names[16] && font.names[1])
						newNames.push([16, font.names[1]]);

					// sort newNames to handle any additions
					newNames.sort((a,b) => { return a[0]-b[0]; });

					// 1. write table header
					let offsetNR = 6;
					let offsetStr = offsetNR + 12*newNames.length;
					nameBuf.setUint16(0, 0); // format
					nameBuf.setUint16(2, newNames.length); // count of nameRecords
					nameBuf.setUint16(4, offsetStr); // stringOffset

					// 2. write nameRecords and strings
					p = offsetStr;
					newNames.forEach((kv, n) => {
						let nameID = kv[0], name = kv[1];
						[3, 1, 0x0409, nameID, 2*name.length, p-offsetStr].forEach ((nri, i) => {
							nameBuf.setUint16(offsetNR + 12*n + 2*i, nri); // write 6 USHORTs for each nameRecord
						});
						for (let c=0; c<name.length; c++) // write each string (2 bytes per character)
							nameBuf.setUint16(p, name.charCodeAt(c)), p+=2;
					});

					// 3. write name data
					table.length = p;
					if (node)
						write (fdw, nameBuf, 0, table.length, table.offset);
					else
						copyBytes (nameBuf, fontBuffer, 0, table.offset, table.length);
					position += table.length;
					break;


				default:

					// final changes to head and hhea tables
					// - in node, we call this *before* writing to the file
					// - memory, we call this *after* copying to the new file in memory
					// - this helps avoid allocating temporary memory to edit
					const tweakTable = tag => {
						switch (tag) {
							case "head":
								let longDateTime = Math.floor(new Date().getTime()/1000) + ((1970-1904) * 365 + Math.floor((1970-1904)/4)+1) * 24 * 60 * 60; // seconds since 1904-01-01 00:00:00... new Date().getTime() is UTC; Math.floor((1970-1904)/4)+1 = 17 leap years between 1904 and 1970
								tableBuffer.setUint32(28, Math.floor(longDateTime / 0x100000000)); // modified LONGDATETIME (high 4 bytes)
								tableBuffer.setUint32(32, longDateTime % 0x100000000); // modified LONGDATETIME (low 4 bytes)

								tableBuffer.setUint16(50, 0x0001); // force long loca format (makes things simpler since we know in advance how much space we need for loca)
								break;

							case "hhea":
								tableBuffer.setUint16(34, font.numGlyphs); // easier if  we ignore minor compression possibilities
								break;
						}

					}

					// allocate memory for table
					let tableBuffer, sourceTableBuffer;
					table.length = font.tables[table.tag].length; // new length = old length

					// read table
					if (node) {
						//tableBuffer = Buffer.alloc(table.length);
						tableBuffer = new DataView(new ArrayBuffer(table.length));
						read (fd, tableBuffer, 0, table.length, font.tables[table.tag].offset);
						// OPTIMIZE: don’t read these short tables again if we already read them when parsing
					}
					else {
						tableBuffer = new DataView(fontBuffer.buffer, table.offset, table.length); // looks into new font
						sourceTableBuffer = new DataView(font.data.buffer, originalTable.offset, table.length); // looks into original font
					}

					// write table
					// - note tweaking happens *before* the write in node, but *after* the copy in memory
					if (node) {
						tweakTable(table.tag);
						write (fdw, tableBuffer, 0, table.length, table.offset);
					}
					else {
						copyBytes(sourceTableBuffer, tableBuffer, 0, 0, table.length); // copy from original table to new table without intermediate
						tweakTable(table.tag);
					}

					position += table.length;
					break;
			}

			// pad table to 4 byte boundary
			let padLength = (4 - table.length%4) % 4; // no padding if table.length%4 == 0
			if (padLength) {
				if (node)
					write (fdw, zeroBuffer, 0, padLength, position); // write at current position

				position += padLength;
			}

		}); // end of each table loop


		// [4] fix up

		// [4a] write final loca table
		newLocas.forEach((loca, g) => {
			locaBuf.setUint32(4*g, loca); // in frontend, this writes final loca values in place
		});
		if (node)
			write (fdw, locaBuf, 0, 4*(font.numGlyphs+1), newTables["loca"].offset);


		// [4b] write final hmtx table
		for (let g=0; g<font.numGlyphs; g++) {
			if (aws[g] > 0) // negative values (not in hmtx spec, but gvar processing might cause them) should have been fixed already
				hmtxBuf.setUint16(4*g, aws[g]);
			if (lsbs[g])
				hmtxBuf.setInt16(4*g+2, lsbs[g]);
		}
		if (node)
			write (fdw, hmtxBuf, 0, 4*font.numGlyphs, newTables["hmtx"].offset);

		// [4c] fix the font header
		fileHeaderBuf.setUint32(0, font.fingerprint);
		fileHeaderBuf.setUint16(4, newTableDirectory.length); // numTables

		// calculate searchRange, entrySelector, rangeShift
		let sr=1, es=0, rs;
		while (sr*2 <= newTableDirectory.length) {
			sr*=2;
			es++;
		}
		sr *= 16;
		rs = (16*newTableDirectory.length)-sr;
		fileHeaderBuf.setUint16(6, sr);
		fileHeaderBuf.setUint16(8, es);
		fileHeaderBuf.setUint16(10, rs);

		// [4d] fix table offsets and sizes

		// write the table directory
		newTableDirectory.sort((a,b) => { return a.tag > b.tag ? 1 : -1; }); // sort tables by tag
		newTableDirectory.forEach((table, t) => {

			for (let c=0; c<4; c++)
				fileHeaderBuf.setUint8(12 + t*16 + c, table.tag.charCodeAt(c)); // e.g. "hmtx" (maybe should store this as the original 32-bit integer to avoid character conversion)
			//fileHeaderBuf.setUint32(12 + t*16 + 4, table.checkSum); // TODO: checksums - for now, leave at zero
			fileHeaderBuf.setUint32(12 + t*16 + 8, table.offset);
			fileHeaderBuf.setUint32(12 + t*16 + 12, table.length);
		});

		// [4e] write the font header and table directory
		if (node)
			write (fdw, fileHeaderBuf, 0, fileHeaderSize, 0);


		// [4f] Fix checksums, timestamp
		/*

		TODO!

		*/


		// [5] reporting
		const timerEnd = new Date();
		instance.timer = timerEnd-timerStart;
		instance.size = position;
		//console.log (`Instantiation time: ${instance.timer} ms`);
		//console.log (`New instance file: ${instance.filename} (${position} bytes)`);


		// [6] close file or return binary
		if (node)
			font.config.fs.closeSync(fdw);
		else
			return new Uint8Array(fontBuffer.buffer, 0, position);
	}

	//////////////////////////////////
	//  getNamedInstances()
	//////////////////////////////////
	this.getNamedInstances = function () {
		let instances = [];
		this.instances.forEach(instance => {
			if (instance.type == "named")
				instances.push(instance);
		});
		return instances;
	}

	//////////////////////////////////
	//  addInstance()
	//////////////////////////////////
	this.addInstance = (fvs, options) => {

		let instance = {
			font: this,
			glyphs: [],
			tuple: [], // normalized
			fvs: {},
			type: "custom",
			static: null, // on instantiation, will contain binary data

			// it’s quite possible we’d like to keep the instance binary in memory as well as know where the file is
			binaryBuffer: null, // on instantiation, will contain binary data (replaces static) ?
			binaryFile: null, // on instantiation, will contain a filename (replaces static) ?
		};

		// assign options
		// - possibly we can add an instance pointing to a pre-existing binary in memory or file
		// - we can set instance.tuple here, by passing options.tuple to the method
		if (typeof options == "object") {
			Object.keys(options).forEach(k => {
				instance[k] = options[k];
			});
		}

		// should we allow instances to be added by tuple?
		// - I think so
		if (fvs) {
			this.axes.forEach((axis,a) => {
				instance.fvs[axis.tag] = (fvs[axis.tag] === undefined) ? axis.default : 1.0 * fvs[axis.tag];
				instance.tuple[a] = this.axisNormalize(axis, instance.fvs[axis.tag]);
			});
		}
		this.instances.push(instance);
		return instance;
	}

	//////////////////////////////////
	//  makeInstance()
	//////////////////////////////////
	this.makeInstance = instance => {
		// TODO maybe check the type of the passed object;
		//  - if it is an instance, then we proceed as below
		//  - if it is a fvs object, we first add the instance then proceed below
		//  - so makeInstance will addInstance if it does not exist
		//  - we should check if the static binary exists already, and if it does, do nothing unless a flag tells us to update and overwrite (because of outline editing for example)
		//console.log ("Making static instance for ", this, instance);
		instance.static = this.exportInstance(instance);
		//console.log ("Finished making static instance for ", this, instance);
		//console.log (`${instance.timer} ms`);
}


	//////////////////////////////////
	//  fvsToTuple()
	//////////////////////////////////
	this.fvsToTuple = fvs => {

		// transforms an fvs object into a normalized tuple
		let tuple = [];
		this.axes.forEach((axis,a) => {
			let val = (!fvs || fvs[axis.tag] === undefined) ? axis.default : 1.0 * fvs[axis.tag];
			tuple[a] = this.axisNormalize(axis, val);
		});
		return tuple;
	}


	//////////////////////////////////
	//  tupleToFvs()
	//////////////////////////////////
	this.tupleToFvs = tuple => {

		// transforms a normalized tuple into an fvs object
		let fvs = {};
		this.axes.forEach((axis,a) => {
			let n = tuple[a];

			// avar denormalization
			if (this.avar && this.avar[a]) {

				let map = this.avar[a];
				for (let m=0; m<map.length; m++) {

					if (map[m][1] >= n) {
						if (map[m][1] == n) {
							n = map[m][0]; // covers the -1, 0 and +1 cases (and, I think, the many to one mappings)
						}
						else {
							if (map[m][1] == map[m-1][1])
								n = map[m-1][0];
							else
								n = map[m-1][0] + (map[m][0] - map[m-1][0]) * ( ( n - map[m-1][1] ) / ( map[m][1] - map[m-1][1] ) )
						}
						break;
					}
				}
			}

			// basic denormalization
			fvs[axis.tag] = axis.default;
			if (n > 0)
			 	fvs[axis.tag] += (axis.max - axis.default) * n;
			else if (tuple[a] < 0)
			 	fvs[axis.tag] += (axis.default - axis.min) * n;

		});
		return fvs;
	}


	//////////////////////////////////
	//  axisIndices()
	//////////////////////////////////
	this.axisIndices = tag => {
		// returns an array containing the axis indicies for this axis tag
		// - normally the array will have only one element
		// - HOI fonts may contain multiple axes with identical tags
		// - an empty array means the axis tag is not in this font
		// - it would be better to precalculate these if we use this function intensively

		let indices = [];
		this.axes.forEach((axis,a) => {
			if (axis.tag == tag)
				indices.push(a);
		});
		return indices;
	}


	//////////////////////////////////
	//  axisNormalize(axis, t)
	//////////////////////////////////
	this.axisNormalize = (axis, t, avarIgnore) => {

		// noramalizes t into n, which is returned

		//Bahnschrift avar table
		// <segment axis="wght">
		//   <mapping from="-1.0" to="-1.0"/>
		//   <mapping from="0.0" to="0.0"/>
		//   <mapping from="0.6667" to="0.5"/>
		//   <mapping from="1.0" to="1.0"/>
		// </segment>
		// <segment axis="wdth">
		//   <mapping from="-1.0" to="-1.0"/>
		//   <mapping from="0.0" to="0.0"/>
		//   <mapping from="1.0" to="1.0"/>
		// </segment>
		let n;

		if (axis === undefined) {
			n = 0;
			return n;
		}


		// basic normalization
		if (t == axis.default)
			n = 0;
		else if (t > axis.default) {
			if (t > axis.max)
				n = 1;
			else
				n = axis.max==axis.default? 0 : (t-axis.default)/(axis.max-axis.default);
		}
		else {
			if (t < axis.min)
				n = -1;
			else
				n = axis.min==axis.default? 0 : (axis.default-t)/(axis.min-axis.default);
		}

		// "avar" table transformation
		// - see https://docs.microsoft.com/en-us/typography/opentype/spec/avar
		if (this.avar && this.avar[axis.id] && !avarIgnore) {
			let map = this.avar[axis.id];
			for (let m=0; m<map.length; m++) {

				if (map[m][0] >= n) {

					if (map[m][0] == n)
						n = map[m][1];
					else
						n = map[m-1][1] + (map[m][1] - map[m-1][1]) * ( ( n - map[m-1][0] ) / ( map[m][0] - map[m-1][0] ) );

					break;
				}
			}
		}

		// rounding
		n = Math.round(n * 16384) / 16384;

		return n;
	}


	// Convert from F2DOT14 internal values (-1.0 to +1.0) into user axis values
	// TODO: include avar
	this.axisDenormalize = (axis, t) => {


	}


	// load data if not already loaded
	if (!this.data && (this.url || this.inFile)) {
		this.load(this.url || this.inFile);
	}


	if (init.arrayBuffer) {

		console.log ("arraybuffer method!")
		this.data = new DataView(this.arrayBuffer);
		this.parse();
	}
}


// object instantiatr
function SVG(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}


function getGlyphSVGpath(glyph)
{
	// we either return a path (simple glyph) or an array of paths (composite glyph)

	// composite? handle them recursively
	// - ok, this could lead to an array of arrays of arrays…
	// - we only process them 1 level deep, a limitation shared with macOS
	// - TODO: process to an arbitrary depth (macOS no longer has this limitation)
	if (glyph.numContours == -1) {
		let paths = [];
		glyph.components.forEach((component, c) => {

			//console.log(`Processing component ${c} (gid ${component.glyphId})`);
			if (glyph.instance) {
				let path;
				if (glyph.instance.glyphs[component.glyphId]) { // we have already instantiated this glyph for this instance
					//iglyph = 
				}
				else {
					// we must instantiate this glyph
					//console.log("getGlyphSVGpath: calling glyphApplyVariations");
					glyph.instance.glyphs[component.glyphId] = glyphApplyVariations(glyph.font.glyphs[component.glyphId], null, glyph.instance); // we must instantiate this glyph for this instance
				}
				path = getGlyphSVGpath(glyph.instance.glyphs[component.glyphId]);
				paths.push(path);
			}
			else {
				//console.log("getGlyphSVGpath with !glyph.instance, glyph = ", glyph);
				paths.push(getGlyphSVGpath(glyph.font.glyphs[component.glyphId]));
			}
		});
		return paths; // return an array for composites
	}

	let path = "";
	let glyphSVG = [];
	let contourSVG, pt, pt_, c, p;
	let startPt = 0;

	// convert TT points to an array of points ready for SVG, glyphSVG
	glyph.endPts.forEach(function (endPt) {
		const numPointsInContour = endPt-startPt+1;
		contourSVG = [];

		for (p=startPt; p<=endPt; p++) {
			pt = glyph.points[p];
			pt_ = glyph.points[(p-startPt+1)%numPointsInContour+startPt];
			contourSVG.push (pt);
			if (pt[2] == 0 && pt_[2] == 0)
				contourSVG.push ([(pt[0]+pt_[0])/2,(pt[1]+pt_[1])/2,1]);
		}
		if (contourSVG[0][2] == 0) // ensure SVG contour starts with an on-curve point
			contourSVG.unshift(contourSVG.pop());
		glyphSVG.push(contourSVG);
		startPt = endPt+1;
	});

	// convert glyphSVG to an actual SVG path
	// - already, there are never >1 consecutive off-curve points
	for (c=0; c<glyphSVG.length; c++) {
		contourSVG = glyphSVG[c];
		for (p=0; p<contourSVG.length; p++) {
			pt = contourSVG[p];
			if (p==0)
				path += `M${pt[0]} ${pt[1]}`;
			else {
				if (pt[2] == 0) { // off-curve point (consumes 2 points)
					pt_ = contourSVG[(++p) % contourSVG.length]; // increments loop variable p
					path += `Q${pt[0]} ${pt[1]} ${pt_[0]} ${pt_[1]}`;
				}
				else // on-curve point
					path += `L${pt[0]} ${pt[1]}`;
				if (p == contourSVG.length-1)
					path += "Z";
			}
		}
	}
	return path;
}


function instanceApplyVariations (font, instance) {

	for (let g=0; g<font.numGlyphs; g++) {
		instance.glyphs[g] = glyphApplyVariations (font.glyphs[g], null, instance);
	}
}


function glyphApplyVariations (glyph, userTuple, instance, extra) {

	// create newGlyph, a new glyph object which is the supplied glyph with the variations applied, as specified in instance (or if blank, userTuple)
	// - TODO: can we move away from using userTuple and always require an instance?

	// generate the glyph (e.g. if it’s needed by a composite)
	if (glyph === undefined) {
		console.log ("glyphApplyVariations: glyph is undefined, here is instance.font", instance.font)
	}

	let config = glyph.font.config;
	let newGlyph = {
		default: glyph,
		font: glyph.font,
		id: glyph.id,
		//instance: true,
		instance: instance, // this is still safe for tests that check for (!glyph.instance)
		type: "instance",
		name: glyph.name,
		points: [],
		touched: [],
		numContours: glyph.numContours,
		components: glyph.components,
		endPts: glyph.endPts,
		numPoints: glyph.numPoints,
		xMin: undefined,
		yMin: undefined,
		xMax: undefined,
		yMax: undefined,
		flags: glyph.flags, // do we need this?
	};
	let round = CONFIG.deltas.round;
	if (extra && extra.roundDeltas === false)
		round = false;

	if (config.visualization)
		newGlyph.tvtsVisualization = [];

	// get a good userTuple (TODO: more validations than the array check)
	// - it is recommended to use the ‘instance’ parameter, since then we preserve a connection between newGlyph and its instance
	if (userTuple === null && instance)
		userTuple = instance.tuple;
	if (!Array.isArray(userTuple)) {
		userTuple = glyph.font.fvsToTuple(userTuple); // userTuple was an fvs type object, but we transform it into a tuple array
	}

	// newGlyph starts off as a duplicate of the default glyph (at least, all of its points)
	glyph.points.forEach(function (point, p) {
		newGlyph.points[p] = [point[0], point[1], point[2]];
	});

	// go through each tuple variation table for this glyph
	newGlyph.sValues = [];
	glyph.tvts.forEach(function(tvt, t) {

		let scaledDeltas = [];
		let touched = [];
		let S = 1;

		glyph.points.forEach(function (point, p) {
			scaledDeltas[p] = [0,0];
		});

		// go thru each axis, multiply a scalar S from individual scalars AS
		// based on pseudocode from https://www.microsoft.com/typography/otspec/otvaroverview.htm
		glyph.font.axes.forEach((axis, a) => {
			const ua = userTuple[a], peak = tvt.peak[a], start = tvt.start[a], end = tvt.end[a];
			let AS;

	        if (start > peak || peak > end)
	            AS = 1;
	        else if (start < 0 && end > 0 && peak != 0)
	            AS = 1;
	        else if (peak == 0)
	            AS = 1;
	        else if (ua < start || ua > end)
	            AS = 0;
	        else {
	            if (ua == peak)
	                AS = 1;
	            else if (ua < peak)
	                AS = (ua - start) / (peak - start);
	            else
	                AS = (end - ua) / (end - peak);
	        }
	        S *= AS;

	        // TODO: optimize so that we quit the loop if AS == 0
	        // TODO: get rid of AS and use "S *= " in each of the branches (altho not ideal if we want to record each AS for visualization)
		});

		// now we can move the points by S * delta
		if (S != 0) {

			tvt.deltas.forEach((delta, pt) => {
				if (delta !== null) {
					newGlyph.touched[pt] = touched[pt] = true; // touched[] is just for this tvt; newGlyph.touched[] is for all tvts (in case we want to show in UI) 
					// btw, we don’t need to store touched array for composite or non-printing glyphs - probably a negligible optimization
					scaledDeltas[pt] = [S * delta[0], S * delta[1]];
				}
			});

			// IUP
			// - TODO: ignore this step for composites (even though it is safe because endPts==[])
			if (touched.length > 0 && !config.instantiation.ignoreIUP) { // it would be nice to check "touched.length < glyph.points.length" but that won’t work with sparse arrays, and must also think about phantom points

				// for each contour
				for (let c=0, startPt=0; c<glyph.endPts.length; c++) { // TODO: can we just use glyph.numContours?
				
					// TODO: check here that the contour is actually touched
					const numPointsInContour = glyph.endPts[c]-startPt+1;
					let firstPrecPt = -1; // null value
					let precPt, follPt;
					for (let p=startPt; p!=firstPrecPt; ) {
						let pNext = (p-startPt+1)%numPointsInContour+startPt;
						if (touched[p] && !touched[pNext]) { // found a precPt
							precPt = p;
							follPt = pNext;
							if (firstPrecPt == -1)
								firstPrecPt = precPt;
							do {
								follPt = (follPt-startPt+1)%numPointsInContour+startPt;
								} while (!touched[follPt]) // found the follPt

							// now we have a good precPt and follPt
							// perform IUP for x(0), then for y(1)
							[0,1].forEach(function (xy) {
								// IUP spec: https://www.microsoft.com/typography/otspec/gvar.htm#IDUP
								const pA = glyph.points[precPt][xy];
								const pB = glyph.points[follPt][xy];
								const dA = scaledDeltas[precPt][xy];
								const dB = scaledDeltas[follPt][xy];

								for (let q=pNext, D, T, Q; q!=follPt; q=(q-startPt+1)%numPointsInContour+startPt) {
									Q = glyph.points[q][xy];
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
							});
							p = follPt;
						}
						else if (pNext == startPt && firstPrecPt == -1) // failed to find a precPt, so abandon this contour
							break;
						else
							p = pNext;
					}
					startPt = glyph.endPts[c]+1;
				}
			} // if IUP

			// add the net deltas to the glyph
			// TODO: Try to avoid this step for points that were not moved
			// TODO: Verify that we are rounding correctly. The spec implies we should maybe NOT round here
			// - https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview
			newGlyph.points.forEach(function (point, p) {
				if (round) {
					point[0] += Math.round(scaledDeltas[p][0]);
					point[1] += Math.round(scaledDeltas[p][1]);
				}
				else {
					point[0] += scaledDeltas[p][0];
					point[1] += scaledDeltas[p][1];
				}
			});
		} // if (S != 0)

		
		// store S and scaledDeltas so we can use them in visualization
		// - maybe we should recalculate multiple AS values and 1 S value in the GUI so we don’t add load to samsa-core
		if (config.visualization) {
			//newGlyph.sValues.push(S);
			newGlyph.tvtsVisualization.push({
				S: S,
				scaledDeltas: scaledDeltas,
			});
		}

	}); // end of processing the tvts

	// new bbox extremes
	// - TODO: fix for composites and non-printing glyphs (even though the latter don’t record a bbox)
	if (glyph.tvts.length) {
		newGlyph.xMin = newGlyph.yMin = 32767;
		newGlyph.xMax = newGlyph.yMax = -32768;
		for (let pt=0; pt<newGlyph.numPoints; pt++) { // exclude the phantom points
			let point = newGlyph.points[pt];
			if (newGlyph.xMin > point[0])
				newGlyph.xMin = point[0];
			else if (newGlyph.xMax < point[0])
				newGlyph.xMax = point[0];
			if (newGlyph.yMin > point[1])
				newGlyph.yMin = point[1];
			else if (newGlyph.yMax < point[1])
				newGlyph.yMax = point[1];
		}
	}
	
	return newGlyph;
}


function getDefaultGlyphId(font) {
	// use config.defaultGlyph array to find the first available representative glyph for this font
	for (let d=0; d < font.config.defaultGlyph.length; d++) {
		let g, name = font.config.defaultGlyph[d];
		if ((g = font.glyphNames.indexOf(name)) != -1) {
			return g; // inelegant but concise
		}
	}

	// we didn’t find any of the glyphs named in config.defaultGlyph, let’s use the first printable simple glyph
	// - IMPORTANT: numContours requires the glyphs to be loaded
	// - TODO: we probably shouldn't avoid returning a composite glyph, but we don't want to return a space glyph
	for (let g=0; g < font.numGlyphs; g++) {
		if (font.glyphs[g].numContours > 0 && g>0 && font.glyphNames[g] != ".notdef") {
			return g; // inelegant but concise
		}
	}

	// we tried to avoid .notdef and glyph 0, but here we are
	return 0;
}


function SamsaInstance () {

	this.fvs = {};
	this.tuple = [];

}


function quit(obj) {
	if (obj.errors !== undefined) {
		obj.errors.forEach(error => {
			console.error(`ERROR: ${error}`);
		})
	}
	process.exit(0);
}


// exports for node.js
if (CONFIG.isNode) {
	module.exports = {
		SamsaFont: SamsaFont,
		//SamsaGlyph: SamsaGlyph,
	};
}
