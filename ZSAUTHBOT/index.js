const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { getAvailableKey, getAvailableKeyCount } = require('./keyauth');
const db = require('./db');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

// ─── Auto Register Commands on Startup ───────────────────────────────────────
async function registerCommands() {
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

  try {
    console.log('📋 Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Slash commands registered!');
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
}

client.once('ready', async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  await registerCommands();
});

// ─── Helper: distribute a key to a Discord user ───────────────────────────────
async function distributeKey(interaction) {
  const userId = interaction.user.id;

  if (db.hasClaimed(userId)) {
    return interaction.editReply({
      embeds: [errorEmbed('You already claimed a key! Check your DMs.')]
    });
  }

  let key;
  try {
    key = await getAvailableKey();
  } catch (err) {
    console.error('KeyAuth FULL error:', err);
    return interaction.editReply({
      embeds: [errorEmbed(`KeyAuth error: ${err.message}`)]
    });
  }

  if (!key) {
    return interaction.editReply({
      embeds: [errorEmbed('No keys available right now. Contact an admin.')]
    });
  }

  db.markClaimed(userId, key);

  const embed = new EmbedBuilder()
    .setTitle('✅ Your License Key')
    .setColor(0x5865F2)
    .addFields({ name: '🔑 Key', value: `\`${key}\`` })
    .setFooter({ text: 'Do not share this key with anyone.' })
    .setTimestamp();

  try {
    await interaction.user.send({ embeds: [embed] });
    await interaction.editReply({ embeds: [successEmbed('✅ Your key has been sent to your DMs!')] });
  } catch {
    await interaction.editReply({ embeds: [embed] });
  }
}

// ─── Interactions ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {

  // /getkey command
  if (interaction.isChatInputCommand() && interaction.commandName === 'getkey') {
    await interaction.deferReply({ ephemeral: true });
    await distributeKey(interaction);
  }

  // /panel command
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_getkey')
        .setLabel('🔑 Get My Key')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_info')
        .setLabel('ℹ️ Info')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🚀 Key Distribution')
      .setDescription('Click the button below to receive your unique license key.')
      .setColor(0x5865F2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // Button: Get Key
  if (interaction.isButton() && interaction.customId === 'btn_getkey') {
    await interaction.deferReply({ ephemeral: true });
    await distributeKey(interaction);
  }

  // Button: Info
  if (interaction.isButton() && interaction.customId === 'btn_info') {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('ℹ️ How It Works')
        .setDescription(
          '1. Click **Get My Key**\n' +
          '2. You will receive a unique license key in your DMs\n' +
          '3. Use the key to activate your app\n' +
          '4. Each Discord account can only claim **one key**'
        )
        .setColor(0xFEE75C)],
      ephemeral: true
    });
  }

  // /admin commands
  if (interaction.isChatInputCommand() && interaction.commandName === 'admin') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'count') {
      let count;
      try {
        count = await getAvailableKeyCount();
      } catch {
        count = 'Error fetching from KeyAuth';
      }
      interaction.reply({ content: `🔑 Keys with remaining uses: **${count}**`, ephemeral: true });
    }

    if (sub === 'reset') {
      const target = interaction.options.getUser('user');
      db.resetClaim(target.id);
      interaction.reply({ content: `✅ Reset claim for ${target.tag}`, ephemeral: true });
    }

    if (sub === 'stats') {
      const total = db.getTotalClaims();
      interaction.reply({ content: `📊 Total keys claimed: **${total}**`, ephemeral: true });
    }
  }
});

function errorEmbed(msg) {
  return new EmbedBuilder().setDescription(`❌ ${msg}`).setColor(0xED4245);
}
function successEmbed(msg) {
  return new EmbedBuilder().setDescription(`✅ ${msg}`).setColor(0x57F287);
}

client.login(process.env.DISCORD_TOKEN);
