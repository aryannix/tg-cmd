const axios = require('axios');
const { alldown } = require('aryan-videos-downloader');

const nix = {
  name: "alldown",
  version: "0.0.1",
  aliases: ["alldl", "dl", "down"],
  description: "Download Video from npm",
  author: "ArYAN",
  prefix: true,
  category: "media",
  role: 0,
  cooldown: 10,
  guide: "{p}alldown <video_link>",
};

async function onStart({ bot, message, msg, chatId, args, usages }) {
  let waitMsg = null;
  try {
    const link = args[0];

    if (!link) {
      return usages();
    }

    waitMsg = await bot.sendMessage(
      chatId,
      '⏳ Processing your request Please wait.', {
        reply_to_message_id: msg.message_id,
      }
    );

    const apis = await alldown(link);

    if (!apis || !apis.data || !apis.data.high) {
      await bot.editMessageText(
        '❌ Failed to fetch download link. The link might be invalid or private.', {
          chat_id: chatId,
          message_id: waitMsg.message_id,
        }
      );
      return;
    }

    const { high, title } = apIS.data;
    const caption = `🎬 Title: ${title || 'Downloaded Video'}`;

    const vidStream = (
      await axios.get(high, { responseType: 'stream' })
    ).data;

    const replyMarkup = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Bot Owner', url: 'https://t.me/aryannix' }],
        ],
      },
    };

    await bot.deleteMessage(chatId, waitMsg.message_id).catch(console.error);

    await bot.sendVideo(chatId, vidStream, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_to_message_id: msg.message_id,
      ...replyMarkup,
    });

  } catch (error) {
    console.error('Error in alldown:', error.message);

    if (waitMsg) {
      await bot.deleteMessage(chatId, waitMsg.message_id).catch(console.error);
    }

    await bot.sendMessage(
      chatId,
      `❌ An error occurred: New`, { reply_to_message_id: msg.message_id }
    );
  }
}

module.exports = {
  onStart,
  nix
};
