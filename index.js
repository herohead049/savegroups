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
    succeeded: [],
    disabled: [],
    failed: []
}


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
                if (match = ln.match("Disabled:")) {
                    emitter.emit('disabled',ln.replace(/\s/g, ''),file);
                }

            });

            emitter.emit('fileread',file);

        });
    });
    return emitter;
}



findPattern(
['sgfiles/test1.txt', 'sgfiles/test2.txt'],
    /\(notice\)/g
    )
.on('fileread', function(file) {
    console.log(file + ' was read');
    console.log(saveGroup);
})
.on('found', function(file, match) {
    console.log('Matched "' + match + '" in file ' + file);
})
.on('error', function(err) {
    console.log('Error emitted: ' + err.message);
})
.on('disabled', function(ln, file) {
    //console.log('Matched "' + match + '" in file ' + file);
    //console.log(error(ln),file);
    saveGroup.disabled = ln.split(":")[1].split(",");
})
.on('succeeded', function(ln, file) {
    //console.log('Matched "' + match + '" in file ' + file);
    //console.log(success(ln),file);
    saveGroup.succeeded = ln.split(":")[1].split(",");
});

