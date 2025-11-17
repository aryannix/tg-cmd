const a = require("axios");

const nix = {
  name: "prompt",
  aliases: ["p"],
  version: "0.0.1",
  author: "ArYAN",
  category: "ai",
  prefix: true,
  role: 0,
  cooldown: 5,
  description: "Get a description or answer from an image.",
  guide: "{p}prompt <your_prompt> (reply to an image)",
};

async function onStart({ bot, message, msg, chatId, args, usages }) {
  const u = "http://65.109.80.126:20409/aryan/prompt";
  const p = args.join(" ") || "Describe this image";

  if (msg.reply_to_message && msg.reply_to_message.photo) {
    try {
      const photo = msg.reply_to_message.photo;
      const fileId = photo[photo.length - 1].file_id;
      const imageUrl = await bot.getFileLink(fileId);

      const r = await a.get(u, {
        params: { imageUrl: imageUrl, prompt: p }
      });

      const x = r.data.response || "No response from API.";

      if (r.data.status === false) {
        await bot.sendMessage(
          chatId,
          `❌ API Error: ${r.data.message}`, {
            reply_to_message_id: msg.message_id
          }
        );
        return;
      }

      await bot.sendMessage(
        chatId,
        x, {
          parse_mode: "Markdown",
          reply_to_message_id: msg.message_id
        }
      );

    } catch (e) {
      console.error("API call error:", e.message || e);
      await bot.sendMessage(
        chatId,
        "❌ An error occurred. The API might be down or the image is invalid.", {
          reply_to_message_id: msg.message_id
        }
      );
    }
  } else {
    return usages();
  }
}

module.exports = {
  onStart,
  nix
};
