## Font list panel

This list shows the fonts ready to load with a click, an alternative to the drag-drop method of loading fonts. This list can be convenient for the fonts you are currently working on, or for fonts you are using as models to imitate.

### Editing the list of fonts
The list of fonts is stored in the JSON file `samsa-fonts.json`, which you edit with any text editor, making sure not to invalidate the JSON code. You can put as many fonts as you like in the `fonts` list. Place all the font files in the folder referenced in the `directory` property (by default that’s a “fonts” directory at the same level as the Samsa HTML and JS files). The `default` font is the one loaded when a user clicks on the font name above the main glyph window, or in any other UI for default font loading. Remember to avoid a trailing comma after the last file in the list.

Here follows a small version of `samsa-fonts.json`.

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

### Requires http: or https: protocol, not file:

**The font list does *not* work when the Samsa app is run using the `file://` protocol.**

If you double-click `samsa-gui.html` in your file system, the page loads in your browser using the `file:` protocol rather than the usual `http:` or `https:` protocol. (You will see this at the start of the URL in your browser.) Under `file:` Samsa works fine on drag-drop fonts, but it cannot load files from disk dynamically (including the `samsa-fonts.json` file and any fonts). This is a limitation of the `file:` protocol itself.

In order to edit the list of fonts, you need to run Samsa under the `http://` or `https://` protocol. This means operating your own web server, even if from your own computer. Modern desktop computers can be fairly easily configured to run their own “localhost” webserver which “serves” files to the very same computer, and many web developers set up their machines in this way. Advice on setting up localhost is beyond the scope of this help file.

Place all the Samsa files from the GitHub download in a “samsa” folder within the folder that is accessible as localhost. The URL in the browser would be something like:

    http://localhost/samsa/src/samsa-gui.html
