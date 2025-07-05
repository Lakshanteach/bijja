const fs = require("fs");
const path = require("path");
const db = require("./firebase");

const sessionPath = "auth";

async function saveSessionToFirebase(number) {
  if (!fs.existsSync(sessionPath)) return;
  const files = fs.readdirSync(sessionPath);
  for (const file of files) {
    const data = fs.readFileSync(path.join(sessionPath, file));
    await db.collection("users").doc(number)
      .collection("session").doc(file)
      .set({ filename: file, data: data.toString("base64") });
  }
}

async function loadSessionFromFirebase(number) {
  if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath);
  const snapshot = await db.collection("users").doc(number)
    .collection("session").get();
  snapshot.forEach(doc => {
    const { filename, data } = doc.data();
    fs.writeFileSync(path.join(sessionPath, filename), Buffer.from(data, "base64"));
  });
}

module.exports = { saveSessionToFirebase, loadSessionFromFirebase };
