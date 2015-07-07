/*jslint nomen: true */
/*jslint node:true */


var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');
var cdlibjs = require('cdlibjs');
var amqp = require('amqplib');
var moment = require('moment');
var chalk = require('chalk');


var error = chalk.bold.red;
var success = chalk.bold.green;
var standard = chalk.bold.gray;
var disabled = chalk.underline.gray;
var fileSave = chalk.green;


var rabbitMQ = {
    'server': cdlibjs.getRabbitMQAddress(),
    'username': 'test',
    'password': 'test',
    'virtualHost': '/test',
    'queue': 'nw.savegroup'
};

var rabbitMQAuthString = 'amqp://' + rabbitMQ.username + ':' + rabbitMQ.password + '@' + rabbitMQ.server + rabbitMQ.virtualHost;

amqp.connect(rabbitMQAuthString).then(function (conn) {
    process.once('SIGINT', function () { conn.close(); });
    return conn.createChannel().then(function (ch) {

        var ok = ch.assertQueue(rabbitMQ.queue, {durable: true});

        ok = ok.then(function (_qok) {
            return ch.consume(rabbitMQ.queue, function(msg) {
                //console.log(msg.content.toString());
                var saveGroup = JSON.parse(msg.content);
                console.log(fileSave(moment().format(),saveGroup.fileName));

                writeFile(saveGroup.fileName, saveGroup.data);
                ch.ack(msg);
            }, {noAck: false});
        });

        return ok.then(function (_consumeOk) {
            console.log(success(' [*] Waiting for messages. To exit press CTRL+C'));
        });
    });
}).then(null, console.warn);

function writeFile(file, data) {
    var fs = require('fs');
    fs.writeFile('savedFiles/' + file, data, function(err) {
        if(err) {
            return console.log(err);
        }
        //console.log("The file was saved!");
    });
}
