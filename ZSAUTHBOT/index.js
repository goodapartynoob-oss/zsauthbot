const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getAvailableKey, getAvailableKeyCount } = require('./keyauth');
const db = require('./db');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

// ─── Helper: distribute a key to a Discord user ───────────────────────────────
async function distributeKey(interaction) {
  const userId = interaction.user.id;

  // Already claimed?
  if (db.hasClaimed(userId)) {
    return interaction.editReply({
      embeds: [errorEmbed('You already claimed a key! Check your DMs.')]
    });
  }

  // Fetch a key from KeyAuth that still has uses remaining
  let key;
  try {
    key = await getAvailableKey();
  } catch (err) {
    console.error('KeyAuth error:', err.message);
    return interaction.editReply({
      embeds: [errorEmbed('Could not connect to KeyAuth. Try again later.')]
    });
  }

  if (!key) {
    return interaction.editReply({
      embeds: [errorEmbed('No keys available right now. Contact an admin.')]
    });
  }

  // Save claim so same user can't grab a second key
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
    // DMs closed — show in ephemeral reply instead
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

  // /panel command — posts button panel in channel
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
