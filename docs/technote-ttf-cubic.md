# ttf-cubic: an experimental variable font format with cubic curves

Author: Laurence Penney

In September 2020 [I published](https://twitter.com/axis_praxis/status/1305955442842050561) an experimental build of Samsa that handles **ttf-cubic** fonts. On 25 November 2020 the feature was [merged into Samsa’s main branch](https://github.com/Lorp/samsa/commit/8d63269f755fd6fc83d2a8bf8247b06d09470b45). This article discusses what ttf-cubic fonts are, why they exist, and how to make them.

## Background

Back in 2015 and 2016, when the [OpenType Variations section](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview) of the [OpenType 1.8 specification](https://docs.microsoft.com/en-us/typography/opentype/spec/) was being developed, it was agreed that the data format should be based closely on that of Apple’s TrueType GX Variations. Not only was there a public specification dating back to 1994, but there also existed several fonts to experiment with. Being based on TrueType, GX Variations curves are quadratic (2nd order). It was clear, though, that glyphs with cubic (3rd order) curves must be part of the new specification too: such curves faithfully preserve the actual curves drawn by type designers (almost all font sources are cubic), and of course cubic curves had been widely used for years in non-variable OpenType/CFF (`.otf`) fonts. The question was how to incorporate cubic glyphs into an updated OpenType Variations specification.

Stakeholders from Adobe argued for a variations extension to the OpenType/CFF format. This would, they asserted, offer better compression than TrueType and would also allow PostScript declarative hints. Others argued that the TrueType ‘glyf’ table should be modified slightly in order to handle cubic curves, that this would mean simple updates to existing tooling, and that arguments in favour of CFF were not compelling. Adobe’s position won the day, and the CFF2 format is thus part of OpenType 1.8. Modern variable fonts exist as either TrueType-flavour `.ttf` files (with quadratic curves) or CFF2-flavour `.otf` files (with cubic curves).

Unfortunately for tool makers, CFF (as well as CFF2) is significantly different in its binary format from TrueType, and thus there exist multiple tools which handle either one format or the other. Samsa is such a tool — it would take significant effort to add a CFF2 parsing capability to Samsa and, though a very desirable extension, an opportunity for this has so far not arisen.

## ttf-cubic concept

Given the desire to test cubic glyphs, at the very least when a font is still in development, I therefore wondered if cubic curves could be incorporated easily to the TrueType format and hence incorporated in Samsa. Implementation of CFF2 parsing had been shelved due to it being a major investment for which funding had not emerged. Another option was to handle UFO sources directly, but that would involve adding an XML parser, and handling the numerous files within a UFO container could be tricky, especially by drag-drop.

I realized that one could use normal TrueType-based tooling to build cubic fonts from cubic sources, if one simply agrees on a protocol such that cubic curves are represented in TrueType binaries by an _on-off-off-on_ sequence of points, where “on” means an on-curve point, and “off” means an off-curve point. Of course these point sequences represent valid TrueType curves as well (though visually different curves), so we would also need a flag to indicate that the curves must be parsed as cubic rather than quadratic. We’d only need to record the flag once per font, as the intention at this stage is to represent either quadratic fonts or cubic fonts, not fonts that contain both curve types.

Three candidates for the flag were:

* an unused flag bit in the `glyf` table (see below)
* file extension, i.e. `ttf` vs. `ttf-cubic`
* file fingerprint, i.e. the first 4 bytes of the file:
  * 0x00010000 for TrueType fonts
  * 0x4f54544f (`OTTO`) for CFF fonts
  * 0x43554245 (`CUBE`) for ttf-cubic fonts

I used the last option for two reasons. First, because after loading a font into memory, the file extension may not be preserved; indeed some fonts may be memory objects in the first place, not manifested as files at all. Second, it seems important to disable these fonts from being rendered in normal systems, because the curves will appear incorrectly (circles become squircles); these first four 4 bytes tend to be checked before processing, while an obscure flag may be ignored.

## Building ttf-cubic fonts

Google Fonts’ [`fontmake`](https://github.com/googlefonts/fontmake) tool builds variable fonts in both the TrueType and OpenType/CFF flavours. I needed a way to get it to build TrueType fonts with cubic curves, using the _on-off-off-on_ protocol described above. The cubic/quadratic flag could be handled separately.

The solution turned out to be a lot easier than I had thought. The method is:

1. Prepare your `.designspace` file and `.ufo` sources with cubic glyphs as normal.
2. In all `.glif` files, search & replace all `"curve"` with `"qcurve"`.
3. Use `fontmake` to create a TrueType font from the sources:  
`$ fontmake -o variable -m <yourfont.designspace>`
4. Open the resulting `yourfont.ttf` in a hex editor and set the first 4 bytes to 0x43554245 (`CUBE`).
5. Make the file extension `ttf-cubic`.

Now the font is ready to try in Samsa.

Steps 2–5 can be performed from the \*nix shell (use with care!):

```
$ cd <copy-of-directory-with-yourfont-ufos-and-designspace>
$ find . -name "*.glif" -type f -exec sed -i '' -e 's/type="curve"/type="qcurve"/g' {} +
$ fontmake -o variable -m yourfont.designspace
$ printf 'CUBE' | dd of=yourfont.ttf bs=1 seek=0 count=4 conv=notrunc
$ mv yourfont.ttf yourfont.ttf-cubic
```

Here is the complete `.glif` file for the glyph `O` from @letterror’s `MutatorSansLightCondensed.ufo` after its cubic curves (`type="curve"`) have been replaced by pseudo-quadratic curve pairs (`type="qcurve"`).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<glyph name="O" format="2">
  <advance width="503"/>
  <unicode hex="004F"/>
  <outline>
    <contour>
      <point x="246" y="-10" type="qcurve" smooth="yes"/>
      <point x="257" y="-10" type="line" smooth="yes"/>
      <point x="377" y="-10"/>
      <point x="453" y="88"/>
      <point x="453" y="352" type="qcurve" smooth="yes"/>
      <point x="453" y="615"/>
      <point x="377" y="710"/>
      <point x="257" y="710" type="qcurve" smooth="yes"/>
      <point x="246" y="710" type="line" smooth="yes"/>
      <point x="125" y="710"/>
      <point x="50" y="615"/>
      <point x="50" y="352" type="qcurve" smooth="yes"/>
      <point x="50" y="88"/>
      <point x="125" y="-10"/>
    </contour>
    <contour>
      <point x="246" y="26" type="line" smooth="yes"/>
      <point x="152" y="26"/>
      <point x="90" y="104"/>
      <point x="90" y="352" type="qcurve" smooth="yes"/>
      <point x="90" y="599"/>
      <point x="152" y="674"/>
      <point x="246" y="674" type="qcurve" smooth="yes"/>
      <point x="257" y="674" type="line" smooth="yes"/>
      <point x="352" y="674"/>
      <point x="413" y="599"/>
      <point x="413" y="352" type="qcurve" smooth="yes"/>
      <point x="413" y="104"/>
      <point x="352" y="26"/>
      <point x="257" y="26" type="qcurve" smooth="yes"/>
    </contour>
  </outline>
</glyph>

```

Incidentally, Samsa’s JavaScript code for producing cubic SVG paths from ttf-cubic data is much simpler than the code for producing quadratic SVG paths from normal TrueType curves (see [`SamsaGlyph.prototype.svgPath()`](https://github.com/search?q=SamsaGlyph.prototype.svgPath+user%3Alorp+repo%3Asamsa&type=Code&ref=advsearch&l=&l=)) . Samsa can now assume that all off-curve points come in pairs, surrounded by on-curve points. By contrast, off-curve points in TrueType may come in sequences of any length. In other words, with ttf-cubic, _all_ curves are _on-off-off-on_ because all those pseudo-quadratic `qcurve` elements are in fact cubic, a predictability that means simpler code.

## Testing ttf-cubic fonts

### Samsa
To test a `ttf-cubic` font, drag and drop it onto the Samsa app as usual. You can also add it to `samsa-config.js` in your own hosted installations.

* Samsa uses the first 4 bytes to determine how to handle curves in the `glyf` table, setting an internal `curveOrder` property of the `SamsaFont` and `SamsaGlyph` objects to either 2 (quadratic) or 3 (cubic).

* Samsa’s Webfont panel (which uses standard techniques for display) does not function correctly. The `ttf-cubic` format is not standards-compliant, therefore such fonts are rejected by browsers and operating systems.

### FontLab 7.2

FontLab 7.2, as of 2020-12-02, also [supports import and export of ttf-cubic fonts](https://twitter.com/Fontlab/status/1333956675959742464).

### Glyphs 3

Glyphs 3 (from version Glyphs3.0.2-3040, released 2020-12-01) can export static ttf-cubic fonts. In *Font Info / Exports*, add a custom parameter “Save as ttf-cubic” and enable it. Exports with “TrueType outline flavour” will subsequently be in ttf-cubic format.

## A note on outline direction

Cubic sources are designed with *anticlockwise* solid outlines, and this outline direction is preserved in fonts converted to ttf-cubic using the above method. In other words, point numbers remain consistent between compiled fonts and font sources. This is opposite to the TrueType convention where solid outlines have clockwise outlines. For a real specification, direction should probably be specified, and keeping to the TrueType convention may be the better choice. Note, though, that SVG gets by being agnostic about curve direction; by default it uses a [non-zero fill rule](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule) which works for both clockwise and anticlockwise solid outlines. Thanks for the [note](https://github.com/Lorp/samsa/pull/57) on this, @dberlow.

## Font binary size comparison

The following variable fonts were built with fontmake 2.2.0 from [Mutator Sans sources](https://github.com/LettError/mutatorSans). Sizes are in bytes.

| File | Format | Curves | Size  | Size % | WOFF2 size |
| :--- | :--- | :--- | ---: | ---: | ---: |
| MutatorSans.ttf | ttf | quadratic | 11976 | 100% | 6540 |
| MutatorSans.ttf-cubic | ttf-cubic | cubic | 11044  | 92% | 5908* |
| MutatorSans.otf | otf/CFF2 | cubic | 7920  | 66% | 4932 |

\* The size is from a test font using the standard 0x00010000 fingerprint, because WOFF2 compression does not work otherwise.

## Alternative cubic representation methods in TrueTypeish fonts

* In the `glyf` table, bit 7 in the flags for each point is currently (OpenType 1.8.4) reserved. Using this bit would allow cubic curves to be identified, either once per glyph (if set in the very first flag) or for every curve. Some [Twitter discussion](https://twitter.com/simoncozens/status/1305921854213885960) took place regarding bit 7 and cubic curves. More discussion at [commontype/Cubic Beziers in glyf table](https://github.com/commontype-standard/commontype/issues/38).

* The `head.glyphDataFormat` field could be incremented. However it seems dangerous to assume that this field is reliably checked by font systems, given that there has only been a single way to interpret the `glyf` table hitherto.

* [Karsten Lücke](https://www.kltf.de/) has proposed representing cubic curves in the existing `glyf` format, as described above, except renaming the `glyf` and `loca` tables to `glyc` and `locc` to ensure they are never parsed as quadratic.

Regarding fonts with heterogenous curves (i.e. containing both cubic and quadratic) we note that SVG offers quadratic and cubic curves within contours of a [`path`](https://developer.mozilla.org/en-US/docs/Web/SVG/Tutorial/Paths). FontLab also natively handles mixed curves within a glyph. Rounded corners, at least small ones, are arguably better represented and adjusted in quadratic. Thus there exist reasons one might want to mix curve types within a glyph. Whether these use cases are sufficiently compelling to move on from the longstanding idea that a font is either cubic or quadratic remains to be seen.

These discussions seem to be limited to quadratic and cubic curves, rather than those of higher order, though spiral curves have also been explored seriously, notably @raphlinus’s [Spiro](https://levien.com/spiro/).

Pinging the following users who may find curve format discussion interesting: @behdad @davelab6 @simoncozens @tiroj @svgeesus @twardoch @petercon @rsheeter @anthrotype @cjchapman @danrhatigan @frankrolf @miguelsousa @dberlow @justvanrossum @letterror
