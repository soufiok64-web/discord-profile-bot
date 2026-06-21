const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`${client.user.tag} Ready with new updates!`);

    const commands = [
        new SlashCommandBuilder()
            .setName('upload_image')
            .setDescription('رفع صورة إلى السيرفر مع زر تحميل')
            .addAttachmentOption(option =>
                option.setName('image')
                    .setDescription('اختر الصورة من مكتبتك')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('title')
                    .setDescription('اكتب عنواناً أو وصفاً للصورة (اختياري)')
                    .setRequired(false)
            )
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

    // 1. عند استخدام أمر الـ Slash // 1. عند استخدام أمر الـ Slash لرفع الصورة
if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'upload_image') {
        
        const imageAttachment = interaction.options.getAttachment('image');
        const title = interaction.options.getString('title') || 'صورة جديدة';

        if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
            return interaction.reply({
                content: '❌ عذراً، يرجى رفع ملف صورة صالح فقط.',
                ephemeral: true
            });
        }

        // تعديل شكل الزر: الإيموجي المخصص حقك وبدون نص
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`download_${imageAttachment.id}`)
                    .setEmoji('1517623831898882220') 
                    .setStyle(ButtonStyle.Secondary)
            );

        // حفظ البيانات في الذاكرة لتمريرها عند الضغط على الزر
        if (!client.imageDb) client.imageDb = new Map();
        client.imageDb.set(imageAttachment.id, {
            url: imageAttachment.url,
            title: title
        });

        // هنا السر: نرسل اسم الشخص والعنوان كـ نص، ونعيد إرسال الصورة كمرفق رسمي (Files) ليختفي الرابط تماماً!
        return interaction.reply({
            content: `📸 **${title}** - بواسطة: ${interaction.user}`,
            files: [imageAttachment.url], // إرسال الصورة كملف مرفق لإخفاء الرابط النصي
            components: [row]
        });
    }
}

    // 2. عند الضغط على زر التحميل 📥
    if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const imageId = parts[1];

        if (action === 'download') {
            // جلب رابط الصورة من الذاكرة
            const imageData = client.imageDb?.get(imageId);

            if (!imageData || !imageData.url) {
                return interaction.reply({
                    content: '❌ عذراً، لم أتمكن من العثور على رابط هذه الصورة حالياً.',
                    ephemeral: true
                });
            }

            try {
                // المحاولة الأولى: إرسال الصورة في الخاص (DM)
                await interaction.user.send({
                    content: `📥 **إليك الصورة التي طلبتها:**\n**العنوان:** ${imageData.title}\n${imageData.url}`
                });

                // تأكيد الإرسال برسالة مخفية تظهر له وحده
                await interaction.reply({
                    content: 'تم إرسال الصورة إلى رسائلك الخاصة بنجاح! ✅',
                    ephemeral: true
                });

            } catch (error) {
                // المحاولة الثانية: إذا كان الخاص مغلقاً (DM Closed)
                // يرسل له البوت الصورة فوراً في نفس الروم لكن مخفية (تظهر له وحده فقط)
                await interaction.reply({
                    content: `⚠️ **أنت مقفل خاصك، لذلك إليك الصورة هنا (لا أحد يراها غيرك):**\n${imageData.url}`,
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.TOKEN);


