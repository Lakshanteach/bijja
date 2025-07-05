const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys");
const Pino = require("pino");
const qrcode = require("qrcode-terminal");
const { Boom } = require("@hapi/boom");
const { saveSessionToFirebase, loadSessionFromFirebase } = require("./sessionManager");
const fs = require("fs");

const plugins = [];
if (fs.existsSync("./plugins")) {
  for (const file of fs.readdirSync("./plugins")) {
    plugins.push(require(`./plugins/${file}`));
  }
}

async function startBot() {
  const number = require("./serviceAccountKey.json").client_email || "default";
  await loadSessionFromFirebase(number);

  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: Pino({ level: "silent" }),
    printQRInTerminal: true,
    auth: state,
    browser: ["ShonuX", "Chrome", "10.1"]
  });

  sock.ev.on("creds.update", async () => {
    await saveCreds();
    await saveSessionToFirebase(number);
  });

  sock.ev.on("connection.update", upd => {
    const { connection, lastDisconnect, qr } = upd;
    if (qr) qrcode.generate(qr, { small: true });
    if (connection === "close") {
      const rc = new Boom(lastDisconnect?.error).output.statusCode;
      if (rc !== DisconnectReason.loggedOut) startBot();
      else console.log("🚫 Logged out — scan QR again.");
    } else if (connection === "open") {
      console.log("✅ Connected!");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const text = m.message.conversation || m.message.extendedTextMessage?.text || "";
    for (const p of plugins) {
      try { await p.handle(sock, m, text); } catch (e){ console.error(e); }
    }
  });
}

startBot();
