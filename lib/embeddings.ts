import dotenv from "dotenv";
import { OpenAIEmbeddings } from "@langchain/openai";

dotenv.config({ path: ".env.development" });

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});
