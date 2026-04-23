// ================== ENV ==================
require("dotenv").config();

// ================== IMPORTS ==================
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} = require("discord.js");

const OpenAI = require("openai");
const express = require("express"); // ✅ ADDED (24/7 FIX)

// =====================
// LOWDB
// =====================
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const adapter = new JSONFile("db.json");
const db = new Low(adapter, { users: {} });

// =====================
// CLIENT
// =====================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// =====================
// GROQ AI
// =====================
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// =====================
// SLASH COMMAND
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("ask")
    .setDescription("Talk with Alisa AI")
    .addStringOption(option =>
      option.setName("question").setDescription("Your message").setRequired(true)
    )
    .toJSON(),
];

// REGISTER COMMAND
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), {
    body: commands,
  });
  console.log("✅ Slash command ready");
})();

// =====================
// READY
// =====================
client.once("ready", () => {
  console.log(`🤖 Alisa Online: ${client.user.tag}`);
});

// =====================
// AI FUNCTION
// =====================
async function getAIResponse(userId, username, messageContent) {
  await db.read();

  if (!db.data.users[userId]) db.data.users[userId] = [];

  let userMemory = db.data.users[userId];

  userMemory.push({ role: "user", content: messageContent });

  if (userMemory.length > 10) userMemory.shift();

  const isCreator = userId === process.env.CREATOR_ID;

  const systemPrompt = `
You are Alisa Vexora, a mysterious AI companion.

Personality:
- intelligent
- calm, elegant, slightly mysterious
- helpful and friendly

Rules:
- If user is creator → call them "Master"
- If not → do NOT call them Master
- Speak naturally in Bangla or English
- Keep tone slightly soft and human-like
`;

  const roleInfo = isCreator
    ? "User is your Master. Show loyalty."
    : "User is a normal user.";

  const response = await openai.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: systemPrompt + roleInfo },
      ...userMemory,
    ],
    max_tokens: 200,
  });

  let answer = response.choices[0].message.content;

  userMemory.push({ role: "assistant", content: answer });

  db.data.users[userId] = userMemory;
  await db.write();

  return answer;
}

// =====================
// SLASH COMMAND HANDLER
// =====================
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "ask") {
    const question = interaction.options.getString("question");

    await interaction.deferReply();

    try {
      const reply = await getAIResponse(
        interaction.user.id,
        interaction.user.username,
        question
      );

      const embed = new EmbedBuilder()
        .setColor(0x00ffcc)
        .setTitle("🤖 Alisa Vexora")
        .setDescription(reply)
        .setFooter({ text: "AI Companion • Alisa Bot" });

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      await interaction.editReply("❌ Error hoise");
    }
  }
});

// =====================
// MENTION CHAT
// =====================
client.on("messageCreate", async message => {
  if (message.author.bot) return;
  if (!message.mentions.has(client.user)) return;

  const cleanMsg = message.content.replace(/<@!?\\d+>/g, "").trim();
  if (!cleanMsg) return message.reply("💬 Amar sathe kotha bolo...");

  try {
    await message.channel.sendTyping();

    const reply = await getAIResponse(
      message.author.id,
      message.author.username,
      cleanMsg
    );

    message.reply(reply);

  } catch (err) {
    console.error(err);
    message.reply("❌ Error hoise");
  }
});

// =====================
// LOGIN
// =====================
client.login(process.env.TOKEN);

// =====================
// 🚀 24/7 RENDER SERVER (ADDED)
// =====================
const app = express();

app.get("/", (req, res) => {
  res.send("Alisa Bot is Alive 🤖");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🌐 Web Server Running on ${PORT}`);
});
