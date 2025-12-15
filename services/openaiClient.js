let openai = null;

try {
  const OpenAI = require("openai");

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log("✅ OpenAI client ready");
} catch (error) {
  console.warn("⚠️ OpenAI not ready yet:", error.message);
}

module.exports = openai;
