var fs = require("fs");
// We need to use the express framework: have a real web server that knows how to send mime types etc.
var express = require('express');
// Use mkdirp to handle uploaded files
var mkdirp = require('mkdirp');

// Init globals variables for each module required
var app = express()
, http = require('http')
, server = http.createServer(app);

// Indicate where static files are located  
app.configure(function () {  
	app.use(express.static(__dirname + '/'));
});  

// use body parser to parse post data
app.use(express.bodyParser());

// Config
var PORT = 8081,
	TRACKS_PATH = './multitrack/';

// launch the http server on given port
server.listen(PORT);

// routing
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});

// routing
app.get('/track', function (req, res) {
	function sendTracks(trackList) {
		if (!trackList)
			return res.send(404, 'No track found');
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(trackList));
		res.end();
	}

	getTracks(sendTracks); 
});

// routing
app.get('/track/:id', function (req, res) {
	var id = req.params.id;
	
	function sendTrack(track) {
		if (!track)
			return res.send(404, 'Track not found with id "' + id + '"');
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.write(JSON.stringify(track));
		res.end();
	}

	getTrack(id, sendTrack); 

});

// routing
app.post('/upload', function (req, res) {
	console.log('upload request');
	
	var title = req.param('title', null);
	console.log(req.files);
	if (title != null && (req.files.uploadedfile.length || (req.files.uploadedfile && !req.files.uploadedfile.length))) {
		var destinationPath = TRACKS_PATH + title;
		mkdirp(destinationPath);
		if (req.files.uploadedfile && !req.files.uploadedfile.length) {
			var fileDestinationPath = TRACKS_PATH + title + '/' + req.files.uploadedfile.name;
			fs.createReadStream(req.files.uploadedfile.path).pipe(fs.createWriteStream(fileDestinationPath));
		}
		else {
			for (var i = 0; i < req.files.uploadedfile.length; i++) {
				console.log('file name ' + req.files.uploadedfile[i].name);
				if (req.files.uploadedfile[i].name) {
					var fileDestinationPath = TRACKS_PATH + title + '/' + req.files.uploadedfile[i].name;
					fs.createReadStream(req.files.uploadedfile[i].path).pipe(fs.createWriteStream(fileDestinationPath));
				}
			}
		}
	} else if (title == null) {
		console.log('title is null');
	}
	res.redirect('/');
});
 
// routing
app.get(/\/track\/(\w+)\/(?:sound|visualisation)\/((\w|.)+)/, function (req, res) {
	res.sendfile(__dirname + '/' + TRACKS_PATH + req.params[0] + '/' + req.params[1]);
});

function getTracks(callback) {
	getFiles(TRACKS_PATH, callback);
}

function getTrack(id, callback) {
	getFiles(TRACKS_PATH + id, function(fileNames) {
		console.log('getFiles');
		console.log(fileNames);
		var track = {
			id: id,
			instruments: []	
		};
		fileNames.sort();
		for (var i = 0; i < fileNames.length; i ++) {
			var instrument = fileNames[i].match(/(.*)\.[^.]+$/, '')[1];
			track.instruments.push({
				name: instrument,
				sound: instrument + '.mp3',
			});
		}
		callback(track);
	})
}

function getFiles(dirName, callback) {
	fs.readdir(dirName, function(error, directoryObject) {
		callback(directoryObject);
	});
}




