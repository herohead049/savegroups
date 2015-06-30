/*jslint nomen: true */
/*jslint node:true */


var fs = require('fs');
var chalk = require('chalk');
var _ = require('lodash');
var cdlibjs = require('cdlibjs');
var amqp = require('amqplib');

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
                console.log(saveGroup.fileName);

                writeFile(saveGroup.fileName, saveGroup.data);
                ch.ack(msg);
            }, {noAck: false});
        });

        return ok.then(function (_consumeOk) {
            console.log(' [*] Waiting for messages. To exit press CTRL+C'.green);
        });
    });
}).then(null, console.warn);

function writeFile(file, data) {
    var fs = require('fs');
    fs.writeFile('savedFiles/' + file, data, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });
}
