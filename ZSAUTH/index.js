const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, WebhookClient } = require('discord.js');
const db = require('./db');
require('dotenv').config();

// ============================================================
//  CONFIGURATION
// ============================================================
const OWNER_ID          = '1018124017581953074';
const ALLOWED_CHANNEL_ID = '1505114854866948107';

// ============================================================
//  WEBHOOK — paste your webhook URL below
// ============================================================
const WEBHOOK_URL = 'ADD_WEBHOOK_HERE';
const webhook = WEBHOOK_URL !== 'ADD_WEBHOOK_HERE' ? new WebhookClient({ url: WEBHOOK_URL }) : null;

// ============================================================
//  DISCORD CLIENT
// ============================================================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('clientReady', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

// ============================================================
//  HELPER: Send webhook log
// ============================================================
async function webhookLog(title, description, color = 0x5865F2) {
  if (!webhook) return;
  try {
    await webhook.send({
      embeds: [new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp()]
    });
  } catch (e) {
    console.error('Webhook error:', e.message);
  }
}

// ============================================================
//  HELPER: Check if user is owner
// ============================================================
function isOwner(userId) {
  return userId === OWNER_ID;
}

// ============================================================
//  INTERACTIONS
// ============================================================
client.on('interactionCreate', async (interaction) => {

  // ── /getuser ───────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'getuser') {
    const userId = interaction.user.id;

    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
      return interaction.reply({
        embeds: [errorEmbed(`❌ Use this command in <#${ALLOWED_CHANNEL_ID}> only!`)],
        ephemeral: true
      });
    }

    if (db.hasClaimed(userId)) {
      return interaction.reply({
        embeds: [errorEmbed('You already claimed your login! Check your DMs.')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const SHARED_USERNAME = process.env.SHARED_USERNAME;
    const SHARED_PASSWORD = process.env.SHARED_PASSWORD;

    if (!SHARED_USERNAME || !SHARED_PASSWORD) {
      return interaction.editReply({
        embeds: [errorEmbed('No credentials set yet. Contact the owner.')]
      });
    }

    db.markClaimed(userId, `${SHARED_USERNAME}:${SHARED_PASSWORD}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Your Login Credentials')
      .setColor(0x5865F2)
      .addFields(
        { name: '👤 Username', value: `\`${SHARED_USERNAME}\`` },
        { name: '🔒 Password', value: `\`${SHARED_PASSWORD}\`` }
      )
      .setFooter({ text: 'Do not share these with anyone.' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({ embeds: [successEmbed('✅ Your login has been sent to your DMs!')] });
      await webhookLog('🔑 Key Claimed', `**User:** <@${userId}>\n**Username given:** ${SHARED_USERNAME}`, 0x57F287);
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // ── /panel ─────────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    if (!isOwner(interaction.user.id) && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Only the owner or admins can post the panel.', ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_getuser').setLabel('🔑 Get My Login').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_info').setLabel('ℹ️ Info').setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🚀 Account Distribution')
      .setDescription('Click the button below to receive your login credentials.')
      .setColor(0x5865F2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // ── /addkey ────────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'addkey') {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only the owner can use this command.', ephemeral: true });
    }

    const newUsername = interaction.options.getString('username');
    const newPassword = interaction.options.getString('password');

    process.env.SHARED_USERNAME = newUsername;
    process.env.SHARED_PASSWORD = newPassword;

    await interaction.reply({
      embeds: [successEmbed(`✅ New credentials set!\n👤 Username: \`${newUsername}\`\n🔒 Password: \`${newPassword}\``)],
      ephemeral: true
    });

    await webhookLog('🔑 Key Updated', `**Owner updated credentials**\n👤 Username: ${newUsername}`, 0x5865F2);
  }

  // ── /removekey ─────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'removekey') {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only the owner can use this command.', ephemeral: true });
    }

    process.env.SHARED_USERNAME = '';
    process.env.SHARED_PASSWORD = '';

    await interaction.reply({
      embeds: [successEmbed('✅ Credentials have been removed. No one can claim until new ones are added.')],
      ephemeral: true
    });

    await webhookLog('🗑️ Key Removed', '**Owner removed the shared credentials**', 0xED4245);
  }

  // ── /access ────────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'access') {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only the owner can use this command.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    db.resetClaim(target.id);

    await interaction.reply({
      embeds: [successEmbed(`✅ Access granted to <@${target.id}>. They can now claim a key.`)],
      ephemeral: true
    });

    await webhookLog('✅ Access Granted', `**Owner granted access to:** <@${target.id}>`, 0x57F287);
  }

  // ── /removeaccess ──────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'removeaccess') {
    if (!isOwner(interaction.user.id)) {
      return interaction.reply({ content: '❌ Only the owner can use this command.', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    db.markClaimed(target.id, 'BLOCKED');

    await interaction.reply({
      embeds: [successEmbed(`✅ Access removed from <@${target.id}>. They can no longer claim a key.`)],
      ephemeral: true
    });

    await webhookLog('🚫 Access Removed', `**Owner removed access from:** <@${target.id}>`, 0xED4245);
  }

  // ── Button: Get Login ──────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'btn_getuser') {
    const userId = interaction.user.id;
    await interaction.deferReply({ ephemeral: true });

    if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
      return interaction.editReply({
        embeds: [errorEmbed(`❌ You can only claim your login in <#${ALLOWED_CHANNEL_ID}>!`)]
      });
    }

    if (db.hasClaimed(userId)) {
      return interaction.editReply({
        embeds: [errorEmbed('You already claimed your login. Check your DMs.')]
      });
    }

    const SHARED_USERNAME = process.env.SHARED_USERNAME;
    const SHARED_PASSWORD = process.env.SHARED_PASSWORD;

    if (!SHARED_USERNAME || !SHARED_PASSWORD) {
      return interaction.editReply({
        embeds: [errorEmbed('No credentials available. Contact the owner.')]
      });
    }

    db.markClaimed(userId, `${SHARED_USERNAME}:${SHARED_PASSWORD}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Your Login Credentials')
      .setColor(0x57F287)
      .addFields(
        { name: '👤 Username', value: `\`${SHARED_USERNAME}\`` },
        { name: '🔒 Password', value: `\`${SHARED_PASSWORD}\`` }
      )
      .setFooter({ text: 'Keep these private. Do not share.' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({ embeds: [successEmbed('✅ Sent to your DMs!')] });
      await webhookLog('🔑 Key Claimed', `**User:** <@${userId}>\n**Username given:** ${SHARED_USERNAME}`, 0x57F287);
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // ── Button: Info ───────────────────────────────────────────
  if (interaction.isButton() && interaction.customId === 'btn_info') {
    await interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('ℹ️ How It Works')
        .setDescription(
          '1. Click **Get My Login**\n' +
          '2. You will receive a username and password in DMs\n' +
          '3. Use them to log into the app\n' +
          '4. Each Discord account can only claim once'
        )
        .setColor(0xFEE75C)],
      ephemeral: true
    });
  }

  // ── /admin ─────────────────────────────────────────────────
  if (interaction.isChatInputCommand() && interaction.commandName === 'admin') {
    if (!isOwner(interaction.user.id) && !interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'count') {
      const SHARED_USERNAME = process.env.SHARED_USERNAME;
      const configured = SHARED_USERNAME ? '✅ Configured' : '❌ Not Set';
      interaction.reply({ content: `🔑 Shared Credentials: **${configured}**\n👤 Username: **${SHARED_USERNAME || 'Not set'}**`, ephemeral: true });
    }

    if (sub === 'reset') {
      const target = interaction.options.getUser('user');
      db.resetClaim(target.id);
      interaction.reply({ content: `✅ Reset claim for ${target.tag}`, ephemeral: true });
    }

    if (sub === 'stats') {
      const total = db.getTotalClaims();
      interaction.reply({ content: `📊 Total accounts claimed: **${total}**`, ephemeral: true });
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
