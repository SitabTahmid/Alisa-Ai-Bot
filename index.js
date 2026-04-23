// ================== IMPORTS ==================
require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const OpenAI = require("openai");
const express = require("express");

// ================== DISCORD CLIENT ==================
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// ================== OPENAI ==================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================== BOT READY ==================
client.once("ready", () => {
  console.log(`🤖 Alisa Online: ${client.user.tag}`);
});

// ================== MESSAGE EVENT ==================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  // Example: mention দিলে reply দিবে
  if (message.content.startsWith("!ai")) {
    const prompt = message.content.replace("!ai", "").trim();

    if (!prompt) return message.reply("❌ Please write something!");

    try {
      const response = await openai.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });

      const reply = response.output[0].content[0].text;
      message.reply(reply);

    } catch (err) {
      console.error(err);
      message.reply("❌ Error getting AI response");
    }
  }
});

// ================== LOGIN ==================
client.login(process.env.TOKEN);

// ================== EXPRESS SERVER ==================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is alive!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
