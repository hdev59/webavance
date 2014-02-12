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
		$.blockUI({ message: '<img src="/images/track_loader.gif" /><h6>Veuillez patienter pendant le chargement...</h6>', css: {
				padding:	0,
				margin:		0,
				width:		'520px',
				top:		'40%',
				left:		'35%',
				textAlign:	'center',
				color:		'#000',
				border:		'3px solid #aaa',
				backgroundColor:'#fff',
				cursor:		'wait'
			}});
		
		var dv = new jDataView(request.response);

		if (dv.getString(3, dv.byteLength - 128) == 'TAG') {
			console.log('tag found');
			var title = dv.getString(30, dv.tell());
			var artist = dv.getString(30, dv.tell());
			var album = dv.getString(30, dv.tell());
			var year = dv.getString(4, dv.tell());
			console.log('Title ' + title);
			console.log('Artist ' + artist);
			console.log('Album ' + album);
			console.log('Year ' + year);
			if (artist != "") {
				querySparqlArtist(artist);
			}
			var trackInfoContent = '<p>Album : ' + album + '</p><p> Artist : ' + artist + '</p><p>Year : ' + year + "</p><p>Title : " + title + '</p>';
			if (sparqlResults['page']) {
				trackInfoContent += '<p><a href="' + sparqlResults['page'] + '">Page wikipedia</a></p>';
			}
			if (sparqlResults['thumbnail']) {
				trackInfoContent += '<p>Image artiste : </p> <img src="' + sparqlResults['thumbnail'] + '" />';
			}
			if (sparqlResults['abstract']) {
				trackInfoContent += '<p>Description : ' + sparqlResults['abstract'] + '</p>';
			}
			$('#track-info-content-' + index)[0].innerHTML =  trackInfoContent;
			
			trackTags[index] = { 'album' : album, 'artist' : artist, 'title' : title, 'year' : year, 'thumbnail' : sparqlResults['thumbnail'], 'page' : sparqlResults['page'], 'abstract' : sparqlResults['abstract'] };
		
		} else {
			console.log('tag not found');
		}
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
						$.unblockUI();
						
					}
					if (++loader.loadCount == loader.urlList.length)
                        loader.onload(loader.bufferList);
						console.log('====== trackTags =========');
						console.log(trackTags);
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

var sparqlResults = [];

function querySparqlArtist(artist) {
	sparqlResults = [];
	var query = encodeURIComponent(artist).replace(/%20/g,'+').replace(/%00/g,'');
	var queryResource = encodeURIComponent(artist).replace(/%20/g,'_').replace(/%00/g,'');
	var queryUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+%3Fy+%3Fz+where%0D%0A+%7B+%3Fr+%3Fy+%3Fz.%0D%0A+++%3Fr+foaf%3Aname+%22"+query+"%22%40en%7D&format=application%2Fsparql-results%2Bjson&timeout=&debug=on"
	var queryBisUrl = "http://dbpedia.org/sparql?default-graph-uri=http%3A%2F%2Fdbpedia.org&query=select+%3Fabstract+%3Fthumbnail+%3Fpage+where%0D%0A+%7Bdbpedia%3A"+queryResource+"+dbpedia-owl%3Aabstract+%3Fabstract%3B%0D%0Afoaf%3AisPrimaryTopicOf+%3Fpage%3B%0D%0Adbpedia-owl%3Athumbnail+%3Fthumbnail.%0D%0AFILTER%28langMatches%28lang%28%3Fabstract%29%2C%22fr%22%29%29%7D+&format=application%2Fsparql-results%2Bjson&timeout=30000&debug=on"
	
	$.ajax({
	  dataType: "json",
	  url: queryBisUrl,
	  async: false,
	  error : errorQuery,
	  success: successQuery
	});
	
	function successQuery(data) {
		if (data.results && data.results.bindings[0] && data.results.bindings[0].abstract && data.results.bindings[0].abstract.value) {
			sparqlResults['abstract'] = data.results.bindings[0].abstract.value;
		} else {
			sparqlResults['abstract'] = '';
		}
		if (data.results && data.results.bindings[0] && data.results.bindings[0].thumbnail && data.results.bindings[0].thumbnail.value) {
			sparqlResults['thumbnail'] = data.results.bindings[0].thumbnail.value;
		} else {
			sparqlResults['thumbnail'] = '';
		}
		if (data.results && data.results.bindings[0] && data.results.bindings[0].page && data.results.bindings[0].page.value) {
			sparqlResults['page'] = data.results.bindings[0].page.value;
		} else {
			sparqlResults['page'] = '';
		}
	}
	
	function errorQuery(e) {
		console.log('Could not retrieve dbpedia data');
		sparqlResults['abstract'] = '';
		sparqlResults['thumbnail'] = '';
		sparqlResults['page'] = '';
		
	}
}




BufferLoader.prototype.load = function() {
    // M.BUFFA added these two lines.
    this.bufferList = new Array();
    this.loadCount = 0;
	trackTags = [];
    console.log("BufferLoader.prototype.load urlList size = " + this.urlList.length);
    for (var i = 0; i < this.urlList.length; ++i)
        this.loadBuffer(this.urlList[i], i);
}

