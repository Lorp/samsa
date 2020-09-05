# Samsa

Samsa is a web app for the visualization of variable fonts (VFs) that runs in any modern browser.

## UI summary
The basic design principles are:

* focus on the glyph, and all the changes that happen to its points
* the idea of “panels” to visualize and control aspects of the glyph and the designspace location
* allow new panels to be added easily

Panels are currently placed in the left column. The panel UI may be improved to allow moving, resizing, and hiding panels.

## Code

For parsing VFs, making instances, converting them to SVG, and exporting them as static TTFs, Samsa relies on the [Samsa Core](samsa-core.md) JavaScript library. This is a single JavaScript file with no dependencies.

In respect of VFs, Samsa is a read-only tool. However, it is built on the [Samsa Core](samsa-core.md) library, which can export static instance TTFs, and therefore it made sense to offer static TTF export from any location in the VF’s designspace. Note that these exported TTFs are not production-ready.

## Quick start
Clone the GitHub repo, double-click on `samsa-gui.html`. This opens Samsa in your default browser.

You can also place the Samsa files on a web server, whether localhost or on the web.

Required files and folders:

* `samsa-gui.html`
* `samsa-core.js`
* `samsa-gui.css`
* `samsa-config.js` (can be empty)
* `fonts/`
* `fonts/ui/*`

Optional files and folders:

* `fonts/<font1.ttf>` — any number of fonts to appear in the “Fonts ready to load” panel

## samsa-config.js

This file is intended for Samsa customization. It can be empty, or even absent (though the latter will cause an error).

An important use case is to populate the “Fonts ready to load” panel with a custom list, the `CONFIG.fontList` array. Each object in the array has a `url` property pointing to a font available on the same domain as Samsa (so use relative URLs). Loading these font files is  performed by JavaScript’s `fetch()` function, which requires a web server setup (e.g. Apache), so these _will not work_ when Samsa is invoked by simple double-click. However, local files can be converted to base64 and embedded in `samsa-config.js` using the `file:` protocol. The online converter [base64encode.org](https://www.base64encode.org) produces suitable base64 strings from uploaded files. This repo’s `samsa-config.js` includes MutatorSans.ttf in this way (commented out) to show the syntax. This method is also suitable for automatic generation of `samsa-config.js`, as is done in [Variable Font Test HTML script](https://github.com/mekkablue/Glyphs-Scripts/) by [@mekkablue](https://github.com/mekkablue), which invokes a just-downloaded version of Samsa. Setting the `preload` property to true causes that font to be loaded immediately.

Customizations to the UI themes are also best done in `samsa-config.js`. Edit the `CONFIG.panels` array to change the order and positioning (left or right) of the panels. By default the Glyphs panel is on the right, all other are on the left.

`samsa-config.js` replaces the previous functionality that used `samsa-fonts.json`.

## Panels

### Info panel
Basic font info.

### Axes panel
Try various number formats!

Click the home, min, and max icons to set all axes to default, min and max.

### Instances panel
* **Export static TTF**: Click the down arrow in a circle next to each instance, and get an instantiated static TTF immediately in your Downloads folder. This works for custom instances that you have just made, as well as named instances from the VF.

* **Visibility**: The eye icon, not yet working.


### UI panel
Offers adjustments to the UI.

### Glyphs panel
Shows all glyphs in the font in order of glyph id.

* **Play/Next/Previous** Click the “Play” button in the Glyphs panel. You can adjust sliders freely while the glyph set is playing.


### Fonts ready to load panel
Shows fonts stored on the server. This list comes from `fonts/fontlist.json`.

### Tuples panel

This is useful to understand what happens with intermediate masters and corner masters. Try MuybridgeGX.ttf, and watch the tuple combinations vary as you drag the TIME slider.

Observe the multiplication of tuples in corner masters. In other words, note that a tuple representing the corner of a 2D designspace with both axes set to 0.5 (normalized) will have a scalar of 0.5 * 0.5 = 0.25. The corner tuple of a 3-axis font, with all axes at 0.5, has a scalar of 0.5³ = 0.125.

### Designspace panel

Use Command-click to assign multiple VF axes to either the X or Y axis of the 2D designspace view.

