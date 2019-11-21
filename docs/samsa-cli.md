# Samsa-CLI

Samsa-CLI (samsa-cli.js) is a Node.js command-line utility for performing operations on variable fonts (VFs). It uses the [Samsa-Core](samsa-core.js) library, so it requires samsa-core.js.

## Execution

Run it using Node.js:

`node samsa-cli.js`  

The library file `samsa-core.js` must be in the same directory.

## Options

Define the input and output font files using `--input-font` and `--output-font`:

`--input-font <variable-ttf-file>`  
`--output-font <static-ttf-file>` (default = `samsa-out.ttf`)

Define a variation to be instantiated:

`--variation-settings <axis1> <value1> [<axis2> <value2>...]`  

To instantiate all named instances as static fonts:

`--named-instances`  

## Examples

```
node samsa-cli.js --input-font Gingham.ttf --variation-settings wght 634 wdth 5
node samsa-cli.js --input-font Gingham.ttf --variation-settings wght 300 wdth 75 --named-instances
```

## Performance

Initial tests indicate that it is much faster (approx. 40x) than fontTools at instantiation.

## Limitations
The fonts produced are not production ready. Limitations include:

* no support for GSUB, GPOS, STAT tables.
* checksums are not performed

Exporting production ready fonts will depend on improvements to samsa-core.js.
