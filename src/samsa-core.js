// https://www.npmjs.com/package/uglify-es // this version of uglify is ES6 compatible, earlier versions were not
// uglifyjs samsa-core.js > samsa-core.min.js


/*


samsa-core.js
2019-10-18 glyf parsing in node & browser
2019-10-18 TVTs parsing in node & browser
2019-10-18 Tons of refactoring working nicely (tvts is much clearer structure than old gvd)
2019-10-19 avar seems to be working now
2019-10-20 Finally got gvar decompiling for all fonts I throw at it. Just need to do the fake glyph.points for composites and we’re done.


*/



// this is the 

// TODO:
// - rename it SamsaCONFIG
// - pass the actual config object along with the font
let CONFIG = {
	//MAX_TABLES: 100,
	//OVERLAP_FLAG_APPLE: true,
	//MAX_SIZE_FONT: 10000000,
	//MAX_SIZE_GLYF_TABLE: 10000000,
	//MAX_SIZE_NAME_TABLE: 50000,

	isNode: (typeof module !== 'undefined' && module.exports),
	outFileDefault: "samsa-out.ttf",

	instantiation: {
		method: "default", // sets apple overlap bit
		// method: "dummy-fvar", // does not set apple overlap bit
		// method: "no-overlap-bit", // does not set apple overlap bit
		skipTables: ['gvar','fvar','cvar','avar','STAT','MVAR','HVAR'],
		ignoreIUP: false,
	},

	sfnt: {
		maxNumTables: 100,
		maxSize: 10000000,
	},

	glyf: {
		overlapSimple: true,
		maxSize: 10000000, // TODO: work out the max theoretical size for each glyph (each coordinate is USHORT, etc)
	},

	name: {
		maxSize: 50000,
	},

	ui: {
		arrow: {
			strokeWidth: 2,
			tipLength: 10,
			tipWidth: 6,
			color: "#0044ee",
		},

		tuple: {
			colors: ["#0044ee", "#110033"],
		},

		point: {
			size: 7,
			shapeOnCurve: "■", // one of ⯅●■
			shapeOffCurve: "●", // ⯅●■
		},

		glyph: {
			fillColor: "#404040",
			strokeColor: "#000000",
			strokeWidth: 1.5,
		},

		// ?better as CSS, so we can add italic, weight, border, background-color etc?
		text: {
			font: "IBM Plex",
			size: 18,
		},

		label: {
			font: "IBM Plex",
			size: 12,
		},

	},

	docs: {
		regex: {
			microsoft: "https://docs.microsoft.com/en-us/typography/opentype/spec/dvaraxistag_$1",
			typenetwork: "https://variationsguide.typenetwork.com/#$1",
		},
		axes: {
			wght: "regex:microsoft",
			wdth: "regex:microsoft",
			opsz: "regex:microsoft",
			ital: "regex:microsoft",
			slnt: "regex:microsoft",
			xtra: "regex:typenetwork",
			xopq: "regex:typenetwork",
			ytra: "regex:typenetwork",
			yopq: "regex:typenetwork",
			ytlc: "regex:typenetwork",
			ytuc: "regex:typenetwork",
			ytde: "regex:typenetwork",
			ytas: "regex:typenetwork",
			xtab: "regex:typenetwork",
			vrot: "regex:typenetwork",
			udln: "regex:typenetwork",
			shdw: "regex:typenetwork",
			refl: "regex:typenetwork",
			otln: "regex:typenetwork",
			engr: "regex:typenetwork",
			embo: "regex:typenetwork",
			ytch: "regex:typenetwork",
			xtch: "regex:typenetwork",
			rxad: "regex:typenetwork",
			ryad: "regex:typenetwork",
			rsec: "regex:typenetwork",
			vuid: "regex:typenetwork",
			votf: "regex:typenetwork",
		},
		hoi: "http://underware.nl/case-studies/hoi/",
	}


};

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
	var str = "";
	var p = p0;
	while (p - p0 < length)
	{
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
	return this.getInt16(p) / 16384.0; // signed
}

function copyBytes(source, target, zs, zt, n)
{
	// copies n bytes from DataView source (starting at zs) to DataView target (starting at zt)
	for (var end = zt+n; zt<end; zt++,zs++)
		//target[zt] = source.getUint8(zs);
		target.setUint8(zt, source.getUint8(zs));
}


