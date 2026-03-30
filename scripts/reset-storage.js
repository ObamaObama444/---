const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const uploadsDir = path.join(projectRoot, "uploads");
const messagesFile = path.join(projectRoot, "data", "messages.json");

for (const entry of fs.readdirSync(uploadsDir)) {
  if (entry === ".gitkeep") {
    continue;
  }

  fs.rmSync(path.join(uploadsDir, entry), { force: true });
}

fs.writeFileSync(messagesFile, "[]\n", "utf8");

console.log("Forum storage has been reset.");
