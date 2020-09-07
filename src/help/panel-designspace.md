## Designspace panel

This panel offers a 2-axis controller, using Cartesian _x_ and _y_ axes to adjust axis locations in the font’s designspace. Click and drag to change designspace location.

Initially, the first variation axis in the font is assigned to the _x_ axis, and the second variation axis (if it exists) is assigned to the _y_ axis. It is possible to assing multiple variation axes to a single Cartesian axis, allowing multiple variation axes to be adjusted synchronously.

The graph uses normalized variation axis coordinates, thus each axis runs from -1 to 1, with the Default instance at (0,0).

### Normalized axis locations
The graph shows values from -1 to 1 on the _x_ axis, and -1 to 1 on the _y_ axis. Axis minima are normalized to -1, axis defaults are normalized to 0, and axis maxima are normalized to 1. The instance at the centre of the graph (0,0) is the default instance.

If any axis has minimum = default, then the region between -1 and 0 will remain at default. Likewise, if any axis has maximum = default, then the region between 0 and 1 remain at default. This can lead to some quadrants in the designspace graph being unresponsive, which is intentional.

### Default setup
Initially, _x_ is set to the first axis in the font, _y_ to the second (if present). All of the variation axes are listed under the graph, and using the checkboxes you can reassign variation axes to the Cartesian axes of the control.

### Multiple axis assignment
You can assign multiple variation axes to a single Cartesian axis of the control. When 2 or more axes are assigned to a Cartesian axis, the controller adjusts those axes synchronously.

For example, if axes XTRA and YTRA are assigned to _x_, and no axes are assigned to _y_, then horizontal movement in the controller will adjust both those axes synchronously, while vertical movement will have no effect.

Any number of variation axes can be assigned to _y_ as well as  to _x_ except that a variation axis may not be controlled by both _x_ and _y_ simultaneously. If one variation axis is assigned to both Cartesian axes, the background of the selector changes colour to red to indicate an invalid state.

### Feature variations (“rvrn”)
Feature variations are visualized in the Designspace panel. If the glyph has Feature variations, one or more coloured zones appear, illustrating the “conditions” (or parts of the designspace) where it takes effect. As the user drags the mouse in and out of such zones, the glyph in the main window switches.
