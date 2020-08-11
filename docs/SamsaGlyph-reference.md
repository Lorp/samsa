# SamsaGlyph

Class representing a glyph in the variable font object SamsaFont. They are usually stored in arrays as the `glyphs` property of either a `SamsaFont` object or an instance object.

## Constructor

### `SamsaGlyph( init )`

**Parameters:**

1. `init` : `Object`

```jsx
init: {
    id: Number, 
    name: String, 
    font: SamsaFont Object
}
```

**Returns:** 

`SamsaGlyph`

**Example:**

```jsx
new SamsaGlyph({
    id: this.id, 
    name: this.name, 
    font: this.font
});
```

## Properties

### `.curveOrder`

Type: `Number`

---

### `.endPts`

Type: `Array` of `Number`

---

### `.font`

Refer to its parent SamsaFont

Type: `Object (SamsaFont)`

---

### `.id`

Glyph id in the SamsaFont

Type: `Number`

---

### `.instructionLength`

Type: `Number`

---

### `.name`

Glyph’s name, such as "A"

Type: `String`

---

### `.numContours`

Total number of Contours for simple glyphs. It is `-1` for composite glyphs.

Type: `Number`

---

### `.numPoints`

Total number of Points, not including phantom points. For simple glyphs, `.numPoints` is 4 less than `.points.length`. Composite glyphs do not use `.numPoints`.

Type: `Number`

---

### `.points`

Array of Points, including phantom points. For simple glyphs, `.points.length` is 4 more than `.numPoints`. For composite glyphs, the points represent the offsets of each of the components, therefore `.points.length` = <number of components> + 4.

Type: `Array` of `Array`

- Example:

In this example, points 0 to 3 define a rectangle, and points 4 to 7 are the phantom points which Samsa has automatically added. The advance width is always the first element in the point 3rd from last, in this case 500. Note that `.numPoints` in this example is 4.

```jsx
[
	[50, 0, 1],
	[450, 0, 1],
	[450, 700, 1],
	[50, 700, 1],
	[0, 0],
	[500, 0],
	[0, 0],
	[0, 0]
]
```

---

### `.xMax`

Type: `Number`

---

### `.xMin`

Type: `Number`

---

### `.yMax`

Type: `Number`

---

### `.yMin`

Type: `Number`

---

### `.tvts`

Array of tuple variable table (`tvt`) data structures. Each `tvt` defines:
* a table of delta x,y movements for a subset of points (or components) in this glyph
* the region of application in designspace using start, peak and end locations for each axis

Type: `Array` of `Object`

## Methods

### `.decompose ( tuple , params )`

Decompose a composite glyph into a new simple glyph

**Parameters:**

1. `tuple` : `Array`
2. `params` : `Object` – (optional)

**Returns:**  

`Object (SamsaGlyph)`

**Source:** 

[samsa/src/samsa-core.js:201](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L201)

---

### `.instantiate ( userTuple , instance , extra )`

Take a default glyph and return the instantiation produced using the userTuple or instance settings

**Parameters:**

1. `userTuple` : `Array` or `null`
2. `instance` : `Object`
3. `extra` : `Object` – (optional)

**Returns:** 

`Object (SamsaGlyph)`

**Example:** 

```jsx
glyph.instantiate(null, instance)
```

**Source:** 

[samsa/src/samsa-core.js:311](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L311)

---

### `.svgPath ()`

Convert glyph’s points to a string that can be used as an SVG <path> "d" attribute.
	
Coordinates are identical to those used in the font, so the SVG typically needs scaling and flipping vertically. The transformation is typically perfomed in an enclosing `<g>` tag to transform multiple SVG elements together.

**Example:**

```jsx
glyph.svgPath();
```

Result: `"M50 0L450 0L450 700L50 700Z"`

```svg
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
	<g transform="translate(0,500) scale(0.5,-0.5)">
		<path d="M50 0L450 0L450 700L50 700Z"></path>
	</g>
</svg>
```

**Returns:** 

`String`

**Source:** 

[samsa/src/samsa-core.js:525](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L525)

## Source

[samsa/src/samsa-core.js](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js)