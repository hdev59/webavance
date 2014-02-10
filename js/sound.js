var context;
var recording = false;
var source = null;
// Les echantillons prêts à être joués, de toutes les pistes
var tracks = [];
var buffers = []; // audio buffers decoded
var samples = []; // audiograph nodes

var currentEffectNodes = [];

var loop = false;

// Volume
var MAX_VOLUME = 100;

var masterVolumeNode;
var wetGain;

var trackVolumeNodes = [];

// Channel splitter
var channelSplitter;
// default channel count to stereo
var DEFAULT_CHANNEL_COUNT = 2;

// Volume sliders
var masterVolumeSlider;
var trackVolumeSliders = [];
var masterVolumeSliderValue = MAX_VOLUME;

var buttonPlay, buttonStop, buttonLoop, buttonMonoStereo;

// divTrack containing track sample, mute button, volume slider
var divTrack;

var canvas, ctx;
var frontCanvas, frontCtx;

var tracksCanvas = [];
var tracksTimeCanvas = [];


var tracksCtx = [];
var trackTimeCtx = [];

// Sample size in pixels
var SAMPLE_WIDTH = 600;
var SAMPLE_HEIGHT = 100;
var SAMPLE_MARGIN = 0;

// Useful for memorizing when we paused the song
var lastTime = 0;
var currentTime;
var delta;

var elapsedTimeSinceStart = 0;

var paused = true;
var playedOnce = false;

// Frequency spectrum
var frequencySpectrumCanvas;
var frequencySpectrumCtx;
var FREQUENCY_SPECTRUM_WIDTH = 300;
var FREQUENCY_SPECTRUM_HEIGHT = 100;


// ngProgress progress bar
var progressApp = angular.module('progressApp', ['ngProgress']);


