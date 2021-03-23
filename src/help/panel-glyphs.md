## Glyphs panel

The Glyphs panel shows all glyphs in the font in their native glyph order. The glyph names are shown initially.

### Toggle glyph names / glyph ID
Click the 123 icon in the title bar of the panel to switch between glyph name and glyph ID.

### Filter glyphs

You can filter glyphs in four ways, by glyph name, by glyph id, or by a string of characters.

Use _Filter by name or id_ to filter by the glyph names that you want. Type “alpha” to obtain all glyphs with “alpha” in the glyph name. The search uses a case-insensitive regular expression, allowing you to filter by names that start with or end with a custom string: “^do” obtains all glyphs starting with “do”; “ar$” obtains all glyphs ending with “ar”; “^a$” obtains only glyphs named “A” or “a”.

Also use _Filter by name or id_ for glyph ids. Integers typed here are treated as glyph ids. Ranges are also allowed, using a hyphen, so “20-30” obtains the 11 glyphs with those ids.

Use _Filter by string_ to obtain the glyphs needed to render a given string. Thus, “Hello world” obtains the 8 glyphs needed for that string: “<space>Hdelorw”.

Use the _Filter by type_ checkboxes to filter glyphs by their type. Each glyph is simple, composite or blank.

### Navigate to next and previous glyphs
Click the forward or back buttons in the title bar of the panel to move to the next or previous glyphs.

### Play the glyph set
Click the triangular Play button to step through all glyphs in the font, then the square Stop button to stop. This can be useful for quickly previewing a font. The axis controls and UI modes can be freely adjusted as Samsa steps through the glyph set.

