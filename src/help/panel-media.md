## Media panel

This panel is for exporting graphics in various formats.

### SVG
This button exports the current glyph visualization as an SVG file. The current image is already SVG, so the exported SVG is in fact exactly the same data.

#### Font units 

When processing SVG images, the `transform` attribute allows Samsa to use native font coordinates to display the glyph. In the following example, the first three control points in the glyph outline represented in this SVG have the same coordinates in the original font, thus (-42,0), (320,660), (350,660), thanks to the translate and scale components of the `transform` attribute.

```
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" style="background-color: transparent;">
	<g id="svg-transform-group"
	transform="translate(130,500) scale(0.5,-0.5)">

	<path d="M-42 0L320 660L350 660L434 0L404 0L356 
	396Q350 452 343 509Q336 566 330 626L326 626Q296 
	565 266 510Q236 455 204 396L-12 0ZM104 238L112 
	264L392 264L386 238Z"
	stroke="none" stroke-width="0" fill="black">
	
	</g>
</svg>
```

 Note that the _y_ scale is negative because we need to invert the _y_ coordinates from the font coordinate system (which has positive y as up) to the SVG coordinate system (which has positive y as down).
 
### PNG

This button exports a PNG file of the current glyph visualization.

#### How it works

This turns out to be easy to achieve. We have the current visualization as SVG already. We render that on an HTML canvas element, then capture the pixels as PNG and export the file.

### MP4 [seems to work only in Firefox]

This button generates lots of animation frames as PNG images along with a shell script to run, that builds the frames into an MP4 movie file. The [`ffmpeg`](https://ffmpeg.org) utility is required.

#### How it works

The method invokes the same methods as the PNG export, but runs it multiple times, generating multiple frames. For each frame, the axis location of axis 0 is changed a little. We obtain 50 frames in total and one movie creation shell script:

```
  samsa-frame000.png
  samsa-frame001.png
  samsa-frame002.png
  ...
  samsa-frame048.png
  samsa-frame049.png
  samsa-movie.sh
```

These frames represent the entire animation. To turn them into an MP4 movie file we need to run `ffmpeg`. Samsa helpfully exports a shell script alonside the animation frames, which contains the `ffmpeg` invocation with the required parameters. Change to the Downloads folder and run the shell script to create the MP4:

```
$ sh samsa-movie.sh
```


### SVG animation

This outputs a SVG animation based on traversing a given axis from min to max. It produces much smaller files than an equivalent MP4, with the advantages of vector outlines and animation not defined with frames (thus they automatically run as smoothly as the system allows). These files are therefore highly suited for the web.

#### How it works

The method divides single-axis traversals into regions that are piecewise linear. This requires building a ordered list of axis locations, including not only min, default and max, but also the start, peak and end of every tuple. These locations are mapped from the [-1,1] range of the axis onto the [0,1] range of the SVG animation timeline. The complete set of outline point coordinates at each of the axis locations is exported to the SVG.

This method is limited to animations that traverse a single axis, because such animations involve purely linear interpolations which are handled natively by SVG. In general multi-axis traversals are non-linear, so SVG would need JavaScript to move outline points many times per second.