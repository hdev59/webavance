function BufferLoader(context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
}


BufferLoader.prototype.loadBuffer = function(url, index) {
    // Load buffer asynchronously
    console.log('file : ' + url + "loading and decoding");
	var request = new XMLHttpRequest();
    request.open("GET", url, true);

    request.responseType = "arraybuffer";

    var loader = this;

    request.onload = function() {
		
        // Asynchronously decode the audio file data in request.response
        loader.context.decodeAudioData(
                request.response,
                function(buffer) {
                    if (!buffer) {
                        alert('error decoding file data: ' + url);
                        return;
                    }
					
					// Draw sample image
					var data = buffer.getChannelData(0),
					width = tracksCanvas[index].width,
					height = tracksCanvas[index].height,
					ctx = tracksCtx[index],
					step = Math.ceil(data.length / width),
					amp = 200;
					ctx.beginPath();
					ctx.moveTo(0, height/2 + data[0]);
					var oldLineWidth = ctx.lineWidth;
					for (var i = 0; i < width; i++) {
						ctx.lineTo(i, height/2 + data[step*i] * amp);
					}
					ctx.closePath();
					ctx.strokeStyle = "#48c9b0";

					ctx.lineWidth = 3;
					ctx.stroke();
					ctx.moveTo(0, 0);
					// End draw sample image
					ctx.lineWidth = oldLineWidth;
                    loader.bufferList[index] = buffer;
					console.log("Buffer = " + buffer);
                    console.log("In bufferLoader.onload bufferList size is " + loader.bufferList.length + " index =" + index);
					
					// ngProgress : modify counter and update progress bar
					$("#ngProgressCounter").val((loader.loadCount + 1) * (100 / loader.urlList.length));
					
					$("#ngProgressCounter").trigger('input');
					$("#setProgress").click();
                    if ((loader.loadCount + 1) * (100 / loader.urlList.length) == 100) {
						$("#setComplete").click();
					}
					if (++loader.loadCount == loader.urlList.length)
                        loader.onload(loader.bufferList);
                },
                function(error) {
                    console.error('decodeAudioData error', error);
                }
        );
    }

    request.onprogress = function(e) {
        //console.log("loaded : " + e.loaded + " total : " + e.total);

    }
    request.onerror = function() {
        alert('BufferLoader: XHR error');
    }

    request.send();
}

BufferLoader.prototype.load = function() {
    // M.BUFFA added these two lines.
    this.bufferList = new Array();
    this.loadCount = 0;
    console.log("BufferLoader.prototype.load urlList size = " + this.urlList.length);
    for (var i = 0; i < this.urlList.length; ++i)
        this.loadBuffer(this.urlList[i], i);
}

