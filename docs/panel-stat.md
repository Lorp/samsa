## STAT panel

This panel shows data from the STAT table in the OpenType font. Like the font’s Named Instances, which come from the font’s `fvar` table, STAT stores names for locations in the designspace. STAT offers some additional possibilities:

1. The designspace location for a given name need not be fully specified on all of the font’s axes.
2. A range can be specified as well as a value (limited to single-axis names). This may help apps provide meaningful names even when a designspace location does not exactly match a STAT name’s value.
3. A linked value can be specified, which can be a hint to apps regarding a Regular/Bold (the 400 value linking to 700) or Roman/Italic (the 0 value linking to 1) toggle in the UI (limited to single-axis names). Even find an italic in another font.
4. Name composition.
5. Axes not in the font.

### Typical usage

It is normal practice to store named locations on a per-axis basis. In a 2-axis [wght,wdth] font, STAT stores a set of named locations on the Weight axis (e.g. Light: 300, Regular: 400, Bold: 700), and another set named locations on the Width axis (e.g. Condensed: 75; Regular: 100; Wide: 125).

Decorative fonts may wish to name settings on combinations of axes.

### Reference

* [OpenType specification: STAT](https://docs.microsoft.com/en-us/typography/opentype/spec/stat)