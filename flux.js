const ax = require("axios");
const fs = require("fs");
const pt = require("path");
const { createCanvas, loadImage } = require("canvas");

const nix = {
  name: "flux",
  version: "0.0.1",
  author: "ArYAN",
  cooldown: 5,
  role: 0,
  description: "Generates 4 AI images from a prompt using fluxv3 and combines them into a grid.",
  category: "Image",
  guide: "{p}flux2 <prompt>",
  aliases: ["flux"],
  prefix: true
};

async function onStart({ bot, message, msg, chatId, args, usages }) {
  const d = args.join(" ").trim();
  if (!d) return usages();

  let wait;
  const start = Date.now();

  try {
    wait = await bot.sendMessage(
      chatId,
      "🔄 Please wait generating your images...", {
        reply_to_message_id: msg.message_id
      }
    );

    const urls = new Array(4).fill(`http://65.109.80.126:20409/aryan/fluxv3?prompt=${encodeURIComponent(d)}`);
    const cache = pt.join(process.cwd(), "tmp_flux2");
    if (!fs.existsSync(cache)) fs.mkdirSync(cache, { recursive: true });

    const files = await Promise.all(
      urls.map(async (u, i) => {
        const p = pt.join(cache, `flux2_${msg.from.id}_${i}.jpg`);
        const res = await ax({ url: u, method: "GET", responseType: "stream" });
        const w = fs.createWriteStream(p);
        res.data.pipe(w);
        await new Promise((r, j) => {
          w.on("finish", r);
          w.on("error", j);
        });
        return p;
      })
    );

    const imgs = await Promise.all(files.map(f => loadImage(f)));
    const w = imgs[0].width, h = imgs[0].height;
    const canvas = createCanvas(w * 2, h * 2);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(imgs[0], 0, 0, w, h);
    ctx.drawImage(imgs[1], w, 0, w, h);
    ctx.drawImage(imgs[2], 0, h, w, h);
    ctx.drawImage(imgs[3], w, h, w, h);

    const finalPath = pt.join(cache, `flux2_grid_${msg.from.id}.jpg`);
    fs.writeFileSync(finalPath, canvas.toBuffer("image/jpeg"));

    await bot.deleteMessage(chatId, wait.message_id).catch(console.error);
    const end = ((Date.now() - start) / 1000).toFixed(2);

    const rep = await bot.sendPhoto(
      chatId,
      fs.createReadStream(finalPath), {
        caption: `❏ U1, U2, U3, U4\nTime: ${end}s`,
        reply_to_message_id: msg.message_id
      }
    );

    if (!global.teamnix) global.teamnix = { replies: new Map() };
    global.teamnix.replies.set(rep.message_id, {
      nix,
      type: "flux_reply",
      authorId: msg.from.id,
      images: files,
      originalMessageId: rep.message_id,
      chatId: chatId,
    });
    
    fs.unlinkSync(finalPath);

  } catch (err) {
    console.error("flux2 error:", err.message);
    if (wait) {
      await bot.deleteMessage(chatId, wait.message_id).catch(console.error);
    }
    await bot.sendMessage(
      chatId,
      "❌ Failed to generate images.", {
        reply_to_message_id: msg.message_id
      }
    );
  }
}

async function onReply({ bot, message, msg, chatId, userId, args, data, replyMsg }) {
  const r = msg.text ? msg.text.toLowerCase().trim() : "";
  if (data.type !== "flux_reply" || userId !== data.authorId) return;

  const valid = ["u1", "u2", "u3", "u4"];
  if (!valid.includes(r)) {
    return bot.sendMessage(
      chatId,
      "❌ Use U1, U2, U3, or U4.", {
        reply_to_message_id: msg.message_id
      }
    );
  }
  
  try {
    const i = parseInt(r.slice(1)) - 1;
    await bot.sendPhoto(
      chatId,
      fs.createReadStream(data.images[i]), {
        reply_to_message_id: msg.message_id
      }
    );
    
    data.images.forEach(imgPath => fs.unlinkSync(imgPath));
    global.teamnix.replies.delete(replyMsg.message_id);
    
  } catch (e) {
    console.error("flux2 reply error:", e.message);
    await bot.sendMessage(
      chatId,
      "❌ Failed to send the image.", {
        reply_to_message_id: msg.message_id
      }
    );
  }
}

module.exports = {
  onStart,
  onReply,
  nix
};
