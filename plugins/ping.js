module.exports = {
  name: "ping",
  description: "Replies with pong 🏓",
  handle: async (sock, m, text) => {
    if (text === ".ping") {
      await sock.sendMessage(m.key.remoteJid, { text: "pong 🏓" }, { quoted: m });
    }
  }
};
