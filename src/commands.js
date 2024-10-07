import { REST, Routes} from 'discord.js';

export const initCommands = async (config, client) => {
    /*
    This function initializes the commands for the bot.
    Here, we are defining the /tn command.
    */

    const commands = [
        {
            name: 'tn',
            description: 'Recherche dans la base de données de TN Universe',
            options: [
                {
                    name: 'sku',
                    type: 3,
                    description: 'SKU de la paire que tu cherches dans le format 604133001 ou BQ4629-001',
                    required: true,
                },
            ],
        },
    ];

    const rest = new REST({ version: '10' }).setToken(config.parsed.token);

    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};