// samsa-core.js


/*
const config = {
	MAX_TABLES: 100,
	OVERLAP_FLAG_APPLE: false,
	MAX_SIZE_FONT: 10000000,
	MAX_SIZE_GLYF_TABLE: 10000000,
	MAX_SIZE_NAME_TABLE: 50000,
	HUGE_FONT: true,
};
*/



/*
let fonts = [];
*/
let glyph = {
	font: undefined,
	endPts: [],
	points: [],
	deltas: []
};
let newGlyph;


function testFunc () {

	console.log ("Hello from inside function testFunc()");
	return 1+2;
}



function getStringFromData (data, p0, length)
{
	let str = "";
	let p = p0;
	while (p - p0 < length)
	{
		str += String.fromCharCode(data.getUint8(p++));	
	}
	return str;
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


function fontHasTables (font, tables)
{
	let n=0;
	tables.forEach(function (tag) {
		if (font.tables[tag])
			n++;
	});
	return (n == tables.length);
}

// font constructor
function Font (options) {

	let table;
	let p;

	const zeroBuffer = Buffer.alloc(16);

	// map modules
	const fs = options.config.fs; // for Node file functions


	// object boilerplate
	this.options = options;
	this.created = new Date();

	// set up empty font	
	this.tables = [];
	this.tableDirectory = [];
	this.axes = [];
	this.instances = [];
	this.errors = [];

	let font = this; // so we don’t edit 100s of lines of old code

	// we request a file, so we need to be in Node
	if (options.type == "file" && options.filePath && options.config && options.config.isNode)
	{
		//console.log ("Font init based on file");
		this.isFile = true;
		if (this.infile = fs.openSync (options.filePath, "r"))
		{
			this.stat = fs.fstatSync(this.infile);
		}
		else
		{
			this.errors.push("Could not open file.");
			return;
		}
	}
	else if (options.type == "data")
	{
		this.isFile = false;
	}
	else
	{
		this.errors.push("Could not make new Font object.");
		return;
	}

	// load first 12 bytes
	this.bufHeader = Buffer.alloc(12);
	fs.readSync (this.infile, this.bufHeader, 0, 12, false);
	this.signature = this.bufHeader.getUint32(0);
	switch (this.signature)
	{
		case 0x00010000:
		case 0x74727565: // 'true' (as in Skia.ttf)
		case 0x4f54544f:
			break;
		default: this.errors.push ("sfnt header: invalid signature (" + this.signature + ")");
			break;
	}
	this.numTables = this.bufHeader.readUInt16BE(4);
	if (this.numTables > options.config.MAX_TABLES)
		this.errors.push ("sfnt header: Too many tables (" + this.numTables + ")");

	// load table directory
	this.bufTableDir = Buffer.alloc(16 * this.numTables);
	fs.readSync (this.infile, this.bufTableDir, 0, 16 * this.numTables, false);
	for (let t=0, p=0; t<this.numTables; t++)
	{
		let tag = this.bufTableDir.getTag (p);
		if (!tag) {
			this.errors.push ("sfnt table directory: Tag value is invalid");
			break;
		}
		this.tables[tag] = {
			tag: tag,
			checkSum: this.bufTableDir.readUInt32BE(p+4),
			offset: this.bufTableDir.readUInt32BE(p+8),
			length: this.bufTableDir.readUInt32BE(p+12),
		};
		this.tableDirectory.push(tag);
		p += 16;
	}

	// function init() ?

	// load tables
	if (font.isFile)
		loadSfntTable (font, ["maxp","head","hhea","hmtx","vmtx","name","OS/2","fvar","gvar"]);

	// init tables
	decompileTable (font, "maxp");
	decompileTable (font, "hhea");
	decompileTable (font, "head");
	decompileTable (font, "name");
	decompileTable (font, "OS/2");
	decompileTable (font, "fvar");
	decompileTable (font, "gvar"); // just the header


	// end here if we are not instantiating!
	if (!options.config.instantiate)
		return;

	// function generate() ?



	// now we're ready to process glyf and gvar one by one
	let glyphBuf, glyphOffset, glyphSize;
	let newGlyphBuf, newGlyphOffset=0, newGlyphSize;

	//let gvdBuf, gvdOffset, gvdSize;
	let locaSize = font.tables['head'].data.indexToLocFormat==1 ? 4 : 2;
	let gvdLocaSize = font.tables['gvar'].data.indexToLocFormat==1 ? 4 : 2;

	// open temp files for glyf and loca
	const glyfTmpFile = fs.openSync ("TABLE_glyf.tmp", "w+"); // "w+" = read and write
	//const locaTmpFile = fs.openSync ("TABLE_loca.tmp", "w");

	font.tables['loca'].offset;
	let locaBuf = Buffer.alloc(8); // holds 2 Uint32 values
	let gvdLocaBuf = Buffer.alloc(8); // holds 2 Uint32 values

	// init axis settings
	font.options.config.axisSettings.forEach(function (axisSetting) {
		if (font.axisTagToId[axisSetting.tag] !== undefined)
			font.axes[font.axisTagToId[axisSetting.tag]].curr = axisSetting.value;
	});

	// init userTuple for normalized axis settings
	let userTuple = [];
	font.axes.forEach(function (axis) {
		userTuple.push(axisNormalize(axis, axis.curr));
	});

	// font generation output
	let applyDeltasOptions = {iup: true, ignoreDeltas: false, getCoeffs: false};
	let newGlyfLocas = [0];

	// for each glyph: get glyf data, get gvar data, then apply gvar to glypg
	const startTime_main = new Date();
	for (let g=0; g<font.numGlyphs; g++)
	{
		let glyph = {
			font: font,
			glyphId: g,
			numPoints: 0,
			numContours: 0,
			points: [],
			endPts: [],
		};


		// [1] READ SINGLE GLYPH FROM GLYF TABLE

		// read the glyf data from file
		if (font.isFile)
		{		
			if (!fs.readSync (font.infile, locaBuf, 0, 8, font.tables['loca'].offset + g*locaSize))
			{
				continue;
			}
			if (locaSize==4)
			{
				glyphOffset = locaBuf.getUint32(0);
				glyphSize = locaBuf.getUint32(4) - glyphOffset;
			}
			else /* locaSize==2 */
			{
				glyphOffset = 2 * locaBuf.getUint16(0);
				glyphSize = 2 * locaBuf.getUint16(2) - glyphOffset;
			}
		}
		else
		{
			// TODO: memory method
		}

		if (glyphSize<0)
		{
			console.log ("ERROR: glyphSize from loca table <0 (" +glyphSize+")");
			continue; // ERROR
		}


		// interpret glyph		
		font.glyphs = []; // if we're processing huge file, we might still want to keep composites here
		const indexToLocFormat = font.tables['head'].data.indexToLocFormat;

 		// read from glyf table if glyph has >0 size (we still need to process gvar on empty glyphs)
		if (glyphSize > 0) // simple & composite glyphs
		{
			if (font.isFile)
			{
				glyphBuf = Buffer.alloc(glyphSize);
				if (!fs.readSync (font.infile, glyphBuf, 0, glyphSize, font.tables['glyf'].offset + glyphOffset))
				{
					console.log ("ERROR: Could not load glyph ", g);
					break; // ERROR: could not load this glyph
				}
				data = glyphBuf;
				p=0;
			}
			else
			{
				data = font.buf;
				p = font.tables["glyf"].offset;
			}
			//let data = buf; // convenience, for old code

			glyph.numContours = data.getInt16(p), p+=2;
			glyph.xMin = data.getInt16(p), p+=2;
			glyph.yMin = data.getInt16(p), p+=2;
			glyph.xMax = data.getInt16(p), p+=2;
			glyph.yMax = data.getInt16(p), p+=2;

			let flag, repeat=0, x_=0, y_=0, x, y, c, r;
			if (glyph.numContours > 0) // simple glyph
			{
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
				//console.log ("Glyph " + g + " is composite");
			}
			else // error
			{
				font.errors.push ("glyf: Glyph " + g + " has 0 contours, but non-zero size");
			}
		}

		// assign the metrics values to 4 extra points
		//glyph.points.push([0,0], [font.widths[g], 0], [0,0], [0,0]);
		glyph.points.push([0,0,0], [0,0,0], [0,0,0], [0,0,0]); // TODO: get real values from hmtx,vmtx


		// this is used in tuples later (might be better to generate it only if needed)
		// note that glyph.allPoints = Object.keys(glyph.points) adds significant time
		glyph.allPoints = [];
		glyph.points.forEach(function (pt, p) {
			glyph.allPoints.push(p);
		});


		// [2] READ SINGLE GVD FROM GVAR TABLE

		// load gvd from gvar - I think we only need to load one gvd even for composite glyphs
		//console.log ("Glyph "+g+": starting GVD");
		let gvd = {size:0, offset:0};
		const offsetToGvdLocas = 20;
		if (font.isFile)
		{
			// find gvd start and size
			if (!fs.readSync (font.infile, gvdLocaBuf, 0, 8, font.tables['gvar'].offset + offsetToGvdLocas + g*font.tables['gvar'].data.sizeofOffset))
				continue;
			if (font.tables['gvar'].data.sizeofOffset==4)
			{
				gvd.offset = gvdLocaBuf.getUint32(0);
				gvd.size = gvdLocaBuf.getUint32(4) - gvd.offset;
			}
			else /* font.tables['gvar'].data.sizeofOffset==2 */
			{
				gvd.offset = 2 * gvdLocaBuf.getUint16(0);
				gvd.size = 2 * gvdLocaBuf.getUint16(2) - gvd.offset;
			}

			//console.log ("Glyph "+g+", gvdSize: "+gvdSize);
			gvd.buf = Buffer.alloc(gvd.size);

			if (gvd.size>0)
			{
				if (!fs.readSync (font.infile, gvd.buf, 0, gvd.size, font.tables['gvar'].offset + font.tables['gvar'].data.offsetToData + gvd.offset))
				{
					console.log ("ERROR: Could not load gvd ", g);
					break; // ERROR: could not load this glyph
				}
				data = gvd.buf;
				p=0;

				gvd.tupleCount = data.getUint16(p), p+=2;
				gvd.tuples_share_point_numbers = (gvd.tupleCount & 0x8000) ? true : false; // doesn't happen in Skia
				gvd.tupleCount &= 0x0FFF;
				gvd.offsetToSerializedData = data.getUint16(p), p+=2;

				let ps = /*font.tables['gvar'].data.offsetToData + gvdOffset +*/ gvd.offsetToSerializedData;

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

					tuple.peak = [];
					tuple.start = [];
					tuple.end = [];
					let c;
					if (tuple.embedded_tuple_coord)
					{
						for (c=0; c<font.axisCount; c++)
							tuple.peak[c] = data.getF2DOT14(p), p+=2;
					}
					else { 
						tuple.peak = font.tables['gvar'].data.sharedTuples[tuple.tupleIndex]; // TODO: can do the bitmask here instead of above
					}

					if (tuple.intermediate_tuple)
					{
						// TODO... safer to consume all three tuples if we have intermediate_tuple
						for (c=0; c<font.axisCount; c++)
							tuple.start[c] = data.getF2DOT14(p), p+=2;
						for (c=0; c<font.axisCount; c++)
							tuple.end[c] = data.getF2DOT14(p), p+=2;
					}
					else
					{
						for (c=0; c<font.axisCount; c++)
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

					if (glyph.numContours > 0)
					{
						let runLength;
						tuple.points = [];
						tuple.pointCount = 0;
						if (!gvd.tuples_share_point_numbers)
						{
							// get the packed point data for this tuple
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
											//alert ("OBARD at glyph #" + g + ", nextOffset = " + nextOffset);
											console.log ("OBARD", tuple, ps, g);
										}

										

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
								}
							}
							else // if (gvd.tuples_share_point_numbers)
							{
								//console.log ("We have an 'all points' situation");
								tuple.impliedAllPoints = true;
								//tuple.pointCount = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs
								tuple.pointCount = glyph.numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs
							}
						}
						else
						{
							//console.log ("hmmmmmmm... NO private point numbers");
							tuple.pointCount = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs, and remember the phantom points!
						}
					} // end if (glyph.numContours > 0)

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

						/*
						if (ps - (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) > nextOffset)
							console.log ("BAD: g=" + g + ", ps=" + ps + ",start=" + (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) + ", nextOffset="+nextOffset);
						*/
					}
					for (var pc=0; pc < tuple.pointCount; pc++)
						tuple.deltas.push([unpacked[pc], unpacked[tuple.pointCount + pc]]); // x,y

					gvd.tuples.push(tuple);
					//console.log (tuple);

				}
				//console.log (gvd.tuples);
			}
		}
		else // read GVD from whole font in memory
		{
			data = font.buf;
			p = font.tables["gvar"].offset;
		}


		// execute any extra deltas (user edits, loaded from JSON file)
		if (false)
		{
		}


		// [3] APPLY AXIS SETTINGS TO GLYPH VIA GVD TUPLES
  		if (gvd.size > 0 && glyph.numContours > 0)
  		{
			convertToNewFormat (glyph, gvd);

			//glyph.deltas = gvd.tuples ? gvd.tuples : [];
			if (gvd && false)
			{
				gvd.tuples.forEach(function (tuple, t) {
					/*
					let delta = {
						tuple: [],
						points: [],
						offsets: tuple.deltas
					};
					*/
					//tuple.points = [];

					tuple.offsets = tuple.deltas;

					if (tuple.private_point_numbers)
					{	
						if (tuple.impliedAllPoints)
							//tuple.points = glyph.allPoints;//Object.keys(glyph.points);
							
							glyph.points.forEach(function (pt, p) {
												tuple.points.push(p);
											});
							
					}
					else
					{
						// TODO: make this array once, out of a loop
						//tuple.points = glyph.allPoints;//Object.keys(glyph.points);
						
						glyph.points.forEach(function (pt, p) {
							tuple.points.push(p);
						});
						
					}

					//glyph.deltas.push(delta);

				});		
				//console.log (glyph.deltas);
			}

			iglyph = glyphAddVariationDeltas (glyph, userTuple, applyDeltasOptions);
	
			// remember that the default case is still useful to generate, but we can optimize it
		}
		else
			iglyph = null;


		// [4] COMPILE GLYPH
		//newGlyphSize = 0;
		p = 0;

		if (!gvd.size)
		{
			newGlyphBuf = glyphBuf;
			p = glyphSize;
		}
		else if (glyph.numContours > 0)
		{
			let maxNewGlyphSize = 12 + glyph.instructionLength + (glyph.numContours+glyph.instructionLength) * 2 + glyph.numPoints * (2+2+1);
			newGlyphBuf = Buffer.alloc(maxNewGlyphSize); // allocate max possible memory that the new glyph would occupy

			let xMin=0,xMax=0,yMin=0,yMax=0;
			var pt;
			var points = iglyph.points;
			var instructionLength = 0;

			if (points && points[0])
			{
				[xMin,yMin] = [xMax,yMax] = points[0];
				
				let P,Q;
				for (pt=1; pt<iglyph.numPoints; pt++)
				{
					P = points[pt][0];
					Q = points[pt][1];
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
			else
			{
				// TODO: COMPOSITES and SPACE GLYPHS
			}
			iglyph.newLsb = xMin;

			// new bbox
			newGlyphBuf.setInt16(p, iglyph.numContours), p+=2;
			newGlyphBuf.setInt16(p, xMin), p+=2;
			newGlyphBuf.setInt16(p, yMin), p+=2;
			newGlyphBuf.setInt16(p, xMax), p+=2;
			newGlyphBuf.setInt16(p, yMax), p+=2;

			// endpoints
			for (var e=0; e<iglyph.numContours; e++)
				newGlyphBuf.setUint16(p, iglyph.endPts[e]), p+=2;

			// instructions
			newGlyphBuf.setUint16(p, instructionLength); p+=2;
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
			if (font.options.config.OVERLAP_FLAG_APPLE)
				flags[0] |= 0x40; // overlap signal for Apple, see https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6AATIntro.html ('glyf' table section)

			// write flags
			for (pt=0; pt<iglyph.numPoints; pt++)
				newGlyphBuf.setUint8(p, flags[pt]), p++; // compress this a bit more later if optimizing for space, not speed

			// write point coordinates
			for (pt=0; pt<iglyph.numPoints; pt++)
			{
				if (dx[pt] == 0)
					continue;
				if (dx[pt] >= -255 && dx[pt] <= 255)
					newGlyphBuf.setUint8(p, (dx[pt]>0) ? dx[pt] : -dx[pt]), p++;
				else
					newGlyphBuf.setInt16(p, dx[pt]), p+=2;
			}
			for (pt=0; pt<iglyph.numPoints; pt++)
			{
				if (dy[pt] == 0)
					continue;
				if (dy[pt] >= -255 && dy[pt] <= 255)
					newGlyphBuf.setUint8(p, (dy[pt]>0) ? dy[pt] : -dy[pt]), p++;
				else
					newGlyphBuf.setInt16(p, dy[pt]), p+=2;
			}

			// padding
			if (p%2)
				newGlyphBuf.setUint8(p, 0), p++;

			// record our data position
		}

		newGlyphSize = p;
		newGlyfLocas.push(newGlyphSize + newGlyfLocas[g]);
		//console.log (g+" newGlyphSize: "+newGlyphSize+"/"+maxNewGlyphSize);


		// [5] WRITE GLYPH TO FILE

		// write new glyph to temp file
		if (newGlyphSize>0)
			fs.writeSync (glyfTmpFile, newGlyphBuf, 0, newGlyphSize, false);

	}
	const endTime_main = new Date();


	// [6] MERGE TEMP FILES INTO FINAL FILE

	// get the new numTables
	const startTime_merge = new Date();

	let newNumTables = font.numTables;
	font.options.config.OUTPUT_TABLES_TO_SKIP.forEach(function (tag) {
		if (font.tables[tag]) // if these unwanted tables exist in font, decrement numTables in the new font
			newNumTables--;
	});

	// open file and write first 12 bytes
	font.outfile = fs.openSync (font.options.config.outfilePath, "w");
	p = 0; // p is now our write pointer
	const newFirst12Bytes = Buffer.alloc(12);
	newFirst12Bytes.setUint32(0, font.signature);
	newFirst12Bytes.setUint16(4, newNumTables);
	for (var sr=1, es=0; sr*2 <= newNumTables; sr*=2, es++)
		;
	newFirst12Bytes.setUint16(6, sr*16);
	newFirst12Bytes.setUint16(8, es);
	newFirst12Bytes.setUint16(10, 16*(newNumTables-sr));
	fs.writeSync (font.outfile, newFirst12Bytes, 0, 12, 0);
	p+=12;

	// write the tables (zeroed for now)
	const newBufTableDir = Buffer.alloc(16*newNumTables);
	fs.writeSync (font.outfile, newBufTableDir, 0, 16*newNumTables, p);
	p+=16*newNumTables;

	//console.log ("----------------------------");
	//console.log ("Writing tables");
	//console.log (font.numTables, newNumTables);
	let newLocaBuf;

	for (let t=0, newT=0; t<font.numTables; t++)
	{
		let tempBuf;
		let bytesRead;

		// if it's in memory, write it
		let table = font.tables[font.tableDirectory[t]];

		if (font.options.config.OUTPUT_TABLES_TO_SKIP.indexOf(table.tag) == -1)
		{
			let padBytes;
			//console.log ("-",table.tag)
			table.newOffset = p;
			table.newCheckSum = 0;

			if (table.buf && table.tag != "gvar")
			{
				//console.log ("M", table.length);
				table.newLength = table.length;
				fs.writeSync (font.outfile, table.buf, 0, table.newLength, table.newOffset);
				p += table.newLength;
			}
			else if (table.tag == "glyf")
			{
				//console.log ("T");
				tempBuf = Buffer.alloc(font.stat.blksize);
				bytesRead = font.stat.blksize;
				//const pStart=p;
				
				// copy temp file into the final output file, as fast as possible
				while (bytesRead == font.stat.blksize)
				{
					//bytesRead = fs.readSync (glyfTmpFile, tempBuf, 0, font.stat.blksize, false);
					//fs.writeSync (outfile, font.buf, 0, bytesRead, false);
					bytesRead = fs.readSync (glyfTmpFile, tempBuf, 0, font.stat.blksize, p-table.newOffset);
					fs.writeSync (font.outfile, tempBuf, 0, bytesRead, p);
					p+=bytesRead;
				}
				table.newLength = p - table.newOffset;
			}
			else if (table.tag == "loca")
			{
				//console.log ("R");
				let newLocaOffsetSize = newGlyfLocas[font.numGlyphs] >= 0x20000 ? 4 : 2;
				table.newLength = (font.numGlyphs+1) * newLocaOffsetSize;
				newLocaBuf = Buffer.alloc(table.newLength);

				for (let g=0; g<=font.numGlyphs; g++) // <= is correct
				{
					if (newLocaOffsetSize==4)
						newLocaBuf.setUint32(4*g, newGlyfLocas[g]);
					else
						newLocaBuf.setUint16(2*g, newGlyfLocas[g]/2);
				}
				fs.writeSync (font.outfile, newLocaBuf, 0, table.newLength, p);
				p += table.newLength;

				// TODO: ensure maxp value agrees with newLocaOffsetSize
			}
			else // copy other tables from infile to outfile
			{
				//console.log ("C");
				tempBuf = Buffer.alloc(table.length);
				bytesRead = fs.readSync (font.infile, tempBuf, 0, table.length, table.offset);
				table.newLength = table.length;
				fs.writeSync (font.outfile, tempBuf, 0, bytesRead, table.newOffset);
				p += bytesRead;
			}

			// padding (0-3 bytes)
			if (padBytes = (4 - p%4) % 4)
			{
				fs.writeSync (font.outfile, zeroBuffer, 0, padBytes, p);
				p+=padBytes;
			}

			// write table directory entry
			newBufTableDir.setUint8(newT*16, table.tag.charCodeAt(0));
			newBufTableDir.setUint8(newT*16+1, table.tag.charCodeAt(1));
			newBufTableDir.setUint8(newT*16+2, table.tag.charCodeAt(2));
			newBufTableDir.setUint8(newT*16+3, table.tag.charCodeAt(3));
			newBufTableDir.setUint32(newT*16+4, table.newCheckSum);
			newBufTableDir.setUint32(newT*16+8, table.newOffset);
			newBufTableDir.setUint32(newT*16+12, table.newLength);
			newT++;

		} // end of this table

	}

	// write the table directory
	fs.writeSync (font.outfile, newBufTableDir, 0, 16*newNumTables, 12);


	// close files
	fs.closeSync(font.infile);
	fs.closeSync(font.outfile);
	const endTime_merge = new Date();

	// success message
	console.log ("Font generated :-) Glyphs written: " + font.numGlyphs);
	console.log ("Time (main): " + (endTime_main-startTime_main)+ "ms");
	console.log ("Time (merge): " + (endTime_merge-startTime_merge)+ "ms");
}


