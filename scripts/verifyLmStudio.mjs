import { loadConfig } from "../server/src/config.js";
import { LMStudioProvider } from "../server/src/domain/ai.js";

const config = loadConfig();
const provider = new LMStudioProvider(config.llm);
const messages = [
  { role: "system", content: "你是 EduMind Agent 的课程设计 AI 接入验证助手。" },
  { role: "user", content: "请用一句话说明你已经接入 EduMind Agent。" }
];

console.log(`Provider: ${provider.name}`);
console.log(`Endpoint: ${provider.config.endpoint}`);
console.log(`Max tokens: ${provider.config.maxTokens || 1024}`);

try {
  const result = await provider.complete(messages);
  console.log("LM Studio request succeeded.");
  console.log(`Model provider: ${result.provider}`);
  console.log("Answer:");
  console.log(result.text);
} catch (error) {
  console.error("LM Studio request failed.");
  console.error(error?.message || error);
  console.error("请确认 LM Studio 已加载 qwopus3.6-27b-v2-mtp@iq4_xs，并开启 OpenAI-compatible Server。");
  process.exitCode = 1;
}
