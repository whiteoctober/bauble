(function(global, navigator, document){

  var getMedia = ( navigator.getUserMedia ||
                   navigator.webkitGetUserMedia ||
                   navigator.mozGetUserMedia ||
                   navigator.msGetUserMedia );


  // calibration output (todo, scope to VR)
  var maxh, minh, maxs, mins, maxv, minv;

  function Bauble(options){
    this.options = options || {};
    this.listeners = [];
    this._process_action = 'calibrate';

    this.worker = new Worker(this.options.worker || "vr-worker.js");
    this.worker.onmessage = this._workerHandler.bind(this);

    this.video = document.createElement('video');
    this.video.autoplay = true;
    this.video.style.display = 'none';

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.persistantCanvas = document.createElement('canvas');
    this.pctx = this.persistantCanvas.getContext('2d');

    this.lastPoint = null;

  }

  Bauble.prototype.getUserMedia = function(){
    var self = this;

    getMedia.call(navigator,
       {video: true},

       // successCallback
       function(localMediaStream) {
          self.mediaStream = localMediaStream;
          self.video.src = window.URL.createObjectURL(localMediaStream);

          self._waitForVideo();
       },
       // errorCallback
       function(err) { console.log("The following error occured: " + err); }
    );

    return this;
  }

  Bauble.prototype._waitForVideo = function(){
    if(this.video.videoWidth){

      this.width = this.persistantCanvas.width = this.canvas.width = this.video.videoWidth;
      this.height = this.persistantCanvas.height = this.canvas.height = this.video.videoHeight;

      this.ctx.setStrokeColor('rgba(0,255,0,0.9)');

      this.ctx.translate(this.width, 0);
      this.ctx.scale(-1, 1);

      this.emit('video-ready')

      requestAnimationFrame(this._render.bind(this));
    } else {
      requestAnimationFrame(this._waitForVideo.bind(this));
    }
  }

  Bauble.prototype._render = function(){
    if(this._process_action !== 'finish')
      requestAnimationFrame(this._render.bind(this));

    this.ctx.drawImage(this.video, 0, 0);

    // if we are ready for some processing, do it now
    if(!this._processing) this._processing = true, this._process();

    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.persistantCanvas, 0, 0);
    this.ctx.restore();
  }

  Bauble.prototype._process = function(){
    // send stuff to the web worker to be processed

    if(this._process_action === 'calibrate'){
      var image = this.ctx.getImageData(
        0,0,this.canvas.width, this.canvas.height);

      // just now we are only calibrating
      this.worker.postMessage({
        type:'calibrate',

        image: image,
        calibration_size: Math.min(this.height,this.width) / 5,
        windows: [15,30,30]// TODO MAKE TAILORABLE

      },[image.data.buffer]);

    } else if(this._process_action === 'recognise'){
      // recognise

      var image, x1, x2, y1, y2;

      if(this.lastPoint){
        x1 = constrain(this.lastPoint[0]-100,this.canvas.width);
        x2 = constrain(this.lastPoint[0]+100,this.canvas.width);
        y1 = constrain(this.lastPoint[1]-100,this.canvas.height);
        y2 = constrain(this.lastPoint[1]+100,this.canvas.height);
        image = this.ctx.getImageData(x1,y1, x2 - x1, y2 - y1);
      } else {
        image = this.ctx.getImageData(
          0,0,this.canvas.width, this.canvas.height);
      }

      this.worker.postMessage({
        type:'recognise',

        image: image,
        thresholds: [minh, maxh, mins, maxs, minv, maxv],
        bounds: this.lastPoint ?
          {top: y1, left: x1}
          : null,


      },[image.data.buffer]);

    }
  }

  Bauble.prototype._workerHandler = function (oEvent) {
    // ready to process again
    this._processing = false;

    if(oEvent.data.type === 'recognise'){
      if(this._process_action !== 'recognise'){return}

      var cx = oEvent.data.xy[0],
          cy = oEvent.data.xy[1];

      // [x,y] or null (for bounding)
      this.lastPoint = cx && cy && [cx,cy];

      this.emit('point', cx, cy);

    }

    if(oEvent.data.type === 'calibrate'){
      if(this._process_action !== 'calibrate'){return}

      // pull out the data we want
      minh = oEvent.data.windows[0];
      maxh = oEvent.data.windows[1];
      mins = oEvent.data.windows[2];
      maxs = oEvent.data.windows[3];
      minv = oEvent.data.windows[4];
      maxv = oEvent.data.windows[5];

      // draw the debug information to persistant canvas
      var capBox = oEvent.data.capBox;

      this.pctx.putImageData(oEvent.data.image, 0,0);

      this.pctx.strokeStyle = 'rgba(0,255,0,0.6);';
      this.pctx.strokeRect(
        capBox.left, capBox.top, 
        capBox.right - capBox.left, 
        capBox.bottom - capBox.top
      );

      // draw the histograms

      

      var buckets = oEvent.data.buckets;
      // var hctx = document.getElementById('hist').getContext('2d');
      var hctx = this.pctx;
      gh = hctx;
      hctx.save();
      hctx.setTransform(.65, 0, 0, .65, 0, 0);


      hctx.fillStyle = 'rgba(0,0,0,0.5)';

      // scale them into view
      var max = Math.max.apply(Math,buckets)/100;

      // and more
      max /= 2;

      var inner, hist_i, c; 
      hctx.fillStyle = 'rgba(255,255,255,0.7)'
      hctx.fillRect(0,0,255,300);

      for (var i = buckets.length - 1; i >= 0; i--) {

        inner = i < (3 * 255);

        hist_i = Math.floor((i / 255) % 3);
        hctx.fillStyle = 
            hist_i == 0 ? 'rgba(200,150,0,0.9)' : 
            hist_i == 1 ? 'rgba(0,200,150,0.9)' : 
            hist_i == 2 ? 'rgba(0,150,200,0.9)' : 
            'rgba(1,1,1,0.9)';

        if(i < (3 * 255)){
          hctx.fillStyle = '#000'
        }

        c = buckets[i] / max;
        hctx.fillRect(i % 255, (hist_i* 100) + 100 - c, 1, c);
      };

      var peaks = oEvent.data.peaks;
      var windows = oEvent.data.windows;

      hctx.fillStyle = 'red';
      hctx.fillRect(peaks[0], 0, 1, 100);
      hctx.fillRect(peaks[1], 100, 1, 100);
      hctx.fillRect(peaks[2], 200, 1, 100);

      hctx.fillStyle = 'rgba(255,0,0,0.3)';
      hctx.fillRect(windows[0], 0, windows[1] - windows[0], 100);
      hctx.fillRect(windows[2], 100, windows[3] - windows[2], 100);
      hctx.fillRect(windows[4], 200, windows[5] - windows[4], 100);

      hctx.restore();

    }

  };

  Bauble.prototype.attachTo = function(selector){
    var target = document.querySelector(selector);

    target.appendChild(this.video);
    target.appendChild(this.canvas);

    return this;
  }

  Bauble.prototype.on = function(name, fn){
    if(name && fn) this.listeners.push([name, fn])
    return this;
  }

  Bauble.prototype.emit = function(name, value){
    var args = Array.prototype.slice.call(arguments,1);

    this.listeners.forEach(function(l){
      l[0] === name && l[1].apply(this, args);
    });

    return this;
  }

  Bauble.prototype.setCalibrating = function(c){
    if(c){
      this._process_action = 'calibrate';
    } else {
      this.thresholds = [minh, maxh, mins, maxs, minv, maxv];
      this._process_action = 'recognise'; 
    }
    return this;
  }

  Bauble.prototype.destroy = function(){
    this._process_action = 'finish';
    this.mediaStream.stop();
    this.video.remove()
    this.canvas.remove()
    return this;
  }

  // helpers 

  function constrain(v, max){
    return Math.max(0, Math.min(max, v));
  }


  global.Bauble = Bauble;

})(this,navigator, document)