function decompileTable (font, tag)
{
	const fs = font.options.config.fs; // for Node file functions
	let p;
	let buf, data;
	let table = {};
	let tableStart;

	if (!font.tables[tag])
		return false;

	if (font.isFile)
	{
		buf = font.tables[tag].buf;
		p = tableStart = 0;
	}
	else
	{
		buf = font.buf;
		p = tableStart = font.tables[tag].offset;
	}

	data = buf; // convenience

	switch (tag)
	{
		case "maxp":
		table.version = buf.getUint32(p), p+=4;
		table.numGlyphs = buf.getUint16(p), p+=2;
		font.tables['maxp'].data = table;
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
		font.tables['hhea'].data = table;
		break; // end "hhea"


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
		font.tables['head'].data = table;
		break; // end "head"


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
		// TODO: some more data here, depending on OS/2 table version
		font.tables['OS/2'].data = table;
		break; // end "OS/2"


		case "name":
		const nameTableOffset = p;
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

			nameRecordStart = nameTableOffset + table.stringOffset + nameRecord.offset;
			nameRecordEnd = nameRecordStart + nameRecord.length;

			if (nameRecordEnd > nameTableOffset + font.tables['name'].length) // safety check
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
									// this obtains the Unicode index for codes >= 0x10000
									str += (String.fromCharCode(data.getUint16(p))), p+=2;
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
		break; // end "name"


		case "fvar":
		if (!fontHasTables(font, ["fvar","name"]))
			break;
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
			axis.name = font.names[axis.axisNameID]; // name table must already be parsed!
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
			instance.name = font.names[instance.subfamilyNameID]; // name table must already be parsed!
			table.instances.push(instance);
		}

		font.axes = table.axes; // convenience
		font.axisTagToId = table.axisTagToId;
		font.axisCount = table.axisCount;
		font.instances = table.instances; // convenience
		font.tables['fvar'].data = table;
		break; // end "fvar"


		case "gvar":
		if (!fontHasTables(font, ["fvar","glyf"]))
			break;
 		table.majorVersion = data.getUint16(p), p+=2;
		table.minorVersion = data.getUint16(p), p+=2;
		table.axisCount = data.getUint16(p), p+=2;
		table.sharedTupleCount = data.getUint16(p), p+=2;
		table.offsetToSharedTuples = data.getUint32(p), p+=4;
		table.glyphCount = data.getUint16(p), p+=2;
		table.flags = data.getUint16(p), p+=2;
		table.offsetToData = data.getUint32(p), p+=4;
		table.sizeofTuple = table.axisCount * 2; // 2 == sizeof (F2DOT14)
		table.sizeofOffset = (table.flags & 0x01) ? 4 : 2;

		// get shared tuples
		table.sharedTuples = [];
		if (table.sharedTupleCount > 0)
		{
			table.sharedTupleBuf = Buffer.alloc(table.sharedTupleCount * table.sizeofTuple);
			if (fs.readSync (font.infile, table.sharedTupleBuf, 0, table.sharedTupleCount * table.sizeofTuple, font.tables['gvar'].offset + table.offsetToSharedTuples) != table.sharedTupleCount * table.sizeofTuple)
				font.errors.push("gvar: Problem reading shared tuples.");
			for (let t=0, p=0; t < table.sharedTupleCount; t++)
			{
				for (var a=0, tuple=[]; a<table.axisCount; a++)
					tuple.push(table.sharedTupleBuf.getF2DOT14(p)), p+=2;
				table.sharedTuples.push (tuple);
				//console.log (tuple);
			}
		}
		else
			console.log ("gvar: No shared tuples")

		font.tables['gvar'].data = table;
		break;
	}

	//console.log (font.tables[tag]);
}


