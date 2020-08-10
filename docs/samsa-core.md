# Samsa-Core (samsa-core.js)

Samsa-Core is the JavaScript library at the heart of Samsa. There are two fundamental classes: `SamsaFont` and `SamsaGlyph`, with properties and methods described below for parsing variable fonts (VFs), creating VF instances, converting glyph outlines to SVG, and exporting static TTFs.

These functions are used in the graphical tool [Samsa-GUI](samsa-gui.md), the command-line utility [Samsa-CLI](samsa-cli.md) and the polyfill demo [Samsa-Polyfill](samsa-polyfill.md).

## References
* [**SamsaFont Reference**](SamsaFont-reference.md)
* [**SamsaGlyph Reference**](SamsaGlyph-reference.md)

## Code Examples
A SamsaFont can be initialised in any of the following ways:

```jsx
//from a URL
let vf = new SamsaFont({
  fontFamily: "FontNameShouldGoHere",
  url: "fonts/Sans_Variable.ttf",
  callback: function (font) {}
});

//from a font file upload
let vf = new SamsaFont({
  arrayBuffer: e.target.result,
  inFile: file.name,
  filesize: file.size, //Optional
  date: file.lastModified, //Optional
  callback: function (font) {}
});
```
