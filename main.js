const  { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder } = require('discord.js');
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
});

client.on("messageCreate", async message => {
    if (message.author.bot) return;

    page = await fetchProduct(message);

    if (page){
        product = parsePage(page);
        sendMessage(product, message);
    }
});




const parseUrl = (id) => {
    /*
    This function checks whethere the user inputed:
    - the SKU in XXXXXX-XXX or XXXXXX XXX format 
    - the name of the colourway.
    It then returns the formated url for the GET request.
    */
    regex10=/^\d{6}-\d{3}|[a-zA-Z]{2}\d{4}-\d{3}$/;
    regex9 =/^(?:\d{9}|[a-zA-Z]{2}\d{7})$/;
    regex=/^[a-zA-Z]+$/;

    if (regex10.test(id)){
        console.log('triggered10')

        return `https://tnuniverse.com/produit/${id}`;
    }

    else if (regex9.test(id)){
        id_new = id.slice(0,6) + "-" + id.slice(6);
        id_new = id_new.toUpperCase();
        return `https://tnuniverse.com/produit/${id_new}`;
    }
    
    else if (regex.test(id)){
        console.log('triggered_text')

        return `https://tnuniverse.com/names/${id}`;
    }

    else{
        console.log('triggered none')
        return null;
    };   

}

const fetchProduct = async (message) =>{
    /*
    This function sends a GET request to the website and returns the product data.
    If the request fails, it logs the error.
    */
    try {
        console.log('fetching');
        const url = parseUrl(message.content);
        if (!url) {
            message.channel.send('SKU ou nom de colorway invalide');
            return null;
        }

        console.log(url);

        const response = await fetch(url, {
            headers: {
                "user-agent":'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0',
                "Accept": "text/html",
            },
        });

        if (!response.ok) {
            message.channel.send('Erreur lors de la récupération des données du produit. Vériie le SKU.');
            return null;
        }

        const data = await response.text();
        const root = parse(data);
        const mainContent = root.querySelector('main')?.innerHTML || 'No main content found';

        console.log('finished fetching');

        return mainContent;
    } catch (err) {
        console.error('Error during fetch:', err);
        return null;
    }
}

const getAttributeValue = (root, thText) => {
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

const sendMessage = (product,message) => {
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
    
    const button = new ButtonBuilder()
        .setLabel('Voir sur TN Universe')
        .setStyle('Link')
        .setURL(parseUrl(message.content));

    const row = new ActionRowBuilder().addComponents(button);

    message.channel.send({ embeds: [embed], components: [row] });
}