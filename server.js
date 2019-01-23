const discord = require('discord.js');
const client = new discord.Client();
const text_to_mp3 = require('text-to-mp3');
const commandProcessor = new (require('./commandprocessor'))();

client.on('message', msg => {
    if (msg.author.bot) return;
    if (msg.content.indexOf('-') !== 0) return;
    //msg.reply(msg.content.slice(1));
    console.log(msg.author.username + ': ' + msg.content.slice(1));
    try {
        commandProcessor.process(msg.content.slice(1), msg);
    } catch (e) {
        console.log(e);
        msg.reply(e.message);
    }
});

client.login('NTM3MzY5Njc3NzUyNTY1Nzk4.DykQow.eyoxIGO7-AzzZNTqwKvtAy5mjpo').then(() => {
    console.log('Connected!');
    const channel = client.channels.get("537371422830624776");
    if (!channel) return;
    channel.join().then(connection => {

    }).catch(console.log);
});