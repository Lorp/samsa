# Samsa-Core (samsa-core.js)

Samsa-Core is the JavaScript library at the heart of Samsa. It provides numerous functions for parsing variable fonts (VFs), creating VF instances, presenting VFs as SVG, and exporting static TTFs.

These functions are used in the graphical tool [Samsa-GUI](samsa-gui.md), the command-line utility [Samsa-CLI](samsa-cli.md) and the polyfill demo [Samsa-Polyfill](samsa-polyfill.md).

## SamsaVF object
`SamsaFont` is the main font object. Some methods:

```
getNamedInstances()
addInstance()
makeInstance()
fvsToTuple()
tupleToFvs()
axisIndices()
axisNormalize()
axisDenormalize()
```

## Notable functions
```
glyphApplyVariations()
getGlyphSVGpath()
SamsaVF_compileBinaryForInstance()
```

## Code Examples

A SamsaFont can be initialised in any of the following ways:

```jsx
//from a URL
var vf = new SamsaFont({
	fontFamily: "FontNameShouldGoHere",
	url: "fonts/Sans_Variable.ttf",
	callback: function(font) {}
});
//from a font file upload
let vf = new SamsaFont({
	arrayBuffer: this.result,
	inFile: this.__file__.name,
	filesize: this.__file__.size,
	date: this.__file__.lastModified,  
	callback: function(font) {}
});
```

## Constructor

### `SamsaFont( init : Object , config : Object )`

**Parameters:**

1. `init` :  `Object`

    ```jsx
    init: {
      url: String,
      fontFamily: String,
      callback: Function,

      arrayBuffer: ArrayBuffer,
      inFile: String, 
      outFile: String,
      filesize: String,
      date: String
    }
    ```

2. `config` :  `Object` - (optional)

    ```jsx
    defaultConfig = {
      isNode: false,
      outFileDefault: "samsa-out.ttf",
      instantiation: {
        method: "default",
        skipTables: ["gvar","fvar","cvar","avar","STAT","MVAR","HVAR","VVAR","DSIG"],
        ignoreIUP: false
      },
      defaultGlyph: ["A", "a", "Alpha", "alpha", "afii10017", "A-cy", "afii10065", "a-cy", "zero"],
      sfnt: {
        maxNumTables: 100,
        maxSize: 10000000
      },
      glyf: {
        overlapSimple: true,
        bufferSize: 500000,
        compression: true
      },
      name: {
        maxSize: 50000
      },
      deltas: {
        round: true
      },
      postscriptNames: [".notdef",".null","nonmarkingreturn","space","exclam","quotedbl","numbersign","dollar","percent","ampersand","quotesingle","parenleft","parenright","asterisk","plus","comma","hyphen","period","slash","zero","one","two","three","four","five","six","seven","eight","nine","colon","semicolon","less","equal","greater","question","at","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","bracketleft","backslash","bracketright","asciicircum","underscore","grave","a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","braceleft","bar","braceright","asciitilde","Adieresis","Aring","Ccedilla","Eacute","Ntilde","Odieresis","Udieresis","aacute","agrave","acircumflex","adieresis","atilde","aring","ccedilla","eacute","egrave","ecircumflex","edieresis","iacute","igrave","icircumflex","idieresis","ntilde","oacute","ograve","ocircumflex","odieresis","otilde","uacute","ugrave","ucircumflex","udieresis","dagger","degree","cent","sterling","section","bullet","paragraph","germandbls","registered","copyright","trademark","acute","dieresis","notequal","AE","Oslash","infinity","plusminus","lessequal","greaterequal","yen","mu","partialdiff","summation","product","pi","integral","ordfeminine","ordmasculine","Omega","ae","oslash","questiondown","exclamdown","logicalnot","radical","florin","approxequal","Delta","guillemotleft","guillemotright","ellipsis","nonbreakingspace","Agrave","Atilde","Otilde","OE","oe","endash","emdash","quotedblleft","quotedblright","quoteleft","quoteright","divide","lozenge","ydieresis","Ydieresis","fraction","currency","guilsinglleft","guilsinglright","fi","fl","daggerdbl","periodcentered","quotesinglbase","quotedblbase","perthousand","Acircumflex","Ecircumflex","Aacute","Edieresis","Egrave","Iacute","Icircumflex","Idieresis","Igrave","Oacute","Ocircumflex","apple","Ograve","Uacute","Ucircumflex","Ugrave","dotlessi","circumflex","tilde","macron","breve","dotaccent","ring","cedilla","hungarumlaut","ogonek","caron","Lslash","lslash","Scaron","scaron","Zcaron","zcaron","brokenbar","Eth","eth","Yacute","yacute","Thorn","thorn","minus","multiply","onesuperior","twosuperior","threesuperior","onehalf","onequarter","threequarters","franc","Gbreve","gbreve","Idotaccent","Scedilla","scedilla","Cacute","cacute","Ccaron","ccaron","dcroat"]
    }
    ```

**Returns:** 

`SamsaFont`

**Example:**

```jsx
var vf = new SamsaFont({
	fontFamily: "FontNameShouldGoHere",
	url: "fonts/KairosSans_Variable.ttf",
	callback: function(font) {}
});
```

## Properties

### `.fontFamily`

Type: `String`

### `.unitsPerEm`

Type: `Number`

It specifies the number of coordinate units on the "em square", an abstract square whose height is the intended distance between lines of type in the same type size. This is the size of the design grid on which glyphs are laid out. Example value: `1000`

### `.numGlyphs`

Total number of glyphs

Type: `Number`

### `.italicAngle`

