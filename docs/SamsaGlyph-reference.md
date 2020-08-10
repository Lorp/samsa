# SamsaGlyph

Class representing a glyph in the variable font object SamsaFont.

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

Total number of Contours

Type: `Number`

---

### `.numPoints`

Total number of Points

Type: `Number`

---

### `.points`

Array of Points.  

Type: `Array` of `Array`

- Example:

    ```jsx
    [
        [125, 408, 1],
        [116, 468, 0]
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

Convert glyph’s points to be used an SVG <path> "d" attribute

**Returns:** 

`String`

**Source:** 

[samsa/src/samsa-core.js:525](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js#L525)

## Source

[samsa/src/samsa-core.js](https://github.com/Lorp/samsa/blob/master/src/samsa-core.js)
