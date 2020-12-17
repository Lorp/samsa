# Samsa-CLI

Samsa-CLI (samsa-cli.js) is a Node.js command-line utility for performing operations on variable fonts (VFs). It uses the [Samsa-Core](samsa-core.js) library, so it requires samsa-core.js, as well as Node.

## Installing Node.js
[Download Node.js](https://nodejs.org/en/download/) for your platform.

## Arguments

**`--instances "<instanceDef[;instanceDef]>"`**  
  Introduces a list of instance definitions, separated with ";". Use quotes 
  to avoid space and semicolon being handled incorrectly by the shell. An
  instance definition may be:
  
* A specific location in the font’s designspace, specifying axis tags and values in pairs (e.g. "`wght 633 wdth 88 ital 1`").
* The special value "`default`", which generates the default instance.
* The special value "`named`", which generates all named instances in the font.
* The special value "`stat`", which generates all possible combinations of axis values specified by the STAT table. For example, if a STAT table records 5 axis values for `wght` and 3 axis values for `wdth`, we get the 15 (=5*3) possible combinations of instances. Note that this can lead to the generation of very many instances in some fonts. Any Format 4 STAT values are also included.

**`--instance, -i`**  
Synonyms for `--instances`.

**`--output, -o <filename>`**  
Outfile filename, overrides default "samsa-instance".

**`--optimize, -O <memory|speed|size>`**  
Optimize for low memory, high speed, instance size (default = speed), comma-separated. Note that very large fonts may require the “memory” optimization.

**`--quiet, -q`**  
Quiet mode, no console output.

**`--list, -l`**  
List instances, do not write any files.

## Examples

Print out this short help info:  
`% node samsa-cli.js`

Make static fonts for all named instances:  
`% node samsa-cli.js Gingham.ttf --instances named`

Make static fonts for all named instances (switching to short -i syntax):  
`% node samsa-cli.js Gingham.ttf -i named`

Make static fonts for all named instances optimized for smaller output size and low memory usage:  
`% node samsa-cli.js Gingham.ttf -i named -O size,memory`

Make static fonts for all stat instances:  
`% node samsa-cli.js SourceSans.ttf -i stat`

Make a static font for the custom instance at wght 245, wdth 89:  
`% node samsa-cli.js Skia.ttf -i "wght 345 wdth 89"`

Make a static font for the default instance:  
`% node samsa-cli.js Skia.ttf -i default`

Make static fonts using multiple instance specifications separated with ";":  
`% node samsa-cli.js Skia.ttf -i "named;stat;wght 345 wdth 89;wght 811 wdth 180;default"`

## Performance

Initial tests indicate that it is much faster (approx. 40x) than fontTools at instantiation.

## Limitations
The static fonts exported are not yet production ready. Limitations include:

* no support for GSUB, GPOS, STAT, MVAR tables (GSUB and GPOS tables are identical to input font, MVAR data is ignored, is STAT data is not exported to static fonts)
* no support for Feature Variations (aka `rvrn`)
* sfnt table checksums are all set to zero
* the name table remains identical to the input font

Exporting production ready fonts will depend on improvements to samsa-core.js.
