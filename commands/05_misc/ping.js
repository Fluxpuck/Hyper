/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    For more information on the commands, please visit hyperbot.cc  */

//construct the command and export
module.exports.run = async (client, message, arguments, prefix, permissions) => {

    //return Client- and Discord Latency
    return message.reply('Pinging...').then(async (msg) => {
        msg.edit(`${client.user.username} ${msg.createdTimestamp - message.createdTimestamp}ms\nDiscord ${Math.round(client.ws.ping)}ms`);
    }).catch((err) => { });

}

//command information
module.exports.info = {
    name: 'ping',
    alias: ['latency'],
    category: 'misc',
    desc: 'Check client and Discord latency',
    usage: '{prefix}ping',
}
//slash setup
module.exports.slash = {
    slash: false,
    options: [],
    permission: [],
    defaultPermission: false,
}