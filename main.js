const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const config = require('dotenv').config();
const { parse } = require('node-html-parser');

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
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, channelId } = interaction;
    console.log('Command:', commandName);
    console.log('Channel:', channelId);
    console.log('Options:', options);

    if (channelId !== '1292201035301126275'){
        interaction.reply('Désolé, cette commande n\'est pas disponible dans ce channel.');
        return;
    };

    if (commandName === 'tn') {
        const query = options.getString('sku');
        const regex10 = /^(?:\d{6}-\d{3}|[a-zA-Z]{2}\d{4}-\d{3})$/;
        const regex9 = /^(?:\d{9}|[a-zA-Z]{2}\d{7})$/;

        if (regex10.test(query) || regex9.test(query)) {
            await interaction.deferReply({ ephemeral: true }); // Acknowledge the interaction

            try {
                const page = await fetchProduct(query);

                if (page) {
                    const product = parsePage(page);
                    sendMessage(product, interaction);
                } else {
                    await interaction.editReply("Désolé, soit ce SKU n'existe pas, soit il n'est pas enregistré sur TN Universe");
                }
            } catch (err) {
                await interaction.editReply('Erreur lors de la récupération des données du produit.');
            }
        } else {
            await interaction.editReply('Désolé, SKU invalide');
        }
    }
});

const parseUrl = (id) => {
    /*
    This function checks whether the user inputted:
    - the SKU in XXXXXX-XXX or XX1234-567 format 
    - the name of the colourway.
    It then returns the formatted URL for the GET request.
    */
    const regex10 = /^(?:\d{6}-\d{3}|[a-zA-Z]{2}\d{4}-\d{3})$/;
    const regex9 = /^(?:\d{9}|[a-zA-Z]{2}\d{7})$/;

    if (regex10.test(id)) {
        return `https://tnuniverse.com/produit/${id}`;
    } else if (regex9.test(id)) {
        const id_new = id.slice(0, 6) + "-" + id.slice(6);
        return `https://tnuniverse.com/produit/${id_new}`;
    } else {
        return null;
    }
}

const fetchProduct = async (message) => {
    /*
    This function sends a GET request to the website and returns the product data.
    If the request fails, it logs the error.
    */
    try {
        const url = parseUrl(message);

        if (!url) {
            console.error('Invalid URL');
            return null;
        }

        console.log(url);

        const response = await fetch(url, {
            headers: {
                "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
                "Accept": "text/html",
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.text();
        const root = parse(data);
        const mainContent = root.querySelector('main')?.innerHTML || null;

        console.log('finished fetching');

        return mainContent;

    } catch (err) {
        console.error('Error during fetch:', err);
        return null;
    }
}

const getAttributeValue = (root, thText) => {
    /*
    This function returns the value of the attribute in the product page.
    For the specific structure of TNuniverse's product page HTML.
    */
    const rows = root.querySelectorAll('.shop_attributes tr');
    for (let row of rows) {
        const th = row.querySelector('th');
        if (th && th.innerText.trim() === thText) {
            return row.querySelector('td a')?.innerText || 'Not found';
        }
    }
    return 'Not found';
};

const parsePage = (page) => {
    /*
    This function parses the html page and returns the product data.
    */
    const root = parse(page);

    const product = {
        imageUrl: root.querySelector('.woocommerce-product-gallery__image img')?.getAttribute('data-src') || null,
        name: getAttributeValue(root, 'Name(s)'),
        productionDate: getAttributeValue(root, 'Production Date'),
        countryManufacture: getAttributeValue(root, 'Country of Manufacture'),
        color: getAttributeValue(root, 'Colorway')
    };
    return product;
}

const sendMessage = (product, interaction) => {
    /*
    This function sends the product in a message back to the user in the channel.
    With a direct link to the page just scraped.
    */    
    const embed = new EmbedBuilder()
        .setTitle(product.name)
        .addFields(
            { name: 'Date de Production', value: product.productionDate, inline: true },
            { name: 'Pays de Fabrication', value: product.countryManufacture, inline: true },
            { name: 'Colorway', value: product.color, inline: true }
        )
        .setFooter({ text: 'TN Universe' })
        .setTimestamp();

    if (product.imageUrl) {
        embed.setImage(product.imageUrl);
    }

    const url = parseUrl(interaction.options.getString('sku'));
    if (url) {
        const button = new ButtonBuilder()
            .setLabel('Voir sur TN Universe')
            .setStyle(ButtonStyle.Link)
            .setURL(url);

        const row = new ActionRowBuilder().addComponents(button);
        interaction.channel.send({ embeds: [embed], components: [row] });
    } else {
        interaction.channel.send({ embeds: [embed] });
    }

    interaction.deleteReply();
}