## Instances panel

The Instances panel lists all the instances in the font. Initially this is the Default instance, followed by all the Named Instances.

### Adding instances
You can add instances to this panel by clicking “Add instance” in the Axes panel or the STAT panel. The current axis locations are always used when clicking “Add instance”.

### Instance records
Each instance record displays:

* **type** of instance (the *Default instance* has a home icon, *Named Instances* have a bookmark icon, *Custom Instances* have a sliders icon);
* **preview** of the capital A glyph of this instance;
* **name** of this instance (it’s editable in case you want to keep track of created instances or save the instance as a TTF);
* **visibility** toggle (eye icon, not currently functional);
* **download** icon to instantiate and download a static font (see below);
* **location** on each axis.

Click on an instance to:

* Update all parts of the UI which display the current axis locations to the axis locations of the new instance. That includes the main Glyph display, the Axes panel, the Delta sets panel and the Webfont panel.
* Update the Glyphs panel to show all the glyphs from the new instance.

The green background colour indicates the most recent active instance.

### Instantiate (download) static TTF
Click the down arrow on any instance to export an instantiation of the variable font at the current designspace location. It is saved to the Downloads folder.

#### Limitations

The downloaded TTF files may be useful for testing, but they are not ready for production. Samsa does not (yet) process:

* OpenType table checksums
* `GPOS` (so kerning remains default)
* `GSUB` (so `rvrn` Feature Variations are not respected)
* `MVAR` (variation of `OS/2` table and other metrics)
* `cvar` (so the `cvt ` table remains default)

#### Technical details
When instantiating TTFs, Samsa first processes each glyph according to its location on all the axes, similarly to how Samsa instantiates glyphs for display in the Glyphs panel, using identical functions in `samsa-core.js` to generate a new set of outline points for each glyph.

Then, instead of the function to convert these outlines into SVG for immediate display, another function converts the outlines to the TrueType binary format (as defined in [OpenType spec: `glyf` table](https://docs.microsoft.com/en-us/typography/opentype/spec/glyf)). These new binary objects are compiled, along with much of the metadata from the original font, into a JavaScript ArrayBuffer object, this being an entire TrueType font stored in the browser’s memory.

Next, the ArrayBuffer is converted into a [data URL](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URIs), with the binary TrueType data encoded as a [Base 64](https://en.wikipedia.org/wiki/Base64) string, which is then set as the `href` attribute of a new `<a>` element. Finally Samsa triggers a click to download the binary data as a file in the Downloads folder.

### Adding Named Instances to fonts
A font maker typically sets up the Named Instances of a VF using a font editor, or within a [.designspace](https://github.com/fonttools/fonttools/tree/master/Doc/source/designspaceLib#document-xml-structure) document. Named Instances are stored in the `fvar` table of an Opentype variable font, each occupying only a few bytes.

### References
* [OpenType specification: fvar](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar)
