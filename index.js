/*jslint nomen: true */
/*jslint node:true */

/*eslint-env node */
/*eslint quotes: [2, "single"], curly: 2*/

'use strict';


var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
//var chalk = require('chalk');
var _ = require('lodash');

//var error = chalk.bold.red;
//var success = chalk.bold.green;
//var standard = chalk.bold.grey;
//var disabled = chalk.strikethrough.grey;

var saveGroup = {
    name: '',
    startTime: '',
    endTime: '',
    restartTime: '',
    details: [],
    succeeded: [],
    disabled: [],
    failed: []
};

//var temp =  [{
//    server: '',
//    details: []
//}];

var temp = [];


function findPattern(files) {
    var emitter = new EventEmitter();
    files.forEach(function (file) {
        fs.readFile(file, 'utf8', function (err, content) {
            if (err) {
                return emitter.emit('error', err);
            }
            //console.log(standard(content));
            var lines = content.split(/\r?\n/);
            _.forEach(lines, function (ln) {
                //console.log(ln);
                if (ln.match('Succeeded:')) {
                    emitter.emit('succeeded', ln.replace(/\s/g, ''), file);
                }

                if (ln.match('Failed:')) {
                    emitter.emit('failed', ln.replace(/\s/g, ''), file);
                }
                if (ln.match('Disabled:')) {
                    emitter.emit('disabled', ln.replace(/\s/g, ''), file);
                }
                if (ln.match('Start time:')) {
                    emitter.emit('startTime', ln, file);
                }
                if (ln.match('Restart time:')) {
                    emitter.emit('restartTime', ln, file);
                }
                if (ln.match('End time:')) {
                    emitter.emit('endTime', ln, file);
                }
                if (ln.match('NetWorker savegroup:')) {
                    emitter.emit('title', ln, file);
                }
                if (ln.match(/\* /)) {
                    emitter.emit('details', ln, file);
                }
            });

            emitter.emit('fileread', file);
        });
    });
    return emitter;
}

function checkAndAdd(name, ln) {
    //var id = temp.length + 1;
    var found = temp.some(function (el) {
        return el.username === name;
    });
    if (!found) {
        temp.push({
            servername: name,
            details: ln
        });
    }
}

findPattern(
['sgfiles/test10.txt'],
        /\(notice\)/g
    )
    .on('fileread', function (file) {
        console.log(file + ' was read');
        console.log(saveGroup);
        //_.forEach(temp, function (s) {
        // console.log(s.servername,s.details);

        //});

        console.log(_.pluck(_.filter(temp, {
            'servername': 'ch00sa09'
        }), 'details'));

        //console.log(temp[1]);
    })
    .on('found', function (file, match) {
        console.log('Matched "' + match + '" in file ' + file);
    })
    .on('error', function (err) {
        console.log('Error emitted: ' + err.message);
    })
    .on('disabled', function (ln) {
        saveGroup.disabled = ln.split(':')[1].split(',');
    })
    .on('startTime', function (ln) {
        saveGroup.startTime = ln.split('time:')[1].trim();
    })
    .on('endTime', function (ln) {
        saveGroup.endTime = ln.split('time:')[1].trim();
    })
    .on('restartTime', function (ln) {
        saveGroup.restartTime = ln.split('time:')[1].trim();
    })
    .on('title', function (ln) {
        saveGroup.name = ln.split(':')[1].split(',')[0].trim().split(' ')[1];
    })
    .on('failed', function (ln) {
        saveGroup.failed = ln.split(':')[1].split(',');
    })
    .on('details', function (ln) {
        var t = ln.split(':')[0].split(' ')[1];
        //console.log(t);
        //temp.server[t] = t;
        checkAndAdd(t, ln);
        //temp.details.push(ln);

    })
    .on('succeeded', function (ln) {
        saveGroup.succeeded = ln.split(':')[1].split(',');
    });