var ProgressMainCtrl = function($scope, $timeout, ngProgress) {
        $scope.name = 'Lars';
        $scope.show = false;

        $scope.color = ngProgress.color();
        $scope.height = ngProgress.height();

        ngProgress.start();
        $timeout(function(){
            ngProgress.complete();
            $scope.show = true;
        }, 2000);

        $scope.setWidth = function(new_width, $event) {
            ngProgress.set(new_width);
            $event.preventDefault();
        }

        $scope.startProgress = function($event) {
            $event.preventDefault();
            ngProgress.start();
        }

        $scope.count = function($event) {
            $event.preventDefault();
            ngProgress.set(ngProgress.status() + 9);
        }

        $scope.new_color = function(color, $event) {
            $event.preventDefault();
            ngProgress.color(color);
        }

        $scope.new_height = function(new_height, $event) {
            $event.preventDefault();
            ngProgress.height(new_height);
        }

        $scope.completeProgress = function($event) {
            $event.preventDefault();
            ngProgress.complete();
        }

        $scope.stopProgress = function($event) {
            $event.preventDefault();
            ngProgress.stop();
        }

        $scope.resetProgress = function($event) {
            ngProgress.reset();
            $event.preventDefault();
        }
		
	//============== DRAG & DROP =============
    // source for drag&drop: http://www.webappers.com/2011/09/28/drag-drop-file-upload-with-html5-javascript/
    var dropbox = document.getElementById("dropbox")
    $scope.dropText = 'Déposez vos fichiers ici'

    // init event handlers
    function dragEnterLeave(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        $scope.$apply(function(){
            $scope.dropText = 'Déposez vos fichiers ici'
            $scope.dropClass = ''
        })
    }
    dropbox.addEventListener("dragenter", dragEnterLeave, false)
    dropbox.addEventListener("dragleave", dragEnterLeave, false)
    dropbox.addEventListener("dragover", function(evt) {
        evt.stopPropagation()
        evt.preventDefault()
        var clazz = 'not-available'
        var ok = evt.dataTransfer && evt.dataTransfer.types && evt.dataTransfer.types.indexOf('Files') >= 0
        $scope.$apply(function(){
            $scope.dropText = ok ? 'Déposez vos fichiers ici' : 'Seuls les fichiers sont autorisés'
            $scope.dropClass = ok ? 'over' : 'not-available'
        })
    }, false)
    dropbox.addEventListener("drop", function(evt) {
        console.log('drop evt:', JSON.parse(JSON.stringify(evt.dataTransfer)))
        evt.stopPropagation()
        evt.preventDefault()
        $scope.$apply(function(){
            $scope.dropText = 'Déposez vos fichiers ici'
            $scope.dropClass = ''
        })
        var files = evt.dataTransfer.files
        if (files.length > 0) {
            $scope.$apply(function(){
				console.log('$scope files');
				console.log($scope.files);
				if ($scope.files == undefined) {
					$scope.files = [];
				}
                for (var i = 0; i < files.length; i++) {
                    $scope.files.push(files[i])
                }
            })
        }
    }, false)
    //============== DRAG & DROP =============

    $scope.setFiles = function(element) {
    $scope.$apply(function($scope) {
      console.log('files:', element.files);
      // Turn the FileList object into an Array
        $scope.files = []
        for (var i = 0; i < element.files.length; i++) {
          $scope.files.push(element.files[i])
        }
      $scope.progressVisible = false
      });
    };

    $scope.uploadFile = function() {
        var fd = new FormData()
		fd.append('title', $('#uploadtitle').val());
        for (var i in $scope.files) {
            fd.append('uploadedfile', $scope.files[i])
        }
        var xhr = new XMLHttpRequest()
        xhr.upload.addEventListener("progress", uploadProgress, false)
        xhr.addEventListener("load", uploadComplete, false)
        xhr.addEventListener("error", uploadFailed, false)
        xhr.addEventListener("abort", uploadCanceled, false)
        xhr.open("POST", "/upload")
        $scope.progressVisible = true
        xhr.send(fd)
    }

    function uploadProgress(evt) {
        $scope.$apply(function(){
            if (evt.lengthComputable) {
                $scope.progress = Math.round(evt.loaded * 100 / evt.total)
            } else {
                $scope.progress = 'unable to compute'
            }
        })
    }

    function uploadComplete(evt) {
        /* This event is raised when the server send back a response */
        alert("Titre envoyé avec succès.");
		
		// Add song to select
		var uploadedTitle = $("#uploadtitle").val();
		appendTrackToList(uploadedTitle);
		
		// Clear upload form
		$("#uploadtitle").val("");
		$scope.$apply(function(){
			$scope.files = [];
            $scope.progressVisible = false
        })
    }

    function uploadFailed(evt) {
        alert("Une erreur est survenue durant l'envoi.")
    }

    function uploadCanceled(evt) {
        $scope.$apply(function(){
            $scope.progressVisible = false
        })
        alert("L'envoi à été annulé ou le navigateur a fermé la connexion, veuillez réessayer d'envoyer vos fichiers.")
    }
}

progressApp.config(function(ngProgressProvider){
        // Default color is firebrick
        ngProgressProvider.setColor('firebrick');
        // Default height is 2px
        ngProgressProvider.setHeight('10px');
    });

// requestAnim shim layer by Paul Irish, like that canvas animation works
// in all browsers
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();



function init() {
    // Get handles on buttons
    buttonPlay = document.querySelector("#bplaypause");
    buttonStop = document.querySelector("#bstop");
	buttonLoop = document.querySelector("#bloop");
	buttonMonoStereo = document.querySelector("#bmonostereo");
	
    divTrack = document.getElementById("tracks");


    // canvas where we draw the samples
    canvas = document.querySelector("#myCanvas");
    ctx = canvas.getContext('2d');

    // Create a second canvas
    frontCanvas = document.createElement('canvas');
    frontCanvas.id = 'frontCanvas';
    // Add it as a second child of the mainCanvas parent.
    canvas.parentNode.appendChild(frontCanvas);
    // make it same size as its brother
    frontCanvas.height = canvas.height;
    frontCanvas.width = canvas.width;

    frontCtx = frontCanvas.getContext('2d');

    // Init audio context
    context = initAudioContext();

    // Get the list of the songs available on the server and build a 
    // drop down menu
    loadSongList();

}


