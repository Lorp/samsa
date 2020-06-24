## STAT panel

This panel shows data from the [`STAT` table](https://docs.microsoft.com/en-us/typography/opentype/spec/stat) in an OpenType font, including the table version number. Each STAT record, rather like a Named Instance, assigns a name to a location in designspace.

### Comparison of STAT records and Named Instances
The STAT table builds on the idea of _Named Instances_, which are long established in Variable Fonts, and which are closely related to the instances specified by typeface designers in font editors and .designspace documents.

Unlike a Named Instance, a STAT record typically _does not fully specify_ a designspace location. Rather, it _partially specifies_ it, by assigning a name to a location on _one_ axis, or to locations on a _subset_ of axes.

### Using the STAT panel
The axes controlled by STAT are presented in dropdown lists, one list per axis. Selecting a name from a list (e.g. selecting “ExtraBold” from the Weight list) adjusts that axis to the new value, and updates the Samsa UI including the main glyph window with the new axis location.

Selecting an item from the list for one axis does not affect location on any other axis.

If axis settings are moved (using other controls) to  a location where a value in unnamed on that axis, then “[no match]” is displayed in the list for that axis.

Value ranges, linked values and multi-axis names are also indicated. See below for details.

### Name composition
STAT table records allow style names for instances to be automatically composed by applications and font tools.

For example, in a 2-axis font with Weight and Italic axes, when a user sets location to wght=700, ital=1, STAT records at wght=700 (“Bold”) and ital=1 (”Italic”) are concatenated, resulting in a Composed name of “Bold Italic”. This name can be assigned to the instance by the application or any other process that handles the font, even if the font has no Named Instances.

Some name components, such as “Regular”, “Roman” or “Upright”, are not expected to become part of a complete font style name. For this reason, it is possible to declare certain STAT records “elidable” (i.e. to be ignored during name composition). Samsa represents such records by placing the name in parentheses, thus “(Regular)”. An elidable STAT record requires flag `0x0002` to be set. In the following TTX dump, the “Regular” weight record is elidable by virtue of Flags=2, but “SemiBold” is not.

```
<AxisValue index="2" Format="1">
    <AxisIndex value="0"/>
    <Flags value="2"/>  <!-- elidable -->
    <ValueNameID value="260"/>  <!-- Regular -->
    <Value value="400.0"/>
</AxisValue>
<AxisValue index="3" Format="1">
  <AxisIndex value="0"/>
  <Flags value="0"/>  <!-- not elidable -->
  <ValueNameID value="261"/>  <!-- SemiBold -->
  <Value value="600.0"/>
</AxisValue>
```

The Regular weight of a font often results in a Composed name where all components are elidable. STAT allows a specific name to be used in this situation, usually the string “Regular”.

#### STAT axis ordering
For the purposes of composition, axis order, may be different from axis order in the `fvar` table, thus a font with  a Width and Weight axis (in that order), can reassign the sort order in the STAT table to ensure that composed names are of the form “_weight_ _width_” (e.g. “Thin Condensed” rather than “Condensed Thin”).

STAT axis order is reflected in the STAT panel in Samsa, and it is generally assumed that UIs, as well as name composition, should respect axis order.

#### Name composition when designspace location of an instance if not fully specified with STAT
No guidance is provided in the OpenType specification for name composition when one or more of the axes is set to a value not recorded in the nominal value of a STAT record. In such cases Samsa adds a numeric value to the Composed name.

### Axes not in the font
A STAT table can store locations on axes that are not variation axes in the font. In other words, the number of “design axes” stored in STAT may be larger than the number of variation axes in the `fvar` table.

While initially counter-intuitive, this possibility makes sense when we consider font families that are split between multiple font files, most commonly Roman and Italic. By means of such STAT records, a Roman variable font asserts that it is at location 0 on the `ital` axis, and its companion Italic variable font asserts that it is at location 1. This way, applications can more easily build UIs that present multiple fonts as one coherent family.

#### STAT and static fonts
Specifying location on axes not in the font applies well to static, non-variable fonts. Thus, a static Black Condensed font that is intended to be part of a variable font family, specifies its location on the Weight and Width axes using a STAT table of two value records: wght=900 (“Black”) and wdth=75 (“Condensed”).

### Range specification
A range can be specified in a STAT record, as well as a value. Samsa represents ranges thus:

_nominalValue [rangeMin, rangeMax]_.

STAT ranges may help apps provide meaningful names even when a designspace location does not exactly match a STAT name’s value, and also allow static fonts to assert their intended range of operation. Although the feature was intended to allow selection of particular optical size masters for ranges of sizes in the real world (e.g. use _Caption_ up to 8pt, use _Text_ from 8pt to 14pt, use _Display_ from 14pt and above), the Adobe Source variable fonts also use ranges for the Weight axis, thus its Regular STAT record has a nominal value of 400, with a range from 350 to 450. It is unclear whether such usage is recommended [June 2020].

Ranges are limited to single-axis STAT records.

### Linked value specification
A linked value can be specified in a STAT record. Typical usage is to link the “Regular” weight to the Bold (so the wght=400 record links to 700) or to link “Roman” on the Italic axis to “Italic” (so the ital=0 record links to 1). Samsa represents ranges thus:

_nominalValue → linkedvalue_.

An app might use this information to build a UI toggle, enabling users to switch easily between Regular and Bold, and Roman and Italic. Note that the linked location, especially regarding the Italic axis, may be in a separate variable font file in the same family.

Linked values are limited to single-axis names. Linked values cannot be combined with a STAT range in the same record. The Adobe Source fonts utilize a Range record and a Linked value record to represent dual functionality, but it is unclear whether such usage is recommended or widely supported [June 2020].

### Multi-axis names (“format 4”)
The STAT table, from version 1.2 onwards, allows more than 1 axis to be specified in a single name record. It is not recommended to use registered axes in this way, since they are designed to be adjusted individually.

Decorative fonts may wish to name settings on combinations of axes. For example a record for “Pointed” might specify locations on 2 custom axes, while in the same font other (registered) axes use simple 1-axis STAT names and values.

Some font engineering tools and workflows assumed incorrectly that multi-axis VFs required multi-axis STAT records, mirroring the Named Instances that were (correctly) being specified in the `fvar` table.

### Font selection UI
If usefully named locations are specified for each axis in the font using the STAT table, it becomes possible to build a UI in applications such that users determine the styling of their font one axis at a time, rather than selecting from a long list of Named Instances. This is expected to bring significant usability benefits, considering the combinatorial explosion of many axes each with many locations.

Example 1: For a VF with Weight and Width axes, a dropdown selector can be offered for each axis: the Weight selector offering Light, Regular, Bold and Black, the Width selector offering Condensed, Normal, Wide and ExtraWide. These same possibilities presented via Named Instances requires 16 records, with the choices probably listed in an unstructured manner in app UI.

Example 2: A 4-axis VF with 6 named locations on each axis requires 1296 (6<sup>4</sup>) Named Instances to list all the possibilities that a STAT-based UI offers using 4 dropdown selectors, each with 6 items.

No apps currently exist with a STAT-based style selection UI [June 2020], though the UI in Samsa itself may be used as a template for user experience.

### Notes
Version 1.0 of the STAT table is deprecated.

### References

* [OpenType spec: STAT](https://docs.microsoft.com/en-us/typography/opentype/spec/stat)
* [OpenType spec: OS/2, usWeightClass](https://docs.microsoft.com/en-us/typography/opentype/spec/os2#uswidthclass)
* [OpenType spec: OS/2, usWidthClass](https://docs.microsoft.com/en-us/typography/opentype/spec/os2#uswidthclass)
