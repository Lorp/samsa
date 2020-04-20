#!/usr/local/bin/node

// samsa-cli.js




// global config
let config = {
	/*
	isNode: (typeof module !== 'undefined' && module.exports) ? true : false,
	*/
	path: ".",
};



// import modules
module.paths.push(config.path);
let fs = require('fs');
let samsa = require("samsa-core.js");
const cliTimeStart = new Date();

config.fs = fs;


let init = {
	callback: vfLoaded,
	outFile: "samsa-instance",
};


//let processedArgs = false;
let listOnly = false;
let quiet = false;
let thisArg, thisParam;
let allInstances = [];
let instanceDefs = [];
let i = 1;


while (!((thisArg = process.argv[++i]) === undefined)) {
	switch (thisArg) {
		case "--instances":
		case "--instance":
		case "-i":
			if (!((thisParam = process.argv[++i]) === undefined)) {
				instanceDefs = thisParam.split(";");
			}
			break;

		case "--list":
		case "-l":
			listOnly = true;
			break;

		case "--quiet":
		case "-q":
			quiet = true;
			break;

		case "--output":
		case "-o":
			if (!((thisParam = process.argv[++i]) === undefined)) {
				let lastDot = thisParam.lastIndexOf(".");
				if (lastDot == -1)
					init.outFile = thisParam; // no extension
				else
					init.outFile = thisParam.substr(0,lastDot); // remove extension
			}
			break;

		// an argument without a flag must be the font file
		default:
			init.inFile = process.argv[i];
			break;

	}

}

if (init.inFile) {

	let vf = new samsa.SamsaVF(init, config);

}
else {

	console.log (`
Samsa-CLI, a utility for generating static fonts from variable fonts, based on 
the Samsa-Core JavaScript library.

Documentation:

  https://github.com/Lorp/samsa/tree/master/docs

Arguments:

  --instances, --instance, -i <instanceDef[;instanceDef]>
  Introduces a list of instance definitions, separated with ";". Use quotes 
  to avoid space and semicolon being handled incorrectly by the shell. An
  instance definition may be:
    * A specific location in the font’s designspace, specifying axis tags then
      axis values (e.g. "wght 633 wdth 88 ital 1").
    * The special value "default", which generates the default instance.
    * The special value "named", which generates all named instances in the
      font.
    * The special value "stat", which generates all possible combinations of
      axis values specified by the STAT table. For example, if a STAT table
      records 5 axis values for 'wght' and 3 axis values for 'wdth', we get the
      15 (=5*3) possible combinations of instances. Note that this can lead to
      the generation of very many instances in some fonts. Any Format 4 STAT 
      values are also included.

  --output, -o
  Outfile filename, overrides "samsa-instance".

  --quiet, -q
  Quiet mode, no console output.

  --list, -l
  List instances, do not write any files.

Examples:

  Print out this short help info:
  % node samsa-cli.js

  Make static fonts for all named instances 
  % node samsa-cli.js Gingham.ttf --instances named

  Make static fonts for all named instances (switching to short -i syntax)
  % node samsa-cli.js Gingham.ttf -i named

  Make static fonts for all stat instances
  % node samsa-cli.js SourceSans.ttf -i stat

  Make a static font for the custom instance at wght 245, wdth 89
  % node samsa-cli.js Skia.ttf -i "wght 345 wdth 89"

  Make a static font for the default instance
  % node samsa-cli.js Skia.ttf -i default

  Make static fonts using multiple instance specifications separated with ";"
  % node samsa-cli.js Skia.ttf -i "named;stat;wght 345 wdth 89;wght 811 wdth 180;default"
`);

}