function initAudioContext() {
    // Initialise the Audio Context
    // There can be only one!
    var context;

    if (typeof AudioContext == "function") {
        context = new AudioContext();
        console.log("USING STANDARD WEB AUDIO API");
    } else if (typeof webkitAudioContext == "function") {
        context = new webkitAudioContext();
        console.log("USING WEBKIT AUDIO API");
    } else {
        throw new Error('AudioContext is not supported. :(');
    }
    return context;
}
// SOUNDS AUDIO ETC.


function resetAllBeforeLoadingANewSong() {
    console.log('resetAllBeforeLoadingANewSong');
	playedOnce = false;
    // reset array of tracks. If we don't do this we just add new samples to existing
    // ones... playing two songs at the same time etc.
    tracks = [];
    stopAllTracks();
    buttonPlay.disabled = true;
	buttonLoop.disabled = true;
    $("#track-table tbody")[0].innerHTML = "";
	$("#track-table").css({'display' : 'block'});
    /*
    samples.forEach(function(s) {
        s.stop(0);
        s.disconnect(0);
    });*/
	deleteTracksCanvas();
	resetEffectNodes();
}

function resetEffectNodes() {
	for (var i =0; i < currentEffectNodes.length; i++) {
		currentEffectNodes[i].disconnect();
	}
	currentEffectNodes = [];
}

var bufferLoader;
function loadAllSoundSamples(tracks) {


    bufferLoader = new BufferLoader(
            context,
            tracks,
            finishedLoading
            );
    bufferLoader.load();
}
function finishedLoading(bufferList) {
    console.log("finished loading");
    
    buffers = bufferList;
    buttonPlay.disabled = false;
	buttonLoop.disabled = false;
}

function buildGraph(bufferList) {
    var sources = [];
    // Create a single gain node for master volume
    masterVolumeNode = context.createGain();
	wetGain = context.createGain();
	// Create a channel splitter		
	channelSplitter = context.createChannelSplitter();
	
	// channelCount is used to help compute computedNumberOfChannels
	// computedNumberOfChannels representing the actual number of channels of the input at any given time
	channelSplitter.channelCount = DEFAULT_CHANNEL_COUNT;
	
	// channelCountMode determines how computedNumberOfChannels will be computed. Once this number is computed, all of the connections 
	// will be up or down-mixed to that many channels
	// value “explicit”: computedNumberOfChannels is the exact value as specified in channelCount
	channelSplitter.channelCountMode = "explicit";
	
	// Connect the master volume to the channel splitter
    masterVolumeNode.connect(channelSplitter);
	// Connect the channel splitter to the speakers
	channelSplitter.connect(context.destination);
	buttonMonoStereo.disabled = false;
	
	// setup a javascript node
    javascriptNode = context.createJavaScriptNode(2048, 1, 1);
    // connect to destination, else it isn't called
    javascriptNode.connect(context.destination);
	
	// setup a analyzer
    analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 512;
 
	masterVolumeNode.connect(analyser);
	audioRecorder = new Recorder( masterVolumeNode );
	console.log("MasterVolumeNode " + masterVolumeNode);
	analyser.connect(javascriptNode);
	initializeFrequencySpectrum();
    console.log("in build graph, bufferList.size = " + bufferList.length);
    bufferList.forEach(function(sample, i) {
// each sound sample is the  source of a graph
        sources[i] = context.createBufferSource();
        sources[i].buffer = sample;
		console.log("Sample : " + sample);
        // connect each sound sample to a volume node
        trackVolumeNodes[i] = context.createGain();
        // Connect the sound sample to its volume node
        sources[i].connect(trackVolumeNodes[i]);
        // Connects all track volume nodes a single master volume node
		trackVolumeNodes[i].connect(wetGain);
        samples = sources;
    })
	wetGain.connect(masterVolumeNode);
}

// ######### SONGS
function loadSongList() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "track", true);

    xhr.onload = function(e) {
        var songList = JSON.parse(this.response);
        songList.forEach(function(songName) {
            appendTrackToList(songName);
        });
    };
    xhr.send();
}

function appendTrackToList(songName) {
	var trackList = $("#track-list");
	var li = $('<li>');
	$("<a>", { href: '#', value: songName, text: songName }).addClass('switch-track').appendTo(li);
	li.appendTo(trackList);
}

