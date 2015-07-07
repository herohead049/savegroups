/*jslint nomen: true */
/*jslint node:true */


var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');
var cdlibjs = require('cdlibjs');
var chokidar = require('chokidar');
var moment = require('moment');

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

//var temp =  [{
//    server: "",
//    details: []
//}];

var temp = [];

var watcher = chokidar.watch('sgFilesDirectory/*.txt', {
  ignored: /[\/\\]\./,
  persistent: true
});

watcher
  .on('add', function(path) {
    processFile(path);
});


var rmq = cdlibjs.rabbitMQ;
rmq.server = cdlibjs.getRabbitMQAddress();
rmq.routingKey = "nw_failed";

//console.log(rmq);
//process.exit(0);

function findPattern(files, regex) {
    var emitter = new EventEmitter();
    files.forEach(function(file) {
        fs.readFile(file, 'utf8', function(err,content) {
            if (err)
                return emitter.emit('error',err);
            //console.log(standard(content));
            var lines = content.split(/\r?\n/);
            var fileGroup = "";

            _.forEach(lines, function(ln) {
                //console.log(ln);
                if (match = ln.match("Succeeded:")) {
                    emitter.emit('succeeded',ln.replace(/\s/g, ''), file);
                    return;
                }
                if (match = ln.match("Failed:")) {
                    emitter.emit('failed',ln.replace(/\s/g, ''),file);
                    return;
                }
                if (match = ln.match("Disabled:")) {
                    emitter.emit('disabled',ln.replace(/\s/g, ''),file);
                    return;
                }
                if (match = ln.match("Start time:")) {
                    emitter.emit('startTime',ln,file);
                    return;
                }
                if (match = ln.match("Restart time:")) {
                    emitter.emit('restartTime',ln,file);
                    return;
                }
                if (match = ln.match("End time:")) {
                    emitter.emit('endTime',ln,file);
                    return;
                }
                if (match = ln.match("NetWorker savegroup:")) {
                    emitter.emit('title',ln,file);
                    return;
                }
                  if (match = ln.match(/--- Unsuccessful Save Sets ---/)) {
                    fileGroup = "failed"
                }
                if (match = ln.match(/--- Successful Save Sets ---/)) {
                    fileGroup = "success";
                }

                if (fileGroup === "failed") {
                    emitter.emit('failed details',ln,file);
                } else {
                    emitter.emit('details',ln,file);
                }
                /**
                if (match = ln.match(/\* /)) {
                    if (fileGroup === "failed") {
                        emitter.emit('failed details',ln,file);
                    }
                }
                **/
            });

            emitter.emit('fileread',file);

        });
    });
    return emitter;
}

function processFile(file) {

findPattern([file],/\(notice\)/g)
.on('fileread', function(file) {
    //console.log(file + ' was read');
    console.log(saveGroup);
    _.forEach(temp, function (s) {
       // console.log(s.servername,s.details);

    });

    var tmpFile = saveGroup.startTime.replace(/\:/g,'_');
    sendCompleteSaveGroup(file, saveGroup.name + "_" + tmpFile.replace(/\ /g,'_') + '.txt');



    //console.log(_.pluck(_.filter(temp, { 'servername' : "ch00sa09"}) , 'details'));

    //console.log(temp[1]);
})
.on('found', function(file, match) {
    console.log('Matched "' + match + '" in file ' + file);
})
.on('error', function(err) {
    console.log('Error emitted: ' + err.message);
})
.on('disabled', function(ln, file) {
    saveGroup.disabled = ln.split(":")[1].split(",");
        //rmq.routingKey = "nw_disabled";
    _.forEach(saveGroup.disabled, function (server) {
    var tempDisabled = {
            server: server,
            group: saveGroup.name,
            timeStamp: moment().format()
        };
        rmq.publishTopic(JSON.stringify(tempDisabled), "nw_disabled");
    });
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
    //rmq.routingKey = "nw_failed";
    _.forEach(saveGroup.failed, function (server) {
        var tempFailed = {
            server: server,
            group: saveGroup.name,
            timeStamp: moment().format()
        };
        rmq.publishTopic(JSON.stringify(tempFailed), "nw_failed");
    });
})
.on('details', function(ln, file) {
    var t = ln.split(":")[0].split(" ")[1];
    //console.log(t);
    //temp.server[t] = t;
    checkAndAdd(t,ln);
    //temp.details.push(ln);

}).on('failed details', function(ln, file) {
    var t = ln.split(":")[0].split(" ")[1];
    //console.log(t);
    //temp.server[t] = t;
    console.log("failed", ln);
    //rmq.publishTopic(ln);


})
.on('succeeded', function(ln, file) {
    saveGroup.succeeded = ln.split(":")[1].split(",");
    console.log("Count of publish" , saveGroup.succeeded.length);
        //rmq.routingKey = "nw_success";
    _.forEach(saveGroup.succeeded, function (server) {
        console.log("sending", server);
        var tempSuccess = {
            server: server,
            group: saveGroup.name,
            timeStamp: moment().format()
        };
        rmq.publishTopic(JSON.stringify(tempSuccess), "nw_success");
    });
});

}

function checkAndAdd(name,ln) {
  var id = temp.length + 1;
  var found = temp.some(function (el) {
    return el.username === name;
  });
  if (!found) { temp.push({ servername: name , details: ln}); }
}


function sendCompleteSaveGroup(file,fileName) {
    fs = require('fs')
    fs.readFile(file, 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
        var temp = {
            fileName: fileName,
            timeStamp: moment().format(),
            data: data
        };
  rmq.publishTopic(JSON.stringify(temp), "nw_savegroups");
fs.unlink(file);
        //console.log(data);
});
}
