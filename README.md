# Samsa

[**Samsa web app**](https://lorp.github.io/samsa/src/samsa-gui.html) ← _click to start_

Samsa is a web app that visualizes how variable fonts (VF) work. Type designers, font developers, front end developers and others can use Samsa to open VFs, then inspect VF glyph outlines and other data as they explore the VF designspace using sliders and other UI controls.

[Detailed video presentation May 2020 (90 mins)](https://www.youtube.com/watch?v=T75bZ7ooiFQ)

![Mutator](screenshots/20191119%20Mutator%20S.png?raw=true)

Samsa uses the [Samsa-Core](https://github.com/Lorp/samsa-core) JavaScript library for processing variable fonts. The library implements much of the [OpenType 1.8 Variations](https://docs.microsoft.com/en-us/typography/opentype/spec/otvaroverview) specification.

Samsa-Core can also output static TrueType (TTF) fonts, and the Samsa web app provides export of static TTFs from any designspace location. (Note: These are not production ready.)

Samsa is written in ES6 JavaScript with no dependencies. It is normally installed on web servers, but can also be run from any folder with no server setup by double-clicking `samsa-gui.html`.

Also provided are: a command-line utility, Samsa-CLI (`samsa-cli.js`, for execution via Node.js); and a simple browser VF polyfill, Samsa-Polyfill, `samsa-polyfill.js`. These are both very short scripts that depend on the Samsa-Core library.

## Documentation

* [**Samsa**](docs/samsa-gui.md) is the main web app.
* [**Samsa-CLI**](docs/samsa-cli.md) is a command-line utility for generating static instances from VFs. It is executed using Node.js.
* [**Samsa-Core**](docs/samsa-core.md) is the JavaScript library that powers Samsa-GUI and Samsa-CLI.
* [**Samsa-Polyfill**](docs/samsa-polyfill.md) is a demo that uses Samsa-Core to implement a VF polyfill in browsers.

## Try Samsa

There are several ways to try Samsa:

* Visit [www.axis-praxis.org/samsa](https://www.axis-praxis.org/samsa/)
* Visit [lorp.github.io/samsa](https://lorp.github.io/samsa/src/samsa-gui.html)
* Download the repository and double-click `samsa-gui.html`
	* This works well for drag-drop usage, but does not allow fonts to be loaded from a server.
* Download the files and install on a web server
	* You can make a symbolic link from index.html to samsa-gui.html or simply rename samsa-gui.html to index.html
	* Edit `samsa-config.js` to change the fonts in the Fonts panel
	
## Try some fonts in Samsa

There are many open source variable fonts to try in Samsa, including:
* [Google Fonts](https://fonts.google.com/?vfonly=true) (215 VFs)
* [IBM Plex Sans Var](https://github.com/IBM/plex/tree/master/IBM-Plex-Sans-Variable) (2 VFs)
* Adobe [Source Serif, Source Sans, Source Code](https://github.com/adobe-fonts) (6 VFs)
* [Amstelvar](https://github.com/TypeNetwork/Amstelvar/) (2 VFs, 12 axes each)
* [Decovar](https://github.com/TypeNetwork/Decovar/) (1 VF, 15 axes)
* many open source and trial fonts at [Axis-Praxis](https://www.axis-praxis.org) and [V-Fonts.com](https://v-fonts.com/)

## Related apps & demps

* [Samsa Polyfill Demo](https://lorp.github.io/samsa/src/samsa-polyfill.html) — [_documentation_](docs/samsa-polyfill.md)
* [avar2 demo](https://lorp.github.io/samsa/src/samsa-avar2.html) — [_documentation_](docs/samsa-avar2.md)

## Background

The Samsa project grew out of:

* 2013 work on TTJS, a browser-based TTF outline editor in JavaScript
* 2017 work to write a VF browser polyfill
* 2017–2018 work to extend [Axis-Praxis](https://www.axis-praxis.org) in order to visualize what happens inside VFs as designspace location changes

An early version of the VF polyfill was demo’d at TYPO Labs 2017 [[video](https://www.youtube.com/watch?v=16QIZrRxafY&t=45m16s)]. The visualization project took a separate development path from Axis-Praxis, and an early version of Samsa was demo’d at TGA Raabs 2017 and TYPO Labs 2018.

With support from Google Fonts in 2019, Samsa now has numerous fixes and other improvements including a new UI, and is released under the Apache-2.0 license.

The name Samsa comes from [Gregor Samsa](https://en.wikipedia.org/wiki/The_Metamorphosis#Gregor_Samsa), the protagonist of Franz Kafka’s story, *The Metamorphosis*.

	
## Contributing

Feedback and contributions (UI ideas, feature ideas, code) are welcome. Please use the GitHub issues system to report bugs and to suggest improvements.
