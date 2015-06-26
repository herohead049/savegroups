/*jslint nomen: true */
/*jslint node:true */


var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');

var error = chalk.bold.red;
var success = chalk.bold.green;
var standard = chalk.bold.grey;
var disabled = chalk.strikethrough.grey;

var saveGroup = {
    name: "",
    startTime: "",
    endTime: "",
    restartTime: "",
    details: [],
    succeeded: [],
    disabled: [],
    failed: []
}

var temp =  [{
    server: "",
    details: []
}];


function findPattern(files, regex) {
    var emitter = new EventEmitter();
    files.forEach(function(file) {
        fs.readFile(file, 'utf8', function(err,content) {
            if (err)
                return emitter.emit('error',err);


            //console.log(standard(content));
            var lines = content.split(/\r?\n/);
            _.forEach(lines, function(ln) {
                //console.log(ln);
                if (match = ln.match("Succeeded:")) {
                    emitter.emit('succeeded',ln.replace(/\s/g, ''), file);
                }

                if (match = ln.match("Failed:")) {
                    emitter.emit('failed',ln.replace(/\s/g, ''),file);
                }
                if (match = ln.match("Disabled:")) {
                    emitter.emit('disabled',ln.replace(/\s/g, ''),file);
                }
                if (match = ln.match("Start time:")) {
                    emitter.emit('startTime',ln,file);
                }
                if (match = ln.match("Restart time:")) {
                    emitter.emit('restartTime',ln,file);
                }
                if (match = ln.match("End time:")) {
                    emitter.emit('endTime',ln,file);
                }
                if (match = ln.match("NetWorker savegroup:")) {
                    emitter.emit('title',ln,file);
                }
                if (match = ln.match(/\* /)) {
                    emitter.emit('details',ln,file);
                }



            });

            emitter.emit('fileread',file);

        });
    });
    return emitter;
}



findPattern(
['sgfiles/test1.txt'],
    /\(notice\)/g
    )
.on('fileread', function(file) {
    console.log(file + ' was read');
    console.log(saveGroup);
    console.log(temp);
})
.on('found', function(file, match) {
    console.log('Matched "' + match + '" in file ' + file);
})
.on('error', function(err) {
    console.log('Error emitted: ' + err.message);
})
.on('disabled', function(ln, file) {
    saveGroup.disabled = ln.split(":")[1].split(",");
})
.on('startTime', function(ln, file) {
    saveGroup.startTime = ln.split("time:")[1].trim();
})
.on('endTime', function(ln, file) {
    saveGroup.endTime = ln.split("time:")[1].trim();
})
.on('restartTime', function(ln, file) {
    saveGroup.restartTime = ln.split("time:")[1].trim();
})
.on('title', function(ln, file) {
    saveGroup.name = ln.split(":")[1].split(",")[0].trim().split(" ")[1];
})
.on('failed', function(ln, file) {
    saveGroup.failed = ln.split(":")[1].split(",");
})
.on('details', function(ln, file) {
    var t = ln.split(":")[0].split(" ")[1];
    //console.log(t);
    temp.server[t] = t;
    //temp.details.push(ln);

})
.on('succeeded', function(ln, file) {
    saveGroup.succeeded = ln.split(":")[1].split(",");
});

