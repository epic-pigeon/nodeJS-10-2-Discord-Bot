const discord = require('discord.js');
const client = new discord.Client();
const text_to_mp3 = require('text-to-mp3');
const commandProcessor = new (require('./commandprocessor'))([
    {
        name: "say",
        description: "Writes down all the arguments given",
        adminOnly: false,
        usage: "-say 'arg1' 'arg2' ...",
        action: function (msg, arguments) {
            arguments.forEach(arg => {msg.reply(arg.value)});
        }
    },
    {
        name: "add_command",
        description: "Creates a command",
        adminOnly: true,
        usage: "-add_command 'name' 'description' 'usage' 'admin only? true : false' 'msg' 'arguments' 'function body'",
        action: function (msg, arguments) {
            if (arguments.length >= 3) {
                let name = arguments.shift().value;
                let commandNames = [];
                self.commands.forEach(command => {commandNames.push(command.name)});
                if (commandNames.includes(name)) throw {message: "Such command already exists!"};
                let description = arguments.shift().value;
                let usage = arguments.shift().value;
                let adminOnly = arguments.shift().value;
                let functionBody = arguments.pop().value;
                let functionArguments = [];
                arguments.forEach(arg => functionArguments.push(arg.value));
                let action;
                try {
                    action = new Function(...functionArguments, functionBody);
                } catch (e) {
                    throw {message: "Invalid function"};
                }
                self.commands.push({
                    name: name,
                    description: description,
                    usage: usage,
                    adminOnly: adminOnly,
                    action: action
                });
                msg.reply('Command "' + name + '" successfully created!');
            } else {
                throw {message: "Invalid number of arguments"};
            }
        }
    },
    {
        name: "help",
        description: "Helps with understanding commands :)",
        usage: "help ?command",
        adminOnly: false,
        action: function (msg, arguments) {
            if (arguments.length === 0) {
                let string = 'All commands list:\n\t';
                let commandNames = [];
                self.commands.forEach(command => {commandNames.push(command.name)});
                string += commandNames.join('\n\t');
                msg.reply(string);
            } else if (arguments.length === 1) {
                let command = arguments[0].value;
                let commandObject;
                self.commands.forEach(comm => {
                    if (comm.name === command.toLowerCase()) commandObject = comm;
                });
                if (typeof commandObject === "undefined") throw {message: "Such a command doesn't exist"};
                let string = "Command name: " + commandObject.name + "\nCommand description: " + commandObject.description + "\nCommand usage: " + commandObject.usage + (commandObject.adminOnly ? "\nAdmin only!" : "");
                msg.reply(string);
            }
        }
    },
    {
        name: "fetch_songs",
        description: "Updates songs database",
        usage: "-fetch_songs",
        adminOnly: false,
        action: function (msg, arguments) {
            fetchSongs();
            msg.reply('Song database successfully updated!');
        }
    },
    {
        name: "show_songs",
        description: "Shows all songs",
        usage: "-show_songs",
        adminOnly: false,
        action: function (msg, arguments) {
            msg.reply(songs.join('\n'));
        }
    },
    {
        name: "play_song",
        description: "Playes a song",
        usage: "-play_song song_id",
        adminOnly: true,
        action: function (msg, arguments) {
            let songID = arguments.shift().value;
            playSong(songID);
            msg.reply('Song successfully selected:\n\t' + song.toString());
        }
    },
    {}
]);
const request = require('request');
let songs = [];
let voiceConnection;
let currentDispatcher;
let nextSongID;
let currentSongID;
let playMode = 'nextLoop';

function playNextSong() {
    if (nextSongID) {
        playSong(nextSongID);
        nextSongID = undefined;
    } else {
        switch (playMode.toLowerCase()) {
            case "nextloop":
                nextSongID = currentSongID + 1;
                if (nextSongID == songs.length) nextSongID = 0;
                playNextSong();
                break;
            case "next":
                nextSongID = currentSongID + 1;
                if (nextSongID == songs.length)
                    nextSongID = 0;
                else
                    playNextSong();
                break;
            case "random":
                nextSongID = Math.floor(Math.random() * songs.length);
                playNextSong();
                break;
            case "single":
                break;
        }
    }
}

function playSong(songID) {
    currentSongID = songID;
    let song;
    songs.forEach(s => {if (s.id == songID) song = s});
    if (!song) throw {message: "A song with such ID doesn't exist"};
    let stream = request("http://82.117.236.104:8080/player/music/" + song.filename);
    currentDispatcher = voiceConnection.playStream(stream);
}

function fetchSongs () {
    request('http://82.117.236.104:8080/player/api.php?query=SELECT%20songs.id,%20songs.name%20as%20name,%20songs.filename,%20authors.name%20as%20authorname%20FROM%20songs%20JOIN%20authors%20ON%20(songs.authorid%20=%20authors.id)%20WHERE%20songs.verified%20=%201',
        (err, res, body) => {
            songs = JSON.parse(body);
            songs.forEach(song => {song.toString = () => {
                return "ID: " + song.id + ", name: " + song.name + ", author: " + song.authorname;
            }});
        })
}

fetchSongs();

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
        voiceConnection = connection;
    }).catch(console.log);
});