// https://www.npmjs.com/package/uglify-es // this version of uglify is ES6 compatible, earlier versions were not
// uglifyjs samsa.js > samsa.min.js



//var currentUser = null;

const config = {
	MAX_TABLES: 100,
	OVERLAP_FLAG_APPLE: false,
	MAX_SIZE_FONT: 10000000,
	MAX_SIZE_GLYF_TABLE: 10000000,
	MAX_SIZE_NAME_TABLE: 50000,
};

let deltaColours = [
	"red",
	"green",
	"blue",
	"pink",
	"lightgreen",
	"lightblue",
	"red",
	"green",
	"blue",
	"pink",
	"lightgreen",
	"lightblue",
	"red",
	"green",
	"blue",
	"pink",
	"lightgreen",
	"lightblue",
	"red",
	"green",
	"blue",
	"pink",
	"lightgreen",
	"lightblue",
];

let prefs = {
	showPointNumbers: false,
	showNodes: false
};

// main UI layers: each layer is a glyph object or false
let layers = [
		{
			glyph: false,
			name: "defaultGlyph"
		},
		{
			glyph: false,
			name: "backgroundGlyph"
		},
		{
			glyph: false,
			name: "instanceGlyph"
		}
	];

let svg, svgg;

let fonts = [];
let glyph = {
	font: undefined,
	endPts: [],
	points: [],
	deltas: []
};
let newGlyph;



/*
var font = {
	axes: [
		{ tag: "wght", name: "Weight", min: 0, default: 500, max: 1000, curr: 500 },
		{ tag: "wdth", name: "Width", min: 0, default: 200, max: 1000, curr: 200 }
	]
};
fonts[0] = font;

var glyph = {
		font: font,
		endPts: [3, 7],
		points: [[0,0,0], [0,100,0], [100,100,0], [100,0,0] ,  [50,50,1],[25, 75,1],[75,75,1],[75,50,1] ],
		deltas: [
			{
				tuple: [0.7,0.0],
				points: [0, 1, 5],
				offsets: [ [50,50],[50,10], [100,70] ]
			},

			{
				tuple: [-1.0,0.0],
				points: [3, 6],
				offsets: [ [-50,50], [-100,-210] ]
			},

			{
				tuple: [0,1],
				points: [3,6],
				offsets: [ [10,120],[30,140] ]
			},
			
			{
				tuple: [0,1],
				points: [3,6],
				offsets: [ [10,120],[30,40] ]
			},
//			{
//				tuple: [0,1],
//				points: [0, 3],
//				offsets: [ [50,50],[51,10] ]
//			},
			{
				tuple: [0,-1],
				points: [3, 6],
				offsets: [ [-50,50], [-100,-310] ]
			},
		]
	};

*/



function getStringFromData (data, p0, length)
{
	var str = "";
	var p = p0;
	while (p - p0 < length)
	{
		str += String.fromCharCode(data.getUint8(p++));	
	}
	return str;
}

function uint8ToBase64(buffer) {
     var binary = '';
     var len = buffer.byteLength;
     for (var i = 0; i < len; i++) {
         binary += String.fromCharCode(buffer[i]);
     }
     return window.btoa( binary );
}

DataView.prototype.getTag = function (p) {
	var tag = "";
	var p_end = p + 4;
	var ch;
	while (p < p_end)
	{
		ch = this.getUint8(p++);
		if (ch >= 32 && ch < 126) // valid chars in tag data type https://www.microsoft.com/typography/otspec/otff.htm
			tag += String.fromCharCode(ch);	
	}
	return tag.length == 4 ? tag : false;
}

DataView.prototype.getF2DOT14 = function (p) {
	return this.getInt16(p) / 16384.0; /* signed */
}

function copyBytes(source, target, zs, zt, n)
{
	// copies n bytes from DataView source (starting at zs) to DataView target (starting at zt)
	for (var end = zt+n; zt<end; zt++,zs++)
		//target[zt] = source.getUint8(zs);
		target.setUint8(zt, source.getUint8(zs));
}

