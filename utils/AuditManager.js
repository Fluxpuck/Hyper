/*  Fluxpuck © Creative Commons Attribution-NoDerivatives 4.0 International Public License
    The AuditManager contains functions related to Logging Audits and Moderator actions */

//require packages
const { customAlphabet } = require('nanoid');
const nanoid = customAlphabet('1234567890abcdef', 12);
const { getMemberLogs, saveMemberLog } = require("../database/QueryManager");

module.exports = {

    /** construct hyperLog and save to database
     * @param {*} message 
     * @param {*} type 
     * @param {*} target 
     * @param {*} reason 
     * @returns 
     */
    async createHyperLog(message, type, duration, target, reason) {
        function hyperLog(log, reason, duration, target, executor) {
            this.log = log;
            this.reason = reason;
            this.duration = duration;
            this.target = target;
            this.executor = executor;
        }

        let executor //setup executor details
        const interaction = (message.interaction) ? message.interaction : undefined;
        if (interaction) executor = { id: interaction.user.id, tag: `${interaction.user.username}#${interaction.user.discriminator}` }
        else executor = { id: message.author.id, tag: message.author.tag }

        //construct hyperlog
        const UserLog = new hyperLog({ id: nanoid(), type: type }, reason, duration, { id: target.user.id, username: target.user.tag }, { id: executor.id, username: executor.tag });
        //save to database
        await saveMemberLog(message.guild.id, UserLog);
        //return hyperlog
        return UserLog
    },

    /** collect all (saved) Userlogs 
     * @param {*} guild 
     * @param {*} target 
     * @returns 
     */
    async FetchHyperLogs(guild, target) {
        //get all member logs from database
        const HyperLogs = await getMemberLogs(guild.id, target.id)
        //return empty array if false
        if (HyperLogs == false) return [];
        //return values
        return HyperLogs
    },

    /** get ban information on target
     * @param {*} guild 
     * @param {*} target 
     */
    async FetchBanLog(guild, target) {
        function BanDetails(target, reason, date) {
            this.target = target;
            this.reason = reason;
            this.date = date;
        }
        //get ban information on target
        const fetchBans = await guild.bans.fetch(target.id)
            .catch(err => { return false }) //return if nothing came up
        //if no ban logs were found, return false
        if (fetchBans == false) return false
        //return ban details
        return new BanDetails({ id: fetchBans.user.id, username: `${fetchBans.user.username}#${fetchBans.user.discriminator}` }, fetchBans.reason, undefined)
    },

    /** Filter Hyper and Audit Ban logs
     * @param {*} target 
     * @param {*} HyperLogs 
     * @param {*} BanLogs 
     */
    async FilterTargetLogs(target, HyperLogs, BanLogs) {
        function TargetLogs(target, status, reason, date) {
            this.target = target;
            this.status = status;
            this.reason = reason;
            this.date = date;
        }

        //setup empty values
        var logReason, logDate, targetStatus

        //get Hyper ban logs & sort on date
        var HyperBan = HyperLogs.filter(log => { return log.type === 'ban' })
        HyperBan = HyperBan.sort((a, b) => b.date.update - a.date.update);
        //get Hyper kick logs & sort on date
        var HyperKick = HyperLogs.filter(log => { return log.type === 'kick' })
        HyperKick = HyperKick.sort((a, b) => b.date.update - a.date.update);

        //check if member has left
        if (target.left == true) {
            //setup username & targetStatus
            if (HyperBan.length >= 1) {
                //setup target username
                target.user.username = HyperBan[0].target.username
                //setup the log values
                targetStatus = 'banned';
                logReason = HyperBan[0].reason;
                logDate = HyperBan[0].date.create;
            }
            else if (BanLogs) {
                //setup target username
                target.user.username = BanLogs.target.username
                //setup the log values
                targetStatus = 'banned';
                logReason = BanLogs.reason.replace('{HYPER} ', '');
                logDate = undefined;
            }
            else if (HyperKick.length >= 1) {
                //setup target username
                target.user.username = HyperKick[0].target.username
                //setup the log values
                targetStatus = 'kicked';
                logReason = HyperKick[0].reason;
                logDate = HyperKick[0].date.create;
            }
            else {
                //setup the log values
                targetStatus = 'left';
                logReason = undefined;
                logDate = undefined;
            }
        }

        //return value
        return new TargetLogs({ id: target.user.id, username: target.user.username }, targetStatus, logReason, logDate)
    },

    /** get AuditLogDetails and save foreign logs to Database
     * @param {*} client
     * @param {*} guild 
     * @param {*} auditType 
     * @param {*} auditDuration 
     * @returns 
     */
    async getAuditLogDetails(client, guild, auditType, auditDuration) {
        function AuditLog(log, reason, duration, target, executor) {
            this.log = log;
            this.reason = reason;
            this.duration = duration;
            this.target = target;
            this.executor = executor;
        }
        //fetch AuditLog(s)
        const fetchLogs = await guild.fetchAuditLogs({ limit: 2, type: auditType })
        const firstLog = fetchLogs.entries.first();

        if (firstLog) { //if a log is found
            //get details from Auditlog
            let { action, reason, executor, target } = firstLog

            //check for the correct logAction
            switch (action) {
                case 'MEMBER_KICK': action = 'kick'
                    break;
                case 'MEMBER_BAN_ADD': action = 'ban'
                    break;
                case 'MEMBER_BAN_REMOVE': action = 'unban'
                    break;
                case 'MEMBER_UPDATE': action = 'timeout'
                    break;
                case 'MEMBER_ROLE_UPDATE': action = 'mute'
                    break;
                default:
                    action = false
            }

            //if action is neither, return
            if (action == false) return;
            //if action is mute
            if (!reason && action == 'mute') reason = 'Foreign mute';
            //set reason if not provided
            if (!reason) reason = "-"

            //check if log is a hyperLog
            if (reason.startsWith('{HYPER}')) {
                //get all member logs from database
                const HyperLogs = await getMemberLogs(guild.id, target.id, action);
                if (HyperLogs.length <= 0) return //if no logs are found, return
                if (HyperLogs == false) return

                //calculate log that is closest to current date
                let temp = HyperLogs.map(d => Math.abs(new Date() - new Date(d.date.create)));
                let idx = temp.indexOf(Math.min(...temp)); //index of closest date

                //trigger checkup for smart auto report
                await client.emit('autoReport', guild, target, action);

                //return AuditLog
                return new AuditLog({ id: HyperLogs[idx].id, type: HyperLogs[idx].type }, HyperLogs[idx].reason.replace('{HYPER} ', ''), HyperLogs[idx].duration, HyperLogs[idx].target, HyperLogs[idx].executor)

            } else { //if log is not from Hyper, save foreign to database

                //construct hyperlog
                const UserLog = new AuditLog({ id: nanoid(), type: action }, reason, auditDuration, { id: target.id, username: target.tag }, { id: executor.id, username: executor.tag });

                //save to database
                await saveMemberLog(guild.id, UserLog);

                //trigger checkup for smart auto report
                await client.emit('autoReport', guild, target, action);

                //return hyperlog
                return UserLog
            }
        } else return false //if no logs are found, return false
    },

}