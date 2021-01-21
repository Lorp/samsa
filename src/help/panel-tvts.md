## Delta sets panel

Delta sets, at the core of OpenType Variations technology, define how default glyph outlines morph into new glyph outlines when variation axes are moved away from their default locations. A detailed explanation of Delta sets is beyond the scope of this document, but a concise explanation is given below along with references to the specification.

The Delta sets panel displays a list of all Delta sets belonging to the current glyph. The same Delta sets are also represented as coloured arrows in the main glyph window, and the colour of the arrows corresponds with the colours of rows in the Delta sets panel.

*Normalized axis coordinates (in the range [-1,+1] with Default at 0) are used throughout this help file.*

### Delta set rows

Each Delta set row consists of:

* The _id_ of this Delta set (0-based integer). This determines the order in which the arrows are arranged in the main glyph window.
* The _colour_ of this Delta set, assigned by Samsa. When “split arrows” is checked in the UI panel, the arrow colours in the main glyph window match the row colours.
* The number of _Points_ moved explicitly by this Delta set. Click the expand button to display all the (x,y) offset deltas for this Delta set. Adjust axis positions to see the values change. These values are visualized as coloured arrows in the main glyph window. When axis values are at peak values for a Delta set, Scalar will be 1, and these deltas will be at the values recorded in the `gvar` table, i.e. their maximum.
* The current _Scalar_ for this Delta set. This is the product of the individual axis-scalars, that can be seen in the associated sawtooth graphs.
* The _Order_ of this Delta set, being the number of axes involved in it. If a Delta set involves 2 axes, and they are both moved synchronously, this overall Scalar responds with a quadratic (order 2) function; if a Delta set has 3 axes, moving them synchronously results in a cubic (order 3) function; and so on.
* The _sawtooth graphs_, one for each axis involved. Each plots axis values [-1,+1] on the _x_-axis and the axis-scalar [0,1] on the _y_-axis. Hovering over a sawtooth graph reveals axis value and axis-scalar.

### Controlling colours of Delta sets and arrows

Colours of Delta sets (and their corresponding arrows), as well as the number of colours before cycling, may be changed by editing the array `CONFIG.ui.tuple.colors`.

### What are Delta sets?

Delta sets are data objects in variable fonts that control how Default glyph outlines morph into new forms. Each Delta set defines two things:

First, each axis is assigned either:

* _start_ and _end_ defining a range where the Delta set is active, along with a _peak_ value within that range, or
* _null_

Second, each point is assigned either:

* an (x,y) offset to be added, or
* _null_

During a glyph’s instantiation, its Delta sets are processed in turn. For each, a scalar value in the range [0,1] is determined, and used as a multiplier on the array of (x,y) offsets. The scalar thus determines what proportion of the offset is added to the Default glyph, in other words the length of the vector that the offset represents.

We obtain the scalar for each Delta set by calculating the product of all the axis-scalars. Axis-scalars are obtained by comparing current axis settings with those Delta set axis ranges which are not _null_. We obtain all axis-scalars in a Delta set:

* if _peak_ = 0, axis-scalar is 1,
* if the axis value = _peak_, axis-scalar is 1,
* if the axis value is ≤ _start_ or ≥ _end_, axis-scalar is 0,
* if the axis value is between _start_ and _peak_, determine axis-scalar by its interpolated position between _start_ (where axis-scalar is 0) and _peak_ (where axis-scalar is 1),
* if the axis value is between _peak_ and _end_, determine axis-scalar by its interpolated position between _peak_ (where axis-scalar is 1) and _end_ (where axis-scalar is 0).

This function, where axis values between -1 and +1 are mapped to axis-scalars between 0 and 1, is represented visually by sawtooth graphs in the Delta sets panel. Red needles represent the current axis values, and one can inspect current axis-values and axis-scalars by hovering the pointer over the graphs.

Once we have all the axis-scalars, we multiply them together to obtain the overall scalar for the Delta set.

In a valid variable font, _start_ and _end_ never bridge the axis default value (0), therefore _start_, _peak_ and _end_ are always of similar sign (or 0).

There is no limit to the number of Delta sets per glyph.

Delta sets for one glyph need not correspond with Delta sets for any other glyph in the font.

### Inferred deltas (aka IUP)

When Delta sets are added to the Default glyph outline, consideration is needed when offsets are defined only for a subset of its points. Contours where no point is moved are ignored. Contours where some points are moved and some are not moved are processed for “inferred deltas”, also known as IUP (interpolate untouched points). This involves taking each unmoved point, and moving it in proportion to the amount its two “closest” points (i.e. the two points found by tracing around the outline in either direction from the initial point until a moved point is found). For more on IUP including pseudo-code see [_Inferred deltas for un-referenced point numbers_](https://docs.microsoft.com/en-us/typography/opentype/spec/gvar#inferred-deltas-for-un-referenced-point-numbers).

### Example

A simple 2-axis variable font with 4 sources (masters), where `wght` ranges from 400 (min and default) to 700 (max), and `wdth` ranges from 100 (min and default) to 200 (max), typically has three Delta sets:

* Delta set #0 controlled by the `wght` axis with _min_=0, _peak_=1, _max_=1. The Delta set represents the point deltas from the Default (400,100) to the Bold source (700,100).
* Delta set #1 controlled by the `wdth` axis with _min_=0, _peak_=1, _max_=1. The Delta set represents the point deltas from the Default (400,100) to the Wide source (400,200).
* Delta set #2 controlled by 2 axes: the `wght` axis with _min_=0, _peak_=1, _max_=1 and the `wdth` axis with _min_=0, _peak_=1, _max_=1. Because the axis settings that invoke this Delta set also invoke the other two Delta sets, here we record the deltas needed _in addition to_ those applied by Delta set #0 and Delta set #1. Therefore the deltas required to obtain the points of the Bold Wide source (700,200) are rather small — corrections, in a sense.

Note that the scalar for multi-axis Delta sets, such as Delta set #2 above, may be less than expected, due to the scalar calculation as the product of the axis-scalars. Thus, although the scalar Delta set #2 is 1 when both axes are at their maxima, the scalar is only 0.25 when both axes are at 0.5 (normalized), and 0.01 when both axes are at 0.1.

### References

* [OpenType Font Variations Overview](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview)
* [Introducing OpenType Variable Fonts](https://medium.com/variable-fonts/https-medium-com-tiro-introducing-opentype-variable-fonts-12ba6cd2369)
* [OpenType specification: gvar](https://docs.microsoft.com/en-us/typography/opentype/spec/gvar)
* [Inferred deltas for un-referenced point numbers](https://docs.microsoft.com/en-us/typography/opentype/spec/gvar#inferred-deltas-for-un-referenced-point-numbers)