## Axes panel

This panel displays data about the axes in variable font. For each axis, we can see:

* the 4-character tag name, e.g. `wght`
* the human-reable name, e.g. “Weight”
* the minimum value
* the default value
* the maximum value
* the current value

Initial data for the axes panel comes from the font’s `fvar` table.

### Number format
This offers multiple views on the minimum, default, maximum and current values:

* **user**: the value in decimal;
* **userhex**: the value in hexadecimal, multiplied by 65536 (0x10000) in accordance with the 16.16 format — these hex values can be observed when inspecting font binaries;
* **norm**: the normalized value, after the value has been transformed into a value in the range [-1,1];
* **normhex**: the normalized value in hexadecimal, multiplied by 16384 in accordance with the 2.14 format.

Note that both norm and normhex views incorporate avar mapping, if the font contains an avar table.

### +/- buttons
These buttons increment and decrement the current normalized value by the smallest possible amount, which is 1/16384, or (in 2.14 format) 0x0001. In “normhex” number format we can see these values incrementing and decrementing by 1. These controls are particularly useful in examining behaviour near intermediate masters.

### avar table
If the font has an `avar` table, that is shown graphically if you click the checkbox to make it visible.

### References

* [OpenType specification: fvar](https://docs.microsoft.com/en-us/typography/opentype/spec/fvar)
* [OpenType specification: avar](https://docs.microsoft.com/en-us/typography/opentype/spec/avar)