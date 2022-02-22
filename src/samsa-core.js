/*

samsa-core.js

Minification:
- https://www.npmjs.com/package/uglify-es
- uglifyjs samsa-core.js > samsa-core.min.js

*/


// TODO:
// - rename it SamsaCONFIG
// - pass the actual config object along with the font
let CONFIG = {

	isNode: (typeof module !== 'undefined' && module.exports),
	outFileDefault: "samsa-out.ttf",

	instantiation: {
		skipTables: ["gvar","fvar","cvar","avar","STAT","MVAR","HVAR","VVAR","DSIG"],
		ignoreIUP: false,
	},

	defaultGlyph: [
		"A", "a", "Alpha", "alpha", "afii10017", "A-cy", "afii10065", "a-cy", "zero", // PostScript names: Latin, Russian, Cyrillic (or should we use the cmap? because some fonts lack ps names)
	],

	sfnt: {
		maxNumTables: 100,
		maxSize: 10000000, // does not apply in node mode (i.e. we can create fonts of unlimited size on the command line)
	},

	glyf: {
		overlapSimple: true,
		bufferSize: 500000, // max data to accumulate in binary glyf table before a write (ignored for in-memory instantiation)
		compression: true, // toggles glyf data compression for output; default to true to minimize TTF file size; if false we generate instances faster; Bahnschrift-ship.ttf (2-axis) produces instances of ~109kb compressed, ~140kb uncompressed (note that woff2 compression generates identical woff2 files from compressed/uncompressed glyf data)
	},

	name: {
		maxSize: 50000,
	},

	deltas: {
		round: true,
	},

	purgeGlyphs: false, // release memory for glyphs when possible, but slower when doing multiple things with the font (only use for very large fonts)

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
	Buffer.prototype.getTag = function (p, length=4) {
		let tag = "";
		let p_end = p + length;
		while (p < p_end) {
			let ch = this.readUInt8(p++);
			if (ch >= 32 && ch < 126) // valid chars in tag data type https://www.microsoft.com/typography/otspec/otff.htm
				tag += String.fromCharCode(ch);	
		}
		return tag.length == length ? tag : false;
	}

	Buffer.prototype.getF2DOT14 = function (p) {
		return this.getInt16(p) / 16384.0; // signed
	}
}


function getStringFromData (data, p0, length)
{
	// TODO: add a Pascal and C modes to use in parsing "post" table (use length = undefined for C, -1 for Pascal)
	let str = "";
	let p = p0;
	while (p - p0 < length) {
		str += String.fromCharCode(data.getUint8(p++));	
	}
	return str;
}

