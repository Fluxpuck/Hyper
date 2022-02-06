/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    For more information on the commands, please visit hyperbot.cc  */

//import styling
const { apply_button } = require('../../assets/buttons');

//require modules
const { MessageEmbed } = require("discord.js");
const { ReplyErrorMessage } = require("../../utils/MessageManager");
const { textchannels } = require('../../config/config.json');

//construct the command and export
module.exports.run = async (client, message, arguments, prefix, permissions) => {

    //if there are no arguments or no attachments
    if (arguments.length < 1) return message.reply('Where should I post?');

    //get target channel
    const channel = message.guild.channels.cache.find(c => c.id == arguments[0].replace(/[^\w\s]/gi, ''))
    if (!channel) return ReplyErrorMessage(message, `#channel was not found`, 4800)
    if (textchannels.includes(channel.type) == false) return ReplyErrorMessage(message, `#channel is not a text channel`, 4800)

    //create embedded message
    const collect_message = new MessageEmbed()
        .setDescription(`Please click the button to start your application process.`)

    //send message to target channel
    await channel.send({
        embeds: [collect_message],
        components: [apply_button],
    })

}


//command information
module.exports.info = {
    name: 'applications',
    alias: ['apply'],
    category: 'admin',
    desc: 'Creates an application module',
    usage: '{prefix}applications [channel]',
}

//slash setup
module.exports.slash = {
    slash: false,
    options: [],
    permission: [],
    defaultPermission: false,
    ephemeral: true
}