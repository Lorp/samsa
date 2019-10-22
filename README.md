# Samsa

Samsa is a suite of tools for variable font development. It is written in vanilla JavaScript

Included are *Samsa-GUI*, a front-end font inspector and *Samsa-CLI*, a command-line utility for instantiating variable fonts. Also included is *Samsa-Polyfill*, a demo variable font polyfill for browsers. The library functions are all in *Samsa-Core* (samsa-core.js), see below.

## Samsa-GUI

Undergoing a rewrite. Currently redesigning the UI as well as the interface to Samsa-Core.

Old version: ``

New version: `samsa-gui.html`

## Samsa-CLI

Samsa-CLI is a command-line utility that performs useful functions on variable fonts. It uses the same library as Samsa-GUI: Samsa-Core (samsa-core.js).

### Instantiation
Its only function so far is instantiation. There are command-line arguments to define the input font and to control instantiation.

Run it using Node.js:

`node samsa-cli.js`  

The command line options are to declare the variable font being used:

`--input-font <variable-ttf-file>`  

This option creates a new non-variable font using the given axis settings:

`--variation-settings <axis1> <value1> [,<axis2> <value2>...]`  

This creates new non-variable fonts for all the named instances in the variable font:

`--named-instances`  


## Samsa-Core

Refactoring during October 2019, moving many functions to Samsa-Core.

