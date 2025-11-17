const a = require("axios");
const b = require("fs");
const c = require("path");
const d = require("yt-search");

const nix = {
  name: "sing",
  aliases: ["music", "song"],
  version: "0.0.1",
  author: "ArYAN",
  cooldown: 10,
  role: 0,
  description: "Search and download music from YouTube",
  category: "media",
  guide: "{p}sing <song name or YouTube URL>",
  prefix: true,
};

async function onStart({ bot, message, msg, chatId, args, usages }) {
  if (!args.length) return usages();

  let h = args.join(" ");
  let i = null;

  try {
    i = await bot.sendMessage(
      chatId,
      "🎵 Searching and downloading... Please wait.", {
        reply_to_message_id: msg.message_id
      }
    );

    let j;
    if (h.startsWith("http")) {
      j = h;
    } else {
      const k = await d(h);
      if (!k || !k.videos.length) throw new Error("No results found for your query.");
      j = k.videos[0].url;
    }

    const l = `http://65.109.80.126:20409/aryan/play?url=${encodeURIComponent(j)}`;
    const m = await a.get(l);
    const n = m.data;

    if (!n.status || !n.downloadUrl) {
      throw new Error(n.message || "API failed to return download URL.");
    }

    const o = `${n.title || 'music'}.mp3`.replace(/[\\/:"*?<>|]/g, "_");
    const p = c.join(process.cwd(), "tmp", o);

    if (!b.existsSync(c.join(process.cwd(), "tmp"))) {
      b.mkdirSync(c.join(process.cwd(), "tmp"), { recursive: true });
    }

    const q = await a.get(n.downloadUrl, { responseType: "arraybuffer" });
    b.writeFileSync(p, q.data);

    const caption = `🎵 𝗠𝗨𝗦𝗜𝗖\n━━━━━━━━━━━━━━━\n\n${n.title}`;

    await bot.sendAudio(
      chatId,
      b.createReadStream(p), {
        caption: caption,
        reply_to_message_id: msg.message_id
      }
    );

    b.unlinkSync(p);
    await bot.deleteMessage(chatId, i.message_id).catch(console.error);

  } catch (r) {
    console.error(r);
    if (i) {
      await bot.deleteMessage(chatId, i.message_id).catch(console.error);
    }
    await bot.sendMessage(
      chatId,
      `❌ Failed to download song: ${r.message}`, {
        reply_to_message_id: msg.message_id
      }
    );
  }
}

module.exports = {
  onStart,
  nix
};
