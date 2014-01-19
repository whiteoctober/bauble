# bauble

Video stream object tracking in the browser.

![recognising a lemon](http://benjaminbenben.com/bauble-1.jpg)

## About

This recognises objects from a getUserMedia video stream - we built it for a web-based pictionary game at our christmas party.

The approach taken is:

1. convert the image into HSV
2. perform thresholding on the three channels
3. find the average x/y coordinate of matching pixels

This is quite a basic approach to object recognition,  if you want to try and recognise more complex objects you might want to take a look at [js-objectdetect](https://github.com/mtschirs/js-objectdetect), or skip the browser and go stright to [opencv.org](http://opencv.org/).  Also, if you have suggestions of how to make this more robust/efficient - please do log [an issue](https://github.com/whiteoctober/bauble/issues) or ping [benjaminbenben](https://twitter.com/benjaminbenben).

Most of the processing is done in a web worker, so it shouldn't impact too much on other page interactions.  There is also an optimisation that only checks the region near the last observed point - which speeds things up quite a bit.

## Usage

```html
<div id="target"></div>
<button id="calibrate_button"></button>

<script src="js/bauble.js"></script>
<script>
  var bauble = new Bauble({worker:'js/bauble-worker.js'})
  bauble.getUserMedia()
      .attachTo('#target')
      .on('point', function(x,y){
        // do something awesome!!
      });

  // click #calibrate_button to mark as calibrated
  calibrate_button.onclick = function(){
    bauble.setCalibrating(false);
  }
</script>
```


### canvas

There is an offscreen canvas that is drawn over the top of every video frame, this can be handy for overlaying visuals on the video.

```js
.on('point', function(x,y){
  bauble.pctx.fillRect(x-2,y-2,4,4);
});
```

## Examples

There is a pretty basic example at [whiteoctober.github.io/bauble/example/](http://whiteoctober.github.io/bauble/example/).  More are on the way.