function SamsaVF_compileBinaryForInstance (font, instance) {
	// we either write to a memory object or straight to a file


	const timerStart = new Date();

	let node = font.config.isNode;
	let fd, read, write;
	let zeroBuffer;
	let position;
	let fdw;
	if (node) {
		fd = font.fd;
		read = font.config.fs.readSync;
		write = font.config.fs.writeSync;
		zeroBuffer = Buffer.alloc(16);
		//console.log ("In node");
		position = 0;
	}
	if (!instance.filename)
		instance.filename = font.outFile;


	// [0] setup
	// - node: open file
	// - frontend: allocate memory

	if (node) {
		fdw = font.config.fs.openSync (instance.filename, "w");
	}
	else {

	}

	// [1] write header: first 12 bytes + table directory
	// - zero for now
	// - we update with actual values at the end

	// get new number of tables (we skip the variable-specific tables, copy or recompile all the rest)
	let newNumTables = 0;
	let newTableDirectory = [];
	let newTables = {};
	font.tableDirectory.forEach (table => {
		if (font.config.instantiation.skipTables.indexOf(table.tag) == -1) {
			//newTableDirectory.push(table); // TODO: make this fully independent of font.tableDirectory

			newTableDirectory.push(newTables[table.tag] = {	tag: table.tag } );
			++newNumTables;
		}
	});

	//console.log (`newNumTables=${newNumTables}`)

	let fileHeaderBuf;
	let dFileHeaderBuf;
	if (node) {
		let headerSize = 12 + 16 * newNumTables;
		fileHeaderBuf = Buffer.alloc(headerSize);
		write (fdw, fileHeaderBuf, 0, headerSize, position);
		position += headerSize;
	}
	else {
		console.log ("memory method");
	}
	//process.exit();

	// sort tableDirectory (we can move this to the end)
	//console.log(font.tableDirectory);

	// sort new table dir by offset
	// - this is because we will write them in the order from the original font file
	// - we later sort them by tag, so that we get nice table indices to update file with new offset and length
	// - we might consider sorting tables by size here instead: this brings header tables to the front of the file and ensures loca will come before glyf; there was a Microsoft tool that did this
	newTableDirectory.sort((a,b) => (a.offset > b.offset) ? 1 : -1);


	font.tableDirectory.sort((a, b) => (a.offset > b.offset) ? 1 : -1); // sort in order of the original table order in the font, i.e. by offset
	//console.log("Sorted tables");
	//console.log(font.tableDirectory);


	// [3] write tables (same order as source font)
	// now the tableDirectory is ordered by original offset
	//console.log(font.tableDirectory);
	let tablesNewLocations = {};
	//font.tableDirectory.forEach (table => {

	// go thru tables in order of their original offset values

	let locaBuf, hmtxBuf;
	let aws = [], lsbs = []; // metrics, calculated when we instantiate each glyph
	let newLocas = [0]; // if we write in ULONG format we can write this table before glyf if we want


	//console.log(newTableDirectory); //process.exit();


	newTableDirectory.forEach (table => {

		//console.log(`Writing ${table.tag} at offset ${position.toString(16)}`);


		// TODO: we already checked this...
		if (font.config.instantiation.skipTables.indexOf(table.tag) == -1) {

			// it’s a simple table if it’s not one of these
			//let simpleTable = (["hmtx", "loca", "glyf"].indexOf(table.tag) == -1);
			//console.log(simpleTable);
			//table.length = font.tables[tag].length;
			table.offset = position; // new offset

			// read and write small table
			//console.log ("Writing table " + table.tag + " (" + table.length + " bytes)");

			switch (table.tag) {

				case "glyf":

					let p; // the current data offset where the binary glyph is being written in memory

					// OPTIMIZE: write to a large buffer, handle overflows: the large write data size should be faster

					// = node ? 0 : 0; // TODO: fix this for frontend

					for (let g=0; g<font.numGlyphs; g++) {

						// remember to delete these later!
						//font.glyphs[g] = font.parseGlyph(g); // glyf data
						//font.glyphs[g].tvts = font.parseTvts(g); // gvar data
		
						//let glyph = font.glyphs[g];

						let glyph = font.glyphs[g] = font.parseGlyph(g); // glyf data
						glyph.tvts = font.parseTvts(g); // gvar data

						let newGlyphBuf; // compiled binary will go here
						if (node) {
							p = 0; // node: one glyph at a time for memory efficiency with very large fonts
						}
						else {
							// p = ?? // frontend: all glyphs at once
						}

						if (glyph.numContours < 0) {
							// composite glyph
							//console.log(`Glyph #${g} (composite)`);
							lsbs[g] = 0;
							aws[g] = 0;
						}
						else if (glyph.numContours == 0) {
							// space glyph
							//console.log(`Glyph #${g} (---)`);
							lsbs[g] = 0;
							aws[g] = 0;
						}
						else /* glyph.numContours > 0) */
						{
							// simple glyph

							// OPTIMIZE: Only allocate the memory once (at the biggest possible binary glyph size)
							// - this only works in node mode of course, as frontend will normally need the whole font

							// apply the variations
							let iglyph = glyphApplyVariations(glyph, instance.tuple);
							//console.log(`Glyph #${g} (simple)`);

							//console.log(`i length=${glyph.instructionLength}`);
							let maxNewGlyphSize = 12 + glyph.instructionLength + (glyph.numContours+glyph.instructionLength) * 2 + glyph.numPoints * (2+2+1);
							maxNewGlyphSize += 256; // safety margin...
							newGlyphBuf = Buffer.alloc(maxNewGlyphSize);
							//console.log("Memory " + maxNewGlyphSize );

							let xMin=0,xMax=0,yMin=0,yMax=0;
							let pt;
							let points = iglyph.points;
							let instructionLength = 0;

							// we always have >0 points in a simple glyph
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
							if (font.config.glyf.overlapSimple)
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

							// now p == size of this compiled glyph in bytes
							//console.log("glyph size: "+ p + ", position: " + position);

							// record our data position


							// write this glyph
							if (node) {
								//console.log(`position: ${position.toString(16)}`);
								write (fdw, newGlyphBuf, 0, p, position);
								position += p;
							}

							//console.log(`DONE ${g}: @${p.toString(16)}`, newGlyphBuf);

							// store metrics (with node, we soon lose the iglyph)
							aws[g] = iglyph.points[iglyph.numPoints+1][0]; // the x-coordinate of the numPoints+1 point
							lsbs[g] = iglyph.xMin;
						}



						// release memory explicitly

						font.glyphs[g].tvts = undefined;
						font.glyphs[g] = undefined;

						// store location of *next* loca
						//console.log (`loop ${g}: set next loca ${g+1} to ${p}`)
						newLocas[g+1] = newLocas[g] + p;
						// OPTIMIZE: write this directly to locaBuf

					}


					//position = p;
					//console.log ("LENGTH: ", newLocas.length, font.glyphs.length)

					// update table.length
					table.length = newLocas[font.numGlyphs];
					//console.log(`glyf table.length : ${(table.length).toString(16)}`);

					break;


				case "loca":

					// write zeroes for now, update with real values at the end
					// use long offsets so that we know already the size of the table

					table.length = 4 * (font.numGlyphs+1);
					if (node) {
						locaBuf = Buffer.alloc(table.length); // zeroed data
						write (fdw, locaBuf, 0, table.length, table.offset);
						position += table.length;
					}
					// remember to tweak head.indexToLocFormat = 1
					break;


				case "hmtx":

					// write zeroes for now, update with real values at the end
					// write all values in full even for monospace fonts

					table.length = 4 * font.numGlyphs;
					if (node) {
						hmtxBuf = Buffer.alloc(table.length); // zeroed data
						write (fdw, hmtxBuf, 0, table.length, table.offset);
						position += table.length;
					}
					// remember to tweak hhea.numberOfHMetrics = font.numGlyphs
					break;


				// TODO: customize name table, remove VF names
				// case "name":
				// 	break;


				default:

					//console.log("simpleTable");

					// allocate memory for table
					table.length = font.tables[table.tag].length; // new length == old length
					let tableBuf = Buffer.alloc(table.length);

					// read table
					read (fd, tableBuf, 0, font.tables[table.tag].length, font.tables[table.tag].offset);

					// tweak table
					switch (table.tag) {
						case "head":
							tableBuf.setUint16(50, 0x0001); // long loca format makes things simpler since we know in advance how much space we need for loca
							break;

						case "hhea":
							tableBuf.setUint16(34, font.numGlyphs); // easier if  we ignore minor compression possibilities
							break;
					}

					//write table
					write (fdw, tableBuf, 0, table.length, table.offset);
					position += table.length;

					break;
			}

			// pad table
			let padLength = (4 - table.length%4) % 4; // no padding if table.size%4 == 0
			if (padLength) {
				write (fdw, zeroBuffer, 0, padLength, position); // write at current position
				position += padLength;
			}
		}


		//console.log(`Written ${table.tag} at offset ${}`);


	}); // end of each table loop


	// [4] fix up
	//console.log("Fixing up...");

	// [4a] write final loca table
	newLocas.forEach((loca, g) => {
		locaBuf.setUint32(4*g, loca);
	});
	write (fdw, locaBuf, 0, 4*(font.numGlyphs+1), newTables["loca"].offset);

	// [4b] write final hmtx table
	for (let g=0; g<font.numGlyphs; g++) {
		if (aws[g])
			hmtxBuf.setUint16(4*g, aws[g]);
		if (lsbs[g])
			hmtxBuf.setInt16(4*g+2, lsbs[g]);
	}
	write (fdw, hmtxBuf, 0, 4*font.numGlyphs, newTables["hmtx"].offset);

	// [4c] fix the font header
	fileHeaderBuf.setUint32(0, font.fingerprint);
	fileHeaderBuf.setUint16(4, newTableDirectory.length);
	let sr, es;
	for (sr=1, es=0; sr*2 <= newTableDirectory.length; sr*=2, es++)
		;
	fileHeaderBuf.setUint16(6, sr*16);
	fileHeaderBuf.setUint16(8, es);
	fileHeaderBuf.setUint16(10, (16*newTableDirectory.length)-sr);

	// [4d] fix table offsets and sizes
	// sort tables by tag and write the table directory
	newTableDirectory.sort((a,b) => (a.tag > b.tag) ? 1 : -1);
	newTableDirectory.forEach((table, t) => {
		for (let c=0; c<4; c++)
			fileHeaderBuf.setUint8(12 + t*16 + c, table.tag.charCodeAt(c)); // e.g. "hmtx" (maybe should store this as the original 32-bit integer to avoid character conversion)
		//fileHeaderBuf.setUint32(12 + t*16 + 4, table.checkSum); // TODO: checksums - for now, leave at zero
		fileHeaderBuf.setUint32(12 + t*16 + 8, table.offset);
		fileHeaderBuf.setUint32(12 + t*16 + 12, table.length);
	});

	// [4e] write the font header and table directory
	write (fdw, fileHeaderBuf, 0, 12 + newTableDirectory.length*16, 0);


	// [5] close file
	if (node) {
		font.config.fs.closeSync(fdw);
	}


	// [6] reporting
	const timerEnd = new Date();
	instance.timer = timerEnd-timerStart;
	instance.size = position;
	//console.log (`Instantiation time: ${instance.timer} ms`);
	//console.log (`New instance file: ${instance.filename} (${position} bytes)`);

}


