const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const nix = {
  name: "midjourney",
  version: "0.0.1",
  aliases: ["mj"],
  description: "Generate AI images (Midjourney Style)",
  author: "ArYAN",
  cooldown: 5,
  role: 0,
  prefix: true,
  category: "Image",
  guide: "Use: {pn} <prompt>\nExample: {pn} a majestic dragon flying over a neon city"
};

const API_BASE = `http://65.109.80.126:20409/aryan/midjourney`;
const TEMP_DIR = path.join(__dirname, "cache");

async function onStart({ bot, message, msg, chatId, userId, args, usages }) {
  const start = Date.now();
  
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

  const prompt = args.join(" ").trim();

  if (!prompt) {
    return message.reply("❌ Please provide a prompt to generate images.");
  }

  const wMsg = await message.reply(`⏳ Midjourney is generating your images...`);
  
  let imagePaths = [];

  try {
    const apiUrl = `${API_BASE}?prompt=${encodeURIComponent(prompt)}&apikey=aryannix`;
    const { data: d } = await axios.get(apiUrl);

    if (!d.status || !d.urls || d.urls.length === 0) {
      throw new Error("API failed to return images.");
    }

    const imageUrls = d.urls.slice(0, 4);

    await Promise.all(
      imageUrls.map(async (url, i) => {
        const imagePath = path.join(TEMP_DIR, `mj_${userId}_${i + 1}.jpg`);
        const response = await axios({
          url: url,
          method: "GET",
          responseType: "arraybuffer"
        });
        fs.writeFileSync(imagePath, Buffer.from(response.data));
        imagePaths.push(imagePath);
      })
    );

    const loadedImages = await Promise.all(imagePaths.map(img => loadImage(img)));

    const width = loadedImages[0].width;
    const height = loadedImages[0].height;

    const canvas = createCanvas(width * 2, height * 2);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(loadedImages[0], 0, 0, width, height);
    ctx.drawImage(loadedImages[1], width, 0, width, height);
    ctx.drawImage(loadedImages[2], 0, height, width, height);
    ctx.drawImage(loadedImages[3], width, height, width, height);

    const combinedImagePath = path.join(TEMP_DIR, `mj_combined_${userId}.jpg`);
    fs.writeFileSync(combinedImagePath, canvas.toBuffer("image/jpeg"));

    await bot.deleteMessage(chatId, wMsg.message_id);

    const duration = ((Date.now() - start) / 1000).toFixed(2);
    
    const sentMessage = await bot.sendPhoto(chatId, combinedImagePath, {
      caption: `✅ Generated in ${duration}s\nReply to this message with U1, U2, U3, or U4 to get the individual upscaled image.`,
      reply_to_message_id: msg.message_id
    });

    fs.unlinkSync(combinedImagePath);

    global.teamnix.replies.set(sentMessage.message_id, {
      nix: { name: nix.name },
      type: "reply",
      author: userId,
      data: { 
        images: imagePaths,
        combined_id: sentMessage.message_id
      }
    });

  } catch (error) {
    console.error("Error generating Midjourney image:", error.message);
    await bot.deleteMessage(chatId, wMsg.message_id).catch(() => {});
    message.reply("❌ Failed to generate image. The API might be down or the prompt is restricted.");
    
    imagePaths.forEach(p => {
        if (fs.existsSync(p)) fs.unlinkSync(p);
    });
  }
}

async function onReply({ bot, msg, chatId, userId, replyMsg, data }) {
    if (!replyMsg || !data || data.nix?.name !== nix.name) return;

    if (data.author !== userId) {
        return bot.sendMessage(chatId, "❌ This is not your conversation!");
    }
    
    const action = msg.text?.trim().toLowerCase();
    
    const { images } = data.data || {};

    if (!images || images.length === 0) {
      global.teamnix.replies.delete(replyMsg.message_id);
      return bot.sendMessage(chatId, "❌ Session data is missing or expired. Please run the command again.", {
          reply_to_message_id: msg.message_id
      });
    }

    const validActions = ["u1", "u2", "u3", "u4"];
    
    if (validActions.includes(action)) {
        const index = parseInt(action.slice(1)) - 1;
        const imagePath = images[index];
        
        if (fs.existsSync(imagePath)) {
            await bot.sendPhoto(chatId, imagePath, {
                caption: `✅ Selected image ${action}.`,
                reply_to_message_id: msg.message_id
            });
            
            global.teamnix.replies.delete(replyMsg.message_id);
            images.forEach(p => {
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        } else {
             bot.sendMessage(chatId, `❌ Image file ${action} not found. Session expired.`);
             global.teamnix.replies.delete(replyMsg.message_id);
        }
    } else {
        bot.sendMessage(chatId, "❌ Invalid action. Please use U1, U2, U3, or U4.", {
            reply_to_message_id: msg.message_id
        });
    }
}

module.exports = {
  nix,
  onStart,
  onReply
};
