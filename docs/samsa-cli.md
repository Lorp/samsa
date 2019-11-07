# Samsa-CLI

The only function currently is instantiation. Command-line arguments define the input font and control which instances will be generated as static fonts.

Run it using Node.js:

`node samsa-cli.js`  

The command line options are to declare the variable font being used:

`--input-font <variable-ttf-file>`  

This option creates a new non-variable font using the given axis settings:

`--variation-settings <axis1> <value1> [,<axis2> <value2>...]`  

This creates new non-variable fonts for all the named instances in the variable font:

`--named-instances`  

Initial tests show that it is much faster (approx. 42x) than fontTools at instantiation. Note that the fonts produced are not production ready, lacking support for several variation tables.