// TODO: get rid of this!
function uint8ToBase64(buffer) {
	let binary = '';
	let len = buffer.byteLength;
	for (let i=0; i < len; i++) {
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


function SamsaGlyph (init) {

	this.id = init.id;
	this.name = init.name;
	this.font = init.font;
	this.numPoints = init.numPoints || 0;
	this.numContours = init.numPoints || 0; // -1 is the flag for composite
	this.instructionLength = 0;
	this.points = init.points || [];
	this.components = init.components || [];
	this.endPts = init.endPts || [];
	this.tvts = init.tvts || [];
	this.curveOrder = init.curveOrder || (this.font ? this.font.curveOrder : undefined);

}

// SamsaGlyph methods are methods of SamsaGlyph.prototype, so that we don’t create a copy when we make each SamsaGlyph

// decompose()
// - decompose a composite glyph into a new simple glyph
SamsaGlyph.prototype.decompose = function (tuple, params) {

	let simpleGlyph = new SamsaGlyph( {
		id: this.id,
		name: this.name,
		font: this.font,
		curveOrder: this.curveOrder,
		decompositionForGlyph: this,
	} );

	let iglyph = (tuple) ? this.instantiate(tuple) : this;

	let offset, transform, flags;
	if (params) {
		offset = params.offset;
		transform = params.transform;
		flags = params.flags;
	}

	// simple case
	if (this.numContours >= 0) {

		if (!params && !tuple) // optimization for case when there’s no offset and no transform (we can make this return "this" itself: the decomposition of a simple glyph is itself)
			return this;

		// add the points (ignore phantom points)
		for (let pt=0; pt<iglyph.numPoints; pt++) {

			// spec: https://docs.microsoft.com/en-us/typography/opentype/spec/glyf

			let point = [ iglyph.points[pt][0], iglyph.points[pt][1], iglyph.points[pt][2] ];

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
		for (endPt of this.endPts) {
			simpleGlyph.endPts.push(endPt + simpleGlyph.numPoints);
		}
		simpleGlyph.numPoints += iglyph.numPoints;
		simpleGlyph.numContours += iglyph.numContours;
	}

	else {
		// step thru components, adding points to simpleGlyph
		iglyph.components.forEach((component, c) => {

			const gc = this.font.glyphs[component.glyphId],
				  gci = gc.instantiate(tuple),
				  matched = component.matchedPoints;

			let newTransform = component.transform;
			let newOffset = [ iglyph.points[c][0], iglyph.points[c][1] ];
			if (offset) {
				newOffset[0] += offset[0];
				newOffset[1] += offset[1];
			}

			// decompse!
			// - this is the recursive step
			let decomp = gc.decompose(tuple, {
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
			for (endPt of decomp.endPts) {
				simpleGlyph.endPts.push(endPt + simpleGlyph.numPoints);
			}
			simpleGlyph.numPoints += decomp.numPoints;
			simpleGlyph.numContours += decomp.numContours;
		});
	}


	// add the 4 phantom points
	simpleGlyph.points.push([0,0,0], [iglyph.points[iglyph.points.length-3][0],0,0], [0,0,0], [0,0,0]);

	// return the simple glyph
	return simpleGlyph;

}


// instantiate()
// - take a default glyph and return the instantiated glyph produced applying the userTuple or instance settings
SamsaGlyph.prototype.instantiate = function (userTuple, instance, extra) {

	// create newGlyph, a new glyph object which is the supplied glyph with the variations applied, as specified in instance (or if blank, userTuple)
	// - TODO: can we move away from using userTuple and always require an instance?

	// generate the glyph (e.g. if it’s needed by a composite)
	if (this === undefined) {
		console.log ("Samsaglyph.instantiate(): glyph is undefined");
	}

	const config = this.font.config;
	const font = this.font;
	let newGlyph = new SamsaGlyph({id:this.id, name:this.name, font:this.font});

	newGlyph.default = this;
	newGlyph.instance = instance; // this is still safe for tests that check for (!glyph.instance)
	newGlyph.type = "instance";
	newGlyph.points = [];
	newGlyph.touched = [];
	newGlyph.curveOrder = this.curveOrder;
	newGlyph.numContours = this.numContours;
	newGlyph.components = this.components;
	newGlyph.endPts = this.endPts;
	newGlyph.numPoints = this.numPoints;
	newGlyph.xMin = this.xMin;
	newGlyph.yMin = this.yMin;
	newGlyph.xMax = this.xMax;
	newGlyph.yMax = this.yMax;
	newGlyph.flags = this.flags; // do we need this?

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
		userTuple = font.fvsToTuple(userTuple); // userTuple was an fvs type object, but we transform it into a tuple array
	}

	// newGlyph starts off as a duplicate of the default glyph (at least, all of its points)
	let p=this.points.length;
	while (--p >= 0) {
		const point = this.points[p];
		newGlyph.points[p] = [point[0], point[1], point[2]];
	}

	// go through each tuple variation table for this glyph
	newGlyph.sValues = [];
	this.tvts.forEach((tvt, t) => {

		let S = 1, scaledDeltas = [], touched = [];
		let pt = this.points.length;
		while (--pt >= 0) {
			scaledDeltas[pt] = [0,0];
		}

		// go thru each axis, multiply a scalar S from individual scalars AS
		// - if the current designspace location is outside of this tvt’s tuple, we get S = 0 and nothing is done
		// - based on pseudocode from https://www.microsoft.com/typography/otspec/otvaroverview.htm
		for (let a=0; a<font.axes.length; a++) {
			const ua = userTuple[a], peak = tvt.peak[a], start = tvt.start[a], end = tvt.end[a];

			/*
			let AS;
			if (start > peak || peak > end)
				AS = 1;
			else if (start < 0 && end > 0 && peak != 0)
				AS = 1;
			else if (peak == 0)
				AS = 1;
			else if (ua < start || ua > end) {
				S = 0;
				break; // we have a zero so set S=0 and quit
			}
			else {
				if (ua == peak)
				AS = 1;
			else if (ua < peak)
				AS = (ua - start) / (peak - start);
			else
				AS = (end - ua) / (end - peak);
			}
			S *= AS;
			*/

			// validity checks noted in the pseudocode are now performed while parsing
			if (peak != 0) {
				
				if (ua < start || ua > end) {
					S = 0;
					break; // zero scalar, which makes S=0, therefore quit loop
				}
				else if (ua < peak)
					S *= (ua - start) / (peak - start);
				else if (ua > peak)
					S *= (end - ua) / (end - peak);
				//else if (ua == peak)
					// nothing to do because this is S*=1
			}
		}

		// now we can move the points by S * delta
		// OPTIMIZE: it must be possible to optimize for the S==1 case, but attempts reduce speed...
		if (S != 0) {

			pt = this.points.length;
			while (--pt >= 0) {
				const delta = tvt.deltas[pt];
				if (delta !== null) {
					newGlyph.touched[pt] = touched[pt] = true; // touched[] is just for this tvt; newGlyph.touched[] is for all tvts (in case we want to show in UI) 
					// btw, we don’t need to store touched array for composite or non-printing glyphs - probably a negligible optimization
					scaledDeltas[pt] = [S * delta[0], S * delta[1]];
				}
			}

			// IUP
			// - TODO: ignore this step for composites (even though it is safe because numContours<0)
			// - OPTIMIZE: calculate IUP deltas when parsing, then a "deltas" variable can point either to the original deltas array or to a new scaled deltas array (hmm, rounding will be a bit different if IUP scaled deltas are always based on the 100% deltas)
			if (tvt.iup && this.numContours > 0 && touched.length > 0 && !config.instantiation.ignoreIUP) { // it would be nice to check "touched.length < glyph.points.length" but that won’t work with sparse arrays, and must also think about phantom points

				// for each contour
				for (let c=0, startPt=0; c<this.numContours; c++) {
				
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
								follPt = (follPt-startPt+1)%numPointsInContour+startPt;
							} while (!touched[follPt]) // found the follPt

							// perform IUP for x(0), then for y(1)
							for (let xy=0; xy<=1; xy++) {

								// IUP spec: https://www.microsoft.com/typography/otspec/gvar.htm#IDUP
								const pA = this.points[precPt][xy];
								const pB = this.points[follPt][xy];
								const dA = scaledDeltas[precPt][xy];
								const dB = scaledDeltas[follPt][xy];

								for (let q=pNext, D, T, Q; q!=follPt; q=(q-startPt+1)%numPointsInContour+startPt) {
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
			// TODO: Verify that we are rounding correctly. The spec implies we should maybe NOT round here, only at the end
			// - https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview
			pt = newGlyph.points.length;
			if (round) {
				while (--pt >= 0) {
					newGlyph.points[pt][0] += Math.round(scaledDeltas[pt][0]);
					newGlyph.points[pt][1] += Math.round(scaledDeltas[pt][1]);
				}
			}
			else {
				while (--pt >= 0) {
					newGlyph.points[pt][0] += scaledDeltas[pt][0];
					newGlyph.points[pt][1] += scaledDeltas[pt][1];
				}
			}
		} // if (S != 0)

		
		// store S and scaledDeltas so we can use them in visualization
		// - maybe we should recalculate multiple AS values and 1 S value in the GUI so we don’t add load to samsa-core
		if (config.visualization) {
			newGlyph.tvtsVisualization.push({
				S: S,
				scaledDeltas: scaledDeltas,
			});
		}

	}); // end of processing the tvts

	// new bbox extremes
	// - TODO: fix for composites and non-printing glyphs (even though the latter don’t record a bbox)
	newGlyph.recalculateBounds();
	
	return newGlyph;
}


// parseTvts()
// - parse the tuple variation tables (tvts), also known as "delta sets with their tuples" for this glyph
SamsaGlyph.prototype.parseTvts = function () {

	let font = this.font;
	if (font.axes.length == 0) // static font?
		return [];

	let node = font.config.isNode;
	let data, p;
	let offset = font.tupleOffsets[this.id];
	let size = font.tupleSizes[this.id];
	let tvts = [];
	let runLength;
	let fd, read, write;
	if (node) {
		fd = font.fd;
		read = font.config.fs.readSync;
		write = font.config.fs.writeSync;
	}

	// do we have data?
	if (size > 0) {

		// unpackPackedPointIds ()
		// - returns a new array of point ids (integers) expanded from the compressed representation
		// <data> is the memory to read from
		// <tupleNumPoints> is the number of points to be unpacked
		// - note that the <ps> variable in the enclosing function is in scope and updated
		// - <data> and <tupleNumPoints> are also already in scope, but let’s pass them as arguments
		function unpackPackedPointIds (data, tupleNumPoints) {

			let pointIds = [];
			let pointId = 0;
			let pc = 0; // point count
			while (pc < tupleNumPoints) {

				let runLength = data.getUint8(ps++), pointInc;
				let pointsAreWords = runLength & 0x80;
				runLength = (runLength & 0x7f) +1; // get the low 7 bits
				if (pc + runLength <= tupleNumPoints) {
					for (let r=0; r < runLength; r++) {
						if (pointsAreWords)
							pointInc = data.getUint16(ps), ps+=2;
						else
							pointInc = data.getUint8(ps), ps++;
						pointId += pointInc;
						pointIds.push(pointId);
					}
				}
				pc += runLength;
			}
			return pointIds;
		}

		// [[ 0 ]] set up data and pointers
		if (node) {
			data = Buffer.alloc(size);
			read (fd, data, 0, size, font.tables['gvar'].offset + font.tables['gvar'].data.offsetToData + offset);
			p = 0;
		}
		else {
			data = font.data;
			p = font.tables['gvar'].offset + font.tables['gvar'].data.offsetToData + offset;
		}
		let tvtsStart = p;

		// [[ 1 ]] get tvts header
		let tupleCount, tuplesSharePointNums, offsetToSerializedData;
		tupleCount = data.getUint16(p), p+=2;
		tuplesSharePointNums = (tupleCount & 0x8000) ? true : false; // doesn't happen in Skia
		tupleCount &= 0x0FFF;
		offsetToSerializedData = data.getUint16(p), p+=2;
		let sharedPointIds = [];
		let sharedTupleNumPoints = 0;
		let ps = tvtsStart + offsetToSerializedData; // set up data pointer ps

		// [[ 2 ]] get shared points - this is the first part of the serialized data (ps points to it)
		if (tuplesSharePointNums) {

			let impliedAllPoints = false;
			let tupleNumPoints = data.getUint8(ps); ps++;
			if (tupleNumPoints & 0x80)
				tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
			else
				tupleNumPoints &= 0x7F;

			if (tupleNumPoints == 0) { // allPoints: would be better to use the allPoints flag in the tuple
				impliedAllPoints = true;
				tupleNumPoints = this.points.length; // we don't bother storing their IDs
			}
			else {
				sharedPointIds = unpackPackedPointIds(data, tupleNumPoints); // updates ps variable
			}
			sharedTupleNumPoints = tupleNumPoints; // this sharedTupleNumPoints is tested later on (this case would have been better represented directly in the tuple as an all points tuple)
		}

		// [[ 3 ]] get each tvt
		for (let t=0; t < tupleCount; t++) {

			let a, tupleSize, tupleIndex, tupleIntermediate, tuplePrivatePointNumbers, tupleNumPoints, impliedAllPoints;
			let tvt = {
				peak: [],
				start: [],
				end: [],
				iup: true, // will override to false (the optimized value) if this is an "all points" tvt
				deltas: [],
			};

			// [[ 3a ]] get TupleVariationHeader
			tupleSize = data.getUint16(p), p+=2;
			tupleIndex = data.getUint16(p), p+=2;
			tupleEmbedded = tupleIndex & 0x8000;
			tupleIntermediate = tupleIndex & 0x4000;
			tuplePrivatePointNumbers = tupleIndex & 0x2000;
			tupleIndex &= 0x0fff;

			// [[ 3b ]] get tvt peaks, starts, ends that define the subset of design space
			// get peaks
			if (tupleEmbedded) {
				for (a=0; a<font.axisCount; a++) {
					tvt.peak[a] = data.getF2DOT14(p), p+=2;
				}
			}
			else {
				tvt.peak = font.sharedTuples[tupleIndex];
			}

			// get starts and ends
			if (tupleIntermediate) { // for intermediates, the peak may still be embedded
				for (a=0; a<font.axisCount; a++) {

					// get start and end values for this region
					tvt.start[a] = data.getF2DOT14(p + a*2);
					tvt.end[a]   = data.getF2DOT14(p + a*2 + font.axisCount*2);

					// if region is invalid, force a null region
					if ((tvt.start[a] > tvt.end[a]) || (tvt.start[a] < 0 && tvt.end[a] > 0))
						tvt.start[a] = tvt.end[a] = tvt.peak[a] = 0;
				}
				p += font.axisCount*4;
			}
			else {
				// infer starts and ends from peaks
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

			// [[ 3c ]] get the packed point ids for this tuple
			// - ps is the pointer inside the serialized data
			let pointIds = [];
			tupleNumPoints = 0;

			if (tuplePrivatePointNumbers) {
				// get the private packed pointIds for this tuple
				tupleNumPoints = data.getUint8(ps), ps++; // 0x00
				if (tupleNumPoints & 0x80)
					tupleNumPoints = 0x100 * (tupleNumPoints & 0x7F) + data.getUint8(ps), ps++;
				else
					tupleNumPoints &= 0x7F;

				if (tupleNumPoints == 0) { // 0 means "all points", in which case this tuple doesn’t store pointIds
					impliedAllPoints = true;
					tvt.iup = false;
					tupleNumPoints = this.points.length;
				}
				else {
					impliedAllPoints = false;
					pointIds = unpackPackedPointIds(data, tupleNumPoints); // updates ps variable
				}
			}			
			else {
				// get the points from the sharedpointdata for this tuple
				pointIds = sharedPointIds;
				tupleNumPoints = sharedTupleNumPoints; // we could use sharedPointIds.length BUT sharedPointIds is empty (IBMPlexVariable) when the shared record is also an all points record
			}		

			// [[ 3d ]] unpack the deltas
			// - get the packed delta values for this tuple
			// - remember "all points" means tupleNumPoints = font.glyphs[g].numPoints + 4
			let unpacked = [], r;
			while (unpacked.length < tupleNumPoints * 2) // TODO: replace with a for loop
			{
				runLength = data.getUint8(ps), ps++;
				const bytesPerNum = (runLength & 0x80) ? 0 : (runLength & 0x40) ? 2 : 1;
				runLength = (runLength & 0x3f) +1;
				switch (bytesPerNum) {
					case 0: for (r=0; r < runLength; r++) unpacked.push(0); break;
					case 1: for (r=0; r < runLength; r++) unpacked.push(data.getInt8(ps)), ps++; break;
					case 2: for (r=0; r < runLength; r++) unpacked.push(data.getInt16(ps)), ps+=2; break;
				}
			}

			if (impliedAllPoints) {
				for (let pt=0; pt < this.points.length; pt++) {
					tvt.deltas[pt] = [unpacked[pt], unpacked[pt + tupleNumPoints]];
				}
			}
			else {
				for (let pt=0, pc=0; pt < this.points.length; pt++) {
					if (pt < pointIds[pc] || pc >= tupleNumPoints) {
						tvt.deltas[pt] = null; // these points will be moved by IUP
					}
					else {
						tvt.deltas[pt] = [unpacked[pc], unpacked[pc + tupleNumPoints]]; // these points will be moved explicitly
						pc++;
					}
				}
			}

			// [3e] add the tvt to the tvts array
			tvts.push(tvt);
		}
	}

	// [[ 4 ]] all’s well, we’re done
	this.tvts = tvts;
	return tvts.length;
}


// recalculateBounds()
// - recalculate the bounding box for this simple glyph
SamsaGlyph.prototype.recalculateBounds = function () {

	if (this.numContours < 0) {
		return false;
	}
	else if (this.numContours == 0) {
		this.xMin = 0;
		this.yMin = 0;
		this.xMax = 0;
		this.yMax = 0;
	}
	else {
		let xMin = 32767, yMin = 32767, xMax = -32768, yMax = -32768;
		for (let pt=0; pt<this.numPoints; pt++) { // exclude the phantom points
			let point = this.points[pt];
			if (xMin > point[0])
				xMin = point[0];
			else if (xMax < point[0])
				xMax = point[0];
			if (yMin > point[1])
				yMin = point[1];
			else if (yMax < point[1])
				yMax = point[1];
		}
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;
	}
	return this.numPoints;
}


// maxCompiledSize()
// - return the maximum size in bytes that this glyph compiles to
// - assumes no compression is possible
// - use it to allocate memory for a compiled glyph
SamsaGlyph.prototype.maxCompiledSize = function () {

	if (this.numContours > 0)
		return (5*2) + this.numContours*2 + 2 + this.instructionLength + this.numPoints * (2+2+1);
	else if (this.numContours < 0)
		return (5*2) + (4+4)*2 * this.components.length + 2 + this.instructionLength;
	else
		return 0;

}


// compile()
// - compile a SamsaGlyph object into compact binary TrueType data
// - buf: DataView onto an ArrayBuffer OR Node buffer (this is the only required argument)
// - startOffset: position within buf to start writing
// - metrics: array in which 4 metrics values will be stored
// - compress: whether to use glyf table compression (RLE for flags, flags for point positions); avoiding compression is faster
// - returns the size of the compiled glyph in bytes (unpadded)
SamsaGlyph.prototype.compile = function (buf, startOffset=0, metrics, compress=true) {

	const font = this.font;
	const points = this.points;
	const numPoints = this.numPoints;
	let p = startOffset;

	// 1. SIMPLE glyph
	if (this.numContours > 0) {

		let xMin,xMax,yMin,yMax;
		let pt;
		let instructionLength = 0;

		// calculate bbox
		// - we always have >0 points in a simple glyph
		if (points && points[0]) {
			[xMin,yMin] = [xMax,yMax] = points[0];
			for (pt=1; pt<numPoints; pt++) {
				const P = points[pt][0], Q = points[pt][1];
				if (P<xMin) xMin=P;
				else if (P>xMax) xMax=P;
				if (Q<yMin) yMin=Q;
				else if (Q>yMax) yMax=Q;
			}
			xMin = Math.round(xMin);
			yMin = Math.round(yMin);
			xMax = Math.round(xMax);
			yMax = Math.round(yMax);
		}

		// new bbox
		buf.setInt16(p, this.numContours), p+=2;
		buf.setInt16(p, xMin), p+=2;
		buf.setInt16(p, yMin), p+=2;
		buf.setInt16(p, xMax), p+=2;
		buf.setInt16(p, yMax), p+=2;

		// endpoints
		for (let e=0; e<this.numContours; e++)
			buf.setUint16(p, this.endPts[e]), p+=2;

		// instructions (none for now)
		buf.setUint16(p, instructionLength), p+=2;
		p += instructionLength;

		// write glyph points
		let X, Y, f, dx=[], dy=[], flags=[], cx=0, cy=0;
		if (compress) {

			// write compressed glyph points (slower)
			for (pt=0; pt<numPoints; pt++) {
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
			}

			// overlap signal for Apple
			if (font.config.glyf.overlapSimple)
				flags[0] |= 0x40;

			// write flags with RLE
			let rpt = 0;
			for (pt=0; pt<numPoints; pt++) {
				if (pt > 0 && rpt < 255 && flags[pt] == flags[pt-1]) {
					rpt++;
				}
				else {
					rpt = 0;
				}

				if (rpt<2) {
					buf.setUint8(p, flags[pt]), p++; // write without compression (don’t compress 2 consecutive identical bytes)
				}
				else {
					if (rpt==2)
						buf.setUint8(p-2, flags[pt] | 0x08); // set repeat bit on the pre-previous flag byte
					buf.setUint8(p-1, rpt); // write the number of repeats
				}
			}

			// write point coordinates
			// TODO: slightly faster to work in terms of flags with a switch on 3 values? (probably not)
			for (pt=0; pt<numPoints; pt++) {
				if (dx[pt] == 0)
					continue;
				if (dx[pt] >= -255 && dx[pt] <= 255)
					buf.setUint8(p, (dx[pt]>0) ? dx[pt] : -dx[pt]), p++;
				else
					buf.setInt16(p, dx[pt]), p+=2;
			}
			for (pt=0; pt<numPoints; pt++) {
				if (dy[pt] == 0)
					continue;
				if (dy[pt] >= -255 && dy[pt] <= 255)
					buf.setUint8(p, (dy[pt]>0) ? dy[pt] : -dy[pt]), p++;
				else
					buf.setInt16(p, dy[pt]), p+=2;
			}
		}

		else { // compress != true

			// write uncompressed glyph points (faster in memory and for SSD disks)
			const xOffset = p + numPoints;
			const yOffset = xOffset + 2 * numPoints;
			let cx=0, cy=0;

			// write everything in one loop
			for (pt=0; pt<numPoints; pt++) {

				const x = points[pt][0], y = points[pt][1];
				buf.setUint8(p+pt, points[pt][2]); // write 1 byte for flag
				buf.setInt16(xOffset + 2*pt, x - cx); // write 2 bytes for dx
				buf.setInt16(yOffset + 2*pt, y - cy); // write 2 bytes for dy
				cx = x;
				cy = y;
			}

			// overlap signal for Apple
			if (font.config.glyf.overlapSimple)
				buf.setUint8(p, points[0][2] | 0x40);

			// update the pointer
			p = yOffset + 2 * numPoints;

		}
	} // simple glyph end

	// 2. COMPOSITE glyph
	else if (this.numContours < 0) {

		// glyph header
		// TODO: recalculate composite bbox (tricky in general, not bad for simple translations)
		buf.setInt16(p, -1), p+=2;
		buf.setInt16(p, this.xMin), p+=2;
		buf.setInt16(p, this.yMin), p+=2;
		buf.setInt16(p, this.xMax), p+=2;
		buf.setInt16(p, this.yMax), p+=2;

		// components
		for (let c=0; c<this.components.length; c++) {
			let component = this.components[c];

			// set up the flags
			let flags = 0;
			flags |= 0x0001; // ARG_1_AND_2_ARE_WORDS (could compress the component a tiny bit if we cared about this)
			flags |= 0x0002; // ARGS_ARE_XY_VALUES
			if (c < this.components.length-1)
				flags |= 0x0020; // MORE_COMPONENTS
			if (component.flags & 0x0200)
				flags |= 0x0200; // USE_MY_METRICS (copy from the original glyph)
			// flag 0x0100 WE_HAVE_INSTRUCTIONS is set to zero

			// TODO: handle matched points method (ARGS_ARE_XY_VALUES == 0)
			// TODO: handle transforms

			// write this component
			buf.setUint16(p, flags), p+=2;
			buf.setUint16(p, component.glyphId), p+=2;
			buf.setInt16(p, points[c][0]), p+=2;
			buf.setInt16(p, points[c][1]), p+=2;								
		}
	} // composite glyph end

	// store metrics (for simple, composite and empty glyphs)
	if (metrics) {
		metrics[0] = points[numPoints+0][0]; // lsb point, usually 0
		metrics[1] = points[numPoints+1][0]; // advance point
		metrics[2] = points[numPoints+2][1]; // top metric, usually 0 in horizontal glyphs
		metrics[3] = points[numPoints+3][1]; // bottom metric, usually 0 in horizontal glyphs
	}

	return p - startOffset; // size of binary glyph in bytes
}


// featureVariationsGlyphId(tuple)
// - return a new glyphId for this glyph at the designspace location <tuple> according to FeatureVariations data
// - main function is in SamsaFont, so that, given a glyphId, we don’t need to create a SamsaGlyph in order to find FeatureVariations 
SamsaGlyph.prototype.featureVariationsGlyphId = function (tuple) {

	return this.font.featureVariationsGlyphId(this.id, tuple);

}


// svgPath()
// - export glyph as a string to be used in a SVG <path> "d" attribute
SamsaGlyph.prototype.svgPath = function () {

	let contours = [];
	let contour, contourLen, pt, pt_, pt__, c, p, startPt;
	let path = "";

	switch (this.curveOrder) {

		// quadratic curves
		case 2:

			// LOOP 1: convert the glyph contours into an SVG-compatible contours array
			startPt = 0;
			for (endPt of this.endPts) {
				contourLen = endPt-startPt+1; // number of points in this contour
				contour = [];

				// insert on-curve points between any two consecutive off-curve points
				for (p=startPt; p<=endPt; p++) {
					pt = this.points[p];
					pt_ = this.points[(p-startPt+1)%contourLen+startPt];
					contour.push (pt);
					if (pt[2] == 0 && pt_[2] == 0) // if we have 2 consecutive off-curve points...
						contour.push ( [ (pt[0]+pt_[0])/2, (pt[1]+pt_[1])/2, 1 ] ); // ...we insert the implied on-curve point
				}

				// ensure SVG contour starts with an on-curve point
				if (contour[0][2] == 0) // is first point off-curve?
					contour.unshift(contour.pop()); // OPTIMIZE: unshift is slow, so maybe build two arrays, "actual" and "toAppend", where "actual" starts with an on-curve

				// append this contour
				contours.push(contour);

				startPt = endPt+1;
			}

			// LOOP 2: convert contours array to an actual SVG path
			// - we’ve already fixed things in loop 1 so there are never consecutive off-curve points
			for (contour of contours) {
				for (p=0; p<contour.length; p++) {
					pt = contour[p];
					if (p==0)
						path += `M${pt[0]} ${pt[1]}`;
					else {
						if (pt[2] == 0) { // off-curve point (consumes 2 points)
							pt_ = contour[(++p) % contour.length]; // increments loop variable p
							path += `Q${pt[0]} ${pt[1]} ${pt_[0]} ${pt_[1]}`;
						}
						else // on-curve point
							path += `L${pt[0]} ${pt[1]}`;
					}
				}
				path += "Z";
			}

			break;

		// cubic curves
		// - EXPERIMENTAL!
		// - for use with ttf-cubic format and cff (when we implement cff)
		case 3:
			startPt = 0;

			// loop through each contour
			for (endPt of this.endPts) {

				let firstOnPt;
				contourLen = endPt-startPt+1;

				// find this contour’s first on-curve point: it is either startPt, startPt+1 or startPt+2 (else the contour is invalid)
				if      (contourLen >= 1 && this.points[startPt][2] == 1)
					firstOnPt = 0;
				else if (contourLen >= 2 && this.points[startPt+1][2] == 1)
					firstOnPt = 1;
				else if (contourLen >= 3 && this.points[startPt+2][2] == 1)
					firstOnPt = 2;

				if (firstOnPt !== undefined) {

					// loop through all this contour’s points
					for (p=0; p<contourLen; p++) {

						pt = this.points[startPt + (p+firstOnPt) % contourLen];
						if (p==0)
							path += `M${pt[0]} ${pt[1]}`;
						else {
							if (pt[2] == 0) { // off-curve point (consumes 3 points)
								pt_ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								pt__ = this.points[startPt + ((++p + firstOnPt) % contourLen)]; // increments loop variable p
								path += `C${pt[0]} ${pt[1]} ${pt_[0]} ${pt_[1]} ${pt__[0]} ${pt__[1]}`;
							}
							else // on-curve point
								path += `L${pt[0]} ${pt[1]}`;
							if (p == (contourLen+firstOnPt-1) % contourLen)
								path += "Z";
						}
					}
				}

				startPt = endPt+1;
			}
			break;
	}

	return path;
};


// svg()
// - export glyph as an SVG string, suitable for saving as a complete SVG file
// - style is an object (with all properties optional), such as:
//   {
//	   class: "letter simple",
//     fill: "orange",
//     stroke: "#fe55a0",
//     strokeWidth: 4,
//     transform: "translate(130,500) scale(0.5,-0.5)"
//	 }
// - note that with no transform, the glyph will be displayed upside-down
// - note that if the transform scale has a positive y transform, the glyph will be displayed upside-down
SamsaGlyph.prototype.svg = function (style={}) {
	let extra = (style.class ? ` class="${style.class}"` : "")
	          + (style.fill ? ` fill="${style.fill}"` : "")
	          + (style.stroke ? ` stroke="${style.stroke}"` : "")
	          + (style.strokeWidth ? ` stroke-width="${style.strokeWidth}"` : "");
	return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
	<g${style.transform ? ` transform="${style.transform}"` : ""}>
		<path d="${this.svgPath()}"${extra}></path>
	</g>
</svg>`;
}


// ttx()
// - export glyph as a string to be used as a complete XML <TTGlyph> within a TTX file
SamsaGlyph.prototype.ttx = function () {

	let ttx = `<TTGlyph name="${this.name}" xMin="${this.xMin}" yMin="${this.yMin}" xMax="${this.xMax}" yMax="${this.yMax}">\n`;
	let startPt = 0;
	
	for (let endPt of this.endPts) {
		ttx += `    <contour>\n`;
		for (let pt=startPt; pt <= endPt; pt++) {
			let point = this.points[pt];
			ttx += `        <pt x="${point[0]}" y="${point[1]}" on="${point[2]}"/>\n`;
		}
		ttx += `    </contour>\n`;
		startPt = endPt + 1;
	}

	ttx += `</TTGlyph>\n`;
	return ttx;
};


// json()
// - export glyph as a JSON string but without the circular references of the internal object
SamsaGlyph.prototype.json = function () {

	const replacer = ["id", "name", "curveOrder", "endPts", "numContours", "numComponents", "numPoints", "points", "components"];
	return JSON.stringify(this, replacer, 4);
};


// ufo()
// - export glyph as a string to be used as a complete XML <glyph> structure as a standalone .glif file
SamsaGlyph.prototype.ufo = function () {
	// - working for quadratic
	// - assumes that UFO is cool with any number of off-curve points between on-curves, which is not clear from the spec
	// - https://unifiedfontobject.org/versions/ufo3/glyphs/glif/
	// - TODO: composites???
	const curveType = this.curveOrder == 2 ? "qcurve" : "curve"; // qcurve for curveOrder 2, curve for curveOrder 3
	let glif = `<?xml version="1.0" encoding="UTF-8"?>\n`;
	glif += `<glyph name="${this.name}" format="2">\n`;
	glif += `  <advance width="${this.points[this.numPoints+1][0]}"/>\n`;
	glif += `  <outline>\n`;
	let startPt = 0;
	for (let endPt of this.endPts) {
		glif += `    <contour>\n`;
		for (let pt=startPt; pt <= endPt; pt++) {
			let point = this.points[pt];
			let numContourPoints = endPt - startPt + 1;
			let ptInContour = pt - startPt;
			let prevPoint = this.points[startPt + (ptInContour-1+numContourPoints) % numContourPoints];
			let typeString = "";
			if (point[2] == 1) { // if point is on-curve
				typeString = ` type="${ prevPoint[2] == 1 ? "line" : curveType }"`; // decide if the current point is line or qcurve/curve
			}
			glif += `      <point x="${point[0]}" y="${point[1]}"${typeString}/>\n`;
		}
		glif += `    </contour>\n`;
		startPt = endPt + 1;
	}
	glif += `  </outline>\n`;
	glif += `</glyph>\n`;
	return glif;
};


function SamsaFont (init, config) {

	// initialize config, and update it with updates passed to constructor
	this.config = CONFIG;
	if (config) {
		Object.keys(config).forEach(k => this.config[k] = config[k] );
	}

	// high-level optimization to low-level
	if (this.config.optimize) {

		this.config.optimize = this.config.optimize.split(","); // convert string into array: "memory,size" => ["memory","size"]
		if (this.config.optimize.includes("speed")) {
			this.config.glyf.compression = false;
			this.config.purgeGlyphs = false;
		}
		if (this.config.optimize.includes("memory")) {			
			this.config.purgeGlyphs = true; // may override speed optimization
		}
		if (this.config.optimize.includes("size")) {
			this.config.glyf.compression = true; // may override speed optimization
		}
	}

	// general properties
	this.dateCreated = new Date();
	this.date = init.date;

	this.arrayBuffer = init.arrayBuffer;
	this.url = init.url; // for browser using a VF on a server
	this.callback = init.callback;
	this.data = undefined;
	this.fontFamily = init.fontFamily;
	this.names = init.names || [];
	this.axes = [];
	this.axisTagToId = {};
	this.instances = [{
		id: 0,
		font: this,
		name: "Default",
		type: "default",
		glyphs: [],
		tuple: [],
		fvs: {},
		static: null,
	}];
	this.errors = [];
	this.glyphs = [];
	this.numGlyphs = 0;
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
	if (init.filename)
		this.filename = init.filename;
	else if (this.path)
		this.filename = this.path.substr(this.path.lastIndexOf("/")+1); // works nicely even when there are no slashes in the name because of the -1 return :)
	this.filesize = init.filesize;


	// SamsaFont methods

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

			// fetch font binary from a url
			// - works for http: and https: urls (including relative from the current file)
			// - works for data: urls
			// - note that in a browser frontend application, the font url normally needs to be on the same server as the application for same origin policy
			
			fetch(this.url)
			.then(response => {
				return response.arrayBuffer();
			})
			.then(arrayBuffer => {
			
				this.filesize = arrayBuffer.byteLength;
				this.data = new DataView(arrayBuffer);
				this.parse();
			});
		}
	}

	//////////////////////////////////
	//  parse()
	//////////////////////////////////
	this.parse = () => {

		let font = this;
		let data = this.data;
		let config = this.config;
		let node = this.config.isNode;
		let table; 
		let p=p_=0; // data pointers
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
				font.curveOrder = 2;
				break;
			case 0x4f54544f: // 'OTTO' (as in OpenType OTF fonts)
				font.flavor = "cff";
				font.curveOrder = 3;
				break;
			case 0x43554245: // 'CUBE' (for EXPERIMENTAL "ttf-cubic" fonts)
				font.flavor = "CUBE";
				font.curveOrder = 3;
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

				for (let t=0; t<font.numTables; t++) {
					const tag = data.getTag (p);
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
		["maxp", "hhea", "head", "hmtx", "OS/2", "post", "name", "avar", "fvar", "gvar", "STAT", "loca", "GSUB", "cmap"].forEach(tag => {

			if (font.tables[tag])
				font.parseSmallTable(tag);

		});

		// parse glyf table: all glyphs!
		if (!node) {

			for (let g=0; g < font.numGlyphs; g++) {
				font.glyphs[g] = font.parseGlyph(g); // glyf data
				font.glyphs[g].parseTvts(); // gvar data

				// delete glyph if this is a big file, to save memory
				// - which of these is better?
				// font.glyphs[g] = undefined;
				// delete font.glyphs[g]
			}
		}
		// glyf end

		// we parsed the font, get a timestamp
		font.dateParsed = new Date();

		// call the given callback function
		font.callback(font)
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
				break; // maxp end


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
				break; // hhea end


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
				break; // head end


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
				break; // hmtx end


			case "OS/2":

				if (font.tables[tag].length >= 78) {
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
					if (table.version >= 1 && font.tables[tag].length >= 86) {
						table.ulCodePageRange1 = data.getUint32(p), p+=4
						table.ulCodePageRange2 = data.getUint32(p), p+=4
						if (table.version >= 2 && font.tables[tag].length >= 96) {
							table.sxHeight = data.getInt16(p), p+=2
							table.sCapHeight = data.getInt16(p), p+=2
							table.usDefaultChar = data.getUint16(p), p+=2
							table.usBreakChar = data.getUint16(p), p+=2
							table.usMaxContext = data.getUint16(p), p+=2
							if (table.version >= 5 && font.tables[tag].length >= 100) {
								table.usLowerOpticalPointSize = data.getUint16(p), p+=2
								table.usUpperOpticalPointSize = data.getUint16(p), p+=2
							}
						}
					}
				}
				break; // OS/2 end


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
				break; // name end


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
				break; // post end
			

			case "loca":

				const indexToLocFormat = font.tables['head'].data.indexToLocFormat;
				font.glyphOffsets[0] = 0;
				for (let g=1; g <= font.numGlyphs; g++) {

					// long offsets or short offsets?
					if (indexToLocFormat)
						font.glyphOffsets[g] = data.getUint32(tableOffset + 4*g);
					else
						font.glyphOffsets[g] = 2 * data.getUint16(tableOffset + 2*g);

					font.glyphSizes[g-1] = font.glyphOffsets[g] - font.glyphOffsets[g-1];
				}
				break; // loca end


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
				// - font.axes == [] at this point
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
					font.axes.push(axis); // append this axis
					font.axisTagToId[axis.tag] = a;
				}

				// build instances
				// - instances array already contains the default instance
				// - here we add all the named instances
				for (let i=0; i<table.instanceCount+1; i++) { // +1 allows for default instance

					let instance;

					if (i==0)
						instance = font.instances[0];
					else {
						instance = {
							id: i+1, // +1 because default instance id 0 is already present
							glyphs: [],
							tuple:[],
							fvs: {},
							static: null, // if this is instantiated as a static font, this can point to the data or url
							subfamilyNameID: data.getUint16(p), // points into name table
							flags: data.getUint16(p+2), // no flags have been specified so far
						};
						p+=4;
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

					if (i>0) {
						if (table.instanceSize == table.axisCount * 4 + 6)
							instance.postScriptNameID = data.getUint16(p), p+=2;
						instance.name = font.names[instance.subfamilyNameID]; // name table must already be parsed! (TODO: fallback if no name table)
						instance.type = "named"; // one of default, named, stat, custom
						font.instances.push(instance);
					}
				}

				font.axisCount = table.axisCount;
				break; // fvar end


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
				break; // avar end


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
					for (let a=0; a<table.axisCount; a++)
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
				break; // gvar end


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
				break; // STAT end


			case "GSUB":

				if (font.tables['GSUB'])
				{
					table.majorVersion = data.getUint16(p), p+=2;
					table.minorVersion = data.getUint16(p), p+=2;
					if (table.majorVersion == 1 && table.minorVersion <= 1) {
						table.scriptListOffset = data.getUint16(p), p+=2;
						table.featureListOffset = data.getUint16(p), p+=2;
						table.lookupListOffset = data.getUint16(p), p+=2;
						if (table.minorVersion == 1)
							table.featureVariationsOffset = data.getUint32(p), p+=4;

						// features
						table.features = [];
						p = tableOffset + table.featureListOffset;
						table.featureCount = data.getUint16(p), p+=2;
						for (let f=0; f<table.featureCount && f < 100; f++, p+=6) {
							let feature = {
								tag: data.getTag(p),
								offset: data.getUint16(p+4),
								name: null,
							};
							let p_ = tableOffset + table.featureListOffset + feature.offset;
							if (feature.tag !== false) {
								feature.featureParams = data.getUint16(p_), p_+=2; // this is an offset, or 0 if there are none
								feature.lookupIndexCount = data.getUint16(p_), p_+=2;

								// get featureParams (i.e. nice name of this feature)
								if (feature.featureParams) {
									p_ = tableOffset + table.featureListOffset + feature.offset + feature.featureParams;
									feature.featureParamsVersion = data.getUint16(p_), p_+=2;
									feature.nameId = data.getUint16(p_), p_+=2;
									if (feature.nameId > 0)
										feature.name = font.names[feature.nameId];
								}

								// get featureParams (i.e. nice name of this feature)
								feature.lookupIds = [];
								if (feature.lookupIndexCount) {
									for (let lu=0; lu<feature.lookupIndexCount; lu++) {
										feature.lookupIds[lu] = data.getUint16(p_), p_+=2;
									}
								}
							}
							table.features[f] = feature;
						}

						// lookups: initialize
						table.lookups = [];
						p = tableOffset + table.lookupListOffset;
						table.lookupCount = data.getUint16(p), p+=2;

						for (let lu=0; lu<table.lookupCount; lu++) {

							let offset = data.getUint16(p); p+=2;
							let p_ = tableOffset + table.lookupListOffset + offset;
							let lookup = {
								offset: offset,
								lookupType: data.getUint16(p_),
								lookupFlag: data.getUint16(p_+2),
								subTableCount: data.getUint16(p_+4),
								subtableOffsets: [],
								markFilteringSet: undefined,
							}
							p_ += 6;

							for (let st=0; st<lookup.subTableCount; st++) {
								lookup.subtableOffsets[st] = data.getUint16(p_), p_+=2;
							}

							if (lookup.lookupFlag & 0x0010) { // useMarkFilteringSet
								lookup.markFilteringSet = data.getUint16(p_), p_+=2; // get markFilteringSet from GDEF using this id
							}
							table.lookups.push(lookup);
						}

						// lookups: process
						for (let lu=0; lu<table.lookupCount; lu++) {
							let lookup = table.lookups[lu];

							for (let st=0; st<lookup.subTableCount; st++) {

								p = tableOffset + table.lookupListOffset + lookup.offset + lookup.subtableOffsets[st];

								switch (lookup.lookupType) {

									// only format 1 are allowed in FeatureVariations
									case 1:
										lookup.substFormat = data.getUint16(p), p+=2;
										coverageOffset = data.getUint16(p), p+=2;
										if (lookup.substFormat == 1) {
											lookup.deltaGlyphId = data.getInt16(p), p+=2;
										}
										else if (lookup.substFormat==2) {
											lookup.glyphCount = data.getUint16(p), p+=2;
											lookup.substituteGlyphIds = [];
											for (let g=0; g<lookup.glyphCount; g++)
												lookup.substituteGlyphIds[g] = data.getUint16(p), p+=2;

										}

										// get lookup.coverage (an array of glyph ids) whether it is format 1 (simple) or format 2 (ranges)
										lookup.coverage = [];
										p = tableOffset + table.lookupListOffset + lookup.offset + lookup.subtableOffsets[st] + coverageOffset;
										const format = data.getUint16(p);
										p+=2;

										if (format == 1) {
											let glyphCount = data.getUint16(p); p+=2;
											for (let g=0; g<glyphCount; g++) {
												lookup.coverage[g] = data.getUint16(p), p+=2;
											}
										}
										else if (format == 2) {
											let rangeCount = data.getUint16(p);
											p+=2;
											for (let r=0; r<rangeCount; r++) {
												let start = data.getUint16(p), end = data.getUint16(p+2);
												p+=6; // startGlyphID, endGlyphID, coverageIndex (we didn’t use the last)
												for (let g=start; g<=end; g++) {
													lookup.coverage.push(g);
												}
											}
										}
										break;

									// others not yet handled
									default:

										break;

								}
							}
						}

						// FeatureVariations?
						if (table.featureVariationsOffset) {

							p = tableOffset + table.featureVariationsOffset;

							if (data.getUint16(p) == 1 && data.getUint16(p+2) == 0) { // check version
								table.featureVariationCount = data.getUint32(p+4);
								table.featureVariations = [];

								// for each feature variation record
								for (let fv=0; fv<table.featureVariationCount; fv++) {

									let featureVariation = {
										conditions: [],
										substitutions: [],
									};
									p = tableOffset + table.featureVariationsOffset + 8 + 8 * fv;
									let csOffset = data.getUint32(p); // conditionSetOffset
									let ftsOffset = data.getUint32(p+4); // featureTableSubstitutionOffset

									// get the condition set
									p = tableOffset + table.featureVariationsOffset + csOffset;
									let conditionCount = data.getUint16(p);
									p+=2;
									for (let cd=0; cd<conditionCount; cd++) {
										let p_ = tableOffset + table.featureVariationsOffset + csOffset + data.getUint32(p);
										let format = data.getUint16(p_);
										if (format == 1) { // only format=1 is defined
											featureVariation.conditions.push( [
												data.getUint16(p_+2), // axisIndex
												data.getF2DOT14(p_+4), // FilterRangeMinValue
												data.getF2DOT14(p_+6), // FilterRangeMaxValue
											] );
										}
										p+=4; // don’t get confused, this is p, not p_
									}

									// get the feature table substitutions
									p = tableOffset + table.featureVariationsOffset + ftsOffset;
									if (data.getUint16(p) == 1 && data.getUint16(p+2) == 0) { // check version
										p+=4;
										let subsCount = data.getUint16(p);
										p+=2;
										for (let su=0; su<subsCount; su++) {

											const featureIndex = data.getUint16(p);
											const offsetToFeatureTable = data.getUint32(p+2);
											p+=6; // increment pointer where we came from

											// now jump to the alternateFeatureTable that is sitting nearby
											let p_ = tableOffset + table.featureVariationsOffset + ftsOffset + offsetToFeatureTable; // alternateFeatureTable offset
											p_+=2; // skip over featureParams, always 0
											const lookupCount = data.getUint16(p_);
											p_+=2;
											let lookups = [];
											for (let lu=0; lu<lookupCount; lu++) {
												const lookupId = data.getUint16(p_ + 2*lu);
												lookups[lu] = table.lookups[lookupId]; // build lookupListIndices, actually build array of real lookups
											}

											// append this sub as an array
											featureVariation.substitutions.push( [featureIndex, lookups] );
										}
									}
									table.featureVariations[fv] = featureVariation;
								}
							}
						}

						font.tables['GSUB'].data = table;
						font.features = table.features;
						font.lookups = table.lookups;
						font.featureVariations = table.featureVariations;
					}
					else
						font.errors.push ("GSUB: Unknown version");
				}
				
				break; // GSUB end


			case "cmap":

				// cmap table spec: https://docs.microsoft.com/en-us/typography/opentype/spec/cmap
				// - parses formats 0, 4
				table.version = data.getUint16(p), p+=2;
				table.numTables = data.getUint16(p), p+=2;
				table.encodingRecords = [];
				table.cmap = []; // character id to glyph id
				table.segments = [];

				// TODO: do we need to decompress the table? How about methods to get the glyphId from the stored binary data?

				// step thru the encodingRecords
				for (let t=0; t < table.numTables; t++) {
					let encodingRecord = {
						platformID: data.getUint16(p),
						encodingID: data.getUint16(p+2),
						offset: data.getUint32(p+4),
					}
					table.encodingRecords.push(encodingRecord);
					p+=8;

					// do we choose one of the encodingRecords or do we merge the mappings of all of them?
					if (encodingRecord.platformID == 3 && encodingRecord.encodingID == 1) {
						encodingRecord.valid = true;
					}

					if (encodingRecord.valid) {

						let format, length, language;
						p = tableOffset + encodingRecord.offset;

						// parse the format, then switch to format-specific parser
						format = data.getUint16(p), p+=2;
						switch (format) {

							case 0:
								length = data.getUint16(p), p+=2;
								language = data.getUint16(p), p+=2;
								for (let c=0; c<256; c++) {
									table.cmap[c] = data.getUint8(p), p++;
								}
								break;

							case 4:
								length = data.getUint16(p), p+=2;
								language = data.getUint16(p), p+=2;
								const segCount = data.getUint16(p) / 2;
								p+=8;
								for (let s=0; s<segCount; s++) {

									// read this segment’s 4 values in parallel
									let segment = {
										start:         data.getUint16(p + segCount*2 + 2 + s*2),
										end:           data.getUint16(p +                  s*2),
										idDelta:       data.getUint16(p + segCount*4 + 2 + s*2),
										idRangeOffset: data.getUint16(p + segCount*6 + 2 + s*2),
									};

									// get glyphIds for all characters in this segment
									for (let g, c=segment.start; c<=segment.end; c++) {
										if (segment.idRangeOffset) {
											let offsetIntoGlyphIdArray =
												p + segCount*6 + 2 + s*2     // + &idRangeOffset[i]
												+ segment.idRangeOffset      // + idRangeOffset[i]/2
												+ (c - segment.start) * 2;   // + (c - startCode[i])
											g = data.getUint16(offsetIntoGlyphIdArray);
											if (g > 0)
												g += segment.idDelta;
										}
										else {
											g = c + segment.idDelta;
										}

										g %= 0x10000;
										table.cmap[c] = g; // this is the font‘s (sparse) cmap lookup array
									}

									// seems a nice idea to store the segment
									table.segments.push(segment);
								}

								break;

							default:
								console.log(`Error: Not handling cmap format ${format}`);
								break;
						}
					}
				}

				font.cmap = table.cmap;
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
		let glyph = new SamsaGlyph( {
			id: g,
			name: font.glyphNames[g],
			font: font,
			curveOrder: font.curveOrder,
		});
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

			let flag, repeat, x_=0, y_=0, x, y, c, r;

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
					flags.forEach((flag, pt) => {
						switch (flag & 0x12) { // x
							case 0x00: x = x_ + data.getInt16(p); p+=2; break;
							case 0x02: x = x_ - data.getUint8(p); p++; break;
							case 0x10: x = x_; break;
							case 0x12: x = x_ + data.getUint8(p); p++; break;
						}
						glyph.points[pt] = [x_ = x];
					});
					flags.forEach((flag, pt) => {
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
					else {
						if (flag & 0x0001) { // ARG_1_AND_2_ARE_WORDS
							component.matchedPoints = [data.getUint16(p), data.getUint16(p+2)], p+=4;
						}
						else {
							component.matchedPoints = [data.getUint8(p), data.getUint8(p+1)], p+=2;
						}
					}

					// transformation matrix
					// - if component.transform is undefined, it means identity matrix is [1, 0, 0, 1]
					if (flag & 0x0008) { // WE_HAVE_A_SCALE
						const scale = data.getF2DOT14(p); p+=2;
						component.transform = [scale, 0, 0, scale];
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
		glyph.points.push([0,0,0], [font.widths[g], 0, 0], [0,0,0], [0,0,0]);

		return glyph;
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
				//newTableDirectory.push(newTables[table.tag] = {	tag: table.tag } ); // add it to newTableDirectory (we’ll set length and offset later)
				newTables[table.tag] = { tag: table.tag }; // add it to newTableDirectory (we’ll set length and offset later)
		});

		// are there any new tables to be added? e.g. COLR, CPAL, CFF2
		if (font.addTables) {
			font.addTables.forEach(table => {
				newTables[table.tag] = table;
				if (table.tag == "CFF2") { // if we add a CFF2 table, we no longer want glyf or loca
					if (newTables["glyf"])
						delete newTables["glyf"];
					if (newTables["loca"])
						delete newTables["loca"];
				}
			});
		}

		// now we have our final set of tables we can create newTableDirectory
		Object.keys(newTables).forEach(tag => {
			newTableDirectory.push(newTables[tag]);
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
		newTableDirectory.sort((a,b) => a.offset - b.offset); // sort in the order of the original font’s table offsets (this step is non-critical)

		// [3] write tables (same offset order as source font)
		// - newTableDirectory is ordered by original offset and only contains tables we want for static output
		let locaBuf, hmtxBuf;
		let aws = [], lsbs = []; // metrics, calculated when we instantiate each glyph
		let newLocas = [0]; // if we write in ULONG format we can write this table before glyf if we want

		newTableDirectory.forEach ((table, t) => {

			// set the new offset
			table.offset = position;
			let originalTable = font.tables[table.tag] || newTables[table.tag];			
			let p; // the current data offset in glyfBuffer, where the binary glyph is being written in memory

			switch (table.tag) {

				case "glyf":

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

						// fetch/parse our glyph object
						// - we will release this glyph later, if CONFIG.purgeGlyphs
						let glyph;
						let metrics = [];

						if (font.glyphs[g]) {
							glyph = font.glyphs[g];
						}
						else {
							glyph = font.glyphs[g] = font.parseGlyph(g); // glyf data
							glyph.parseTvts(); // gvar delta sets, one glyph at a time (discarded after this iteration if CONFIG.purgeGlyphs is true)
						}

						// apply variations to the glyph
						// - same function for all glyphs: simple, composite, zero-contour
						let iglyph = glyph.instantiate(null, instance);

						// flush the buffer if we need to (only for non-empty glyphs)
						if (iglyph.numContours &&
							node && 
							(p + iglyph.maxCompiledSize() + glyfBufSafetyMargin) > font.config.glyf.bufferSize)
							glyfBuffer = flushGlyfBuffer(glyfBuffer); // assigns new glyfBuffer and p

						// COMPILE THIS GLYPH!
						p += iglyph.compile(glyfBuffer, p, metrics, CONFIG.glyf.compression); // write compiled glyph into glyfBuffer at position p, return its byte length
						aws[g] = metrics[1];
						lsbs[g] = iglyph.xMin || 0;

						// padding
						if (p%2)
							glyfBuffer.setUint8(p, 0), p++;

						// release memory explicitly
						if (node && CONFIG.purgeGlyphs) {
							font.glyphs[g].tvts = undefined;
							font.glyphs[g] = undefined;
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
					table.length = originalTable.length; // new length = old length


					// read table
					if (node) {
						if (table.buffer) {
							tableBuffer = table.buffer;
						}
						else {
							tableBuffer = new DataView(new ArrayBuffer(table.length));
							read (fd, tableBuffer, 0, table.length, originalTable.offset);
							// OPTIMIZE: don’t read these short tables again if we already read them when parsing
						}
					}
					else {
						tableBuffer = new DataView(fontBuffer.buffer, table.offset, table.length); // looks into new font
						sourceTableBuffer = table.buffer || new DataView(font.data.buffer, originalTable.offset, table.length); // looks into original font
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
		if (newTables["loca"]) {		
				newLocas.forEach((loca, g) => {
				locaBuf.setUint32(4*g, loca); // in frontend, this writes final loca values in place
			});
			if (node)
				write (fdw, locaBuf, 0, 4*(font.numGlyphs+1), newTables["loca"].offset);
		}

		// [4aa] write lsbs and aws if CFF2
		for (let g=0; g<font.numGlyphs; g++) {
			aws[g] = font.glyphs[g].points[font.glyphs[g].points.length-3][0];
			lsbs[g] = 0;
		}

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
		fileHeaderBuf.setUint32(0, newTables["CFF2"] ? 0x4f54544f : font.fingerprint); // "OTTO" if CFF2
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


		// [4f] Fix checksums
		/*

		TODO!

		*/


		// [5] reporting
		const timerEnd = new Date();
		instance.timer = timerEnd-timerStart;
		instance.size = position;


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
		// returns an array containing the axis indices for this axis tag
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


	//////////////////////////////////
	//  defaultGlyphId()
	//////////////////////////////////
	this.defaultGlyphId = () => {
		// returns the default glyph id for this font (normally "A")

		// use config.defaultGlyph array to find the first available representative glyph for this font
		for (let d=0; d < this.config.defaultGlyph.length; d++) {
			let g, name = this.config.defaultGlyph[d];
			if ((g = this.glyphNames.indexOf(name)) != -1) {
				return g; // inelegant but concise
			}
		}

		// we didn’t find any of the glyphs named in config.defaultGlyph, let’s use the first printable simple glyph
		// - IMPORTANT: numContours requires the glyphs to be loaded
		// - TODO: we probably shouldn't avoid returning a composite glyph, but we don't want to return a space glyph
		for (let g=0; g < this.numGlyphs; g++) {
			if (this.glyphs[g].numContours > 0 && g>0 && this.glyphNames[g] != ".notdef") {
				return g; // inelegant but concise
			}
		}

		// we tried to avoid .notdef and glyph 0, but here we are
		return 0;
	}


	// featureVariationsGlyphId(g, tuple)
	// - return a new glyphId for glyphId <g> at the designspace location <tuple> according to FeatureVariations data
	// - there’s also a function SamsaGlyph.featureVariationsGlyphId which calls this function
	// - return undefined if FeatureVariations has no effect at designspace location <tuple>
	// - return undefined if there is no FeatureVariations data
	this.featureVariationsGlyphId = (g, tuple) => {

		let newGlyphId;
		const font = this;

		// are there FeatureVariations in the font
		if (!font.featureVariations)
			return newGlyphId;

		// - spec:
		// - https://docs.microsoft.com/en-us/typography/opentype/spec/gsub (GSUB — Glyph Substitution Table)
		// - https://docs.microsoft.com/en-us/typography/opentype/spec/chapter2 (OpenType Layout Common Table Formats)

		// does the tuple satisfy all location conditions?
		for (let featureVariation of font.featureVariations) {
			const conds = featureVariation.conditions;

			let match = true;
			for (let co=0; co<conds.length && match; co++) {
				let cond = conds[co];
				// - cond[0] is axisIndex
				// - cond[1] is FilterRangeMinValue
				// - cond[2] is FilterRangeMaxValue
				if (tuple[cond[0]] < cond[1] || tuple[cond[0]] > cond[2])
					match = false;
			}

			// if tuple satisfied all location conditions
			if (match) {

				// check if we matched on glyphId (probably should be the other way around!)
				// - this treats all subsitution in featureVariation the same
				// - i.e. it does not care which feature tag (e.g. "rvrn", "rclt") triggers it
				for (let sub of featureVariation.substitutions) {

					let feature = font.features[sub[0]];
					let lookups = sub[1];

					for (let lu=0; lu<lookups.length; lu++) {

						const lookup = lookups[lu];
						const gIndex = lookup.coverage.indexOf(g);

						// success and exit loop
						if (gIndex !== -1) {
							if (lookup.substFormat == 1) // deltaGlyphId method
								newGlyphId = (g + lookup.deltaGlyphId + 0x10000) % 0x10000; // we + and % 65536 because (g+lookup.deltaGlyphId) can be negative
							else if (lookup.substFormat == 2) // substituteGlyphIds method
								newGlyphId = lookup.substituteGlyphIds[gIndex]; // TODO: maybe should return here, to break out of the font.featureVariations loop too
							break;
						}
					}
				}
			}
		}

		return newGlyphId;
	}


	// return the box implied by the condition set(s) for this glyph
	// - each conditionSet results in a n-dimensional box where n is the number of conditions
	// - in a single conditionSet, it only makes sense to have one condition per axis
	this.featureVariationsBoxes = g => {
		const font = this;
		let boxes = [];

		if (!font.featureVariations)
			return boxes;

		for (let featureVariation of font.featureVariations) {

			const conds = featureVariation.conditions;
			let newGlyphId;

			// check if we matched on glyphId (probably should be the other way around!)
			// - this treats all subsitution in featureVariation the same, so it does not care which feature tag (e.g. "rvrn", "rclt") triggers it
			for (let sub of featureVariation.substitutions) {

				let feature = font.features[sub[0]];
				let lookups = sub[1];

				for (let lu=0; lu<lookups.length; lu++) {

					const lookup = lookups[lu];
					const gIndex = lookup.coverage.indexOf(g);

					// success and exit loop
					if (gIndex !== -1) {
						if (lookup.substFormat == 1) // deltaGlyphId method
							newGlyphId = (g + lookup.deltaGlyphId + 0x10000) % 0x10000; // we + and % 65536 because (g+lookup.deltaGlyphId) can be negative
						else if (lookup.substFormat == 2) // substituteGlyphIds method
							newGlyphId = lookup.substituteGlyphIds[gIndex]; // TODO: maybe should return here, to break out of the font.featureVariations loop too
						break;
					}
				}
			}

			if (newGlyphId !== undefined) {

				let box = [];
				for (let co=0; co<conds.length; co++) {
					let cond = conds[co]; // each cond is [axisIndex, FilterRangeMinValue, FilterRangeMaxValue]
					box[cond[0]] = [cond[1], cond[2]]; // only define axes that are in the condition, the consumer must deal with the undefineds
				}
				boxes.push(box);
			}
		}

		return boxes;
	}


	// load data if not already loaded
	if (!this.data && (this.url || this.inFile)) {
		this.load(this.url || this.inFile);
	}

	if (init.arrayBuffer) {
		this.data = new DataView(this.arrayBuffer);
		this.parse();
	}

	// is this a new font? then call the callback now
	if (init && init.new && this.callback) {
		this.callback(this);
	}

}


function instanceApplyVariations (font, instance) {

	for (let g=0; g<font.numGlyphs; g++) {

		instance.glyphs[g] = font.glyphs[g].instantiate(null, instance);
		
	}
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
		SamsaGlyph: SamsaGlyph,
	};
}
