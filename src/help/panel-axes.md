## Axes panel

This panel displays data about all the variation axes in font. For each axis, we can see:

* the 4-character tag name, e.g. `wght`
* the human-reable name, e.g. “Weight”
* the minimum value
* the default value
* the maximum value
* the current value (in green)

Axis locations can be adjusted manually using its slider or by editing the current value field.

Initial data for the axes panel comes from the `fvar` table in the font.

### Number format
This control offers 4 different views on the minimum, default, maximum and current values. Each format has its uses, as set out below.

#### “user” format

This is the value in decimal. It is what you see in applications, and it is the value to use when you control variable fonts in CSS and application programming.

#### “userhex” format
The same value in hexadecimal notation, multiplied by 65536 (0x10000) in accordance with the 4-byte 16.16 format (2 bytes integer, 2 bytes fractional). This notation represents the highest precision in which axis values can be specified. These values can be observed when inspecting font binaries of the `fvar` table.

#### “norm” format
The same value, but “normalized” into a value between -1 and 1, according to the [OpenType specification: Coordinate Scales and Normalization](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview#coordinate-scales-and-normalization). Normalization uses the following rules:

* `min` maps to -1
* `default` maps to 0
* `max` maps to 1
* values between min and default are mapped to the range [-1,0]
* values between default and max are mapped to the range [0,1]

These normalized values are used internally in font processing, and can be seen in TTX dumps of the `gvar` and `avar` tables. They are also used in specifying `rvrn` Feature Variations in the `GSUB` table.

Note that both norm and normhex views incorporate `avar` mapping (see below), if the font contains an `avar` table.

#### “normhex” format
This is again the norm value in hexadecimal, multiplied by 16384 in accordance with the 2.14 format (2 bits integer, 14 bits fractional). These hex values can be observed when inspecting font binaries. They are useful when considering the precision with which axis values are processed. All axis values ultimately resolve to this resolution, meaning we can step through all possible instances by adding 1/16384 to the normalized axis values.

### +/- buttons
These buttons increment and decrement the current normalized value by the smallest possible amount, which is 1/16384, or (in 2.14 format) 0x0001. In “normhex” number format we can see these values incrementing and decrementing by 1.

These controls are particularly useful in examining behaviour near intermediate masters. Instananeous transitions between dissimilar shapes (frequently seen in the weight axis of glyphs $, ¢, Ø) can be achieved by juxtaposing two intermediate masters with values differing by 1/16384 in normalized coordinates, as long as the dissimilar glyphs have compatible outlines. For instananeous transitions with incompatible outlines, Feature Variations are necessary.

### avar table
The optional [`avar` table](https://docs.microsoft.com/en-us/typography/opentype/spec/avar) allows font makers to adjust how axis values are mapped to normalized values. Fonts that have an `avar` table display a “Show avar” checkbox in Samsa.

![Samsa visualization of the avar table from Oswald Variable font](https://raw.githubusercontent.com/Lorp/samsa/master/screenshots/20200615-avar-Oswald.png)

First, some background on how `avar` works. A font that has Regular at `wght`=400 and Black at `wght`=900 may benefit by having its Bold at a custom value, e.g. `wght`=618, rather than 700 as defined in the [CSS spec](https://developer.mozilla.org/en/docs/Web/CSS/font-weight) and [OpenType OS/2 table spec](https://docs.microsoft.com/en-us/typography/opentype/spec/os2#usweightclass). In this case the font maker uses the `avar` table to specify a mapping from 618 to 700 (in normalized coordinates) to achieve this.

The diagram in Samsa always shows the three mandatory mappings:

* -1 → -1 for the minimum
* 0 → 0 for the default
* 1 → 1 for the maximum

In addition to the mandatory mappings, the custom `avar` mappings are also shown. As axis settings are adjusted, the green arrow shows the current axis location with its pre-normalized value pointing to its normalized value.

Note how axis values between mapped values are mapped according to linear interpolation.

Note also that, because of the mandatory mappings, the minimum, default and maximum values cannot be remapped.

The values involved in `avar` mapping are shown if you hover the pointer over the diagram:

* original user-facing axis value
* normalized value
* normalized value with avar mapping
* final user-facing axis value with `avar` mapping

### References

* [OpenType specification: fvar](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar)
* [OpenType specification: avar](https://docs.microsoft.com/en-us/typography/opentype/spec/avar)
* [OpenType specification: Coordinate Scales and Normalization](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview#coordinate-scales-and-normalization)