// ######## TRACKS
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getTrackName(elem) {
// returns the name without the suffix
    var n = elem.lastIndexOf(".");
    return elem.slice(0, n + 1);
}

function loadTrackList(songName) {
resetAllBeforeLoadingANewSong();

    var xhr = new XMLHttpRequest();
    xhr.open('GET', "track/" + songName, true);
    xhr.onload = function(e) {
        var track = JSON.parse(this.response);
        // resize canvas depending on number of samples
        resizeSampleCanvas(track.instruments.length);
        var i = 0;
		var tableBody = document.querySelector("#track-table tbody");
        track.instruments.forEach(function(instrument, trackNumber) {

            // Render HTMl
            var column = document.createElement('tr');
			
			var tdMute = document.createElement('td');
			tdMute.className = 'track-td-mute';
			var tdName = document.createElement('td');
			tdName.className = 'track-td-name';
			var tdCanvas = document.createElement('td');
			tdCanvas.className = 'track-td-canvas';
			var tdVolume = document.createElement('td');
			tdVolume.className = 'track-td-volume';
			
			tdVolume.innerHTML = "<div class='ui-slider' class='trackVolumeSlider' id='trackVolumeSlider"  + trackNumber + "'></div>";
			tdName.innerHTML = instrument.name;
			tdMute.innerHTML = "<button id='mute" + trackNumber + "' class='btn btn-block btn-lg btn-primary' onclick='muteUnmuteTrack(" 
				+ trackNumber +  ");'><span class='glyphicon glyphicon-volume-up'></span></button>"; 
			
			createTrackCanvas(trackNumber, tdCanvas);
			
			column.appendChild(tdMute);
			column.appendChild(tdName);
			column.appendChild(tdVolume);
			column.appendChild(tdCanvas);
			
            tableBody.appendChild(column);
			var trackVolumeSlider = $("#trackVolumeSlider"+ trackNumber);
			trackVolumeSlider.attr('data-track-number', trackNumber);
			trackVolumeSlider.slider({
				min: 0,
				max: 100,
				value: 100,
				orientation: "horizontal",
				range: "min",
				slide: function(event, ui) {
					setTrackVolume($(this), ui.value);
				}
			  }).addSliderSegments(trackVolumeSlider.slider("option").max);
			
			trackVolumeSliders[trackNumber] = document.querySelector("#trackVolumeSlider" + trackNumber);
			
            // Audio
            console.log("on a un fichier audio");
            // load audio dans un tableau...
            var url = "track/" + songName + "/sound/" + instrument.sound;
            tracks.push(url);
            console.log("Ajout piste audio " + instrument.name);
            

        });
        loadAllSoundSamples(tracks);
    };
    xhr.send();
}

function createTrackCanvas(trackNumber, tdCanvas) {
	var trackCanvas = $('<canvas>');
	var trackTimeCanvas = $('<canvas>');
	var trackCanvasContainer = $('<div>');
	trackCanvasContainer.addClass('trackCanvasContainer');
	// Configure trackCanvas
	trackCanvas.attr('id', 'trackCanvas' + trackNumber);
	trackCanvas.attr('width', SAMPLE_WIDTH);
	trackCanvas.attr('height', SAMPLE_HEIGHT);
	trackCanvas.addClass('trackCanvas');

	//COnfigure trackTimeCanvas
	trackTimeCanvas.attr('id', 'trackTimeCanvas' + trackNumber);
	trackTimeCanvas.attr('width', SAMPLE_WIDTH);
	trackTimeCanvas.attr('height', SAMPLE_HEIGHT);
	trackTimeCanvas.addClass('trackTimeCanvas');

	// Set trackCanvas in global vars
	tracksCanvas[trackNumber] = trackCanvas[0];
	tracksTimeCanvas[trackNumber] = trackTimeCanvas[0];
	
	// Set and configure canvas context
	tracksCtx[trackNumber] = trackCanvas[0].getContext('2d');
	tracksCtx[trackNumber].strokeStyle = 'white';
	trackTimeCtx[trackNumber] = trackTimeCanvas[0].getContext('2d');

	// Link trackCanvas to main canvas
	trackCanvasContainer[0].appendChild(trackCanvas[0]);
	trackCanvasContainer[0].appendChild(trackTimeCanvas[0]);
	//tdCanvas.appendChild(trackCanvasContainer[0]);
	
	tdCanvas.appendChild(trackCanvas[0]);
	tdCanvas.appendChild(trackTimeCanvas[0]);

	trackTimeCanvas[0].addEventListener("mousedown", function(event) {
        var mousePos = getMousePos(trackCanvas[0], event);
        // will compute time from mouse pos and start playing from there...
        jumpTo(mousePos);
    })
}

