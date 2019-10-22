// samsa-server.js

/* 

/Users/lorp/Documents/variablefonts/fonts/arphic/2017-11-02/JingXiHei-VF_65535.ttf 


Algorithm:

Check file is sfnt
Seek and find number of tables
Load font header
Load head, maxp, hhea, fvar etc.
Load cmap


Load glyph by glyph
- glyf
- gvar
- hmtx?
- vmtx?

Temp file for glyf & loca export
Temp file for hmtx/vmtx export?

Demo by having an option "process on server"

Don’t load LSB if they’re all the same as xMin (via flag?)

64kb * AW = 128kB


Load table header



*/

// global config
const config = {
	isNode: (typeof module !== 'undefined' && module.exports) ? true : false,
	axisSettings: [],

	//infilePath: "fonts/JingXiHei-VF_65535.ttf",
	//infilePath: "fonts/Gingham.ttf",


	outfilePath: "samsa-out.ttf",

	//SERVER: "localhost",
	SERVER: "www.axis-praxis.org",
	MAX_TABLES: 100,
	OVERLAP_FLAG_APPLE: false,
	MAX_SIZE_FONT: 10000000,
	MAX_SIZE_GLYF_TABLE: 10000000,
	MAX_SIZE_NAME_TABLE: 50000,
	//HUGE_FONT: true,
	HUGE_FONT: false,
	OUTPUT_TABLES_TO_SKIP: ['gvar','fvar','cvar','avar','STAT','MVAR','HVAR'],
};


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
	//console.log ("he")
	//console.log (this);
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


let DataView, pathToPyftsubset;
if (config.SERVER == "localhost")
{
	DataView = require("/Users/lorp/Sites/node/node-buffer-dataview-master/dataview.js");
	config.PATH_TO_PYFTSUBSET = '/usr/local/bin/pyftsubset';
}
else
{
	DataView = require("/home/lorp/node/node-buffer-dataview-master/dataview.js");
	config.PATH_TO_PYFTSUBSET = '/home/lorp/lorp.org/env/bin/pyftsubset';
}



// import modules
let http = require('http');
let fs = require('fs');
let exec = require('child_process').exec;

if (config.SERVER == "localhost") {
	let samsa = require("/Users/lorp/Sites/node/samsa-core.js");
}
else {
	let samsa = require("/home/lorp/axis-praxis.org/samsa/samsa-core.js");
}

config.fs = fs;


//console.log (config);

// validate command line arguments
//console.log (process.argv);
let i, inputfile="";
if (((i = process.argv.indexOf("--input-font")) > 1) && process.argv[i+1] !== undefined)
	config.infilePath = process.argv[i+1];
if (((i = process.argv.indexOf("--output-font")) > 1) && process.argv[i+1] !== undefined)
	config.outfilePath = process.argv[i+1];
if ((i = process.argv.indexOf("--variation-settings")) > 1)
{
	let processedArgs = false;
	i++;
	while (!processedArgs)
	{
		if (process.argv[i] === undefined || process.argv[i].substr(0,2) == "--" || 
			process.argv[i+1] === undefined || process.argv[i+1].substr(0,2) == "--")
			processedArgs = true;
		else
		{
			config.axisSettings.push({
				tag: process.argv[i],
				value: parseFloat(process.argv[i+1])
			});
			i+=2;
		}
	}
}

/*
console.log("newFont is type" + (typeof samsa.newFont));
console.log("makeStaticFont is type" + (typeof samsa.makeStaticFont));
console.log("testFunc" + (typeof samsa.testFunc));
*/

/*
let testVal = samsa.testFunc();
console.log ("testFunc() return value: " + testVal);
*/

//var string = require('string');
//let font = {errors: [], tables: {}};
//let p;






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



/*
Buffer.prototype.getUint32 = function (pos) { return bufHeader.readUInt32BE(pos); }
Buffer.prototype.getInt32 = function (pos) { return bufHeader.readInt32BE(pos); }
Buffer.prototype.getUint16 = function (pos) { return bufHeader.readUInt16(pos); }
Buffer.prototype.getInt16 = function (pos) { return bufHeader.readInt16BE(pos); }
*/




// read mini-header to check it’s a font and get number of tables
// START OF MAIN PROGRAM

console.log('-----------------------------------------------');
console.log('Axis-Praxis samsa-server.js running...');

const startTime = new Date();


let f = new samsa.Font({	
	config: config,
	type: "file",
	filePath: config.infilePath,
});
//console.log (f);

console.log ("Is this Node?", config.isNode);



// open font
/*
const infile = fs.openSync (config.infilePath, "r");
font.stat = fs.fstatSync(infile);
const outfile = fs.openSync (config.outfilePath, "w");
*/

/*
// file copy test
font.buf = Buffer.alloc(font.stat.blksize);
let bytesRead = font.stat.blksize;
while (bytesRead == font.stat.blksize)
{
	bytesRead = fs.readSync (infile, font.buf, 0, font.stat.blksize, false);
	fs.writeSync (outfile, font.buf, 0, bytesRead, false);
}
fs.closeSync(outfile);
*/


// load and initialize small font
/*
console.log('----- small font -----');
let newBuf = fs.readFileSync (config.infilePath);
console.log (font);

samsa.testFunc();

let staticFontBuf = samsa.makeStaticFont (font, config);

console.log ("Here is static font");
console.log (staticFontBuf);
*/

// finish up
const endTime = new Date();
//console.log (font);
console.log ((endTime-startTime)+"ms");

