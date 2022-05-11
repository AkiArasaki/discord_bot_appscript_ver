const express = require("express")
const app = express()
const { Client, Intents, MessageEmbed } = require('discord.js');
const { createAudioPlayer, createAudioResource, joinVoiceChannel, AudioPlayerStatus } = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { token } = require('./token.json');
const { prefix } = require('./config.json');

const client = new Client({intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES
    ]});

app.get("/", (req, res) => {
  res.send("live page")
})

app.listen(3000, () => {
  console.log(`Bot is alive!`)
})

class Music {
    isPlaying = false;
    connection = null;
    queue = [];
    player = createAudioPlayer();
    //join
    join(msg) {
        //if user sent message is in voice channel
        if (msg.member.voice.channel !== null) {
            //join voice channel
            this.connection = joinVoiceChannel({
                channelId: msg.member.voice.channel.id,
                guildId: msg.member.voice.channel.guild.id,
                adapterCreator: msg.member.voice.channel.guild.voiceAdapterCreator,
            });
            //make connection subscribe to player
            this.connection.subscribe(this.player);
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Please join a channel first')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //play
    async play(msg) {
        //voice channel ID
        const guildID = msg.guild.id;
        //YouTube url
        const musicURL = msg.content.replace(`${prefix}p`, '').trim();
        //try to get Youtube video info
        try {
            //get Youtube video info
            const res = await ytdl.getInfo(musicURL);
            const info = res.videoDetails;
            //add track into queue
            this.queue.push({
                name: info.title,
                url: musicURL
            });
            //if there is track playing, add new track into queue, otherwise play track
            if (this.isPlaying) {
                msg.channel.send({embeds: [
                        new MessageEmbed()
                            .setColor('#3498DB')
                            .setTitle('Track queued:')
                            .setDescription(info.title)
                            .setURL(musicURL)
                            .setTimestamp()
                    ]});
            } else {
                this.isPlaying = true;
                this.playMusic(msg, guildID, this.queue[0]);
            }
        } catch(e) {
            console.log(e);
        }
    }
    playMusic(msg, guildID, musicInfo) {
        //start playing message
        msg.channel.send({embeds: [
                new MessageEmbed()
                    .setColor('#3498DB')
                    .setTitle('Now playing:')
                    .setDescription(musicInfo.name)
                    .setURL(musicInfo.url)
                    .setTimestamp()
            ]});
        //play track
        this.player.stop();
        this.player.play(createAudioResource(ytdl(musicInfo.url, { filter: 'audioonly' })));
        //remove track from queue
        this.queue.shift();
        //even after playing a track
        this.player.on(AudioPlayerStatus.Idle, () => {
            //if there are tracks in queue
            if (this.queue.length > 0) {
                this.playMusic(msg, guildID, this.queue[0]);
            } else {
                if (this.isPlaying === true) {
                    this.isPlaying = false;
                    msg.channel.send({embeds: [
                            new MessageEmbed()
                                .setColor('#3498DB')
                                .setTitle('End of queue')
                                .setDescription('.help for commands')
                                .setTimestamp()
                        ]});
                    //leave channel
                    this.connection.destroy();
                }
            }
        });
    }
    //resume
    resume(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#3498DB')
                        .setTitle('Resume playing')
                        .setTimestamp()
                ]});
            //resume playing
            this.player.unpause();
        }
    }
    //pause
    pause(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Pause playing')
                        .setTimestamp()
                ]});
            //pause playing
            this.player.pause();
        }
    }
    //skip
    skip(msg) {
        if (this.player) {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#2ECC71')
                        .setTitle('Skip current track')
                        .setTimestamp()
                ]});
            //skip current track
            this.player.stop(true);
        }
    }
    //queue
    nowQueue(msg) {
        //if there are tracks in queue
        if (this.queue && this.queue.length > 0) {
            //make Objects to Strings
            const queueString = this.queue.map((item, index) => `\n[${index+1}] ${item.name}`).join();
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#2ECC71')
                        .setTitle('Current queue:')
                        .setDescription(queueString)
                        .setTimestamp()
                ]});
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('There\'s no track in queue')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //leave
     leave(msg) {
        if (this.connection != null && this.connection.state.status !== "destroyed") {
            //destroy connection and leave channel
            this.connection.destroy();
            //clear player
            this.player.stop();
            //clear queue
            this.queue = [];
            //set isPlaying to false
            this.isPlaying = false;
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('ヾ(￣▽￣)Bye~Bye~')
                ]});
        } else {
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('I\'m not in any channel')
                        .setDescription('.help for commands')
                ]});
        }
    }
}

const music = new Music();

//when bot detects message
client.on('message', async (msg) => {
    //.join
    if (msg.content === `${prefix}join`) {
        //join voice channel
        music.join(msg);
    }
    //if message contains ${prefix}p
    if (msg.content.indexOf(`${prefix}p`) > -1) {
        //if user sent message is in voice channel
        if (msg.member.voice.channel) {
            //play music
            await music.join(msg);
            await music.play(msg);
        } else {
            //if user sent message is not in any channel
            msg.channel.send({embeds: [
                    new MessageEmbed()
                        .setColor('#E74C3C')
                        .setTitle('Please join a channel first')
                        .setDescription('.help for commands')
                ]});
        }
    }
    //.resume
    if (msg.content === `${prefix}resume`) {
        //resume playing
        music.resume(msg);
    }
    //.pause
    if (msg.content === `${prefix}pause`) {
        // pause playing
        music.pause(msg);
    }
    //.skip / .next
    if (msg.content === `${prefix}skip` || msg.content === `${prefix}next`) {
        //skip current track
        music.skip(msg);
    }
    //.queue
    if (msg.content === `${prefix}queue`) {
        //view queue
        music.nowQueue(msg);
    }
    //.leave
    if (msg.content === `${prefix}leave` || msg.content === `${prefix}die`) {
        //leave channel
        music.leave(msg);
    }
    //.help
    if (msg.content === `${prefix}help`) {
        //output list of commands
        msg.channel.send({embeds: [
                new MessageEmbed()
                    .setColor('#3498DB')
                    .setTitle('Commands:')
                    .setDescription(
                        '.join - join voice channel\n' +
                        '.p - start playing music :D\n' +
                        '.resume - resume music playing\n' +
                        '.pause - pause music playing\n' +
                        '.skip - skip current track\n' +
                        '.queue - view queue\n' +
                        '.leave - make bot leave voice channel'
                    )
            ]});
    }
});

//output in console when bot gets on line
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);
