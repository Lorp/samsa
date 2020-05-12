## Font list panel

This list shows the fonts ready to load with a click, an alternative to the drag-drop method of loading fonts. This list can be convenient for the fonts you are currently working on, or for fonts you are using as models to imitate.

### Editing the list of fonts
The list of fonts is stored in the JSON file `samsa-fonts.json`. You can put as many fonts as you like in the `fonts` list. Place all the font files in the folder referenced in the `directory` property. The `default` font is the one loaded when a user clicks on the font name above the main glyph window, or in any other default font loading. Remember to avoid a trailing comma after the last file in the list. Here follows a small version of `samsa-fonts.json`.

```
{
  "directory": "fonts",
  "default": "MutatorSans.ttf",
  "fonts": [
    "Amstelvar-Roman-VF.ttf",
    "DecovarAlpha-VF.ttf",
    "Gingham.ttf",
    "MutatorSans.ttf"
  ]
}
```

### Requirements
The list does *not* work when the Samsa app is run using the `file://` protocol. In other words, if you double-click `samsa-gui.html` in your file system, the app will run but without the capability to load files dynamically. The font list itself cannot be loaded, nor can the fonts that it references, hence the _Fonts to load_ panel will be empty.

To fix this, run the Samsa app under the `http://` or `https://` protocol. This means serving it from a real webserver, either public or private. Modern desktop computers can be fairly easily configured to run their own webserver, and many web developers set up their machines in this way. Typically you would run Samsa in its own folder, and the URL in the browser would be something like:

    http://localhost/samsa/samsa-gui.html
