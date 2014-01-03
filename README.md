# bauble

**(bauble is working name) it might be called something else soon - chime in on [#1](https://github.com/whiteoctober/bauble/issues/1) if you have any ideas.** 

Video stream object tracking in the browser.

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