function vfLoaded (font) {
	
	let totalSize = 0;

	if (!quiet)
		console.log(`Loaded font file "${font.inFile}" (${font.numGlyphs} glyphs)\n  parsed small tables: ${font.dateParsed - font.dateCreated} ms`);

	// if no instanceDefs, print out some info from the font and return
	if (instanceDefs.length == 0) {
		let namedInstanceString = "";
		let axesString = "";
		let instances = font.getNamedInstances();

		// build string for namedInstances
		namedInstanceString += ` ${instances.length}`;
		instances.forEach((instance,i) => {
			namedInstanceString += `\n  ${instance.name} ${JSON.stringify(font.tupleToFvs(instance.tuple))}`;
		});

		// build string for axes
		axesString += ` ${font.axes.length}`;
		font.axes.forEach((axis,a) => {
			axesString += `\n  ${axis.tag} (${axis.name}) [${axis.min}..${axis.default}..${axis.max}]`;
		});

		console.log (`
fullName: ${font.names[4]}
familyName: ${font.names[1]} (nameID 1), ${font.names[16]} (nameID 16)
subfamilyName: ${font.names[2]} (nameID 2), ${font.names[17]} (nameID 17)
copyright: ${font.names[0]}
version: ${font.names[5]}
PostScript name: ${font.names[6]}
numGlyphs: ${font.numGlyphs}
axes:${axesString}
namedInstances:${namedInstanceString}
`);

		// exit, no instanceDefs specified
		return;
	}

	// assemble the list of supplied instance definitions, expanding "named" and "stat" values
	instanceDefs.forEach(instanceDef => {
		instanceDef = instanceDef.trim();
		let instances = [];
		let fvs = {}; // default
		switch (instanceDef) {

			// output all named instances
			case "named":
				instances = font.getNamedInstances();
				break;

			// output all instances that can be generated from STAT data
			case "stat":
				if (font.tables["STAT"]) {
					let avtsByAxis = [];
					let stat = font.tables["STAT"].data;
					let numInstances = 1;

					// build arrays of axisValue records for each axis
					for (let a=0; a<stat.designAxes.length; a++) {
						avtsByAxis[a] = [];
					}
					stat.axisValueTables.forEach(avt => {
						if (avt.format >= 1 && avt.format <= 3)
							avtsByAxis[avt.axisIndex].push(avt);
					});
					avtsByAxis.forEach(avts => {
						numInstances *= avts.length; // this could be zero, for poorly made STAT tables
					});

					// generate all STAT combinations (using modulo arithmetic, not recursion)
					for (let i=0; i<numInstances; i++) {
						let fvs = {};
						let divider = 1;
						let statNamesAVTs = [];
						stat.designAxesSorted.forEach(designAxis => {
							let avts = avtsByAxis[designAxis.designAxisID];
							let modulo = avtsByAxis[designAxis.designAxisID].length; // this is right, because designAxesSorted might not be sorted in fvar axis order
							let avt = avts[((i / divider) >> 0) % modulo]; // this gets us the combinatorial explosion
							statNamesAVTs.push(avt); // build STAT name
							fvs[designAxis.tag] = avt.value;
							divider *= avts.length;
						});

						// get final STAT name
						let statName, elidable = true, statNamesStrs = [];
						statNamesAVTs.forEach(statNameAVT => {
							if (!(statNameAVT.flags & 0x0002)) {
								statNamesStrs.push(font.names[statNameAVT.nameID]);
								elidable = false;
							}
						});
						if (elidable && stat.elidedFallbackNameID !== undefined)
							statName = font.names[stat.elidedFallbackNameID];
						else
							statName = statNamesStrs.join(" ");

						// append the instance
						instances.push(font.addInstance(fvs, {type: "stat", name: statName}));
						font.instances.pop();
					}

					// finally add instances pointed to by format 4 avts, which specify multiple axes
					stat.axisValueTables.forEach(avt => {
						let fvs = {};
						if (avt.format == 4) {
							avt.axisIndex.forEach(a => {
								fvs[stat.designAxes[a].tag] = avt.value[a];
							});
							instances.push(font.addInstance(fvs, {type: "stat"}));
							font.instances.pop();
						}
					});

				}
				break;

			// output an instance specified by its axis locations
			// - unspecified axes are set to default
			// - values outside the range [min,max] will be clamped to min or max
			// - the special value "default" sets all axes to default
			// - TODO: handle "min", "max", "default" per axis, e.g. "wght min wdth 150"
			// - TODO: handle ranges to generate multiple instances between two extremes,
			//         e.g. "wght range(100,900,10)" to generate 81 instances 100,110,120 ... 890,900
			default:

				let instanceType;
				if (instanceDef == "default") {
					instanceType = "default";
				}
				else {
					fvsParams = instanceDef.split(" ");
					if (fvsParams.length % 2 == 0) {
						for (let p=0; p < fvsParams.length; p+=2) {
							fvs[fvsParams[p]] = parseFloat(fvsParams[p+1]);
						}
					}
					instanceType = "custom";
				}
				instances.push(font.addInstance(fvs, {type: instanceType}));
				font.instances.pop();
				break;
		}

		allInstances.push(...instances);
	});

	// for each instance, compile binary file
	allInstances.forEach((instance, i) => {

		let extraName = instance.name === undefined ? "" : `(${instance.name})`;
		instance.filename = `${init.outFile}-${i}${extraName}.ttf`;
		if (!listOnly) {
			font.exportInstance(instance);
			totalSize += instance.size;
		}

		if (!quiet) {
			console.log(`Instance: type=${instance.type}, name="${instance.name}", location=` + JSON.stringify (instance.fvs));
			if (!listOnly)
				console.log(`  ${instance.filename}: ${instance.size} bytes, ${instance.timer} ms`);
		}

	});

	// final message
	const cliTimeEnd = new Date();
	if (!quiet) {
		console.log(`Total instances: ${allInstances.length}`);
		if (!listOnly)
			console.log(`${totalSize} bytes, ${cliTimeEnd - cliTimeStart} ms`);
	}
}
