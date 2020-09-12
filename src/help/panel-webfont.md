## Webfont panel

This editable panel (just type in the box) displays text in the current font using the browser’s normal methods for rendering TrueType-flavour webfonts, avoiding all special handling by Samsa. On macOS, Safari, Chrome and Firefox all use the macOS system renderer.

It can be useful to compare the Webfont display with Samsa, especially Samsa’s Preview mode, to help track bugs in Samsa or indeed bugs in the browser’s renderer. Note that the Webfont text is set at `font-size: 50px`, which is the same size as the glyphs in the Glyphs panel.

Note that characters not in the font will render in a fallback font such as Times or Lucida Grande.