function makeStaticFont (font) // use the current settings in font.axes
{
	// elapsed time
	const timerStart = new Date();

	var newfont = {
		tableDirectory: [],
		tables: {},
		glyphs: []
	};

	// set up the new glyf & loca table
	var p = 0;
	var glyfLocas = [0]; // there are numGlyphs+1 loca entries
	var buffer = new ArrayBuffer(config.MAX_SIZE_GLYF_TABLE);
	var glyfTable = new DataView(buffer);
	let userTuple = [];
	font.axes.forEach(function (axis) {
		userTuple.push(axisNormalize(axis, axis.curr));
	});
	let iglyph;

	for (var g=0; g < font.numGlyphs; g++)
	{
		var defaultGlyph = font.glyphs[g];
		var options = {iup: true, ignoreDeltas: false, getCoeffs: true};
		var gvd;

  		if (defaultGlyph.numContours > 0 && (gvd = font.gvds[g]))
  		{
			convertToNewFormat (defaultGlyph);
			iglyph = glyphAddVariationDeltas (defaultGlyph, userTuple, options);
			iglyph.newLsb = 0;
			newfont.glyphs[g] = iglyph;

			let xMin=0,xMax=0,yMin=0,yMax=0;
			var pt;
			var points = iglyph.points;
			var instructionLength = 0;

			if (points && points[0])
			{
				xMin = xMax = points[0][0];
				yMin = yMax = points[0][1];
				for (pt=1; pt<iglyph.numPoints; pt++)
				{
					const [P,Q] = points[pt];
					if (P<xMin) xMin=P;
					else if (P>xMax) xMax=P;
					if (Q<yMin) yMin=Q;
					else if (Q>yMax) yMax=Q;
				};
				xMin = Math.round(xMin);
				xMax = Math.round(xMax);
				yMin = Math.round(yMin);
				yMax = Math.round(yMax);
			}
			else
			{
				// TODO: COMPOSITES and SPACE GLYPHS
			}
			iglyph.newLsb = xMin;

			// new bbox
			glyfTable.setInt16(p, iglyph.numContours), p+=2;
			glyfTable.setInt16(p, xMin), p+=2;
			glyfTable.setInt16(p, yMin), p+=2;
			glyfTable.setInt16(p, xMax), p+=2;
			glyfTable.setInt16(p, yMax), p+=2;

			// endpoints
			for (var e=0; e<iglyph.numContours; e++)
			{
				glyfTable.setUint16(p, iglyph.endPts[e]), p+=2;
			}

			// instructions
			glyfTable.setUint16(p, instructionLength); p+=2;
			// write instructions here, but we don't bother for now
			p += instructionLength;

			// compress points
			let dx=[], dy=[], X, Y, flags=[], f, cx=cy=0;
			for (pt=0; pt<iglyph.numPoints; pt++)
			{
				X = dx[pt] = Math.round(points[pt][0]) - cx;
				Y = dy[pt] = Math.round(points[pt][1]) - cy;
				f = points[pt][2]; // on-curve = 1, off-curve = 0
				if (!X)
					f |= 0x10;
				else if (X >= -255 && X <= 255)
					f |= (X > 0 ? 0x12 : 0x02);

				if (!Y)
					f |= 0x20;
				else if (Y >= -255 && Y <= 255)
					f |= (Y > 0 ? 0x24 : 0x04);

				flags[pt] = f;
				cx = points[pt][0];
				cy = points[pt][1];
			}
			if (config.OVERLAP_FLAG_APPLE)
				flags[0] |= 0x40; // overlap signal for Apple, see https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6AATIntro.html ('glyf' table section)

			// write flags
			for (pt=0; pt<iglyph.numPoints; pt++)
				glyfTable.setUint8(p, flags[pt]), p++; // compress this a bit more later with the repeat flag

			// write point coordinates
			for (pt=0; pt<iglyph.numPoints; pt++)
			{
				if (dx[pt] == 0)
					continue;
				if (dx[pt] >= -255 && dx[pt] <= 255)
					glyfTable.setUint8(p, (dx[pt]>0) ? dx[pt] : -dx[pt]), p++;
				else
					glyfTable.setInt16(p, dx[pt]), p+=2;
			}
			for (pt=0; pt<iglyph.numPoints; pt++)
			{
				if (dy[pt] == 0)
					continue;
				if (dy[pt] >= -255 && dy[pt] <= 255)
					glyfTable.setUint8(p, (dy[pt]>0) ? dy[pt] : -dy[pt]), p++;
				else
					glyfTable.setInt16(p, dy[pt]), p+=2;
			}

			// padding
			if (p%2)
				glyfTable.setUint8(p, 0), p++;

			// record our data position
			glyfLocas.push(p);
		}
		else
		{
			// either a) there are no variations, b) glyph is composite or c) glyph has no gvd
			// if (glyph.numContours < 0 || !gvd)
			var offset, nextOffset;
			if (font.tables['head'].data.indexToLocFormat == 0)
			{
				offset = 2 * font.data.getUint16(font.tables['loca'].offset + 2*g);
				nextOffset = 2 * font.data.getUint16(font.tables['loca'].offset + 2*(g+1));
			}
			else
			{
				offset = font.data.getUint32(font.tables['loca'].offset + 4*g);
				nextOffset = font.data.getUint32(font.tables['loca'].offset + 4*(g+1));
			}

			if (nextOffset > offset) // allow for empty glyphs
			{
				copyBytes(font.data, glyfTable, font.tables['glyf'].offset + offset, p, nextOffset - offset);
				p += nextOffset - offset;
			}

			// padding
			if (p%2)
				glyfTable.setUint8(p, 0), p++;
			glyfLocas.push(p);
		}
	}

	// copy all tables except gvar and fvar
	var fBuffer = new ArrayBuffer(config.MAX_SIZE_FONT);
	var fDataView = new DataView(fBuffer);
	p = 0;

	// write font header
	fDataView.setUint32(p, 0x00010000), p+=4;

	// get the new numTables
	var tablesToSkip = ['gvar','fvar','cvar','avar','STAT','MVAR','HVAR'];
	newfont.numTables = font.numTables;
	for (var t=0; t < tablesToSkip.length; t++)
		if (font.tables[tablesToSkip[t]]) // if these unwanted tables exist in font, decrement numTables in the new font
			newfont.numTables--;

	// write numTables stuff
	p = 4;
	fDataView.setUint16(p, newfont.numTables), p+=2;
	for (var sr=1, es=0; sr*2 <= newfont.numTables; sr*=2, es++)
		;
	fDataView.setUint16(p, sr*16), p+=2;
	fDataView.setUint16(p, es), p+=2;
	fDataView.setUint16(p, 16*(newfont.numTables-sr)), p+=2;


	// check loca table format
	var indexToLocFormat = glyfLocas[glyfLocas.length -1] < 0x20000 ? 0 : 1;

	// skip table directory
	p = 12 + newfont.numTables * 16;
	for (var t=0; t<font.numTables; t++) // steps thru the original tables, copying most of them
	{
		if (tablesToSkip.indexOf(font.tableDirectory[t].tag) != -1)
			continue; // omit!

		var p_start = p;
		switch (font.tableDirectory[t].tag)
		{
			case "glyf":
				copyBytes (glyfTable, fDataView, 0, p, glyfLocas[font.numGlyphs]); // copy the whole table in one go
				p += glyfLocas[font.numGlyphs];
				break;

			case "hmtx":
				for (var g=0; g<font.numGlyphs; g++)
				{
					let glyph = newfont.glyphs[g] ? newfont.glyphs[g] : font.glyphs[g];

					/*
					if (glyph.numPoints > 0 && glyph.points)
					{
						fDataView.setUint16(p, glyph.points[glyph.numPoints+1][0]), p+=2; // the x coord of the advance width point
						fDataView.setInt16(p, glyph.newLsb), p+=2;
					}
					else
					{
						fDataView.setUint16(p, 0), p+=2;
						fDataView.setInt16(p, 0), p+=2;
					}
					// TODO: check if hhea.numberOfHMetrics needs to be updated
					*/

					if (glyph.numContours >= 0 && glyph.points) // simple glyphs incl. spaces
					{
						if (g < font.tables['hhea'].data.numberOfHMetrics)
							fDataView.setUint16(p, glyph.points[glyph.numPoints+1][0]), p+=2; // the x coord of the advance width point
						fDataView.setInt16(p, glyph.newLsb), p+=2;
					}
					else
					{
						fDataView.setUint16(p, 0), p+=2;
						fDataView.setInt16(p, 0), p+=2;
					}



				}
				break;

			case "loca":
				if (indexToLocFormat == 0)
					for (var l=0; l<glyfLocas.length; l++) // < is correct
						fDataView.setUint16(p, glyfLocas[l] / 2), p+=2;
				else /* indexToLocFormat == 1 */
					for (var l=0; l<glyfLocas.length; l++) // < is correct
						fDataView.setUint32(p, glyfLocas[l]), p+=4;
				break;

			case "name":
				// allocate max possible space needed
				// only write 3,1 English names
				const nameBuf = new ArrayBuffer(config.MAX_SIZE_NAME_TABLE);
				const dvName = new DataView(nameBuf);

				// build nameRecords and write names into dvname/nameBuf
				let pn=0, n=0, nameRecords = [];
				font.names.forEach (function (name, nameID) {
					nameRecords[n] = [3,1,0x0409,nameID,2*name.length,pn];
					for (let c=0; c<name.length; c++)
						dvName.setUint16(pn, name.charCodeAt(c)), pn+=2;
					n++;
				});

				// write table header
				fDataView.setUint16(p, 0), p+=2; // format
				fDataView.setUint16(p, n), p+=2; // count
				fDataView.setUint16(p, 6 + 12*n), p+=2; // stringOffset

				// write nameRecords
				nameRecords.forEach (function (nameRecord, n) {
					nameRecord.forEach (function (nri) {
						fDataView.setUint16(p, nri), p+=2;
					});
				});

				// write name data
				copyBytes (dvName, fDataView, 0, p, pn);
				p += pn;

				break;

			default:
				// copy the table without changes
				copyBytes(font.data, fDataView, font.tableDirectory[t].offset, p, font.tableDirectory[t].length);
				p += font.tableDirectory[t].length;
				break;
		}

		newfont.tableDirectory.push({
			tag: font.tableDirectory[t].tag,
			checkSum: 0,
			offset: p_start,
			length: p - p_start
		});
		newfont.tables[font.tableDirectory[t].tag] = newfont.tableDirectory[newfont.tableDirectory.length -1];

		// pad to 4 bytes
		/*
		switch (p%4)
		{
			case 3: fDataView.setUint8(p, 0); fDataView.setUint8(p+1, 0); fDataView.setUint8(p+2, 0); p+=3; break;
			case 2: fDataView.setUint8(p, 0); fDataView.setUint8(p+2, 0); p+=2; break;
			case 1: fDataView.setUint8(p, 0); p+=1; break;
		}
		*/

		// pad this table to 4 bytes
		var padBytes = (4 - p%4) % 4; // no padding if p%4 == 0
		while (padBytes--)
			fDataView.setUint8(p++, 0);
	}

	var totalNewFontLength = p;

	// write the table directory (finally!)
	p = 12;
	for (var t=0; t<newfont.numTables; t++)
	{
		for (var c=0; c<4; c++)
			fDataView.setUint8(p, newfont.tableDirectory[t].tag.charCodeAt(c)), p++;
		fDataView.setUint32(p, newfont.tableDirectory[t].checkSum), p+=4;
		fDataView.setUint32(p, newfont.tableDirectory[t].offset), p+=4;
		fDataView.setUint32(p, newfont.tableDirectory[t].length), p+=4;
	}

	//var thing = new Uint8Array (fBuffer);

	//$("#webfonts").append("@font-face {font-family:'" + "New Font Instance" + "'; " + "src: url('data:;base64," + uint8ToBase64(thing) + "') format('truetype');} ");

	//$("#css-instance").html("@font-face {font-family:'" + "InstanceFont" + "'; " + "src: url('data:;base64," + uint8ToBase64(thing) + "') format('truetype');} ");

	// make it downloadable, as in TTJS	

	var filedata = new Uint8Array(fBuffer, 0, totalNewFontLength);

	// elapsed time
	const timerEnd = new Date();
	console.log ("Generated font in "+(timerEnd-timerStart)+" ms");

	return filedata;
}

function fontHasTables (font, tables)
{
	let n=0;
	tables.forEach(function (tag) {
		if (font.tables[tag])
			n++;
	});
	return (n == tables.length);
}


