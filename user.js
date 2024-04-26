const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    channelId: { type: String, required: true }
});

const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

const userSchema = new mongoose.Schema({
    discordId: { type: String, required: true },
    healthGoal: { type: String, default: "None" },
    fitnessGoal: { type: String, default: "None" }, 
    remindersTime: { type: String, default: "never" }, 
});

const User = mongoose.model('User', userSchema);

module.exports = { User, GuildSettings };