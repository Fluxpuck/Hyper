/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    For more information on the commands, please visit hyperbot.cc  */

//require modules

//construct the command and export
module.exports.run = async (client, message, arguments, prefix, permissions) => {


}


//command information
module.exports.info = {
    name: 'statusdashboard',
    alias: [],
    category: 'setup',
    desc: 'Setup status Dashboard',
    usage: '{prefix}statusdashboard [channel]',
}

//slash setup
module.exports.slash = {
    slash: false,
    options: [{
        name: 'channel',
        type: 'CHANNEL',
        channelTypes: ['GUILD_TEXT', 'GUILD_NEWS_THREAD', 'GUILD_PUBLIC_THREAD', 'GUILD_PRIVATE_THREAD'],
        description: 'Where should I talk?',
        required: true,
    }],
    permission: [],
    defaultPermission: false,
    ephemeral: true
}