const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
  new SlashCommandBuilder()
    .setName('getkey')
    .setDescription('Get your unique license key'),

  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Post the key distribution panel in this channel'),

  new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Admin commands')
    .addSubcommand(sub =>
      sub.setName('count').setDescription('Show number of available keys'))
    .addSubcommand(sub =>
      sub.setName('stats').setDescription('Show total keys claimed'))
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
