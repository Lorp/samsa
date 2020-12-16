## UI panel

The UI panel allows you to switch between named UI themes and also offers toggles for some metadata for glyph control points.

Each theme controls glyph presentation in the main window in terms of stroke style, fill style, style of the control points, style of delta arrows, style of point tangents, and style and position of point numbers. The default glyph and the current instance glyph are styled independently in terms of fill and stroke.

The pre-installed themes are:

* **light**: default (white background)
* **dark**: a kind of dark mode of the default (black background)
* **loci**: see below
* **preview**: shows current instance glyph only, black on white

Press space at any time to switch to “preview” UI mode temporarily.

Samsa users may edit the existing styles and add new styles. See below for notes on editing styles.

### Toggles

* **Split deltas**: Shows a set of arrows for each point, representing the individual deltas by which that point is moved in this instance. *Each arrow is coloured using the same scheme as in the Delta sets panel.* Expanding the associated Delta set reveals the numeric coordinate deltas corresponding to the set of arrows. Explicit deltas are shown using solid lines and black text, implicit deltas (IUP) are shown using dotted lines and grey text.
* **Total deltas**: Shows a single arrow for each point, representing the total point movement that point undergoes in this instance. This total movement is the sum of the individual deltas applied to each point at the current designspace location.
* **Point numbers**: The 0-based point numbers for the glyph, including the 4 “phantom points” representing horizontal and vertical metrics that are automatically appended to each glyph before variations processing.
* **Tangents**: For off-curve points, tangents point in the direction of the on-curve point to which they are closely related. Contours without off-curve points do not display tangents.

### Loci (singular: locus)

Definition of locus:

> a curve or other figure formed by a point moving according to mathematically defined conditions

The `loci` theme shows, using “railway track” lines in the main window, the locus of each point as one or more axes is moved from -1 to +1. Samsa records and displays a trace of each point as an axis is moved from -1 to +1. A maximum of two sets of loci can be displayed at the same time.

The display of loci works in conjunction with the Designspace panel. By default:

* axis 0 (i.e. the first axis in the font) is assigned to the x-axis and shown in blue;
* axis 1 (i.e. the second axis in the font, if it exists) is assigned to the y-axis and shown in red.

It will be noted that the colours, blue and red, are used both for the Designspace view and the loci that represent all possible locations for each point.

The Designspace panel is used to assign the axes to be visualized as loci. Using the Designspace axis controls, 1 or more variation axes can be attached to a single cartesian axis, and then those sets of axes are traversed in sync. Thus a Designspace UI can be set up where axes *A* and *B* are attached to the (blue) x-axis and axes *C* and *D* are attached to the (red) y-axis. These same relationships are then employed in the display of loci, using a blue “railway track” to represent synchronized movement along axes *A* and *B* at the same time, and a red “railway track” to show synchronized movement along *C* and *D*.

When moving axes synchronously, adjustment of designspace location is best done by dragging in the Designspace panel.

Note that, in general, intermediate masters cause “kinks” in loci, because deltas in general are not aligned. Being a kind of intermediate, the Default glyph acts in this way too, so it is normal to see kinked loci.

For a theme to display point loci, set its `loci` object, for example:

```
{
	steps: 40,
	strokeWidth: 6,
	style: "railway", // "railway" or "line"
	opacity: 0.7,
}
```

### Editing themes

You can edit one of the four default themes or add your own themes. Both require editing the `CONFIG.uiModes` object in `samsa-gui.html`. For a new theme, copy one of the existing themes such as the “light” theme, give it a new key and a new name, and edit stylistic properties:

* stroke width, stroke colour and fill colour for glyphs;
* style of control points for default and instance glyphs;
* style of coordinate axes
* style of point numbers
* style of tangents

Notes:

* The default glyph is styled separately from the current instance glyph.
* Arrow colours correspond to the Delta set to which this delta belongs. Thus a Delta set coloured green in the Deltas sets panel is represented in the main window by green arrows.
* The unit of length is SVG `px`.
