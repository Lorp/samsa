## UI panel

[to complete]

You can choose between the following themes:

* light
* dark
* loci
* preview

Each themes defines a set of values that control graphical presentation in the main window. This includes the width and colours of lines, including arrows, the fill colours of the glyph (both default and instance), and the style of point numbers.

Note that arrow colours correspond to the Delta Set that each one represents. Thus a Delta Set coloured green is represented graphically by green arrows.

### Arrows

We can choose different visualizations of the arrows, representing the deltas applied to each point.

* total arrows: total deltas for each point
* split arrows: individual deltas from each delta set

Note in the colours of the split arrows matches the colour of the delta set which they represent.

### SVG exporting

### Custom themes

You can add your own themes by adding to the `CONFIG.uiModes` object. Copy one of the existing themes such as the “light” theme, and edit stylistic properties:

* stroke width, stroke colour and fill colour for glyphs, with default styled separately from the current instance;
* style of control points for default and instance glyphs;
* style of coordinate axes
* style of point numbers

