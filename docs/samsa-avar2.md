# samsa-avar2

**samsa-avar2** is an app for testing fonts with an avar 2.0 table.

[**samsa-avar2 app**](https://lorp.github.io/samsa/src/samsa-avar2.html) ← _click to start_

In the left panel, each variation axis in the font is shown with 2 sliders, both of them initially set to the default axis value. For each axis, the upper slider is the input controlled by the user; the lower slider is the effective axis value after transformation by structures in the avar 2.0 table. Each transformed (lower) axis value is potentially affected by the input (upper) positions of all axes (including itself). In this way, one axis can update the locations of multiple axes, and axes can work together to make easy journeys through designspace that were previously almost impossible.

To see the intermediate steps in the transformation of axis values, click the “show normalized” checkbox.

The font samples on the right show the same font, incorporated into the webpage with normal webfont technology. Each is styled by CSS `font-variation-settings`:
* in the upper sample, `font-variation-settings` reflects the axis values set by the user;
* in the lower sample, `font-variation-settings` uses axis values transformed by the avar 2.0 table.

**The lower sample therefore implements a polyfill for avar 2.0 in current [2022-10] browsers.**

[In browsers supporting avar 2.0 (none exist as of 2022-10), the upper sample would show the correct instance, and the upper one would be useless.]

The app is preloaded with a special build of Amstelvar, where the _wght_, _wdth_ and _opsz_ axes drive the parametric axes — so try those three and see how they affect other axis values. Try the app on your own font with the “Choose font” button.

Written by Laurence Penney in 2022 using new avar 2.0-related methods added to Samsa (2019–2022).

## Limitations

This app does not work in current [2022-10] Firefox, which has an issue with fonts that contain a non-standard avar table. Chrome, Safari and Edge should be fine.
