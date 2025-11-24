const axios = require("axios");
const path = require("path");
const fs = require("fs");

const nix = {
  name: "prompt",
  version: "0.0.1",
  aliases: ["p"],
  description: "Get a description or response for a replied image using AI.",
  author: "ArYAN",
  cooldown: 5,
  role: 0,
  prefix: true,
  category: "ai",
  guide: "Use: {pn} <question> by replying to an image.\nExample: {pn} what is special about this?"
};

async function onStart({ bot, message, msg, chatId, args }) {
  const apiUrl = "http://65.109.80.126:20409/aryan/prompt";
  const question = args.join(" ") || "Describe this image in detail";
  
  const repliedMsg = msg.reply_to_message;

  if (repliedMsg && repliedMsg.photo) {
    try {
      const fileId = repliedMsg.photo[repliedMsg.photo.length - 1].file_id;
      const imageUrl = await bot.getFileLink(fileId);

      const response = await axios.get(apiUrl, {
        params: { imageUrl: imageUrl, prompt: question }
      });

      const result = response.data.response || "No response received.";
      
      if (response.data.status === false) {
        return message.reply(`❌ API Error: ${response.data.message}`);
      }

      await message.reply(result);
      
    } catch (e) {
      console.error("Local API call error:", e.message || e);
      return message.reply("❌ An error occurred while communicating with the image analysis API.");
    }
  } else {
    message.reply("⚠️ Please reply to an image using this command.");
  }
}

module.exports = {
  nix,
  onStart
};
