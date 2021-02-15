## Instances panel

The Instances panel lists all the instances in the font and allows any of them to be instantiated and downloaded as a static font. Click on an instance to set the designspace location of all parts of the Samsa interface to that of the instance.

In the list of instances, the Default is shown first (although it is not technically an instance), followed by the Named Instances defined in the `fvar` table. Any new instances, added using the “Add instance” button in other panels, are also shown.

### Instance records
Each instance record in the list displays:

* **type** of instance (the *Default instance* has a home icon, *Named Instances* have a bookmark icon, *Custom Instances* have a sliders icon);
* **preview** of the capital A glyph of this instance (or other fallback glyph if this font does not contain capital A;
* **name** of this instance (it’s editable in case you want to keep track of created instances or save the instance as a TTF);
* **download** icon to instantiate and download a static font (see below);
* **location** on each axis.

Click on an instance to set the Samsa UI to the axis locations of the new instance. This adjusts:
* the main Glyph display,
* the Axes panel,
* the Delta sets panel,
* the Webfont panel,
* the Glyphs panel.

The light blue background colour indicates the most recently clicked instance.

### Adding instances
Add an instance to this panel by clicking the “Add instance” button in the Axes panel or the STAT panel. The current axis locations are used when clicking “Add instance”.

### Download a static TTF
Click the down arrow on any instance to export an instantiation of the variable font at the current designspace location as a static TrueType font. The file is saved to the Downloads folder.

#### Limitations of downloaded fonts

The downloaded TTF files may be useful for testing, but they are not ready for production. Samsa does not (yet) process:

* OpenType table checksums
* `GPOS` (so kerning remains default)
* `GSUB` (so `rvrn` Feature Variations are not respected)
* `MVAR` (variation of `OS/2` table and other metrics)
* `cvar` (so the `cvt ` table remains default)

See also: [GitHub issue #37: Issues to fix before TTFs are production-ready](https://github.com/Lorp/samsa/issues/37)

#### Technical details
**The Samsa web app never uploads font data to a server.**

When instantiating TTFs, Samsa first processes each glyph according to its location on all the axes, similarly to how Samsa instantiates glyphs for display in the Glyphs panel, using identical functions in `samsa-core.js` to generate a new set of outline points for each glyph.

Then, instead of the method to convert these outlines into SVG for immediate display, another method converts the outlines to the TrueType binary format (as defined in [OpenType spec: `glyf` table](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf)). These new binary objects are compiled, along with much of the metadata from the original font, into a JavaScript ArrayBuffer object, this being an entire TrueType font stored in the browser’s memory.

Next, the ArrayBuffer is converted into a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs), with the binary TrueType data encoded as a [Base 64](https://en.wikipedia.org/wiki/Base64) string, which is then set as the `href` attribute of a new `<a>` element. Finally Samsa triggers a click to download the binary data as a file in the Downloads folder.

### Adding Named Instances to fonts
A font maker typically sets up the Named Instances of a VF using a font editor, or within a .designspace XML document. Named Instances are stored in the `fvar` table of an OpenType variable font, each occupying only a few bytes.

### References
* [OpenType specification: fvar](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar)
* [DesignSpaceDocument Specification: XML structure](https://github.com/fonttools/fonttools/tree/master/Doc/source/designspaceLib#document-xml-structure)