function newFont (fontReq)
{
	// check type of fontReq

	if (typeof fontReq == "string")
	{


	}
	else if (fontReq instanceof DataView)
	{
		var font = {
			data: fontReq,
			axes: [],
			errors: []
		};
		var data = fontReq;
		var table; 
		var p = 0, p_ = 0; // data pointers

		// sfntVersion
		switch (data.getUint32(0))
		{
			case 0x00010000:
			case 0x74727565: // 'true' (as in Skia.ttf)
			case 0x4f54544f: // 'OTTO' (as in OpenType OTF fonts)
				break;

			default:
				font.errors.push ("Invalid first 4 bytes of the file. Must be one of: 0x00010000, 0x74727565, 0x4f54544f");
				break;
		}

		// set up tables
		if (!font.errors.length)
		{
			font.numTables = data.getUint16(4);
			if (font.numTables > config.MAX_TABLES)
				font.errors.push ("numTables (" + font.numTables + "exceeds config.MAX_TABLES (" + config.MAX_TABLES + ")");
			else
			{
				font.tableDirectory = [];
				font.tables = {};
				p = 12;
				for (var t=0; t<font.numTables; t++)
				{
					//var tag = getStringFromData (data, p, 4);
					var tag = data.getTag (p);
					if (!tag) {
						font.errors.push ("Tag value is invalid");
						break;
					}
					font.tables[tag] = font.tableDirectory[t] = {
						tag: tag,
						checkSum: data.getUint32(p+4),
						offset: data.getUint32(p+8),
						length: data.getUint32(p+12),
					};
					p += 16;
				}
			}
		}

		if (font.errors.length)
			return font;

		// get maxp data
		table = {};
		p = font.tables['maxp'].offset;
		table.version = data.getUint32(p), p+=4;
		table.numGlyphs = data.getUint16(p), p+=2;
		font.numGlyphs = table.numGlyphs; // convenience
		// maxp end


		// get head data
		table = {};
		p = font.tables['head'].offset;
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
		font.tables['head'].data = table;
		// head end


		// get hhea data
		table = {};
		p = font.tables['hhea'].offset;
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
		font.tables['hhea'].data = table;
		// hhea end


		// get hmtx data
		if (fontHasTables(font, ["hmtx","hhea"]))
		{
			table = {};
			p = font.tables['hmtx'].offset;
			font.widths = [];
			if (font.tables['hhea'].data.numberOfHMetrics < 1)
				font.errors.push ("hhea: numberOfHMetrics must be >=1.")
			for (var m=0; m<font.numGlyphs; m++)
			{
				if (m < font.tables['hhea'].data.numberOfHMetrics)
				{
					font.widths[m] = data.getUint16(p), p+=2;
					p+=2; // skip over unwanted lsb
				}
				else
					font.widths[m] = font.widths[m-1];
			}
			table.majorVersion = data.getUint16(p), p+=2;
			table.ascender = data.getInt16(p), p+=2;
			font.tables['hmtx'].data = table;
		} // hmtx end


		// get name data
		table = {};
		p = font.tables['name'].offset;

		table.format = data.getUint16(p), p+=2;
		table.count = data.getUint16(p), p+=2;
		table.stringOffset = data.getUint16(p), p+=2;
		table.nameRecords = [];
		table.names = [];
		for (var n=0; n < table.count; n++)
		{
			var nameRecord = {};
			var str = "";
			var nameRecordStart, nameRecordEnd;

			nameRecord.platformID = data.getUint16(p), p+=2;
			nameRecord.encodingID = data.getUint16(p), p+=2;
			nameRecord.languageID = data.getUint16(p), p+=2;
			nameRecord.nameID = data.getUint16(p), p+=2;
			nameRecord.length = data.getUint16(p), p+=2;
			nameRecord.offset = data.getUint16(p), p+=2;

			nameRecordStart = font.tables['name'].offset + table.stringOffset + nameRecord.offset;
			nameRecordEnd = nameRecordStart + nameRecord.length;

			if (nameRecordEnd > font.tables['name'].offset + font.tables['name'].length) // safety check
				continue;

			p_ = p;
			p = nameRecordStart;
			switch (nameRecord.platformID)
			{
				case 1:
					if (nameRecord.languageID == 0)
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
								//var big = 0;
								while (p < nameRecordEnd) {
									/*
									// this obtains the Unicode index for codes >= 0x10000
									var d = data.getUint16(p);
									if (d >= 0xD800 && d <= 0xDBFF)
										big = 0x10000 + 0x400 * (d - 0xD800);
									else if (d >= 0xDC00 && d <= 0xDFFF)
									{
										big += d - 0xDC00;
										console.log (big.toString (16));
									}
									*/
									str += (String.fromCharCode(data.getUint16(p))), p+=2; // this should not work, but does in Zycon
									//str += String.fromCharCode(data.getUint32(p)), p+=4; // this should work, but doesn't in Zycon
								}
								nameRecord.string = str;
								break; // the sample text in the 2016 Zycon uses this to store an Emoji string
						}

					}
			}

			// set up working name strings that might be taken from Windows (3) or Macintosh (1) strings
			// the Windows strings will overwrite the Mac strings, as nameRecords are sorted by platformID as well as nameID
			// TODO: treat 1,0 strings as MacRoman
			if (nameRecord.hasOwnProperty('string'))
				table.names[nameRecord.nameID] = str; // sparse array

			table.nameRecords.push(nameRecord);
			p = p_; // restore pointer ready for the next nameRecord
		}

		font.names = table.names; // convenience
		font.tables['name'].data = table;
		// name end


		// get fvar data
		if (fontHasTables(font, ["fvar","name"]))
		{
			table = {};
			p = font.tables['fvar'].offset;

			table.majorVersion = data.getUint16(p), p+=2;
			table.minorVersion = data.getUint16(p), p+=2;
			table.offsetToAxesArray = data.getUint16(p), p+=2;
			table.countSizePairs = data.getUint16(p), p+=2;
			table.axisCount = data.getUint16(p), p+=2;
			table.axisSize = data.getUint16(p), p+=2;
			table.instanceCount = data.getUint16(p), p+=2;
			table.instanceSize = data.getUint16(p), p+=2;

			table.axes = [];
			table.axisTagToId = {};
			for (var a=0; a<table.axisCount; a++)
			{
				var axis = {};
				axis.tag = getStringFromData (data, p, 4), p+=4;
				axis.min = data.getInt32(p)/65536, p+=4;
				axis.curr = axis.default = data.getInt32(p)/65536, p+=4;
				axis.max = data.getInt32(p)/65536, p+=4;
				axis.flags = data.getUint16(p), p+=2;
				axis.axisNameID = data.getUint16(p), p+=2;
				axis.name = font.tables['name'].data.names[axis.axisNameID]; // name table must already be parsed!
				table.axes.push(axis);
				table.axisTagToId[axis.tag] = a;
			}

			table.instances = [];
			for (var i=0; i<table.instanceCount; i++)
			{
				var instance = {'tuple':[]};
				instance.subfamilyNameID = data.getUint16(p), p+=2;
				instance.flags = data.getUint16(p), p+=2;
				for (var a=0; a<table.axisCount; a++) {
					instance.tuple[a] = data.getInt32(p)/65536, p+=4;
				}
				if (table.instanceSize == table.axisCount * 4 + 6)
					instance.postScriptNameID = data.getUint16(p), p+=2;
				instance.name = font.tables['name'].data.names[instance.subfamilyNameID]; // name table must already be parsed!
				table.instances.push(instance);
			}

			font.axes = table.axes; // convenience
			font.instances = table.instances; // convenience
			font.tables['fvar'].data = table;
		}
		// fvar end


		// get glyf data
		if (fontHasTables(font, ["glyf","loca","head","maxp","hmtx","hhea"]))
		{
			font.glyphs = [];
			var indexToLocFormat = font.tables['head'].data.indexToLocFormat;
			var offset=0;
			for (var g=0; g < font.numGlyphs; g++)
			{
				let glyph = {font: font, glyphId: g, numPoints: 0, points: [], endPts: []}, pt;
				let nextOffset = (indexToLocFormat == 1) ? data.getUint32(font.tables['loca'].offset + 4*(g+1)) : 2 * data.getUint16(font.tables['loca'].offset + 2*(g+1));


				if (nextOffset > offset) // simple & composite glyphs
				{
					p = font.tables['glyf'].offset + offset;
					glyph.numContours = data.getInt16(p), p+=2;
					glyph.xMin = data.getInt16(p), p+=2;
					glyph.yMin = data.getInt16(p), p+=2;
					glyph.xMax = data.getInt16(p), p+=2;
					glyph.yMax = data.getInt16(p), p+=2;

					let flag, repeat=0, x_=0, y_=0, x, y, c, r;
					if (glyph.numContours > 0) // simple glyph
					{
						//glyph.endPtsOfContours = [];
						for (c=0; c<glyph.numContours; c++)
							glyph.endPts.push(data.getUint16(p)), p+=2;
						glyph.numPoints = glyph.endPts[glyph.numContours -1] + 1;
						glyph.instructionLength = data.getUint16(p), p+=2;
						p += glyph.instructionLength;

						let flags = [];
						for (pt=0; pt<glyph.numPoints; )
						{
							flag = data.getUint8(p), p++;
							flags[pt++] = flag;
							if (flag & 0x08)
							{
								repeat = data.getUint8(p), p++;
								for (r=0; r<repeat; r++)
									flags[pt++] = flag;
							}
						}

						if (flags.length = glyph.numPoints)
						{
							flags.forEach(function (flag, pt) {
								switch (flag & 0x12) // x
								{
									case 0x00: x = x_ + data.getInt16(p); p+=2; break;
									case 0x02: x = x_ - data.getUint8(p); p++; break;
									case 0x10: x = x_; break;
									case 0x12: x = x_ + data.getUint8(p); p++; break;
								}
								glyph.points[pt] = [x_ = x];
							});
							flags.forEach(function (flag, pt) {
								switch (flag & 0x24) // y
								{
									case 0x00: y = y_ + data.getInt16(p), p+=2; break;
									case 0x04: y = y_ - data.getUint8(p), p++; break;
									case 0x20: y = y_; break;
									case 0x24: y = y_ + data.getUint8(p), p++; break;
								}
								glyph.points[pt].push(y_ = y, flags[pt] & 0x01);
							});
						}
					}
					else if (glyph.numContours < 0) // composite glyph
					{
						console.log ("Glyph " + g + " is composite");
					}
					else // error
					{
						font.errors.push ("glyf: Glyph " + g + " has 0 contours, but non-zero size");
					}

				}
				else // invisible glyph
				{
					glyph.numContours = 0; // do nothing
				}

				// assign the metrics values to 4 extra points
				glyph.points.push([0,0], [font.widths[g], 0], [0,0], [0,0]);

				font.glyphs[g] = glyph;
				offset = nextOffset;
			}
			font.tables['glyf'].data = table;

		} // glyf end


		// get gvar data
		if (fontHasTables(font, ["gvar","glyf","fvar"]))
		{
			p = font.tables['gvar'].offset;
			//console.log ("Length of gvar = " + font.tables['gvar']['length']);
			table = {};
			table.majorVersion = data.getUint16(p), p+=2;
			table.minorVersion = data.getUint16(p), p+=2;
			table.axisCount = data.getUint16(p), p+=2;
			table.sharedTupleCount = data.getUint16(p), p+=2;
			table.offsetToSharedTuples = data.getUint32(p), p+=4;
			table.glyphCount = data.getUint16(p), p+=2;
			table.flags = data.getUint16(p), p+=2;
			table.offsetToData = data.getUint32(p), p+=4;
			var sizeofTuple = table.axisCount * 2; // 2 == sizeof (F2DOT14)
			var sizeofOffset = (table.flags & 0x0001) ? 4 : 2;
			table.sharedTuples = [];
			table.gvds = []; // glyphVariationData array, this is the daddy, one for each glyph in the font

			// get sharedTuples array - this is working nicely!
			var ps = font.tables['gvar'].offset + table.offsetToSharedTuples;
			for (var t=0; t < table.sharedTupleCount; t++)
			{
				var tuple = [];
				for (var a=0; a<table.axisCount; a++)
					tuple.push(data.getF2DOT14(ps)), ps+=2;
				table.sharedTuples.push (tuple);
			}


			// get glyphVariationData array
			var offset = 0;


			// Go thru each gvd
			//for (var g=0; g < table.glyphCount; g++)
			var gvdStart = p;
			//for (var g=0; g < table.glyphCount; g++)

			//offset = sizeofOffset == 2 ? 2 * data.getUint16(gvdStart + 2 * (73)) : data.getUint32(gvdStart + 4 * (73));
			for (var g=0; g < font.numGlyphs; g++)
			{
				//console.log ("g=" + g)
				var nextOffset;
				if (sizeofOffset == 2)
					nextOffset = 2 * data.getUint16(gvdStart + 2 * (g+1));
				else if (sizeofOffset == 4)
					nextOffset = data.getUint32(gvdStart + 4 * (g+1));

				//alert ("gvd offsets are size " + sizeofOffset);

				// get shared points if we have to

				//console.log ("Getting gvar for glyph "+g)
				// do we have data?
				if (nextOffset > offset && font.glyphs[g].numContours > 0)
				{
					//console.log ("found gvd")
					if (!font.glyphs[g])
					{
						console.log ("ERROR: This should not happen… Glyph " + g + " is EMPTY");
						font.glyphs[g] = {numPoints: 0};
					}
					else if (font.glyphs[g].numContours < 0)
						; //console.log ("Glyph " + g + " is COMPOSITE");
					else
						; //console.log ("Glyph " + g + " is SIMPLE");


					//console.log ("font.tables['gvar'].offset: " + font.tables['gvar'].offset + ", table.offsetToData: " + table.offsetToData + ", offset: " + offset + ", nextOffset: " + nextOffset);
					p = font.tables['gvar'].offset + table.offsetToData + offset;
					var gvd = {}; // glyphVariationData

					gvd.tupleCount = data.getUint16(p), p+=2;
					gvd.tuples_share_point_numbers = (gvd.tupleCount & 0x8000) ? true : false; // doesn't happen in Skia
					gvd.tupleCount &= 0x0FFF;
					gvd.offsetToSerializedData = data.getUint16(p), p+=2;

					if (g==967 || g==2)
					{
						console.log ("GVD for #" +g, gvd);
					}

					//console.log ("gvd size: " + (nextOffset - offset) + " bytes");

					// set up the pointer to the serializedData 
					ps = font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData;


					/*
					gvd.sharedPoints = [];
					//if (gvd.tuples_share_point_numbers) // let's pretend it does
					{
						console.log ("SKIA DOES HAVE SHARED POINTS!") // actually it doesn't
						// TODO: write this code


						// get shared points numbers, whatever!!!!
						// contradicts Apple and MS spec:
						// https://www.microsoft.com/typography/otspec/otvarcommonformats.htm
						// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6gvar.html
						console.log ("Getting shared point numbers");
						var sharedPointCount;
						sharedPointCount = data.getUint8(ps), ps++;
						if (sharedPointCount & 0x80)
							sharedPointCount = 0x100 * (sharedPointCount & 0x7F) + data.getUint8(ps), ps++;
						else
							sharedPointCount &= 0x7F;
						//console.log ("found " + gvd.pointCount + " points!")
						var pointNum = 0;
						if (sharedPointCount)
						{
							var pc = 0;
							console.log ("sharedPointCount = " + sharedPointCount)
							while (pc < sharedPointCount)
							{						
								runLength = data.getUint8(ps), ps++;
								var pointsAreWords = runLength & 0x80 ? true : false;
								runLength &= 0x7F;
								runLength++;
								while (runLength--)
								{
									var pointData;
									if (pointsAreWords)
										pointData = data.getUint16(ps), ps+=2;
									else
										pointData = data.getUint8(ps), ps++;
									pointNum += pointData;
									gvd.sharedPoints.push(pointNum);
								}
								pc += runLength;
							}
						}
						else
						{
							console.log ("We have an 'all points' situation");
							sharedPointCount = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs
						}
					}
					*/


					// get the tuples
					gvd.tuples = [];
					for (var t=0; t < gvd.tupleCount; t++)
					{
						var tuple = {};
						tuple.tupleSize = data.getUint16(p), p+=2;
						tuple.tupleIndex = data.getUint16(p), p+=2;
						tuple.embedded_tuple_coord = (tuple.tupleIndex & 0x8000) ? true : false;

						tuple.intermediate_tuple = (tuple.tupleIndex & 0x4000) ? true : false;
						tuple.private_point_numbers = (tuple.tupleIndex & 0x2000) ? true : false;
						tuple.tupleIndex &= 0x0FFF; // if embedded_tuple_coord is false, this is an index into table.sharedTuples (defined later)

						if (g==967)
							console.log ("H222: p="+p);

						/*
						if (tuple.embedded_tuple_coord)
						{
							tuple.peak = [];
							for (var c=0; c<table.axisCount; c++)
								tuple.peak.push(data.getF2DOT14(p)), p+=2;
						}
						else
							tuple.peak = table.sharedTuples[tuple.tupleIndex];

						if (tuple.intermediate_tuple)
						{
							// TODO... safer to consume all three tuples if we have intermediate_tuple
							console.log ("FOUND INTERMEDIATE for glyph " + g)
							tuple.start = [];
							for (var c=0; c<table.axisCount; c++)
								tuple.start.push(data.getF2DOT14(p)), p+=2;
							tuple.end = [];
							for (var c=0; c<table.axisCount; c++)
								tuple.end.push(data.getF2DOT14(p)), p+=2;
						}
						*/

						tuple.peak = [];
						tuple.start = [];
						tuple.end = [];
						var c;
						if (tuple.embedded_tuple_coord)
						{
							for (c=0; c<table.axisCount; c++)
								tuple.peak[c] = data.getF2DOT14(p), p+=2;
						}
						else { 
							tuple.peak = table.sharedTuples[tuple.tupleIndex];
						}

						if (tuple.intermediate_tuple)
						{
							// TODO... safer to consume all three tuples if we have intermediate_tuple
							for (c=0; c<table.axisCount; c++)
								tuple.start[c] = data.getF2DOT14(p), p+=2;
							for (c=0; c<table.axisCount; c++)
								tuple.end[c] = data.getF2DOT14(p), p+=2;
						}
						else
						{
							for (c=0; c<table.axisCount; c++)
							{
								if (tuple.peak[c] > 0)
									{ tuple.start[c] = 0; tuple.end[c] = tuple.peak[c]; }
								else
									{ tuple.start[c] = tuple.peak[c]; tuple.end[c] = 0; }
							}
						}

						// get the packed data FOR THIS TUPLE!

						// ps is the pointer inside the serialized data

						//var ps = font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData;
						//console.log ("g: " + g + ", p: " + p + ", gvaroffset: " + font.tables['gvar'].offset + ", offsettodata: " + table.offsetToData + ", offset: " + offset + ", gvdoffset: " + gvd.offsetToSerializedData)

						// POINT IDS
						let runLength;
						tuple.points = [];
						tuple.pointCount = 0;
						if (!gvd.tuples_share_point_numbers)
						{
							// get the packed point data for this tuple

							if (g==967 && t==1)
							{

								let dsfdsf = 0;

							}

							tuple.pointCount = data.getUint8(ps), ps++;
							if (tuple.pointCount & 0x80)
								tuple.pointCount = 0x100 * (tuple.pointCount & 0x7F) + data.getUint8(ps), ps++;
							else
								tuple.pointCount &= 0x7F;
							//console.log ("found " + tuple.pointCount + " points!")
							if (tuple.pointCount != 0)
							{
								var pointNum = 0;
								var pc = 0;
								tuple.impliedAllPoints = false;


								//console.log ("pointCount = " + tuple.pointCount);
								while (pc < tuple.pointCount)
								{						
									runLength = data.getUint8(ps), ps++;
									const pointsAreWords = (runLength & 0x80) ? true : false;
									runLength &= 0x7F;
									runLength++;
									//console.log ('got a run of ' + runLength);
									//while (runLength > 0)
									for (let r=0; r < runLength; r++)
									{

										if (pc + r > tuple.pointCount)
											break;

										if (ps >= font.tables['gvar'].offset + font.tables['gvar'].length)
										{
											alert ("OBARD at glyph #" + g + ", nextOffset = " + nextOffset);
											console.log ("OBARD", tuple, ps, g);
										}

										



										//console.log ("run length")

										//console.log ('ok ' + runLength);
										var pointData;
										if (pointsAreWords)
											pointData = data.getUint16(ps), ps+=2;
										else
											pointData = data.getUint8(ps), ps++;
										pointNum += pointData;
										tuple.points.push(pointNum);
										//runLength--;
									}
									pc += runLength;

									/*
									else
									{
										runLength++; // the value minus 1 is stored
										pc += runLength;
										while (runLength--)
											gvd.points.push(data.getUint8(p)), p++;
									}
									*/
								}
							}
							else
							{
								//console.log ("We have an 'all points' situation");
								tuple.impliedAllPoints = true;
								tuple.pointCount = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs
							}
						}
						else
						{
							//console.log ("hmmmmmmm... NO private point numbers");
							tuple.pointCount = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs, and remember the phantom points!
						}

						// DELTAS
						// get the packed delta values for this tuple
						tuple.deltas = [];
						//console.log ("here at the start of deltas: pointCount = " + tuple.pointCount)
						var unpacked = [];

						while (unpacked.length < tuple.pointCount * 2)
						{
							runLength = data.getUint8(ps), ps++;
							const bytesPerNum = (runLength & 0x80) ? 0 : (runLength & 0x40) ? 2 : 1;
							let r;
							runLength = (runLength & 0x3f) +1;
							switch (bytesPerNum)
							{
								case 0: for (r=0; r < runLength; r++) unpacked.push(0); break;
								case 1: for (r=0; r < runLength; r++) unpacked.push(data.getInt8(ps)), ps++; break;
								case 2: for (r=0; r < runLength; r++) unpacked.push(data.getInt16(ps)), ps+=2; break;
							}

							if (ps - (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) > nextOffset)
								console.log ("BAD: g=" + g + ", ps=" + ps + ",start=" + (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) + ", nextOffset="+nextOffset);
						}
						for (var pc=0; pc < tuple.pointCount; pc++)
							tuple.deltas.push([unpacked[pc], unpacked[tuple.pointCount + pc]]); // x,y

						//////////////////





						gvd.tuples.push(tuple);
					}

					//console.log (gvd.tupleCount);
					table.gvds[g] = gvd;

				}
				offset = nextOffset;
			}

			//console.log ("done all the glyphs");

			/*
			// get sharedTuples array - this is working nicely!
			p = font.tables['gvar'].offset + table.offsetToSharedTuples;
			for (var t=0; t < table.sharedTupleCount; t++)
			{
				var tuple = [];
				for (var a=0; a<table.axisCount; a++)
					tuple.push(data.getF2DOT14(p)), p+=2;
				table.sharedTuples.push (tuple);
			}
			*/

			table.nameRecords = [];
			table.names = [];

			font.gvds = table.gvds;
			font.sharedTuples = table.sharedTuples;
			//font.tables['gvar'].data = table;
		}
		// gvar end

		// some convenience names
		font.familyName = font.names[4] || "(unknown)";
		font.menuName = font.familyName;

		return font;
	}

	return false;
}