Type: `Number`

### `.instances`

Type: `Array` of `Object`

Array of variable fonts’ instances. 

- Example:

    ```jsx
    [{
      id: 0,
      glyphs: [],
      tuple: [
        0,
        0,
        0
      ],
      fvs: {
        fmsk: 0,
        hdrs: 0,
        hscl: 0
      },
      static: null,
      name: 'Default',
      type: 'default'
    }]
    ```

### `.axes`

Type: `Array` of `Object`

Array of variable fonts’ axes.  

- Example:

    ```jsx
    [{
      id: 0,
      tag: 'fmsk',
      min: 0,
      default: 0,
      max: 100,
      flags: 0,
      axisNameID: 256,
      name: 'WearFaceMask'
    }]
    ```

### `.axisCount`

Total number of axes

Type: `Number`

### `.axisTagToId`

Map of axis tag to axis id.

Type: `Object`

- Example:

    ```jsx
    axisTagToId: {
      wght: 0,
      wdth: 1,
      ital: 2
    }
    ```

### `.errors`

Type: `Array`

### `.glyphs`

Type: `Array` of `null`

### `.widths`

Array of each glyph’s width

Type: `Array` of `Number`

- Example:

    ```jsx
    [
      800,
      600,
      0,
      240,
      512,
      502,
      485,
      502
    ]
    ```

### `.glyphNames`

Array of each glyph’s name, such as "A"

Type: `Array` of `String`

- Example:

    ```jsx
    [
      ".notdef",
      "NULL",
      "nonmarkingreturn",
      "space",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]
    ```

### `.glyphOffsets`

Type: `Array` of `Number`

### `.glyphSizes`

Type: `Array` of `Number`

### `.tupleOffsets`

Type: `Array` of `Number`

### `.tupleSizes`

Type: `Array` of `Number`

### `.avar`

Type: `Array`

### `.url`

Font url

Type: `String`

### `.path`

Font url or font file

Type: `String`

- Example:

    ```jsx
    "https://res.cloudinary.com/dr6lvwubh/raw/upload/v1596755490/Variable%20Fonts/KairosSans_Variable.ttf",
    ```

### `.arrayBuffer`

Type: `ArrayBuffer`

### `.filename`

Font file name. Example value: `KairosSans_Variable.ttf`

Type: `String`

### `.filesize`

Font file size. Example value: `68404`

Type: `Number`

### `.flavor`

Font file size. Example value: `truetype`

Type: `String`

### `.numTables`

Total number of font data tables. Example value: `16`

Type: `Number`

### `.tableDirectory`

Type: `Array` of `Object`

Array of font data tables

- Example:

    ```jsx
    [{
      id: 0,
      tag: 'HVAR',
      checkSum: 1677429614,
      offset: 15684,
      length: 1393
    }]
    ```

### `.tables`

Type: `Object`

Font data tables as object

- Example:

    ```jsx
    {
    	...
      fvar: {
        id: 5,
        tag: 'fvar',
        checkSum: 270942577,
        offset: 17528,
        length: 844,
        data: {
          majorVersion: 1,
          minorVersion: 0,
          offsetToAxesArray: 16,
          countSizePairs: 2,
          axisCount: 3,
          axisSize: 20,
          instanceCount: 48,
          instanceSize: 16
        }
      }
    }
    ```

### `.names`

Type: `Array`

Font information, designer names, etc.

### `.config`

Type: `Object`

See constructor parameter `[config](https://www.notion.so/paperjs/SamsaFont-6eedfed8c7c046cf872e02fc5ece73d7#16b849cd1238475790a786f529f5a775)`

## Methods

### `.getNamedInstances ()`

Return all named instances from `font.instances`, return an array of instances

**Returns:** 

`Array` of `Object`

**Source:** 

[samsa/src/samsa-core.js:2337](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2337)

### `.addInstance ( fvs , options )`

Add an new instance to `font.instances`, then return the added instance.

**Parameters:**

1. `fvs` : `Object`
2. `options` : `Object`

**Returns:** 

`Object`

**Source:** 

[samsa/src/samsa-core.js:2349](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2349)

### `.makeInstance ( instance )`

**Source:** 

[samsa/src/samsa-core.js:2388](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2388)

### `.fvsToTuple ( fvs )`

Convert `fvs` to `tuple`

**Returns:** 

`Array`

**Source:** 

[samsa/src/samsa-core.js:2404](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2404)

### `.tupleToFvs ( tuple )`

Convert `tuple` to `fvs`

**Returns:** 

`Object`

**Source:** 

[samsa/src/samsa-core.js:2419](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2419)

### `.axisIndices ( tag )`

Returns an array containing the axis indicies for this axis tag

**Parameters:**

1. `tag` : `String`

**Returns:** 

`Array`

**Source:** 

[samsa/src/samsa-core.js:2462](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2462)

### `.axisNormalize ( axis , t , avarIgnore )`

**Source:** 

[samsa/src/samsa-core.js:2548](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L2548)

### `.exportInstance ( instance )`

**Source:** 

[samsa/src/samsa-core.js:1713](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L1713)

### `.parse ()`

**Source:** 

[samsa/src/samsa-core.js:697](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L697)

### `.parseGlyph ( glyph )`

**Source:** 

[samsa/src/samsa-core.js:1269](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L1269)

### `.parseSmallTable ( tag )`

**Source:** 

[samsa/src/samsa-core.js:806](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L806)

### `.parseTvts ( glyph )`

**Source:** 

[samsa/src/samsa-core.js:1466](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L1466)

## Source

[samsa/src/samsa-core.js](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js)