// TODO:
// - make sure SamsaVF_compileBinaryForInstance works well for frontend
// - then we can delete this function
function makeStaticFont (font, instance) // use the current settings in font.axes
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
	var buffer = new ArrayBuffer(font.config.glyf.maxSize);
	var glyfTable = new DataView(buffer);

	// TODO: Consider storing an arrays of instantiated glyph objects in the instance object. They take up lots of space, so must be optional.
	let iglyph;

	for (let g=0; g < font.numGlyphs; g++) {

		// in a memory-efficient mode, we parse the glyph and tvt here, then discard them

		console.log("Processing glyph " + g);
		let glyph = font.glyphs[g];
		let tvts = font.glyphs[g].tvts;
		let options = {iup: true, ignoreDeltas: false, getCoeffs: true};

  		if (tvts.length > 0 && glyph.numContours > 0)
  		{
			iglyph = glyphApplyVariations (glyph, instance.tuple); // instance.tuple is already normalized
			iglyph.newLsb = 0;
			newfont.glyphs[g] = iglyph;

			let xMin=0,xMax=0,yMin=0,yMax=0; // these seem wrong!
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
			glyfTable.setUint16(p, instructionLength), p+=2;
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
			if (font.config.glyf.overlapSimple)
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
	var fBuffer = new ArrayBuffer(font.config.sfnt.maxSize);
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

					// TODO: check if hhea.numberOfHMetrics needs to be updated

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
				const nameBuf = new ArrayBuffer(font.config.name.maxSize);
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
	instance.timer = timerEnd-timerStart;

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


function SamsaVF_parseTvts(g) {

	// must work for memory and file models

	// if file, load tvt into memory, then use normal functions

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

	//if (g >= 2)
	//	return tvts;

	//console.log ("========================================");
	//console.log ("g="+g);
	//console.log (`numContours: ${font.glyphs[g].numContours}`);

	// composite?
	if (font.glyphs[g].numContours == -1) {
		//console.log("COMPOSITE SO QUIT");

		// TODO: These need to be created with fake points for the components, then 4 phantom points
		return tvts;
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

	//console.log("-----------------");
	//console.log ("Parsing tvts #" + g);
	//console.log (data);

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
		//console.log ("tupleCount: " + tupleCount, "offset: " + offsetToSerializedData);
		let sharedPointIds = [];
		let sharedTupleNumPoints = 0;

		// set up data pointer ps
		let ps = tvtsStart + offsetToSerializedData;


		// [[ 1b ]] get shared points - this is the first part of the serialized data (ps points to it)
		//console.log(data);
		if (tuplesSharePointNums) {

			//console.log ("====================\nGETTING sharedPointIds\n====================")
			let impliedAllPoints = false;
			//console.log("ps should be 16, but is " + (ps-tvtsStart));


			let tupleNumPoints = data.getUint8(ps); ps++;
			if (tupleNumPoints & 0x80)
				tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
			else
				tupleNumPoints &= 0x7F;

			
			//let tupleNumPoints = data.getUint16(ps); ps+=2;
			//console.log ("tupleNumPoints====" + tupleNumPoints.toString(16));
			if (tupleNumPoints == 0) { // allPoints: would be better to use the allPoints flag in the tuple
				impliedAllPoints = true;
				tupleNumPoints = font.glyphs[g].numPoints + 4; // we don't bother storing their IDs
			}
			else {
				var pointNum = 0;
				var pc = 0;
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
				//console.log("sharedPointIds: " +sharedPointIds);
			}
			sharedTupleNumPoints = tupleNumPoints; // this sharedTupleNumPoints is tested later on (this case would have been better represented directly in the tuple as an all points tuple)
		}

		// [[ 2 ]] get each tvt
		// get the tvt
		for (var t=0; t < tupleCount; t++) {

			//console.log(`------`);
			//console.log(`TUPLE ${t}`);
			let tupleSize, tupleIndex, tupleIntermediate, tuplePrivatePointNumbers, tupleNumPoints, impliedAllPoints;
			//var tuple = {};
			let tvt = {
				peak: [],
				start: [],
				end: [],
				deltas: [],
			};

			// [[ 2a ]] get TupleVariationHeader
			tupleSize = data.getUint16(p), p+=2;
			tupleIndex = data.getUint16(p), p+=2;
			//console.log ("tupleSize, tupleIndex: ", tupleSize, tupleIndex)
			tupleEmbedded = (tupleIndex & 0x8000) ? true : false; // TODO: get rid of these true/false things
			tupleIntermediate = (tupleIndex & 0x4000) ? true : false;
			tuplePrivatePointNumbers = (tupleIndex & 0x2000) ? true : false;
			tupleIndex &= 0x0fff;
			//console.log ("tupleSize, tupleIndex: ", tupleSize, tupleIndex)

			let a, c;
			let savedP = p;

			//console.log (`p:${p}  ps:${ps}`);

			// [[ 2b ]] get tvt peaks, starts, ends that define the subset of design space
			// populate peak, start and end arrays for this tvt
			if (tupleEmbedded) {
				for (a=0; a<font.axisCount; a++) {
					tvt.peak[a] = data.getF2DOT14(savedP+a*2);
				}
			}
			else {
				tvt.peak = font.sharedTuples[tupleIndex];
			}

			if (tupleIntermediate) {
				for (a=0; a<font.axisCount; a++) {
					tvt.start[a] = data.getF2DOT14(savedP + font.axisCount*2 + a*4);
					tvt.end[a] = data.getF2DOT14(savedP + font.axisCount*2 + a*4+2);
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



			// console.log("+++++++++++++++++++++++++++++++++++");
			// console.log("@g="+g+",ps="+ps);
			// console.log(tvt);

			tupleNumPoints = 0;

			// TODO: should be a test for whether private point nums!!!!!!!!!!!!!
			if (!tuplePrivatePointNumbers) {
				// populate pointIds from sharedpointdata for this tuple
				// console.log ("tuplePrivatePointNumbers OFF (so sharing)");

				//get the points from the sharedpointdata for this tuple
				pointIds = sharedPointIds;
				// console.log(pointIds);

				// MUCH BETTER!???
				//tupleNumPoints = sharedPointIds.length;
				tupleNumPoints = sharedTupleNumPoints; // we could use sharedPointIds.length BUT sharedPointIds is empty (IBMPlexVariable) when the shared record is also an all points record
			}
			else {
				// get the packed point number data for this tuple
				//console.log ("tuplePrivatePointNumbers ON");
				tupleNumPoints = data.getUint8(ps), ps++; // 0x00
				if (tupleNumPoints & 0x80)
					tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
				else
					tupleNumPoints &= 0x7F;
				//console.log ("Expecting " + tupleNumPoints + " points!")

				if (tupleNumPoints == 0) {

					//console.log ("We have an 'all points' situation");
					impliedAllPoints = true;
					tupleNumPoints = font.glyphs[g].numPoints + 4; // remember that 0 meant "all points" - we just don't bother storing their IDs

					//console.log ("tupleNumPoints (all): " + tupleNumPoints)
					//pointIds = font.glyphs[g].points.keys(); // experimental, perhaps better handled as an exception to the loop that assings the tvt deltas
					//console.log("YO?");
				}
				else {
					var pointNum = 0;
					var pc = 0;
					impliedAllPoints = false;

					//console.log("NEVER?");
					//console.log("tupleNumPoints: " + tupleNumPoints)

					//console.log ("pointCount = " + tuple.pointCount);
					while (pc < tupleNumPoints)
					{
						runLength = data.getUint8(ps), ps++;
						let pointsAreWords = (runLength & 0x80) ? true : false;
						runLength = (runLength & 0x7f) +1; // 0x7f = the low 7 bits
						for (let r=0; r < runLength; r++)
						{

							if (pc + r > tupleNumPoints)
									break;

							/*
							if (ps >= font.tables['gvar'].offset + font.tables['gvar'].length)
							{
								alert ("OBARD at glyph #" + g + ", nextOffset = " + nextOffset);
								console.log ("OBARD", tuple, ps, g);
							}
							*/

							let pointData;
							if (pointsAreWords)
								pointData = data.getUint16(ps), ps+=2; // TODO: THIS IS GOING WRONG!!!!!!
							else
								pointData = data.getUint8(ps), ps++;

							// console.log ("pointData:",pointData);
							pointNum += pointData;
							
							// console.log(`P ${pointNum}`);
							pointIds.push(pointNum); // TODO: THIS IS BAD!!!!!!!!!!!!!!!!!!!! typically gives values of 32768, 34179

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

					// console.log(`pointIds:${pointIds}`);
				}
			}

/* TODO: check that this spec clause is observed
"Since the values in the packed data are all unsigned, point numbers will be given in increasing order. Since the packed representation can include zero values, it is possible for a given point number to be repeated in the derived point number list. In that case, there will be multiple delta values in the deltas data associated with that point number. All of these deltas must be applied cumulatively to the given point."
*/

			// DELTAS
			// get the packed delta values for this tuple
			var unpacked = [];


			// console.log("looking for " + tupleNumPoints + " tuple points")
			


			let tp=0;

			// the all points' situation results in tupleNumPoints = font.glyphs[g].numPoints + 4

			// console.log (`p:${p}  ps:${ps} [a]`);
			while (unpacked.length < tupleNumPoints * 2) // TODO: replace with a for loop
			//for (tp=0; tp < tupleNumPoints; )
			{
				// console.log(`upl:${unpacked.length}`);
				runLength = data.getUint8(ps), ps++;
				const bytesPerNum = (runLength & 0x80) ? 0 : (runLength & 0x40) ? 2 : 1;
				runLength = (runLength & 0x3f) +1;
				// console.log(`At ps=${ps}, run-length=${runLength} ${runLength & 0x40 ? "w" : "b"}`);



				// if (tp!=unpacked.length)
				// 	console.log (`PROBLEM: tp:${tp}, unpacked.length:${unpacked.length}`);
				// else
				// 	console.log("good", runLength);

				let r;
				switch (bytesPerNum)
				{
					case 0: /*console.log(`@${ps} BPN-0 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(0); break;
					case 1: /*console.log(`@${ps} BPN-1 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(data.getInt8(ps)), ps++; break;
					case 2: /*console.log(`@${ps} BPN-2 *${runLength}`);*/ for (r=0; r < runLength; r++) unpacked.push(data.getInt16(ps)), ps+=2; break;
				}

				tp+=runLength;

				/*
				if (ps - (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) > nextOffset)
					console.log ("BAD: g=" + g + ", ps=" + ps + ",start=" + (font.tables['gvar'].offset + table.offsetToData + offset + gvd.offsetToSerializedData) + ", nextOffset="+nextOffset);
				*/
			}
			// console.log (`p:${p}  ps:${ps} [b] :`, unpacked) ;


			// if (tupleNumPoints * 2 == unpacked.length)
			// 	console.log("tupleNumPoints * 2 == unpacked.length (" + unpacked.length + ")");
			// else
			// 	console.log("bad unpacked.length: " + unpacked.length + " (should be " + (tupleNumPoints*2)  +  ")");

			// console.log(unpacked.join());

			// tvt method 2019-10-15
			//  - working nicely for fully populated delta arrays
			//  - working nicely for sparse delta arrays 
			//  - TODO: check it works when PRIVATE_POINT_NUMBERS is not set
			//  - TODO: check it works when impliedAllPoints is true
			// console.log("pointIds:" + pointIds); // if !PRIVATE_POINT_NUMBERS, what is the state of pointIds?

			if (impliedAllPoints) {
				// console.log("* impliedAllPoints: ", impliedAllPoints);
				// console.log(unpacked);
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
			// console.log(tvt);

			// add the tvt to the tvts array
			tvts.push(tvt);
		}
	}

	return tvts; // return the tvts array to be added to the glyph
}


function SamsaVF_parseGlyph (g) {

	// parse glyph g from the given font

	let font = this;
	let node = this.config.isNode;
	let data, p;
	let offset = font.glyphOffsets[g];
	let size = font.glyphSizes[g];
	let pt;
	let glyph = {
		font: font,
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
					glyph.points[pt].push(y_ = y, flags[pt] & 0x01);
				});
			}
		}
		
		// composite glyph
		else if (glyph.numContours < 0) {

			let flag;
			glyph.components = [];
			do  {
				let component = {};
				flag = data.getUint16(p), p+=2;
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

				}

				// record matched points
				else {
					if (flag & 0x0001) { // ARG_1_AND_2_ARE_WORDS
						component.matchedPoints = [data.getUint16(p), data.getUint16(p+2)], p+=4;
					}
					else {
						component.matchedPoints = [data.getUint8(p), data.getUint8(p+1)], p+=2;
					}
				}

				// transformation matrix (undefined means identity matrix [1, 0, 0, 1])
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
	// TODO: get height from vmtx table (if it exists)
	glyph.points.push([0,0], [font.widths[g], 0], [0,0], [0,0]);

	return glyph;

}


function SamsaVF_parseSmallTable (tag) {

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

	//console.log ("parsing table " + tag);


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
									// TODO: is this necessary?
							}

						}
				}

				// set up working name strings that might be taken from Windows (3) or Macintosh (1) strings
				// the Windows strings will overwrite the Mac strings, as nameRecords are sorted by platformID as well as nameID
				// TODO: treat 1,0 strings as MacRoman
				if (nameRecord.hasOwnProperty('string'))
					font.names[nameRecord.nameID] = str; // sparse array

				table.nameRecords.push(nameRecord);
				p = p_; // restore pointer ready for the next nameRecord
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
			// - flag named instances with namedInstance=true
			font.instances = [];
			for (let i=0; i<table.instanceCount+1; i++) // +1 allows for default instance
			{
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
						instance.tuple[a] = axis.default;
					else
						instance.tuple[a] = data.getInt32(p)/65536, p+=4;
					instance.fvs[axis.tag] = instance.tuple[a];
					instance.tuple[a] = font.axisNormalize(axis, instance.tuple[a]);
				});

				if (i==0) {
					instance.name = "Default";
					instance.default = true;
					instance.namedInstance = false;
				}
				else {
					if (table.instanceSize == table.axisCount * 4 + 6)
						instance.postScriptNameID = data.getUint16(p), p+=2;
					instance.name = font.names[instance.subfamilyNameID]; // name table must already be parsed!
					instance.namedInstance = true;
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
			for (let a=0; a<font.axisCount; a++) {
				font.avar[a] = [];
				let positionMapCount = data.getUint16(p); p+=2;
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

	}
	
	font.tables[tag].data = table;

}


function SamsaVF_parse () {

	//console.log ("parsing");
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
	// this works 2019-10-18!!!
	if (node) {
		data = Buffer.alloc(12);
		read (fd, data, 0, 12, 0);
	}
	font.fingerprint = data.getUint32(0);
	switch (font.fingerprint) {
		case 0x00010000: // normal TrueType
		case 0x74727565: // 'true' (as in Skia.ttf)
		case 0x4f54544f: // 'OTTO' (as in OpenType OTF fonts)
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
	// - avar must precede fvar
	["maxp", "hhea", "head", "hmtx", "OS/2", "name", "avar", "fvar", "gvar", "loca"].forEach(tag => {

		if (font.tables[tag])
			font.parseSmallTable(tag);

	});
	
	// parse glyf table: all glyphs!
	if (!node) {

		for (let g=0; g < font.numGlyphs; g++) {
			font.glyphs[g] = font.parseGlyph(g); // glyf data
			font.glyphs[g].tvts = font.parseTvts(g); // gvar data

			// delete glyph if this is a big file, to save memory
			// font.glyphs[g] = undefined;
		}
	}
	// glyf end

	//console.log ("Parsed all glyphs!!")


	// record parsed timestamp
	font.dateParsed = new Date();
	font.callback(font);
}


/*
function SamsaVF_load (url) {

	let oReq = new XMLHttpRequest();
	oReq.open("GET", url, true);
	oReq.responseType = "arraybuffer";
	oReq.SamsaVF = this;
	oReq.onload = function(oEvent) {

		this.SamsaVF.data = new DataView(this.response);
		this.SamsaVF.parse();

	};
	oReq.send();
}
*/

// TODO make SamsaVFInstance a propoer object
function SamsaVFInstance (init) {


}


// TODO: make SamsaVFGlyph a propoer object
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


function SamsaVF (init, config) {

	// initialize config, and update it with updates passed to constructor
	this.config = CONFIG;
	if (config) {
		Object.keys(config).forEach(k => this.config[k] = config[k] );
	}

	// general properties
	this.dateCreated = new Date();

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

	// methods defined externally (TODO: bring them all inside the SamsaVF init function)
	this.parse = SamsaVF_parse;
	this.parseGlyph = SamsaVF_parseGlyph;
	this.parseTvts = SamsaVF_parseTvts;
	this.parseSmallTable = SamsaVF_parseSmallTable;
	this.compileBinaryForInstance = SamsaVF_compileBinaryForInstance;

	// methods defined internally

	//////////////////////////////////
	//  load()
	//////////////////////////////////
	this.load = function (url) {

		if (this.config.isNode) {
			//console.log (__dirname);
			//console.log ("IN FONT LOAD", this.inFile);
			if (this.fd = config.fs.openSync (this.inFile, "r")) {
				this.stat = config.fs.fstatSync(this.fd);
				this.filesize = this.stat.size;
				this.date = this.stat.birthtime;
			}
			this.parse();
		}

		else if (this.url) {
			let oReq = new XMLHttpRequest();
			oReq.open("GET", url, true);
			oReq.responseType = "arraybuffer";
			oReq.SamsaVF = this;
			oReq.onload = function(oEvent) {

				//this.data = new DataView(this.response);
				//this.parse();
				oReq.SamsaVF.data = new DataView(this.response);
				oReq.SamsaVF.filesize = oReq.SamsaVF.data.byteLength;
				oReq.SamsaVF.parse();

			};
			oReq.send();
		}

	}

	//////////////////////////////////
	//  getNamedInstances()
	//////////////////////////////////
	this.getNamedInstances = function () {
		let namedInstances = [];
		this.instances.forEach(instance => {
			if (instance.namedInstance)
				namedInstances.push(instance);
		});
		return namedInstances;
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
			namedInstance: false, // it’s a custom instance, so not "named" (in the OpenType spec sense)
			static: null, // on instantiation, will contain binary data

			// it’s quite possible we’d like to keep the instance binary in memory as well as know where the file is
			binaryBuffer: null, // on instantiation, will contain binary data (replaces static) ?
			binaryFile: null, // on instantiation, will contain a filename (replaces static) ?
		};


		console.log ("here is new instance" , instance)

		// assign options
		//  - possibly we can add an instance pointing to a pre-existing binary in memory or file
		if (typeof options == "object") {
			Object.keys(options).forEach(k => {
				instance[k] = options[k];
			});
		}

		this.axes.forEach((axis,a) => {
			if (fvs[axis.tag] !== undefined) {
				instance.fvs[axis.tag] = 1.0 * fvs[axis.tag];
			}
			else {
				instance.fvs[axis.tag] = axis.default;
			}
			instance.tuple[a] = this.axisNormalize(axis, instance.fvs[axis.tag]);
		});
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
		console.log ("Making static instance for ", this, instance);


		instance.static = makeStaticFont(this, instance);


		console.log ("Finished making static instance for ", this, instance);
		console.log ("Here it is");
		console.log (instance.static);
	}




	//////////////////////////////////
	//  axisNormalize(axis, t)
	//////////////////////////////////
	this.axisNormalize = (axis, t) => {

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
		}


		if (t == axis.default)
			n = 0;
		else if (t > axis.default)
			if (t > axis.max)
				n = 1;
			else
				n = axis.max==axis.default? 0 : (t-axis.default)/(axis.max-axis.default);
		else
			if (t < axis.min)
				n = -1;
			else
				n = axis.min==axis.default? 0 : (axis.default-t)/(axis.min-axis.default);

		// modify t according to the avar for this axis
		// - see https://docs.microsoft.com/en-us/typography/opentype/spec/avar
		if (this.avar && this.avar[axis.id]) {
			//console.log("Processing avar of length " + this.avar.length);
			let map = this.avar[axis.id];
			for (let m=0; m<map.length; m++) {

				if (map[m][0] >= n) {
					if (map[m][0] == n) {
						n = map[m][1];
					}
					else {
						n = map[m-1][1] + (map[m][1] - map[m-1][1]) * ( ( n - map[m-1][0] ) / ( map[m][0] - map[m-1][0] ) )
					}
				}
			}
		}

		return n;
	}


	// Convert from F2DOT14 internal values (-1.0 to +1.0) into user axis values
	// TODO: include avar
	this.axisDenormalize = (axis, t) => {


	}


	// load data if not already loaded
	if (!this.data && this.url) {
		//console.log ("loading");
		this.load(this.url);
	}


	if (init.arrayBuffer) {

		console.log ("arraybuffer method!")
		this.data = new DataView(this.arrayBuffer);
		this.parse();
	}
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


function instanceApplyVariations (font, instance) {
	console.log(font);
	console.log(instance);

	for (let g=0; g<font.numGlyphs; g++) {
		if (font.glyphs[g].numContours > 0) {
			instance.glyphs[g] = glyphApplyVariations (font.glyphs[g], instance.tuple);
		}
	}
}


function glyphApplyVariations (glyph, userTuple) {

	let config = glyph.font.config;

	let newGlyph = {
		instance: true,
		points: [],
		touched: [],
		numContours: glyph.numContours,
		endPts: glyph.endPts,
		numPoints: glyph.numPoints,
		xMin: undefined,
		yMin: undefined,
		xMax: undefined,
		yMax: undefined,
		advanceWidth: 0,
		flags: glyph.flags, // do we need this?
	};

	// make a duplicate of the default glyph
	glyph.points.forEach(function (point, p) {
		newGlyph.points[p] = [point[0], point[1], point[2]];
	});

	// go through each tuple variation table for this glyph
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
		});

		// now we can move the points by S * delta
		if (S != 0) {

			tvt.deltas.forEach((delta, pt) => {
				if (delta !== null) {
					newGlyph.touched[pt] = touched[pt] = true; // touched[] is just for this tvt; newGlyph.touched[] is for all tvts (in case we want to show in UI)
					scaledDeltas[pt] = [S * delta[0], S * delta[1]];
				}
			});

			// IUP
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

							// now we have a good precPt and follPt, do IUP for x, then for y
							// https://www.microsoft.com/typography/otspec/gvar.htm#IDUP
							[0,1].forEach(function (xy) {
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
			newGlyph.points.forEach(function (point, p) {
				point[0] += Math.round(scaledDeltas[p][0]);
				point[1] += Math.round(scaledDeltas[p][1]);
			});
		} // if (S != 0)
	}); // end of processing the tvts

	// new extremes
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
		};
	}

	return newGlyph;
}



function SamsaInstance () {

	this.fvs = {};
	this.tuple = [];

}


// exports for node.js
if (CONFIG.isNode) {
	module.exports = {
		SamsaVF: SamsaVF,
		//SamsaFont: SamsaFont,
		//SamsaGlyph: SamsaGlyph,
		makeStaticFont: makeStaticFont,
		SamsaVF_compileBinaryForInstance: SamsaVF_compileBinaryForInstance, // better to work on an instance
	};
}
