/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    For more information on the commands, please visit hyperbot.cc  */

//load required modules
const { ReplyErrorMessage, SendModerationActionMessage } = require("../../utils/MessageManager");
const { getUserFromInput } = require("../../utils/Resolver");
const { createHyperLog } = require("../../utils/AuditManager");
const { getModuleSettings } = require("../../utils/PermissionManager");
const { checkPendingMute } = require("../../database/QueryManager");

//construct the command and export
module.exports.run = async (client, message, arguments, prefix, permissions) => {

    const oldMessage = message; //save for original author, execution logging
    const interaction = (message.interaction) ? message.interaction : undefined;
    if (interaction) message = await interaction.fetchReply();

    //if there are no arguments, no target has been defined
    if (arguments.length < 1) return ReplyErrorMessage(oldMessage, '@user was not provided', 4800);

    //get target user
    const target = await getUserFromInput(message.guild, arguments[0]);
    if (target == false) return ReplyErrorMessage(oldMessage, '@user was not found', 4800);

    //check if target is moderator
    if (target.permissions.has('KICK_MEMBERS')) return ReplyErrorMessage(oldMessage, '@user is a moderator', 4800);

    //check if time is in valid format & if time is 
    if (/([0-9]+)\s{0,}m\W|/ig.test(arguments[1]) == false) return ReplyErrorMessage(message, 'Provide mute time in the following format \`10m\`.', 4800)
    const muteTime = (interaction) ? arguments[1] : Number(arguments[1].replace('m', ''))
    const duration = Number.isInteger(muteTime) ? muteTime * 60 * 1000 : false
    if (duration == false) return ReplyErrorMessage(oldMessage, 'Time out duration was not provided', 4800);

    //check if target is already timed out
    const pendingMute = await checkPendingMute(message.guild.id, target.user.id);
    if (pendingMute != false) return ReplyErrorMessage(oldMessage, '@user is already timed out', 4800);

    //check and set reason, else use default message
    let r = arguments.slice(2) //slice reason from arguments
    let reason = (r.length > 0) ? '' : 'No reason was provided.' //set default message if no reason was provided
    r.forEach(word => { reason += `${word} ` }); //set the reason

    //timeout the target
    const mute = await target.timeout(duration, `{HYPER} ${reason}`).catch(err => {
        ReplyErrorMessage(oldMessage, `An Error occured, and ${target.user.tag} was not muted.\n*Make sure the bot-role is above all other roles.*`);
        return false
    });

    //check if action was succesfull
    if (mute != false) {
        //verify that the user has been timed out
        if (interaction) interaction.editReply({ content: `**${target.user.tag}** has been timed out for ${muteTime} minutes.`, ephemeral: true });
        else message.reply(`**${target.user.tag}** has been timed out for ${muteTime} minutes.`).catch((err) => { });
        //save log to database and log event
        await createHyperLog(message, 'timeout', muteTime, target, reason);
        //get module settings, proceed if true
        const moderationAction = await getModuleSettings(message.guild, 'moderationAction');
        if (moderationAction.state === 1 && moderationAction.channel != null) {
            //don't log in channels that are excepted from logging
            if (moderationAction.exceptions.includes(message.channel.id)) return;
            return SendModerationActionMessage(oldMessage, module.exports.info.name, moderationAction.channel)
        }
    }
    return;
}


//command information
module.exports.info = {
    name: 'timeout',
    alias: ['mute'],
    category: 'moderation',
    desc: 'Mute target member for X minutes in the server',
    usage: '{prefix}timeout @user [time]m [reason]',
}

//slash setup
module.exports.slash = {
    slash: true,
    options: [{
        name: 'user',
        type: 'USER',
        description: 'Mention target user',
        required: true,
    },
    {
        name: 'time',
        type: 'NUMBER',
        description: 'Duration in minutes',
        choices: [
            {
                name: "5 minutes",
                value: 5
            },
            {
                name: "10 minutes",
                value: 10
            },
            {
                name: "20 minutes",
                value: 20
            },
            {
                name: "1 hour",
                value: 60
            },
            {
                name: "1 day",
                value: 1440
            },
        ],
        required: true,
    },
    {
        name: 'reason',
        type: 'STRING',
        description: 'Reason why member is muted',
        required: false,
    }],
    permission: [],
    defaultPermission: false,
    ephemeral: true
}