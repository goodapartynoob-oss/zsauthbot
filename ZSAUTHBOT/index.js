const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const KeyAuth = require('./keyauth');
const db = require('./db');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {

  // /getuser command
  if (interaction.isChatInputCommand() && interaction.commandName === 'getuser') {
    const userId = interaction.user.id;

    if (db.hasClaimed(userId)) {
      return interaction.reply({
        embeds: [errorEmbed('You already claimed your login! Check your DMs.')],
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const user = await KeyAuth.fetchUnusedUser();
    if (!user) {
      return interaction.editReply({
        embeds: [errorEmbed('No accounts available right now. Contact an admin.')]
      });
    }

    db.markClaimed(userId, `${user.username}:${user.password}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Your Login Credentials')
      .setColor(0x5865F2)
      .addFields(
        { name: '👤 Username', value: `\`${user.username}\`` },
        { name: '🔒 Password', value: `\`${user.password}\`` }
      )
      .setFooter({ text: 'Do not share these with anyone.' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({ embeds: [successEmbed('✅ Your login has been sent to your DMs!')] });
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // /panel command — posts button panel
  if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_getuser')
        .setLabel('🔑 Get My Login')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('btn_info')
        .setLabel('ℹ️ Info')
        .setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder()
      .setTitle('🚀 Account Distribution')
      .setDescription('Click the button below to receive your login credentials.')
      .setColor(0x5865F2)
      .setTimestamp();

    await interaction.reply({ embeds: [embed], components: [row] });
  }

  // Button: Get Login
  if (interaction.isButton() && interaction.customId === 'btn_getuser') {
    const userId = interaction.user.id;
    await interaction.deferReply({ ephemeral: true });

    if (db.hasClaimed(userId)) {
      return interaction.editReply({
        embeds: [errorEmbed('You already claimed your login. Check your DMs.')]
      });
    }

    const user = await KeyAuth.fetchUnusedUser();
    if (!user) {
      return interaction.editReply({
        embeds: [errorEmbed('No accounts available. Contact an admin.')]
      });
    }

    db.markClaimed(userId, `${user.username}:${user.password}`);

    const embed = new EmbedBuilder()
      .setTitle('✅ Your Login Credentials')
      .setColor(0x57F287)
      .addFields(
        { name: '👤 Username', value: `\`${user.username}\`` },
        { name: '🔒 Password', value: `\`${user.password}\`` }
      )
      .setFooter({ text: 'Keep these private. Do not share.' })
      .setTimestamp();

    try {
      await interaction.user.send({ embeds: [embed] });
      await interaction.editReply({ embeds: [successEmbed('✅ Sent to your DMs!')] });
    } catch {
      await interaction.editReply({ embeds: [embed] });
    }
  }

  // Button: Info
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

  // /admin commands
  if (interaction.isChatInputCommand() && interaction.commandName === 'admin') {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: '❌ Admins only.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'count') {
      const count = await KeyAuth.getUnusedUserCount();
      interaction.reply({ content: `👤 Available accounts: **${count}**`, ephemeral: true });
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
