## MVAR panel

In static fonts, various font-wide metrics — including cap height, x-height, ascender height and underline size — are stored in the tables [`OS/2`](https://docs.microsoft.com/en-us/typography/opentype/spec/os2), [`hhea`](https://docs.microsoft.com/en-us/typography/opentype/spec/hhea), [`vhea`](https://docs.microsoft.com/en-us/typography/opentype/spec/vhea) and [`post`](https://docs.microsoft.com/en-us/typography/opentype/spec/post). Font systems typically make these values available to applications. OpenType variable fonts also store these metrics, but because their values may vary depending on designspace location, a method is needed to define variations in those values. That method is provided by the [`MVAR` table](https://docs.microsoft.com/en-us/typography/opentype/spec/mvar).

Samsa’s MVAR panel displays those variations numerically, updating them as the user changes designspace location using the axis controls or selecting instances.

The full list of 38 metrics (17 from `OS/2`, 3 from `hhea`, 2 from `post`, 6 from `vhea`, 10 from `gasp`) can be found in the MVAR specification linked above.

For each metric having MVAR variations, Samsa displays:
* the **4-letter tag** that is stored in the font (e.g. `xhgt`),
* the **default value** of the metric taken from the tables `OS/2`, `post`, `hhea` and `vhea`,
* the **interpolated delta** (determined by the current designspace location acting on structures in MVAR),
* the **new value** of the metric (i.e. the sum of the default and the delta).

The table and field represented by the tag may be revealed by hovering the pointer over the tag (e.g. hover over `xhgt` to reveal “OS/2.sxHeight”).

Typically, only a subset of a font’s metrics have variations defined in MVAR, so it is normal to see only a small number of metrics in the panel.

### Limitations

The `gasp` table tags of MVAR, which adjust the PPEM ranges of the first 10 fields, are not handled by Samsa.

The new values for the metrics are NOT currently exported in instantiated static fonts.

### References

* [OpenType spec: MVAR](https://docs.microsoft.com/en-us/typography/opentype/spec/mvar)
