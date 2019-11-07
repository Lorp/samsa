# Samsa

Samsa is a web app that visualizes how a variable font (VF) works. Type designers, font developers, front end developers and others can use Samsa to open VFs, then inspect VF glyph outlines and other data as the VF designspace is explored.

Samsa uses the Samsa-Core JavaScript library for processing variable fonts. This library implements the [OpenType 1.8 Variations](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview) specification. Samsa-Core can also output static TrueType (TTF) fonts, and the Samsa web app provides export of static TTFs from any designspace location.

Samsa is written in ES6 JavaScript with no dependencies. It is normally installed on web servers, but can also be run from any folder with no server setup.

Also provided are a command-line utility, Samsa-CLI, and a simple browser VF polyfill, Samsa-Polyfill. They both depend on the Samsa-Core library.

## Detailed documentation

* [**Samsa**](docs/samsa-gui.md) is the main web app.
* [**Samsa-CLI**](docs/samsa-cli.md) is a command-line utility, executed using Node.js, for generating static instances from VFs.
* [**Samsa-Core**](docs/samsa-core.md) is the JavaScript library that powers Samsa-GUI and Samsa-CLI.
* [**Samsa-Polyfill**](docs/samsa-polyfill.md) is a demo that uses Samsa-Core to implement a VF polyfill in browsers.

## Try out Samsa

There are several ways to try Samsa:

* Go to lorp.github.io/samsa for the latest release.
* Download the repository and double-click `samsa-gui.html`
	* This works fine for drag-drop usage, but will not allow fonts to be loaded from the server.
* Download the files and install on a web server
	* You can make a symbolic link from index.html to samsa-gui.html or simply rename samsa-gui.html to index.html

## Background

The Samsa project grew out of work in 2017 to write a VF browser polyfill (an early version was demo’d at [TYPO Labs](https://www.youtube.com/watch?v=16QIZrRxafY&t=45m16s)) and also to extend [Axis-Praxis](https://www.axis-praxis.org) in order to visualize what happens inside VFs as designspace location changes. The polyfill was itself a development of @Lorp’s TTJS of 2013, a browser app that allowed reading, editing and writing of TrueType fonts. The visualization project took a separate development path from Axis-Praxis, and Samsa was demo’d at TGA Raabs 2017 and TYPO Labs 2018. With support from Google Fonts in 2019, Samsa now has numerous fixes and other improvements including a brand new UI, and is to be released under the Apache-2.0 license.

## Contributing

Feedback and contributions (UI ideas, feature ideas, code) are welcome. Please use the GitHub issues system to report bugs and to suggest improvements.