function loadSfntTable (font, tag)
{
	const fs = font.options.config.fs; // for Node file functions
	const tagArray = Array.isArray(tag) ? tag : [tag]; // handle arrays as well as single tags
	let found = {};
	if (!font.isFile)
		return found;

	tagArray.forEach(function (tag_) {
		const table = font.tables[tag_];
		if (table == undefined)
			return false; // table not present
		let numBytes = table.length;
		if (tag_ == "gvar")
			numBytes = 20; // special case, just read header

		//console.log ("TABLE..." , font.tables[tag_], " bytes to read=", numBytes);
		table.buf = Buffer.alloc(numBytes); // TODO: check this is ok
		if (fs.readSync (font.infile, table.buf, 0, numBytes, table.offset))
			found[tag_] = true;
	});

	return found;
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

	/*
	$("td.S").text(0).css("background-color", "transparent");
	*/

	glyph.points.forEach(function (point, p) {
		newGlyph.points[p] = [point[0], point[1], point[2]];
	});

	glyph.deltas.forEach(function(delta, d) {
		if (options.ignoreDeltas && options.ignoreDeltas[d])
		{
			console.log ("Skipping");
			return; // skip this iteration
		}

		let scaledOffsets = [];
		let touched = [];
		let S = 1;

		glyph.points.forEach(function (point, p) {
			scaledOffsets[p] = [0,0];
		});


		// go thru each axis, multiply a scalar S from individual scalars AS
		glyph.font.axes.forEach(function(axis, a) {
			//const peak = delta.tuple[a];
			const ua = userTuple[a];
			const peak = delta.peak[a];
			const start = delta.start[a];
			const end = delta.end[a];
			let AS;

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

			/*
			// reflect in the UI
			$("#deltaset-tr-"+d + " td.S div").text(S);
			//$("#deltaset-tr-"+d + " td.S").css({"background-color"});
			$("#deltaset-tr-"+d).css("background-color", "lightgreen")
			*/
		}
		else
		{
			/*
			$("#deltaset-tr-"+d).css("background-color", "transparent");
			*/
		}

	});


	return newGlyph;
}


function axisNormalize (axis, t) {
	if (t == axis.default)
		return 0;
	else if (t > axis.default)
		return axis.max==axis.default? 0 : (t-axis.default)/(axis.max-axis.default);
	else // t < axis.default
		return axis.min==axis.default? 0 : (axis.default-t)/(axis.min-axis.default);
}



function convertToNewFormat(glyph, gvd) {

	// convert gvd to deltas
	glyph.deltas = [];

	if (gvd)
	{
		let delta;
		gvd.tuples.forEach(function (tuple, t) {
			delta = tuple;
			delta.offsets = tuple.deltas;

			if (tuple.private_point_numbers)
			{	
				if (tuple.impliedAllPoints)
					delta.points = glyph.allPoints;
			}
			else
			{
				// TODO: make this array once, out of a loop
				delta.points = glyph.allPoints;
			}

			glyph.deltas.push(delta);

		});		
		//console.log (glyph.deltas);
	}
}



module.exports = {
	Font: Font,
};
