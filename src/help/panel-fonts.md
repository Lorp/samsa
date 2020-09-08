## Fonts panel

This shows a dropdown selector of all the fonts ready to load, an alternative to the drag-drop method of loading a font. This list can be convenient for the fonts you are currently working on, or for fonts you are using as models to imitate.

### Editing the list of fonts
The list of fonts is set up using the file `samsa-config.js`. Edit it with any text editor, imitating the format of the existing records.

* Add as many fonts as you like to the `CONFIG.fontList` array.
* Place all the font files in the fonts folder at the same level as the Samsa HTML and JS files.
* Add a `preload: true` property to the font you want to load automatically.

### Limitations of the file: protocol

If you double-click `samsa-gui.html` in your file system, the page loads in your browser using the `file:` protocol rather than the usual `http:` or `https:` protocol of the web. (You will see this at the start of the URL in your browser.) Samsa works fine this way with drag-drop fonts, but it cannot load files from disk dynamically (including those defined in `samsa-config.js`). This is a limitation of the `file:` protocol itself.

### Running Samsa in a web server allows dynamic font loading
The recommended method of installing Samsa so you can add your own fonts to the list is to run from a web server. This could be a public web server, a private company server, or your local machine as `localhost`. You will then operate under the `http://` or `https://` protocols and Samsa will be able to load font files dynamically. There are numerous online guides to help you set up a web server locally — many web developers set up their machines in this way.

### Using base64 encoding and the file: protocol
Another method, that works well even on the `file:` protocol (so it works when activating Samsa with a double-click), requires you to convert your font files into a base64 encoded string, then to insert that string itself into `samsa-config.js`. The online converter [base64encode.org](https://www.base64encode.org) produces suitable base64 strings from uploaded files. This repo’s `samsa-config.js` includes MutatorSans.ttf in this way (commented out) to show the syntax.

Note: This method is also suitable for automatic generation of `samsa-config.js`. This is how [Variable Font Test HTML script](https://github.com/mekkablue/Glyphs-Scripts/) by [@mekkablue](https://github.com/mekkablue) works. Setting the `preload` property to true causes that font to be loaded immediately.
