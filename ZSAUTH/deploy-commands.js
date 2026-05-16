const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('getuser')
    .setDescription('Get your login username and password'),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the login distribution panel in this channel'),

  new SlashCommandBuilder()
    .setName('addkey')
    .setDescription('Owner only: Set new shared credentials')
    .addStringOption(opt =>
      opt.setName('username').setDescription('New username').setRequired(true))
    .addStringOption(opt =>
      opt.setName('password').setDescription('New password').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removekey')
    .setDescription('Owner only: Remove current shared credentials'),

  new SlashCommandBuilder()
    .setName('access')
    .setDescription('Owner only: Grant a user access to claim a key')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to grant access').setRequired(true)),

  new SlashCommandBuilder()
    .setName('removeaccess')
    .setDescription('Owner only: Remove a user access to claim a key')
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to remove access').setRequired(true)),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands')
    .addSubcommand(sub =>
      sub.setName('count').setDescription('Show credential status'))
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('Show total accounts claimed'))
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset a user claim')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User to reset').setRequired(true)))

].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Failed:', err);
  }
})();
