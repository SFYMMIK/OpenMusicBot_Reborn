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
        GatewayIntentBits.Guilds, // Allows the bot to receive guild-related events
        GatewayIntentBits.GuildMessages, // Allows the bot to read and send messages
        GatewayIntentBits.MessageContent, // Allows the bot to read the content of messages
        GatewayIntentBits.GuildVoiceStates // Allows the bot to manage and join voice channels
    ]
});

let queue = [];
let announcementChannelId = null;
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

    if (message.content.startsWith('!ping')) {
        message.channel.send('Pong!');
    }

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

    if (message.content.startsWith('!channel')) {
        let channel = message.mentions.channels.first();
        if (channel) {
            announcementChannelId = channel.id;
            message.channel.send(`Announcement channel set to: ${channel.name}`);
        } else {
            message.channel.send('Please mention a valid channel.');
        }
    }

    if (message.content === '!commands') {
        const helpText = `
        **Available Commands:**
        !join - Tells the bot to join the voice channel
        !leave - To make the bot leave the voice channel
        !play <url> - To add songs to the playlist and join the voice channel
        !stop - Stops the whole playlist and disconnects the bot
        !skip - Skips the active song
        !rem <index> - Removes a particular song from the playlist
        !channel <#channel> - Sets the channel for song announcements
        !commands - Lists all commands and supported links
        !creds - Lists the credits to the creators
        
        **Supported Links:**
        - YouTube
        - SoundCloud
        - Spotify (will attempt to find a YouTube equivalent)
        - Bandcamp
        - Attachments: .mp3, .wav
        `;
        message.channel.send(helpText);
    }

    if (message.content === '!creds') {
        const credsText = `
        This bot was created by [Your Name or Team Name].
        Powered by discord.js, yt-dlp, and other open-source projects.
        `;
        message.channel.send(credsText);
    }
});

// Function to play the next song in the queue
async function playNext(connection, message) {
    if (queue.length > 0) {
        const stream = ytdl(queue[0], { filter: 'audioonly' });
        const dispatcher = connection.play(stream);

        dispatcher.on('finish', () => {
            queue.shift();
            playNext(connection, message);
        });

        log(`Now playing: ${queue[0]}`);
        message.channel.send(`**Now playing:** ${queue[0]}`);

        if (announcementChannelId) {
            const channel = client.channels.cache.get(announcementChannelId);
            if (channel) {
                channel.send(`**Now playing:** ${queue[0]}`);
            }
        }
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