# bauble (working name)

Video stream object tracking in the browser.

## Usage

```html
<div id="target"></div>
<button id="calibrate_button"></button>

<script src="js/bauble.js"></script>
<script>
  var bauble = new Bauble({worker:'js/bauble-worker.js'})
  bauble.getUserMedia()
      .attach('#target')
      .on('point', function(x,y){
        // do something awesome!!
      });

  // click #calibrate_button to mark as calibrated
  calibrate_button.onclick = bauble.calibrated;
</script>
```