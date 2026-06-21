const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AttachmentBuilder
} = require('discord.js');

const TOKEN = 'PUT_BOT_TOKEN_HERE';
const CLIENT_ID = 'PUT_CLIENT_ID_HERE';

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`${client.user.tag} Online`);

    const commands = [
        new SlashCommandBuilder()
            .setName('avatar')
            .setDescription('Send avatar with download button')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Target user')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('banner')
            .setDescription('Send banner with download button')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Target user')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

        new SlashCommandBuilder()
            .setName('profile')
            .setDescription('Send full profile')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('Target user')
                    .setRequired(true)
            )
            .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log('Slash commands registered.');
    } catch (err) {
        console.error(err);
    }
});

client.on('interactionCreate', async interaction => {

    if (interaction.isChatInputCommand()) {

        const user = interaction.options.getUser('user');

        const fetchedUser = await client.users.fetch(user.id, {
            force: true
        });

        const avatarURL = fetchedUser.displayAvatarURL({
            size: 4096,
            extension: 'png'
        });

        const bannerURL = fetchedUser.bannerURL({
            size: 4096,
            extension: 'png'
        });

        if (interaction.commandName === 'avatar') {

            const embed = new EmbedBuilder()
                .setTitle(`${user.username} Avatar`)
                .setImage(avatarURL);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`download_avatar_${user.id}`)
                        .setLabel('تحميل الأفاتار')
                        .setStyle(ButtonStyle.Primary)
                );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }

        if (interaction.commandName === 'banner') {

            if (!bannerURL) {
                return interaction.reply({
                    content: 'هذا المستخدم لا يملك Banner.',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${user.username} Banner`)
                .setImage(bannerURL);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`download_banner_${user.id}`)
                        .setLabel('تحميل البانر')
                        .setStyle(ButtonStyle.Success)
                );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }

        if (interaction.commandName === 'profile') {

            const embed = new EmbedBuilder()
                .setTitle(`${user.username} Full Profile`)
                .addFields(
                    {
                        name: 'Avatar',
                        value: `[Open Avatar](${avatarURL})`
                    },
                    {
                        name: 'Banner',
                        value: bannerURL
                            ? `[Open Banner](${bannerURL})`
                            : 'No Banner'
                    }
                )
                .setImage(avatarURL);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`download_profile_${user.id}`)
                        .setLabel('تحميل البروفايل كامل')
                        .setStyle(ButtonStyle.Danger)
                );

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    if (interaction.isButton()) {

        const parts = interaction.customId.split('_');
        const type = parts[1];
        const userId = parts[2];

        const target = await client.users.fetch(userId, {
            force: true
        });

        const avatarURL = target.displayAvatarURL({
            size: 4096,
            extension: 'png'
        });

        const bannerURL = target.bannerURL({
            size: 4096,
            extension: 'png'
        });

        try {

            if (type === 'avatar') {

                await interaction.user.send({
                    content: `Avatar of ${target.tag}\n${avatarURL}`
                });
            }

            if (type === 'banner') {

                if (!bannerURL) {
                    return interaction.reply({
                        content: 'لا يوجد Banner لهذا المستخدم.',
                        ephemeral: true
                    });
                }

                await interaction.user.send({
                    content: `Banner of ${target.tag}\n${bannerURL}`
                });
            }

            if (type === 'profile') {

                let message =
                    `Profile of ${target.tag}\n\nAvatar:\n${avatarURL}`;

                if (bannerURL) {
                    message += `\n\nBanner:\n${bannerURL}`;
                }

                await interaction.user.send({
                    content: message
                });
            }

            await interaction.reply({
                content: 'تم إرسال الملفات إلى الخاص ✅',
                ephemeral: true
            });

        } catch {

            await interaction.reply({
                content:
                    'اعتذر منك، لكنك قافل الرسائل الخاصة (DM)، لذلك لا أستطيع إرسال الملفات.',
                ephemeral: true
            });
        }
    }
});

client.login(TOKEN);