function deleteTracksCanvas() {
	// Remove canvas loaded for each track
	for ( var i = 0; i < tracksCanvas.length; i++) {
		tracksCanvas[i].remove();
	}
	for ( var i = 0; i < tracksTimeCanvas.length; i++) {
		tracksTimeCanvas[i].remove();
	}
	tracksCanvas = [];
	tracksTimeCanvas = []
}

function getMousePos(canvas, evt) {
    // get canvas position
    var obj = canvas;
    var top = 0;  
    var left = 0;
 
    while (obj && obj.tagName != 'BODY') {
        top += obj.offsetTop;
        left += obj.offsetLeft;
        obj = obj.offsetParent;
    }
    // return relative mouse position
    var mouseX = evt.clientX - left + window.pageXOffset;
    var mouseY = evt.clientY - top + window.pageYOffset;
    return {
        x:mouseX,
        y:mouseY
    };
 }

 function jumpTo(mousePos) {
    console.log("in jumpTo x = " + mousePos.x + " y = " + mousePos.y);
    // width - totalTime
    // x - ?
    pauseAllTracks();
    var totalTime = buffers[0].duration;
    var startTime = (mousePos.x * totalTime) / SAMPLE_WIDTH;
	elapsedTimeSinceStart = startTime;
    playAllTracks(startTime);
 }

function animateTime() {
    if (!paused) {
        // Draw the time on the front canvas
        currentTime = context.currentTime;
        var delta = currentTime - lastTime;


        var totalTime;
		
		trackTimeCtx[0].clearRect(0, 0, canvas.width, canvas.height);
        trackTimeCtx[0].fillStyle = 'white';
        trackTimeCtx[0].font = '14pt Arial';
        trackTimeCtx[0].fillText(elapsedTimeSinceStart.toPrecision(4), 100, 20);

        // at least one track has been loaded
        if (buffers[0] != undefined) {
            var totalTime = buffers[0].duration;
			if (elapsedTimeSinceStart <= totalTime) {
				var x = elapsedTimeSinceStart * SAMPLE_WIDTH/ totalTime;

				
				
				for (var i=0; i < trackTimeCtx.length;i++) {
					if (i > 0) {
						trackTimeCtx[i].clearRect(0, 0, canvas.width, canvas.height);
					}
					trackTimeCtx[i].strokeStyle = "white";
					trackTimeCtx[i].lineWidth = 3;
					trackTimeCtx[i].beginPath();
					trackTimeCtx[i].moveTo(x, 0);
					trackTimeCtx[i].lineTo(x, canvas.height);
					trackTimeCtx[i].stroke();
				}
				

				elapsedTimeSinceStart += delta;
				lastTime = currentTime;
				
			} else if (loop == true) {
				// End of song and loop activated, restart playing song from beginning
				stopAllTracks();
				playAllTracks(0);
			} else {
				// End of song and loop deactivated, stop playing
				stopAllTracks();
			}
		}
	}
	requestAnimFrame(animateTime);
}

