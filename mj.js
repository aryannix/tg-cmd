const fs = require("fs");
const pt = require("path");
const ax = require("axios");
const { createCanvas, loadImage } = require("canvas");

const nix_api_key = "aryannix";
const ary = "aryan";
const API_BASE = `http://65.109.80.126:20409/${ary}/midjourney`;

const nix = {
  name: "midjourney",
  aliases: ["mj"],
  author: "ArYAN",
  version: "0.0.1",
  cooldown: 15,
  role: 0,
  prefix: true,
  description: "Generates 4 images from a prompt and combines them in a grid.",
  category: "image",
  guide: "{p}midjourney <prompt>"
};

async function onStart({ bot, message, msg, chatId, args, usages }) {
  const st = Date.now();
  let wMsg = null;

  try {
    const p = args.join(" ").trim();

    if (!p) {
      return usages();
    }

    wMsg = await bot.sendMessage(
      chatId,
      `[⌛]➜ Midjourney is generating your images...`, {
        reply_to_message_id: msg.message_id
      }
    );

    const aUrl = `${API_BASE}?prompt=${encodeURIComponent(p)}&apikey=${nix_api_key}`;
    const { data: d } = await ax.get(aUrl);

    if (!d.status || !d.urls || d.urls.length === 0) {
      throw new Error("API failed to return images. Response status: " + JSON.stringify(d));
    }

    const uLs = d.urls.slice(0, 4);

    const cFPath = pt.join(process.cwd(), "tmp");
    if (!fs.existsSync(cFPath)) fs.mkdirSync(cFPath, { recursive: true });

    const imgs = await Promise.all(
      uLs.map(async (u, i) => {
        const iP = pt.join(cFPath, `mj_${msg.from.id}_${i + 1}.jpg`);
        
        const iS = await ax({
          url: u,
          method: "GET",
          responseType: "stream"
        });

        const wr = fs.createWriteStream(iP);
        iS.data.pipe(wr);

        await new Promise((rs, rj) => {
          wr.on("finish", rs);
          wr.on("error", rj);
        });

        return iP;
      })
    );

    const lImgs = await Promise.all(imgs.map(img => loadImage(img)));
    
    const w = lImgs[0].width;
    const h = lImgs[0].height;
    
    const cn = createCanvas(w * 2, h * 2);
    const ctx = cn.getContext("2d");

    ctx.drawImage(lImgs[0], 0, 0, w, h);
    ctx.drawImage(lImgs[1], w, 0, w, h);
    ctx.drawImage(lImgs[2], 0, h, w, h);
    ctx.drawImage(lImgs[3], w, h, w, h);

    const cIPath = pt.join(cFPath, `mj_combined_${msg.from.id}.jpg`);
    fs.writeFileSync(cIPath, cn.toBuffer("image/jpeg"));

    await bot.deleteMessage(chatId, wMsg.message_id).catch(console.error);

    const eT = Date.now();
    const dr = ((eT - st) / 1000).toFixed(2);

    const rep = await bot.sendPhoto(
      chatId,
      fs.createReadStream(cIPath), {
        caption: `❏ U1, U2, U3, U4\nTime: ${dr}s`,
        reply_to_message_id: msg.message_id
      }
    );

    if (!global.teamnix) global.teamnix = { replies: new Map() };
    
    global.teamnix.replies.set(rep.message_id, {
      nix,
      type: "mj_reply",
      authorId: msg.from.id,
      images: imgs,
      originalMessageId: rep.message_id,
      chatId: chatId,
    });

    fs.unlinkSync(cIPath);

  } catch (er) {
    console.error("Error generating image:", er.message);
    if (wMsg) {
      await bot.deleteMessage(chatId, wMsg.message_id).catch(console.error);
    }
    await bot.sendMessage(
      chatId,
      "❌ | Failed to generate image. Please check the prompt or APIKey.", {
        reply_to_message_id: msg.message_id
      }
    );
  }
}

async function onReply({ bot, message, msg, chatId, userId, args, data, replyMsg }) {
  if (data.type !== "mj_reply" || userId !== data.authorId) {
    return;
  }

  const r = msg.text ? msg.text.toLowerCase().trim() : "";
  const { images } = data;

  try {
    const vI = ["u1", "u2", "u3", "u4"];
    if (vI.includes(r)) {
      const sI = parseInt(r.slice(1)) - 1;
      
      await bot.sendPhoto(
        chatId,
        fs.createReadStream(images[sI]), {
          reply_to_message_id: msg.message_id
        }
      );
      
      images.forEach(imgPath => fs.unlinkSync(imgPath));
      global.teamnix.replies.delete(replyMsg.message_id);
      
    } else {
      await bot.sendMessage(
        chatId,
        "❌ | Invalid action. Please reply with U1, U2, U3, or U4.", {
          reply_to_message_id: msg.message_id
        }
      );
    }
  } catch (e) {
    console.error("Reply error:", e.message);
    await bot.sendMessage(
      chatId,
      "❌ | Failed to send selected image.", {
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
