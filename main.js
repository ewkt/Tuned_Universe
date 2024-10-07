import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { triggerTN } from './src/source.js';
import { initCommands } from './src/commands.js';
import dotenv from 'dotenv';

const config = dotenv.config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.login(config.parsed.token);

client.on("ready", async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    initCommands(config, client);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;
    triggerTN(interaction);
});