function resetTime() {
	frontCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function resizeSampleCanvas(numTracks) {
    canvas.height = (parseInt(SAMPLE_HEIGHT) + parseInt(SAMPLE_MARGIN)) * numTracks;
    frontCanvas.height = canvas.height;
}

function loadSong() {
	var song = $("#song").val();
    loadTrackList(song);
}

function playAllTracks(startTime) {
	// Build audio nodes from BufferSource to speakers
	//if (playedOnce == false) {
		buildGraph(buffers);
	//}
	animateTime();
	// Start playing song
    playFrom(startTime);
}

// Same as previous one except that we not rebuild the graph. Useful for jumping from one
// part of the song to another one, i.e. when we click the mouse on the sample graph
function playFrom(startTime) {
  // Read current master volume slider position and set the volume
  setMasterVolume()
  	if ($("#bplaypause span").hasClass('glyphicon-play')) {
		$("#bplaypause span").removeClass('glyphicon-play');
	}
	$("#bplaypause span").addClass('glyphicon-pause');
	    paused = false;

  samples.forEach(function(s) {
		console.log('starting sample');
		console.log(s);
// First parameter is the delay before playing the sample
// second one is the offset in the song, in seconds, can be 2.3456
// very high precision !
		
        s.start(0, startTime);
    })
    buttonStop.disabled = false;

    // Note : we memorise the current time, context.currentTime always
    // goes forward, it's a high precision timer
    console.log("start all tracks startTime =" + startTime);
    lastTime = context.currentTime;
    paused = false;
}

function stopAllTracks() {
	console.log("stopAllTracks");
    samples.forEach(function(s) {
		console.log(s);
		// destroy the nodes
		console.log("playbackState : " + s.playbackState);
		if (s.playbackState == undefined || s.playbackState != s.FINISHED_STATE) {
			console.log('stopping sample');
			s.stop(0);
			s.disconnect(0);
		}
    });
    buttonStop.disabled = true;
    buttonPlay.disabled = false;
	if ($("#bplaypause span").hasClass('glyphicon-pause')) {
		$("#bplaypause span").removeClass('glyphicon-pause');
	}
	$("#bplaypause span").addClass('glyphicon-play');
    elapsedTimeSinceStart = 0;
    paused = true;
	resetTime();
}

function playOrPause(button) {
	buttonStop.disabled = false;
	console.log("playOrPause");
	var buttonSpan = button.children("span");
	if (buttonSpan.hasClass("glyphicon-play")) {
		buttonSpan.removeClass("glyphicon-play");
		buttonSpan.addClass("glyphicon-pause");
		playAllTracks(elapsedTimeSinceStart);
	}
	else {
		buttonSpan.removeClass("glyphicon-pause");
		buttonSpan.addClass("glyphicon-play");
		pauseAllTracks();
	}
}

function pauseAllTracks() {
console.log("pauseAllTracks");
    if (!paused) {
        // Then stop playing
        samples.forEach(function(s) {
// destroy the nodes
            s.stop(0);
        });
        paused = true;
   }
}

function setMasterVolume() {

   var fraction = parseInt(masterVolumeSliderValue) / parseInt(MAX_VOLUME);
   console.log("Volume fraction = " + fraction);
    // Let's use an x*x curve (x-squared) since simple linear (x) does not
    // sound as good.
    if( masterVolumeNode != undefined)
        masterVolumeNode.gain.value = fraction * fraction;
}


function setTrackVolume(trackVolumeSlider, volume) {
	var trackNumber = trackVolumeSlider.attr('data-track-number');
	console.log('Set track ' + trackNumber + ' volume ' + volume);
	var fraction = parseInt(volume) / parseInt(MAX_VOLUME);
	
	if (trackVolumeNodes[trackNumber] != undefined) 
		trackVolumeNodes[trackNumber].gain.value = fraction * fraction;
}

function changeMasterVolume() {
   setMasterVolume();
}


function muteUnmuteTrack(trackNumber) {
// AThe mute / unmute button
	console.log("mute/unmute track " + trackNumber);
    var b = document.querySelector("#mute" + trackNumber);
		var volumeGlyphIconSpan = $("#mute" + trackNumber + " .glyphicon");
    if (trackVolumeNodes[trackNumber].gain.value > 0) {
        trackVolumeNodes[trackNumber].gain.value = 0;
		volumeGlyphIconSpan.addClass("glyphicon-volume-off");
		volumeGlyphIconSpan.removeClass("glyphicon-volume-up");
    } else {
        trackVolumeNodes[trackNumber].gain.value = 1;
		volumeGlyphIconSpan.addClass("glyphicon-volume-up");
		volumeGlyphIconSpan.removeClass("glyphicon-volume-off");
    }


}

function setLoop() {
	if (loop == true) {
		if ($('#bloop span').hasClass('red')) {
			$('#bloop span').removeClass('red');
		}
		console.log("deactivate loop");
		loop = false;
	} else {
		$('#bloop span').addClass('red');
		console.log("activate loop");
		loop = true;
	}
}

function setChannelCountToMono() {
	console.log("Setting channelCount to 1");
	channelSplitter.channelCount = 1;
}

function setChannelCountToStereo() {
	console.log("Setting channelCount to 2");
	channelSplitter.channelCount = 2;
}


$(document).ready(function() {
	$("#bplaypause").click(function() {
		playOrPause($(this));
	});
	
	$("#bmonostereo").click(function() {
		if ($(this).text() == "stereo") {
			setChannelCountToStereo();
			$(this).text("mono");
		} else if ($(this).text() == "mono") {
			setChannelCountToMono();
			$(this).text("stereo");
		}
	});
	
	$(".ui-slider-range").change(function() {
		console.log("Modified sound : " + $(this).css('width'));
	});
	
	masterVolumeSlider = $("#masterVolumeSlider");
    if (masterVolumeSlider.length) {
      masterVolumeSlider.slider({
        min: 0,
        max: 100,
        value: 100,
        orientation: "horizontal",
        range: "min",
		slide: function(event, ui) {
			masterVolumeSliderValue = ui.value;
			changeMasterVolume();
		}
      }).addSliderSegments(masterVolumeSlider.slider("option").max);
    }
	
	$("#open-upload").fancybox();
	
	$("#track-list").on("click", "li a", function(event){
		$("#track-list-value").text($(this).attr('value'));
		loadTrackList($(this).attr('value'));
	});
	
	$("#track-effect").on("click", "li a", function(event){
		console.log('Change effect');
		$("#track-effect-value").text($(this).text());
		changeEffect(parseInt($(this).attr('data-effect-id')));
	});
	
	$("#brecord").click(function() {
		toggleRecording(this);
		if (recording == false) {
			$(this).css({ 'color' : 'red'});
			$("#bdownload")[0].disabled = false;
			recording = true;
		}
		else {
			$(this).css({ 'color' : 'white'});
			recording = false;
		}
	});
	
	$("#bdownload").click(function() {
		saveAudio();
		$("#brecord").css({ 'color' : 'white'});
		recording = false;
	});
});

// http://css.dzone.com/articles/exploring-html5-web-audio
	function initializeFrequencySpectrum() {
		frequencySpectrumCanvas = document.querySelector("#frequency-spectrum-canvas");
		frequencySpectrumCtx = frequencySpectrumCanvas.getContext('2d');
		var gradient = frequencySpectrumCtx.createLinearGradient(0,0,0,FREQUENCY_SPECTRUM_HEIGHT);
		gradient.addColorStop(1,'#000000');
		gradient.addColorStop(0.75,'#ff0000');
		gradient.addColorStop(0.25,'#ffff00');
		gradient.addColorStop(0,'#ffffff');

		// when the javascript node is called
		// we use information from the analyzer node
		// to draw the volume
		javascriptNode.onaudioprocess = function() {
			// get the average for the first channel
			var array =  new Uint8Array(analyser.frequencyBinCount);
			analyser.getByteFrequencyData(array);

			// clear the current state
			frequencySpectrumCtx.clearRect(0, 0, FREQUENCY_SPECTRUM_WIDTH, FREQUENCY_SPECTRUM_HEIGHT);

			// set the fill style
			frequencySpectrumCtx.fillStyle=gradient;
			drawSpectrum(array);
		}
	}

	function drawSpectrum(array) {
		for ( var i = 0; i < (array.length); i++ ){
			var value = array[i];
			//console.log("Spectrum value : " + value);
			frequencySpectrumCtx.fillRect(i*2,FREQUENCY_SPECTRUM_HEIGHT * 2-value,1,FREQUENCY_SPECTRUM_HEIGHT);
		}
	}
	
	
	

