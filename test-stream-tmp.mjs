import Anthropic from "@anthropic-ai/sdk";
const anthropic = new Anthropic({ apiKey: "sk-ant-invalid-test-key-000000000000000000" });
try {
  const s = await anthropic.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    system: "test",
    messages: [{ role: "user", content: "hi" }],
  });
  console.log("stream object created:", typeof s, s.constructor?.name);
  for await (const chunk of s) {
    console.log("chunk:", chunk.type);
  }
} catch (err) {
  console.log("CAUGHT ERROR:");
  console.log("name:", err?.name);
  console.log("message:", err?.message);
  console.log("status:", err?.status);
}