function SVG(tag) {
    return document.createElementNS('http://www.w3.org/2000/svg', tag);
}


function getGlyphSVGpath(glyph)
{
	let glyphSVG = [];
	let path = "";
	let contourSVG, pt, pt_, c, p;
	let startPt = 0;

	// convert TT points to an array of points ready for SVG, glyphSVG
	glyph.endPts.forEach(function (endPt)
	{
		var numPointsInContour = endPt-startPt+1;
		contourSVG = [];

		/*
		// this is when flags (on/off curve) are in a separate glyph.flags array
		for (p=startPt; p<=endPt; p++)
		{
			p_ = (p-startPt+1)%numPointsInContour+startPt;
			pt = glyph.points[p];
			pt_ = glyph.points[p_];
			contourSVG.push ([pt[0], pt[1], glyph.flags[p]]);
			if (glyph.flags[p] == 0 && glyph.flags[p_] == 0)
				contourSVG.push ([(pt[0]+pt_[0])/2,(pt[1]+pt_[1])/2,1, 1]);
		}
		*/

		for (p=startPt; p<=endPt; p++)
		{
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
	// now there are never >1 consecutive off-curve points
	for (c=0; c<glyphSVG.length; c++)
	{
		contourSVG = glyphSVG[c];
		for (p=0; p<contourSVG.length; p++)
		{
			pt = contourSVG[p];
			if (p==0)
				path += "M" + pt[0] + " " + pt[1];
			else
			{
				if (pt[2] == 0)
				{
					pt_ = contourSVG[(++p)%contourSVG.length]; // increments loop variable p
					path += "Q" + pt[0] + " " + pt[1] + " " + pt_[0] + " " + pt_[1];
				}
				else
					path += "L" + pt[0] + " " + pt[1];
				if (p == contourSVG.length-1)
					path += "Z";
			}
		}
	}
	return path;
}


function glyphAddVariationDeltas (glyph, userTuple, options)
{

	let newGlyph = {
		instance: true,
		points: [],
		touched: [],
		numContours: glyph.numContours,
		endPts: glyph.endPts,
		numPoints: glyph.numPoints,
		flags: glyph.flags
	};

	//console.log (config);

	$("td.S").text(0).css("background-color", "transparent");

	glyph.points.forEach(function (point, p) {
		newGlyph.points[p] = [point[0], point[1], point[2]];
	});

	glyph.deltas.forEach(function(delta, d) {
		if (options.ignoreDeltas && options.ignoreDeltas[d])
			return; // skip this iteration

		let scaledOffsets = [];
		let touched = [];
		let S = 1;

		glyph.points.forEach(function (point, p) {
			scaledOffsets[p] = [0,0];
		});

		// go thru each axis, multiply a scalar S from individual scalars AS
		glyph.font.axes.forEach(function(axis, a) {
			const peak = delta.tuple[a];
			const ua = userTuple[a];
			let AS, start, end;

			start = delta.start[a];
			end = delta.end[a];

			// based on pseudocode from https://www.microsoft.com/typography/otspec/otvaroverview.htm
	        if (start > peak || peak > end)
	            AS = 1;
	        else if (start < 0 && end > 0 && peak != 0)
	            AS = 1;
	        else if (peak == 0)
	            AS = 1;
	        else if (ua < start || ua > end)
	            AS = 0;
	        else
	        {
	            if (ua == peak)
	                AS = 1;
	            else if (ua < peak)
	                AS = (ua - start) / (peak - start);
	            else
	                AS = (end - ua) / (end - peak);
	        }
	        S *= AS;
		});

		// now we can move the points by S * delta
		if (S != 0)
		{
			delta.offsets.forEach(function(offset, o) {
				newGlyph.touched[delta.points[o]] = touched[delta.points[o]] = true;
				scaledOffsets[delta.points[o]] = [S * offset[0], S * offset[1]];
			});

			// IUP
			if (options.iup && delta.points.length) // if any points have been moved (unnecesssary?)
			{			
				for (let c=0, startPt=0; c<glyph.endPts.length; c++)
				{
					// TODO: check here that the contour is actually touched
					const numPointsInContour = glyph.endPts[c]-startPt+1;
					let firstPrecPt = -1; // null value
					let precPt, follPt;
					for (let p=startPt; p!=firstPrecPt; )
					{
						let pNext = (p-startPt+1)%numPointsInContour+startPt;
						if (touched[p] && !touched[pNext]) // found a precPt
						{
							precPt = p;
							follPt = pNext;
							if (firstPrecPt == -1)
								firstPrecPt = precPt;
							do {
								follPt = (follPt-startPt+1)%numPointsInContour+startPt;
								} while (!touched[follPt]) // found the follPt

							// now we have a good precPt and follPt, do IUP for x, then for y
							// https://www.microsoft.com/typography/otspec/gvar.htm#IDUP
							[0,1].forEach(function (xy) {
								const pA = glyph.points[precPt][xy];
								const pB = glyph.points[follPt][xy];
								const dA = scaledOffsets[precPt][xy];
								const dB = scaledOffsets[follPt][xy];
								for (let q=pNext, D, T, Q; q!=follPt; q=(q-startPt+1)%numPointsInContour+startPt)
								{
									Q = glyph.points[q][xy];
									if (pA == pB)
										D = dA == dB ? dA : 0;
									else
									{
										if (Q <= pA && Q <= pB)
											D = pA < pB ? dA : dB;
										else if (Q >= pA && Q >= pB)
											D = pA > pB ? dA : dB;
										else
										{
											T = (Q - pA) / (pB - pA); // safe for divide-by-zero
											D = (1-T) * dA + T * dB;
										}
									}
									scaledOffsets[q][xy] += D;
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
			}

			// add the net deltas to the glyph
			newGlyph.points.forEach(function (point, p) {
				point[0] += Math.round(scaledOffsets[p][0]);
				point[1] += Math.round(scaledOffsets[p][1]);
			})

			// reflect in the UI
			$("#deltaset-tr-"+d + " td.S div").text(S);
			//$("#deltaset-tr-"+d + " td.S").css({"background-color"});
			$("#deltaset-tr-"+d).css("background-color", "lightgreen")
		}
		else
			$("#deltaset-tr-"+d).css("background-color", "transparent");

	});



	return newGlyph;
}




function drawGlyphSVG (glyph, create, variation=false)
{
	if (create)
	{
		// draw glyph path
		var pathSVG = getGlyphSVGpath(glyph);


		// draw nodes
		for (var p=0; p<glyph.points.length; p++)
		{
			pt = glyph.points[p];
			const node = $(SVG('circle'))
						.prop("id", p)
						.addClass("node" + (pt[2]?" on-curve":" off-curve"))
						.attr({cx:pt[0],cy:pt[1],r:4,opacity:0.6,fill:"lightblue",stroke:"black","stroke-width":1});
			$(svgg).append(node);
		}
	}
	else // update positions only
	{
		// update glyph path (we don't need to update nodes)
		$("#glyphPath").attr("d", getGlyphSVGpath(glyph));

		// update nodes
		/*
		var p_ = 0;
		for (c=0; c<glyph.length; c++)
		{
			contour = glyph[c];
			for (p=0; p<contour.length; p++)
			{
				pt = contour[p];
				$('#' + p_)
					.attr("cx", pt[0])
					.attr("cy", pt[1])
				p_++;
			}
		}
		*/
	}
}

function svgDrawTouched () {

	//console.log(newGlyph.touched);
	if (!newGlyph || !glyph)
		return;


	// hmm, the first of these should work
	//newGlyph.points.forEach(function (point, p) {
	$("#lines").empty();
	const arrowAdj = 20;
	newGlyph.touched.forEach(function (touched, p) {

		const line = $(SVG("line")).prop("id", "line-"+p).addClass("delta-line").attr({
			x1:glyph.points[p][0],
			y1:glyph.points[p][1],
			x2:newGlyph.points[p][0],
			y2:newGlyph.points[p][1]
		});
		$("#lines").append(line);
	});
}

//function svgRedraw (updatePositions=[true,true,true]) {
function svgRedraw (l) {
	/*
	layers.forEach(function (layer, l) {
		//const id = l==0?"defaultGlyph": l==1?"backgroundGlyph":"instanceGlyph";
		if (layers[l] && redrawLayers[l])
		{
			// update the glyph
			$("#" + layerNames[l]).attr("d", getGlyphSVGpath(layers[l]));

			// update the control points
			glyph.points.forEach(function (point, p) {


			});
		}
	});
	*/
	if (layers[l].glyph)
	{
		// update the glyph
		$("#"+layers[l].name).attr("d", getGlyphSVGpath(layers[l].glyph));

		// update the control points
		layers[l].glyph.points.forEach(function (point, p) {
			$("#"+l+"-"+p).attr("cx", point[0]).attr("cy", point[1]);
		});
	}
	else
	{
		$("#"+layers[l].name).attr("d", "");
		$("#lines").empty();
	}


	/*
	if (layers[0] && redrawLayers[0])
		$("#defaultGlyph").attr("d", getGlyphSVGpath(layers[0]));
	if (layers[1] && redrawLayers[1])
		$("#backgroundGlyph").attr("d", getGlyphSVGpath(layers[1]));
	if (layers[2] && redrawLayers[2])
		$("#instanceGlyph").attr("d", getGlyphSVGpath(layers[2]));
	*/
	if (l==2)
		svgDrawTouched();
}


function drawDeltas () {

}

function axisNormalize (axis, t) {
	if (t == axis.default)
		return 0;
	else if (t > axis.default)
		return axis.max==axis.default? 0 : (t-axis.default)/(axis.max-axis.default);
	else // t < axis.default
		return axis.min==axis.default? 0 : (axis.default-t)/(axis.min-axis.default);
}

function updateSVG () {
	let tuple = [];
	let ignoreDeltas = [];
	glyph.font.axes.forEach(function (axis) {
		tuple.push(axisNormalize (axis, axis.curr));
	});

	//console.log ("Here is tuple", tuple);

	glyph.deltas.forEach(function (delta, d) {
		ignoreDeltas[d] = !$(".delta-active").eq(d).prop("checked");
		var thing = $(".delta-active").eq(d);
		console.log (d, $(thing).prop("checked"))
	});

	//console.log ("ignoreDeltas", ignoreDeltas);

	//newGlyph = glyphAddVariationDeltas (glyph, tuple, $("#iup").prop("checked"), ignoreDeltas);
	newGlyph = glyphAddVariationDeltas (glyph, tuple, {iup: $("#iup").prop("checked"), ignoreDeltas: ignoreDeltas});
	//console.log (newGlyph);
	layers[2].glyph = newGlyph;
	svgRedraw (2);
}

// d3 stuff
function moving() {
	var d3node = d3.select(this);
	var idParts = this.id.split('-');
	var p = parseInt(idParts[1]);
	var newX = Math.round(d3.event.x);
	var newY = Math.round(d3.event.y);
	d3node.attr("cx", newX).attr("cy", newY);

	// which layer is active?
	glyph.points[p][0] = newX;
	glyph.points[p][1] = newY;

	// update d attribute of the glyph path
	drawGlyphSVG(glyph, false);
	svgRedraw(0);

	$(".point-label").eq(p).attr({x:newX,y:-newY});

	$("#xy span").eq(0).text(newX);
	$("#xy span").eq(1).text(newY);
}


function convertToNewFormat(glyph) {

	// convert flags[p] to pt[2] data (HACK)

	/*
	glyph.points.forEach(function (pt, p) {
		if (glyph.flags)
			pt[2] = glyph.flags[p];

	});
	*/

	// endPts
	//glyph.endPts = glyph.endPtsOfContours; // ? glyph.endPtsOfContours : glyph.endPts;
	//glyph.endPts = glyph.endPtsOfContours !== undefined ? glyph.endPtsOfContours : glyph.endPts;

	// convert gvd to deltas
	glyph.deltas = [];
	let gvd;
	if (gvd = glyph.font.gvds ? glyph.font.gvds[glyph.glyphId] : false)
	{
		/*
		let delta = {
			tuple: [],
			points: [],
			offsets: glyph.deltas
		};
			{
				tuple: [0.7,0.0],
				points: [0, 1, 5],
				offsets: [ [50,50],[50,10], [100,70] ]
			},
		*/


		//console.log (gvd);
		/*
		gvds.forEach(function (gvd, d) {
			$("#deltasets-table").append($("<tr>")
		*/

		gvd.tuples.forEach(function (tuple, t) {
			let delta = {
				tuple: [],
				points: [],
				offsets: tuple.deltas
			};

			delta.tuple = tuple.peak;
			/*
			glyph.font.axes.forEach(function (axis, a) {
				delta.tuple[a] = tuple.peak[a];
			});
			*/

			// intermediate region
			if (tuple.start)
				delta.start = tuple.start;
			if (tuple.end)
				delta.end = tuple.end;


			delta.start = tuple.start;
			delta.end = tuple.end;

			if (tuple.private_point_numbers)
			{	
				if (tuple.impliedAllPoints)
					glyph.points.forEach(function (pt, p) {
										delta.points.push(p);
									});
				else
					delta.points = tuple.points;
			}
			else
			{
				// TODO: make this array once, out of a loop
				glyph.points.forEach(function (pt, p) {
					delta.points.push(p);
				});
			}

			glyph.deltas.push(delta);

		});		
		//console.log (glyph.deltas);
	}
}


function loadGlyph() {

	// DATA
	layers[2].glyph = newGlyph = undefined;
	convertToNewFormat (glyph);


	// UI


	// transform the SVG
	const svgScale = 1000/glyph.font.tables['head'].data.unitsPerEm * 1.0;
	$(svgg).attr({transform:"translate(200,1000) scale("+svgScale+","+(-svgScale)+")"});

	// remove old stuff
	$(".node").remove();
	$(".point-label").remove();
	$("#axes").empty();
	$("#deltasets-table").empty();
	$("#glyph-info").empty();

	// populate glyph info
	$("#glyph-info").append("<p>glyphId: "+glyph.glyphId+"/"+glyph.font.numGlyphs+"</p>");


	// add the nodes and point labels
	glyph.points.forEach(function (pt, p) {
		// add nodes
		$(svgg).append(
			$(SVG("circle"))
				.prop("id", "0-"+p)
				.addClass("node" + (pt[2]?" on-curve":" off-curve"))
				.attr({cx:pt[0],cy:pt[1],r:4})
		);

		// add point labels
		$(svgg).append(
			$(SVG("text"))
				.prop("id", "l-"+p)
				.addClass("point-label noselect")
				.attr({x:pt[0],y:-pt[1],transform:"scale(1,-1) translate(5,0)"})
				.text(p)
		);
	});

	// populate deltasets
	$("#deltasets-table")
		.append($("<tr>")
			.html("<th></th><th>Edit</th><th>Active</th><th>Tuple</th><th>Points</th><th class=\"S\">Scale</th><th></th>"));
	glyph.deltas.forEach(function (delta, d) {
		$("#deltasets-table").append($("<tr>")
				.prop("id","deltaset-tr-"+d)
				.html(
					"<td style=\"color:" + deltaColours[d] + ";\">⬤</td>\
					 <td><input type=\"radio\" name=\"edit-layer\" value=\""+d+"\"></td>\
					 <td><input class=\"delta-active\" type=\"checkbox\" checked></td>\
					 <td>{" + delta.tuple.join(",") + "}</td>\
					 <td>[" + /*delta.points.join(",")*/ "-" + "]</td>\
					 <td class=\"S\">0</td>\
					 <td><button class=\"deltaset-delete\">−</button></td>\
					 ")
				.data("deltaSet", d)

			);
		//$("#editing-layers").append("<option>Delta set " + d + "</option>");
	});

	// set up the UI axes
	glyph.font.axes.forEach(function(axis, a) {
		const axisDiv = $("<div class=\"axis\">")
			.data("axis", axis)
			.append("<span>" + axis.tag +"</span>")
			.append($("<input>")
				.prop("type", "range")
				.prop("id", "axisSlider-" + a)
				.addClass("axisSlider")
				.attr({min:0,max:1,step:0.0001})
				.attr("title", axis.tag + " [" + axis.min + "…" + axis.default + "…" + axis.max + "]")
				.val(axis.max==axis.min ? axis.min : (axis.curr-axis.min)/(axis.max-axis.min))
				)
			.append($("<input>")
				.prop("id", "axisVal-" + a)
				.addClass("axis-value")
				.val(axis.curr)
				)
			.append($("<input>")
				.prop("id", "axisValNormal-" + a)
				.addClass("axis-value normal")
				.val(axisNormalize(axis, axis.curr))
				)
			.append($("<input>")
				.prop("id", "axisValHex-" + a)
				.addClass("axis-value hex")
				.val(axisNormalize(axis, axis.curr))
				)
			.append("<span class=\"play-axis\">⏯</span><br>");

		$("#axes").append(axisDiv);

	});

	

	// let the nodes be dragged
	d3.selectAll(".node").call(d3.drag().on("drag", moving));

	$(".axisSlider").on("input", function () {

		const a = parseInt(this.id.split("-")[1]);
		const axis = glyph.font.axes[a];
		//const axis = glyph.font.axes[a]; // HMM... this should work
		let t = axis.min + $(this).val() * (axis.max-axis.min);

		// get normalized positions from all axis sliders and redraw layers[2]
		if (t > axis.max)
			t = axis.max;
		if (t < axis.min)
			t = axis.min;
		axis.curr = t;		
		const T = axisNormalize (axis, t);

		updateSVG ();

		// update name
		let varStyle = "";
		glyph.font.names[4] = glyph.font.names[1];
		glyph.font.axes.forEach(function(axis, a) {
			varStyle += " " + axis.tag + " " + axis.curr;
		});
		varStyle = varStyle.trim();
		glyph.font.names[4] += " " + varStyle;
		glyph.font.names[3] = glyph.font.names[4];
		if (glyph.font.names[16] === undefined)
			glyph.font.names[16] = glyph.font.names[1];
		glyph.font.names[17] = varStyle;

		//glyph.font.names[4] = glyph.font.names[1] + 
		updateName (glyph.font);

		$("#axisVal-"+a).val(t);
		$("#axisValNormal-"+a).val(T);
		$("#axisValHex-"+a).val((Math.round(T*16384)).toString(16));
	});

	$(".play-axis").click(function () {

		const axisDiv = $(this).closest(".axis");
		if ($(axisDiv).data("timer")) // if it's running, stop
		{
			clearInterval($(axisDiv).data("timer"));
			$(axisDiv).data("timer", false);
		}
		else // if it's not running, start
		{
			const slider = $(axisDiv).find(".axisSlider").val(0);
			const timerObj = {slider: slider, axisDiv: axisDiv}
			$(axisDiv).data("timer", setInterval (function () {
				const t = parseFloat($(this.slider).val())+0.01;
				if (t<=1)
				{
					$(this.slider).val(t);
					$(this.slider).trigger("input");
				}
				else
				{
					$(this.slider).val(1);
					clearInterval($(this.axisDiv).data("timer"));
					$(this.axisDiv).data("timer", false);
				}
			}.bind(timerObj), 30)); // FRAME RATE (was 15)
		}
	});


	// set initial states according to UI prefs
	$("#point-numbers").change();
	$("#fill").change();
	$("#show-nodes").change();

	updateName (glyph.font);

}

function updateName (font)
{
	$("#font-name").val(font.names[4]);
}

function clearGlyphWindow () {
	$("#defaultGlyph").attr("d", "");//empty();
	$("#backgroundGlyph").attr("d", "");//empty();
	$("#instanceGlyph").attr("d", "");//empty();
	$("#lines").empty();			
}


$(function ()
{

//glyph = [[[0,0,0], [100,0,1], [100,100,1], [0,100,1]] , [ [50,50,1],[25, 75,1],[75,75,1],[75,50,1] ]];
//var glyph = [[[0,0,0], [100,0,0], [100,100,0], [0,100,0]] /*, [ [50,50,1],[25, 75,1],[75,75,1],[75,50,1] ]*/];
//var glyph = [[[0,0,1], [100,0,1], [100,100,1], [0,100,1]]];
	let path;

	// setup glyph window
	layers[0].glyph = glyph;

	/*
	// get current user
	$.get( "get-current-user.php", function(res) {
		currentUser = res; // global
	});
	*/

	// create SVG element and its path for the glyph
	const svgScale = 1; //1000/glyph.font.tables['head'].data.unitsPerEm * 0.20;
	svg = $(SVG("svg")).attr({width:"4096",height:"4096",xmlns:"http://www.w3.org/2000/svg"});
	svgg = $(SVG("g")).attr({transform:"translate(500,600) scale("+svgScale+","+(-svgScale)+")"});
	$(svg).append(svgg);

	// arrowhead
	let svgDefs = $(SVG("defs"));
	let svgMarker = $(SVG("marker"));
	let svgMarkerPath = $(SVG("path"));
	svgMarker.prop("id", "arrow");
	svgMarker.attr({markerWidth:20,markerHeight:20,refX:8,refY:3,orient:"auto",markerUnits:"strokeWidth"});
	svgMarkerPath.attr({d:"M0 0V6L8 3z",fill:"green"});
	$(svgMarker).append(svgMarkerPath);
	$(svgDefs).append(svgMarker);
	$(svg).append(svgDefs);

	// lines
	let svgLines = $(SVG("g"));
	svgLines.attr("id", "lines");

	const pathXYAxes = $(SVG("path")).attr({d:"M-10000 0H10000M0 10000V-10000",stroke:"lightgrey",fill:"none","stroke-width":1});
	$(svgg).append(pathXYAxes);

	// create initial empty SVG elements 
	["defaultGlyph","backgroundGlyph","instanceGlyph"].forEach(function (layer) {
		path = $(SVG('path')).prop("id", layer).addClass("glyph-fill");
		if (layer == "instanceGlyph")
			{ $(path).addClass("instance").removeClass("glyph-fill"); }
		$(svgg).append(path);
	});

	// SVG nodes for layer -1 (default)
	glyph.points.forEach(function (pt, p) {
		$(svgg).append(
			$(SVG("circle"))
				.prop("id", "0-"+p)
				.addClass("node" + (pt[2]?" on-curve":" off-curve"))
				.attr({cx:pt[0],cy:pt[1],r:4})
		);

		$(svgg).append(
			$(SVG("text"))
				.prop("id", "l-"+p)
				.addClass("point-label")
				.attr({x:pt[0],y:-pt[1],transform:"scale(1,-1) translate(5,0)"})
				.text(p)
		);
	});

	$(svgg).append(svgLines);

	$("#glyph-window").append(svg);






	$(document).on("click", "input[name=edit-layer]", function () { // works for buttons created in the future

			let d;
			if (!glyph.font.axes)
				return;
			if ((d = $(this).closest("tr").data("deltaSet")) === undefined) // default outline
			{
				glyph.font.axes.forEach(function (axis, a) {
					axis.curr = axis.default;
					$("#axisSlider-" + a)
						.val((axis.curr-axis.min)/(axis.max-axis.min))
						.prop("disabled", false)
						.trigger("input")
						.css("opacity", "");
				});
			}
			else // a particular delta set
			{
				const delta = glyph.deltas[d];
				delta.tuple.forEach(function (peak, a) {
					const axis = glyph.font.axes[a];
					let axisValue;
					if (peak>=0)
						axisValue = axis.default + peak * (axis.max-axis.default);
					else
						axisValue = axis.default + peak * (axis.default-axis.min);
					$("#axisSlider-" + a)
						.val((axisValue-axis.min)/(axis.max-axis.min))
						.trigger("input")
						.prop("disabled", true)
						.css("opacity", 0.5);
				});
			}
		});


	//$("input.delta-active").change(function () {
	$(document).on("change", "input.delta-active", function() {
		updateSVG ();
	});
	/*
	$("input.delta-active").dblclick(function () {
		$("input.delta-active").prop("checked", false);
		$(this).prop("checked", true);
		updateSVG ();
	});
	*/

	$("#iup").on("change", function () {
		updateSVG();
	});

	$("#point-numbers").change(function () {
		$(".point-label").css("display", $("#point-numbers").prop("checked")?"inherit":"none");
	});

	$("#fill").change(function () {
		if ($("#fill").prop("checked"))
		{
			$("#defaultGlyph").addClass("glyph-fill");
			$("#defaultGlyph").removeClass("glyph-outline");
		}
		else
		{
			$("#defaultGlyph").removeClass("glyph-fill");
			$("#defaultGlyph").addClass("glyph-outline");
		}
	});

	$("#show-nodes").change(function () {
		if ($("#show-nodes").prop("checked"))
			$(".node").show();
		else
			$(".node").hide();
	});

	$(document).on("change", ".axis-value", function () {
		//console.log (this);
		//$("#axisSlider"+a).val(axis.max==axis.min ? axis.min : (axis.curr-axis.min)/(axis.max-axis.min));
		//if ($(this).hasClass("normal"))
		const axis = $(this).closest(".axis").data("axis");
		let norm;

		if ($(this).hasClass("normal"))
		{
			norm = parseFloat($(this).val());
			axis.curr = axis.default + (norm>0 ? norm*(axis.max-axis.default) : norm*(axis.default-axis.min));
		}
		else if ($(this).hasClass("hex"))
		{
			norm = parseInt($(this).val(), 16);
			axis.curr = axis.default + (norm>0 ? norm*(axis.max-axis.default) : norm*(axis.default-axis.min));
		}
		else
			axis.curr = parseFloat($(this).val());

		if (axis.curr > axis.max)
			axis.curr = axis.max;
		else if (axis.curr < axis.min)
			axis.curr = axis.min;

		$(this).siblings("input.axisSlider").val(axis.max==axis.min ? axis.min : (axis.curr-axis.min)/(axis.max-axis.min));

		$(this).siblings("input[type=range]").trigger("input");
		//updateSVG ();

	});



	// hmm, this doesn't seem to be used, overridden by the same funciton inside loadGlyph
	$(".axisSlider").on("input", function () {

		console.log ("AXIS");

		const a = parseInt(this.id.split("-")[1]);
		const axis = font.axes[a];
		const t = axis.min + $(this).val() * (axis.max-axis.min);

		// get normalized positions from all axis sliders and redraw layers[2]
		if (t > axis.max)
			t = axis.max;
		if (t < axis.min)
			t = axis.min;
		axis.curr = t;
		const T = axisNormalize (axis, t);

		updateSVG ();

		$("#axisVal-"+a).val(t);
		$("#axisValNormal-"+a).val(T);
		$("#axisValHex-"+a).val((Math.round(T*16384)).toString(16));
	});
	

	$(".deltaset-delete").click(function () {

		$(this).closest("tr").remove();

	});

	$("button.tab").click(function () {
		$("#tabs button").removeClass("active");
		if ($(this).text() == "Font")
		{
			$("#font-window").show();
			$("#glyph-window").hide();
			$("#glyph-nav").hide();
		}
		else // ($(this).text() == "Glyph")
		{
			clearGlyphWindow ();
			$("#font-window").hide();
			$("#glyph-window").show();
			$("#glyph-nav").show();

			layers[0].glyph = glyph; // = font.glyphs[$(this).data("glyphId")];
			loadGlyph ();
			svgRedraw (0);

		}
		$(this).addClass("active");
		//$(this).css("background-color", "red");
	});

	$("#glyph-nav").on("click", "button", function () {
		let g = glyph.glyphId;
		if ($(this).index() == 0) // prev (left arrow)
			g = (g-1 < 0) ? glyph.font.numGlyphs-1 : g-1;
		else if ($(this).index() == 1) // next (right arrow)
			g = (g+1 >= glyph.font.numGlyphs) ? 0 : g+1;
		layers[0].glyph = glyph = glyph.font.glyphs[g];

		glyph.font.axes.forEach(function (axis, a) {
			axis.curr = axis.default;
			$("#axisSlider"+a).val(axis.max==axis.min ? axis.min : (axis.curr-axis.min)/(axis.max-axis.min));
		});

		loadGlyph ();
		svgRedraw (0);
		svgRedraw (2);
	});

	$(document).on("click", "button.upload", function () { // works for buttons created in the future

		const fontBinary = $(this).closest("li").data("fontBinary");
		const filename = $(this).closest("li").data("filename");
		const filesize = $(this).closest("li").data("filesize");

		/*
		var oReq = new XMLHttpRequest();
		oReq.open("POST", "store-font.php", true);
		oReq.onload = function (oEvent) {
		  // Uploaded.
		  alert ("Font uploaded");
		};

		//oReq.send({fontBinary:fontBinary,filename:filename,filesize:filesize});
		*/

		/*
		var data = new FormData();
		//data.append("fontBinary", fontBinary);
		data.append("filename",filename);
		data.append("filesize",filesize);

		console.log ('uploading…');
		$.post("store-font.php", function( data ) {
  			//$( ".result" ).html( data );
  			console.log (data);
  			alert (data);
  			//console.log (res);
		});

		*/

		/*
		var oReq = new XMLHttpRequest();
		oReq.open("POST", "store-font.php", true);
		oReq.onload = function (oEvent) {
			alert ("uploaded")
		};
		var blob = new Blob(['abc123'], {type: 'text/plain'});
		oReq.send(blob);
		*/

		var fd = new FormData();
		fd.append("filename", filename);
		fd.append("data", fontBinary);
		//fd.append("currentUser", currentUser);

		$.ajax({
			url: 'store-font.php',
			type: 'POST',
			contentType: 'application/octet-stream',  
			data: fd,
			processData: false,
			contentType: false,
			success: function (req) {
				console.log ("Here is the AJAX request");
				console.log (req);
				const reqj = JSON.parse(req);
				prompt ("Copy and paste the URL to download the font", reqj.path);
			}
		});

	});

	$("#generate-font-browser").click(function () {
		const outputFontFamily = "outputFontFamily";
		console.log (glyph);
		const fontBinary = makeStaticFont(fonts[0]);
		const fontBinary64 = uint8ToBase64(fontBinary);
		const dateObj = new Date();
		let month = (dateObj.getMonth()+1).toString(); if (month.length==1) month = "0"+month;
		let date = dateObj.getDate().toString(); if (date.length==1) date = "0"+date;
		let hour = dateObj.getHours().toString(); if (hour.length==1) hour = "0"+hour;
		let minute = dateObj.getMinutes().toString(); if (minute.length==1) minute = "0"+minute;
		let second = dateObj.getSeconds().toString(); if (second.length==1) second = "0"+second;
		const outputFilename = "ap-" + dateObj.getFullYear()+month+date+"-"+hour+minute+second+".ttf";

		$("#output-style").html("@font-face {font-family:\"" + outputFontFamily + "\";"
				+"src: url('data:;base64," + fontBinary64 + "') format('truetype');"
				+"}");

		//$('#css-instance').html("@font-face {font-family:'" + "InstanceFont" +instanceNum+ "'; " + "src: url('data:;base64," + uint8ToBase64(instanceFileData) + "') format('truetype');} ");

		$("#output-font-sample").css({"font-family":"outputFontFamily",color:"black"});

		$("#output-fonts").prepend($("<li>")
			.html(outputFilename+" <a href=\"data:application/x-font-truetype;base64," + fontBinary64 + "\" download=\""+outputFilename+"\"><button class=\"download\">Download</button></a> <button class=\"upload\">Upload</button>")
			.data("fontBinary", fontBinary64)
			.data("filename", outputFilename)
			.data("filesize", 10000)
		);
	});

	$("#generate-font-server").click(function () {
		let url = "samsa-server-wrapper.php?";
		let filename = fonts[0].filename;
		if ($("#generate-huge-font-server").prop("checked")) // use huge test font
			filename = "JingXiHei-VF_65535.ttf";
		url += "input-font=" + filename;
		fonts[0].axes.forEach (function (axis) {
			url += "&variations[" + axis.tag + "]=" + axis.curr;
		});
		if ($("#generate-font-server-zip").prop("checked")) // zip font?
			url += "&zip=1";
		console.log ("https://www.axis-praxis.org/samsa/" + url);
		//window.location.href = "https://www.axis-praxis.org/samsa/" + url;
		window.open(url, 'Download');
	});

	// set up drag & drop listeners
	var dragdrop = document.getElementById("font-dropzone");
	dragdrop.addEventListener("dragover", dragFunction, false);
	dragdrop.addEventListener("drop", dropFunction, false);


	// get list of variable fonts from server for this user
	$.ajax({
		url: "list-fonts.php",
		success: function (req) {
			const reqj = JSON.parse(req);
			if (reqj && reqj.fonts.length)
			{
				$("#stored-fonts").prop("disabled", false).empty();
				reqj.fonts.forEach (function (sfont) {
					let isDisabled = sfont.name == "JingXiHei-VF_65535.ttf" ? " disabled" : "";
					$("#stored-fonts").append("<option" + isDisabled +">" + sfont.name + "</option>");
				});
			}
		}
	});

	// load a font from the server
	$("#load-font").click(function () {

		deleteCurrentFont ();

		const filename = $(this).siblings("select").children("option:selected").text();

		// fetch this font as an arraybuffer!
		const url = "custom-font.php?filename=" + filename;

		var oReq = new XMLHttpRequest();
		oReq.open("GET", url, true);
		oReq.responseType = "arraybuffer";
		oReq.onload = function (oEvent) {
			var arrayBuffer = this.response; // Note: not oReq.responseText
			if (arrayBuffer) {
				var dv = new DataView(arrayBuffer);
				//this._myFont.file.size = arrayBuffer.byteLength;

    			var thisfont = newFont (dv);
    			thisfont.filename = filename;
    			console.log ("NEW FONT")
    			console.log (thisfont);

				// TODO: should now populate things that can only be populated on load

	          	//var fontFamily = this._myFontIndex + "/" + this._myFont.type + '/' + thisfont.menuName;
	          	//thisfont.fontFamily = fontFamily;

	          	addFontToUI (thisfont, arrayBuffer)

			}
		}
		oReq.send(null);
	});

});

function deleteCurrentFont () {
	// clear previous font from UI
	$("#font-window").empty();

	// click the font tab
	$("#tabs").children().first().children().first().trigger("click");

	// delete the current glyph (both in memory and the SVG in the DOM)
	glyph = {};
	newglyph = {};
	clearGlyphWindow ();
}



function dropFunction(e) {

	deleteCurrentFont ();

	e.stopPropagation();
    e.preventDefault();

    var files = e.dataTransfer.files; // FileList object
    sessionStorage.clear();

    // loop through the FileList and process each as a font
    for (var i = 0, f; f = files[i]; i++) {

      var reader = new FileReader();

      // https://www.html5rocks.com/en/tutorials/file/dndfiles/
      // Closure to capture the file information.
      reader.onload = (function(theFile) {
        return function(e) {

    		var dv = new DataView(e.target.result);
    		var font = newFont (dv);

    		if (font.errors.length) {
    			for (var e in font.errors)
    				console.log ("ERROR: " + theFile.name + ": " + font.errors[e]);
   				console.log (theFile.name + " cannot be processed as a font file.");
    			return;
    		}

    		// store info about the file
    		font.file = {
		    	name: theFile.name,
		    	lastModified: theFile.lastModified,
		    	size: theFile.size,
		    	type: theFile.type,
		    };

		    addFontToUI (font, e.target.result);

		};
      })(f);

      // Read in the image file as a data URL.
      reader.readAsArrayBuffer(f);
    }
  }


function addFontToUI (font, arraybuffer)
{


	var uint8forBase64 = new Uint8Array(arraybuffer);
	//if (font.names[])
	var sampleText = font.names[19] || "ABCabc123";

  	var fontFamily = "InputFont" + fonts.length;
	$("#input-style").html("@font-face {font-family:\""+fontFamily+"\";src: url('data:;base64," + uint8ToBase64(uint8forBase64) + "') format('truetype');}");
	fonts.push(font);
	$("#input-font-sample").css({"font-family":fontFamily,color:"black"});
	// the font is loaded



	// UI

	// show all glyphs in the Font panel
	const svgScale = 1000/font.tables['head'].data.unitsPerEm * 0.05;
	//console.log ("svgScale:"+svgScale)
	font.glyphs.forEach(function (glyph, g) {
		//console.log (g)
		const div = $("<div class=\"glyph-icon\">")
			.prop("id", "g-"+g)
			.data("glyphId", g);
		const label = $("<div style=\"position:absolute;left:2px;top:2px;\">").text(g);
		$("#font-window").append(div);

		// create SVG element and its path for the glyph
		const svg = $(SVG("svg")).attr({width:"100px",height:"100px",xmlns:"http://www.w3.org/2000/svg"});
		const svgg = $(SVG("g")).attr({transform:"translate(24 70) scale("+svgScale+","+(-svgScale)+")"});
		$(svg).append(svgg);

		let path;
		if (glyph.numContours > 0)
		{
			//convertToNewFormat(glyph)
			path = getGlyphSVGpath (glyph);
		}

		// glyph
		const svgpath = $(SVG("path")).attr({d:path});

		// metrics
		const mpath	= $(SVG("path")).attr({d:"M0 5000V-5000M"+font.widths[g]+" 5000V-5000","stroke-width":20,stroke:"lightgrey",fill:"none"});

		$(svgg).append(mpath);
		$(svgg).append(svgpath);
		$(div).append(svg);
		$(div).append(label);

	});

	$(".glyph-icon").dblclick(function () {

		console.log ("doub")
		// prevent selection effect of double-click
		window.getSelection().removeAllRanges()

		// set up glyph (global var)
		layers[0].glyph = glyph = font.glyphs[$(this).data("glyphId")];
		loadGlyph ();
		svgRedraw (0);

		// click Glyph button
		$("button.tab").eq(1).click();

		//return true;
	});

	updateName (font);


}


function dragFunction(e) {
	e.stopPropagation();
	e.preventDefault();
	e.dataTransfer.dropEffect = "copy"; // use the "copy" pointer
}


// TT points array: these are the nodes on screen for dragging
// SVG points array: these are the control points for the SVG path

