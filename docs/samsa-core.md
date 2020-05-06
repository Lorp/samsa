# Samsa-Core (samsa-core.js)

Samsa-Core is the JavaScript library at the heart of Samsa. It provides numerous functions for parsing variable fonts (VFs), creating VF instances, presenting VFs as SVG, and exporting static TTFs.

These functions are used in the graphical tool [Samsa-GUI](samsa-gui.md), the command-line utility [Samsa-CLI](samsa-cli.md) and the polyfill demo [Samsa-Polyfill](samsa-polyfill.md).

## SamsaVF object
`SamsaFont` is the main font object. Some methods:

```
getNamedInstances()
addInstance()
makeInstance()
fvsToTuple()
tupleToFvs()
axisIndices()
axisNormalize()
axisDenormalize()
```

## Notable functions
```
glyphApplyVariations()
getGlyphSVGpath()
SamsaVF_compileBinaryForInstance()
```
