const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

// قراءة المتغيرات من سيرفر Railway تلقائياً لحماية بياناتك
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`${client.user.tag} Online and ready to upload!`);

    // إنشاء أمر الـ Slash الجديد لرفع الصور
    const commands = [
        new SlashCommandBuilder()
            .setName('upload_image')
            .setDescription('رفع صورة إلى السيرفر مع زر تحميل للخاص')
            .addAttachmentOption(option =>
                option.setName('image')
                    .setDescription('اختر الصورة من مكتبة الصور الخاصة بك')
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

    // 1. التعامل مع أمر رفع الصور
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'upload_image') {
            
            const imageAttachment = interaction.options.getAttachment('image');
            const title = interaction.options.getString('title') || 'صورة جديدة';

            // التأكد من أن الملف المرفوع هو صورة بالفعل
            if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
                return interaction.reply({
                    content: '❌ عذراً، يرجى رفع ملف صورة صالح فقط.',
                    ephemeral: true
                });
            }

            // إنشاء الـ Embed لعرض الصورة بشكل منسق
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(`بواسطة: ${interaction.user}`)
                .setImage(imageAttachment.url)
                .setColor('#5865F2')
                .setTimestamp();

            // إنشاء زر التحميل الذي يمكن لأي شخص الضغط عليه
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        // نقوم بتخزين رابط الصورة داخل الـ CustomId ليتمكن البوت من قراءته لاحقاً
                        .setCustomId(`download_${imageAttachment.id}`)
                        .setLabel('تحميل الصورة على الخاص 📥')
                        .setStyle(ButtonStyle.Primary)
                );

            // حفظ رابط الصورة مؤقتاً في ذاكرة البوت لتسهيل جلبها عند الضغط على الزر
            if (!client.imageDb) client.imageDb = new Map();
            client.imageDb.set(imageAttachment.id, {
                url: imageAttachment.url,
                title: title
            });

            return interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    // 2. التعامل مع ضغطة زر التحميل للخاص (متاح لجميع الأعضاء)
    if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const imageId = parts[1];

        if (action === 'download') {
            // جلب بيانات الصورة من الذاكرة أو من الـ Embed نفسه كبديل احتياطي
            const imageData = client.imageDb?.get(imageId) || {
                url: interaction.message.embeds[0]?.image?.url,
                title: interaction.message.embeds[0]?.title
            };

            if (!imageData.url) {
                return interaction.reply({
                    content: '❌ عذراً، لم أتمكن من العثور على رابط هذه الصورة حالياً.',
                    ephemeral: true
                });
            }

            try {
                // إرسال الصورة إلى خاص الشخص الذي ضغط على الزر
                await interaction.user.send({
                    content: `📥 **إليك الصورة التي طلبتها:**\n**العنوان:** ${imageData.title}\n${imageData.url}`
                });

                // رسالة مخفية تظهر فقط للشخص تأكيداً على الإرسال
                await interaction.reply({
                    content: 'تم إرسال الصورة إلى رسائلك الخاصة بنجاح! ✅',
                    ephemeral: true
                });

            } catch (error) {
                // في حال كان المستخدم مغلقاً للرسائل الخاصة (DM)
                await interaction.reply({
                    content: '❌ لم أتمكن من إرسال الصورة لك. تأكد من فتح الرسائل الخاصة (DMs) في إعدادات السيرفر ثم أعد المحاولة.',
                    ephemeral: true
                });
            }
        }
    }
});

client.login(process.env.TOKEN);


