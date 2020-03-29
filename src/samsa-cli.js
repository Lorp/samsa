#!/usr/local/bin/node

// samsa-cli.js




// global config
let config = {
	/*
	isNode: (typeof module !== 'undefined' && module.exports) ? true : false,
	*/
	path: "/Users/lorp/Sites/samsa",

};


// mappings from DataView methods to Buffer methods
// TODO?: move these to samsa-core.js
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


// import modules
// TODO?: move these to samsa-core.js
module.paths.push(config.path);
let fs = require('fs');
let samsa = require("samsa-core.js");

config.fs = fs;


let init = {
	fontFamily: "Gingham",
	url: "http://localhost/samsa/fonts/Gingham.ttf",
	callback: vfLoaded,
};

// command line args
// TODO?: move this to samsa-core.js
let i;
let fvs = {};
let dumpNamedInstances = false;
let customInstance = false;
if (((i = process.argv.indexOf("--input-font")) > 1) && process.argv[i+1] !== undefined) {
	init.inFile = process.argv[i+1];
	if (init.inFile.charAt[0] != "/")
		init.inFile = __dirname + "/" + init.inFile; // add current directory (__dirname is provided by node)

console.log(init.inFile);

}
if (((i = process.argv.indexOf("--output-font")) > 1) && process.argv[i+1] !== undefined)
	init.outFile = process.argv[i+1];
if ((i = process.argv.indexOf("--variation-settings")) > 1) {
	let processedArgs = false;
	i++;
	while (!processedArgs) {
		if (process.argv[i] === undefined || process.argv[i].substr(0,2) == "--" || 
			process.argv[i+1] === undefined || process.argv[i+1].substr(0,2) == "--") {
			processedArgs = true;
		}
		else {
			fvs[process.argv[i]] = parseFloat(process.argv[i+1]);
			i+=2;
		}
	}
	customInstance = true;
}

if ((i = process.argv.indexOf("--named-instances")) > 1)
	dumpNamedInstances = true;



if (customInstance || dumpNamedInstances) {
	// initialize vf
	let vf = new samsa.SamsaVF(init, config);
}
else
	console.log (`
Samsa-CLI, a utility for generating static fonts from variable fonts, based on the Samsa-Core JavaScript library.

Documentation:
  https://github.com/Lorp/samsa/tree/master/docs

Examples:
  node samsa-cli.js --input-font Gingham.ttf --variation-settings wght 634 wdth 5 --output-font GinghamCustom.ttf
  node samsa-cli.js --input-font Skia.ttf --named-instances
`);




function vfLoaded (font) {
	
	//console.log ("Samsa Font loaded");

	console.log(`Loaded font file and parsed small tables: ${font.dateParsed - font.dateCreated} ms`);
	
	if (customInstance) {
		customInstance = font.addInstance(fvs);
		samsa.SamsaVF_compileBinaryForInstance(font, customInstance);
			console.log (`New instance: ${customInstance.filename} (${font.numGlyphs} glyphs, ${customInstance.size} bytes, ${customInstance.timer} ms`);
	}

	// get named instances
	// TODO: this really needs an optimized mode in samsa-core.js to avoid decompiling the VF each time
	// - you'd load the glyph once, then spin out all the glyphs
	// - a temporary glyph file for each instance is one method
	// - another method: make it possible to create multiple instances at once from within SamsaVF_compileBinaryForInstance, so the instance parameter is optionally an array of instances
	if (dumpNamedInstances) {

		let instances = font.getNamedInstances();

		// make a custom instance
		// generate the binary for each instance and save to file

		// console.log(`Found ${instances.length} instances`);

		instances.forEach((instance, i) => {

			instance.filename = "instance-" + i + ".ttf";

			samsa.SamsaVF_compileBinaryForInstance(font, instance);

			//samsa.makeStaticFont (font, instance);

			console.log (`New instance: ${instance.filename} (${font.numGlyphs} glyphs, ${instance.size} bytes, ${instance.timer} ms`);

		});

	}

}



function getStringFromData (data, p0, length)
{
	var str = "";
	var p = p0;
	while (p - p0 < length) {
		str += String.fromCharCode(data.getUint8(p++));	
	}
	return str;
}

