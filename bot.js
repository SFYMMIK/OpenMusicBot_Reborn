const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const ytdl = require('ytdl-core');
const express = require('express');
const app = express();
const PORT = 3000;

// Read the bot token from the file
const token = fs.readFileSync('TOKEN.DISCORD.BOT.txt', 'utf-8').trim();

// Set up the bot with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, // To manage guilds
        GatewayIntentBits.GuildVoiceStates, // To manage voice channels
        GatewayIntentBits.GuildMessages, // To read and send messages
        GatewayIntentBits.MessageContent // To read the content of messages
    ]
});

let queue = [];
let logData = "";

// Logging function
function log(message) {
    logData += message + "\n";
    console.log(message);
}

// When the bot is ready
client.once('ready', () => {
    log('Bot is online!');
});

// Handling message events
client.on('messageCreate', async message => {
    log(`Received message: ${message.content} from ${message.author.tag}`);

    // Ignore messages from bots
    if (message.author.bot) return;

    if (message.content.startsWith('!play')) {
        let url = message.content.split(' ')[1];
        if (message.member.voice.channel) {
            const connection = await message.member.voice.channel.join();
            queue.push(url);
            log(`Added to queue: ${url}`);
            message.channel.send(`**Added to queue:** ${url}`);
            if (queue.length === 1) {
                playNext(connection, message);
            }
        } else {
            message.reply('You need to join a voice channel first!');
        }
    }

    if (message.content === '!stop') {
        if (message.guild.me.voice.channel) {
            queue = [];
            message.guild.me.voice.channel.leave();
            log('Stopped the playlist and left the voice channel.');
            message.channel.send('Stopped the playlist and left the voice channel.');
        }
    }

    if (message.content === '!skip') {
        if (message.guild.me.voice.channel && queue.length > 0) {
            log('Skipped the current song.');
            message.channel.send('Skipped the current song.');
            queue.shift();
            if (queue.length > 0) {
                playNext(message.guild.me.voice.channel.connection, message);
            } else {
                message.guild.me.voice.channel.leave();
                log('No more songs in the queue, leaving the voice channel.');
            }
        }
    }

    if (message.content.startsWith('!rem')) {
        let index = parseInt(message.content.split(' ')[1]) - 1;
        if (index >= 0 && index < queue.length) {
            let removed = queue.splice(index, 1);
            log(`Removed song at position ${index + 1}: ${removed}`);
            message.channel.send(`Removed song at position ${index + 1}: ${removed}`);
        } else {
            message.channel.send(`Invalid index. There are ${queue.length} songs in the queue.`);
        }
    }
});

// Function to play the next song in the queue
function playNext(connection, message) {
    if (queue.length > 0) {
        const stream = ytdl(queue[0], { filter: 'audioonly' });
        const dispatcher = connection.play(stream);

        dispatcher.on('finish', () => {
            queue.shift();
            playNext(connection, message);
        });

        log(`Now playing: ${queue[0]}`);
        message.channel.send(`**Now playing:** ${queue[0]}`);
    }
}

// Log in to Discord with the token
client.login(token);

// Express app for log export
app.get('/', (req, res) => {
    res.send(`
        <h1>Discord Music Bot</h1>
        <button onclick="exportLog()">Export Log</button>
        <script>
            function exportLog() {
                window.location.href = '/export-log';
            }
        </script>
    `);
});

app.get('/export-log', (req, res) => {
    res.setHeader('Content-disposition', 'attachment; filename=bot.log');
    res.setHeader('Content-type', 'text/plain');
    res.write(logData);
    res.end();
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
