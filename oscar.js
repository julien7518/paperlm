import * as webllm from "https://esm.run/@mlc-ai/web-llm";
import {
  pipeline,
  env,
} from "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";

env.allowLocalModels = false;

const state = {
  llmEngine: null,
  embedder: null,
  vectorStore: [],
  chatHistory: [],
  modelId: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
  embeddingModel: "Xenova/all-MiniLM-L6-v2",
};

const ui = {
  sendBtn: document.getElementById("send-btn"),
  stopBtn: document.getElementById("stop-btn"),
  clearBtn: document.getElementById("clear-btn"),
  input: document.getElementById("user-input"),
  chat: document.getElementById("chat-container"),
  dropZone: document.getElementById("drop-zone"),
  fileInput: document.getElementById("file-input"),
  sourcesList: document.getElementById("sources-list"),
  progressBar: document.getElementById("progress-bar"),
  loadLabel: document.getElementById("load-label"),
  tempSlider: document.getElementById("temp-slider"),
  tempVal: document.getElementById("temp-val"),
  systemPrompt: document.getElementById("system-prompt"),
  litReviewBtn: document.getElementById("lit-review-btn"),
  modelSelect: document.getElementById("model-select"),
  loadModelBtn: document.getElementById("load-model-btn"),
  modelStatus: document.getElementById("model-status"),
  currentModelDisplay: document.getElementById("current-model-display"),
};

// --- INITIALIZATION ---
async function initSystem() {
  ui.sendBtn.disabled = true;
  ui.litReviewBtn.disabled = true;
  ui.litReviewBtn.classList.add("opacity-50", "cursor-not-allowed");

  const updateProgress = (text, percent) => {
    ui.loadLabel.innerText = text;
    ui.progressBar.style.width = `${percent}%`;
  };

  try {
    updateProgress("Loading Embedding Model (MiniLM)...", 20);
    state.embedder = await pipeline(
      "feature-extraction",
      state.embeddingModel,
      {
        quantized: true,
      }
    );

    updateProgress("Embedding Ready - Select LLM Model", 40);
    ui.loadLabel.classList.add("text-blue-600");
    ui.modelStatus.innerText =
      "Embedding model loaded. Now select and load an LLM.";
  } catch (err) {
    console.error("Initialization Error:", err);
    ui.loadLabel.innerText = "Error: Check Console";
    ui.loadLabel.classList.add("text-red-600");
  }
}

// --- LOAD LLM MODEL ---
async function loadLLM() {
  const selectedModel = ui.modelSelect.value;
  state.modelId = selectedModel;

  ui.loadModelBtn.disabled = true;
  ui.loadModelBtn.innerText = "⏳ Loading...";
  ui.modelStatus.innerText = "Downloading model files...";
  ui.loadLabel.innerText = "Loading LLM...";
  ui.loadLabel.classList.remove("text-green-600", "text-blue-600");
  ui.loadLabel.classList.add("text-yellow-600");

  try {
    // Unload previous model if exists
    if (state.llmEngine) {
      state.llmEngine = null;
    }

    state.llmEngine = await webllm.CreateMLCEngine(state.modelId, {
      initProgressCallback: (report) => {
        ui.progressBar.style.width = `${40 + report.progress * 60}%`;
        ui.modelStatus.innerText = report.text;
      },
    });

    ui.progressBar.style.width = "100%";
    ui.loadLabel.innerText = "System Ready";
    ui.loadLabel.classList.remove("text-yellow-600");
    ui.loadLabel.classList.add("text-green-600");
    ui.sendBtn.disabled = false;
    ui.litReviewBtn.disabled = false;
    ui.litReviewBtn.classList.remove("opacity-50", "cursor-not-allowed");
    ui.modelStatus.innerText = "Model loaded successfully!";
    ui.currentModelDisplay.innerText = selectedModel.split("-q")[0];
    ui.loadModelBtn.innerText = "🚀 Load Selected Model";
    ui.loadModelBtn.disabled = false;
  } catch (err) {
    console.error("Model Load Error:", err);
    ui.modelStatus.innerText = "Error: " + err.message;
    ui.loadLabel.innerText = "Model Load Failed";
    ui.loadLabel.classList.add("text-red-600");
    ui.loadModelBtn.innerText = "🚀 Load Selected Model";
    ui.loadModelBtn.disabled = false;
  }
}

// --- COSINE SIMILARITY ---
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- CHUNKING ---
function chunkText(text, chunkSize = 400, overlap = 80) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    let chunk = text.slice(start, end);

    if (end < text.length) {
      const lastPeriod = chunk.lastIndexOf(".");
      if (lastPeriod > -1 && lastPeriod > chunkSize * 0.5) {
        chunk = chunk.slice(0, lastPeriod + 1);
        start += lastPeriod + 1 - overlap;
      } else {
        const lastSpace = chunk.lastIndexOf(" ");
        if (lastSpace > -1) {
          chunk = chunk.slice(0, lastSpace);
          start += lastSpace - overlap;
        } else {
          start += chunkSize - overlap;
        }
      }
    } else {
      start += chunkSize;
    }

    chunks.push(chunk.trim());
  }
  return chunks;
}

// --- DOCUMENT PROCESSING ---
async function processFiles(files) {
  ui.sourcesList.innerHTML = "";
  addMessage("system", `Processing ${files.length} documents...`);

  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item) => item.str).join(" ") + " ";
    }

    const textChunks = chunkText(fullText);

    const embeddingPromises = textChunks.map(async (chunk, i) => {
      const output = await state.embedder(chunk, {
        pooling: "mean",
        normalize: true,
      });
      const embedding = Array.from(output.data);

      return {
        id: `${file.name}_${i}`,
        text: chunk,
        vector: embedding,
        source: file.name,
      };
    });

    const newVectors = await Promise.all(embeddingPromises);
    state.vectorStore.push(...newVectors);

    const item = document.createElement("div");
    item.className =
      "p-2 bg-indigo-50 border border-indigo-200 rounded text-xs truncate";
    item.innerText = `${file.name} (${textChunks.length} chunks)`;
    ui.sourcesList.appendChild(item);
  }

  addMessage(
    "system",
    `Indexing complete. ${state.vectorStore.length} vectors stored.`
  );
}

// --- CHAT HANDLER ---
async function handleChat() {
  const query = ui.input.value.trim();
  if (!query) return;

  addMessage("user", query);
  ui.input.value = "";
  ui.sendBtn.disabled = true;

  if (!state.llmEngine) {
    addMessage("system", "Error: LLM not initialized.");
    ui.sendBtn.disabled = false;
    return;
  }

  let context = "";

  // RAG RETRIEVAL
  if (state.vectorStore.length > 0) {
    const queryOutput = await state.embedder(query, {
      pooling: "mean",
      normalize: true,
    });
    const queryVector = Array.from(queryOutput.data);

    const scoredChunks = state.vectorStore.map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryVector, chunk.vector),
    }));

    scoredChunks.sort((a, b) => b.score - a.score);

    // Get top 4 chunks only (smaller context for 1B model)
    const topChunks = scoredChunks.slice(0, 4);

    context = topChunks
      .map((c, i) => `[Document ${i + 1}]: ${c.text}`)
      .join("\n\n");

    console.log("=== RAG DEBUG ===");
    console.log("Total chunks:", state.vectorStore.length);
    console.log(
      "Top scores:",
      topChunks.map((c) => c.score.toFixed(3))
    );
    console.log("Context chars:", context.length);
  }

  // PROMPT - Extremely simple for 1B model
  const temperature = parseFloat(ui.tempSlider.value);

  let userPrompt;
  if (context) {
    userPrompt = `Read this text from a PDF:

${context}

Question: ${query}

Answer based on the text above:`;
  } else {
    userPrompt = `No PDF uploaded yet. User asked: ${query}`;
  }

  const messages = [
    {
      role: "system",
      content:
        "You summarize and answer questions about documents. Use only the provided text.",
    },
    { role: "user", content: userPrompt },
  ];

  console.log("=== PROMPT ===");
  console.log("Prompt length:", userPrompt.length);

  const responseDiv = addMessage("ai", "...", true);

  ui.sendBtn.classList.add("hidden");
  ui.stopBtn.classList.remove("hidden");

  try {
    const stream = await state.llmEngine.chat.completions.create({
      messages,
      temperature: temperature,
      stream: true,
    });
    let fullResponse = "";
    responseDiv.innerHTML = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      fullResponse += delta;
      responseDiv.innerText = fullResponse;

      const isAtBottom =
        ui.chat.scrollHeight - ui.chat.scrollTop <= ui.chat.clientHeight + 100;
      if (isAtBottom) {
        ui.chat.scrollTop = ui.chat.scrollHeight;
      }
    }

    state.chatHistory.push({ role: "user", content: query });
    state.chatHistory.push({ role: "assistant", content: fullResponse });
  } catch (err) {
    if (err.message?.includes("aborted") || err.name === "AbortError") {
      responseDiv.innerText += " [Stopped]";
    } else {
      console.error(err);
      responseDiv.innerText = "Error generating response.";
    }
  } finally {
    ui.sendBtn.disabled = false;
    ui.sendBtn.classList.remove("hidden");
    ui.stopBtn.classList.add("hidden");
  }
}

// --- UTILS ---
function addMessage(role, text, loading = false) {
  const div = document.createElement("div");
  div.className = "flex gap-4 max-w-4xl mx-auto animate-fade-in";
  div.innerHTML = `
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  role === "user"
                    ? "bg-slate-700 text-white"
                    : "bg-indigo-500 text-white"
                }">${role === "user" ? "U" : "AI"}</div>
                <div class="p-4 rounded-2xl border ${
                  role === "user"
                    ? "bg-indigo-50 border-indigo-100"
                    : "bg-white border-slate-100"
                } text-slate-700">
                    ${loading ? '<div class="dot-flashing"></div>' : text}
                </div>
            `;
  ui.chat.appendChild(div);
  ui.chat.scrollTop = ui.chat.scrollHeight;
  return div.querySelector("div:last-child");
}

// Event Listeners
ui.sendBtn.addEventListener("click", handleChat);
ui.stopBtn.addEventListener("click", () => {
  if (state.llmEngine) {
    state.llmEngine.interruptGenerate();
  }
});

ui.clearBtn.addEventListener("click", () => {
  state.chatHistory = [];
  ui.chat.innerHTML = `
            <div class="flex gap-4 max-w-4xl mx-auto animate-fade-in">
                <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">AI</div>
                <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-md border border-slate-100 text-slate-700 leading-relaxed max-w-full lg:max-w-2xl">
                    Chat cleared. Ready for new questions.
                </div>
            </div>`;
});

ui.input.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) handleChat();
});
ui.dropZone.addEventListener("click", () => ui.fileInput.click());
ui.fileInput.addEventListener("change", (e) =>
  processFiles(Array.from(e.target.files))
);
ui.dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  ui.dropZone.classList.add("bg-indigo-100");
});
ui.dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  ui.dropZone.classList.remove("bg-indigo-100");
});
ui.dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  ui.dropZone.classList.remove("bg-indigo-100");
  if (e.dataTransfer.files.length > 0)
    processFiles(Array.from(e.dataTransfer.files));
});

ui.tempSlider.addEventListener(
  "input",
  (e) => (ui.tempVal.innerText = e.target.value)
);
ui.litReviewBtn.addEventListener("click", () => {
  ui.input.value = "Summarize the main points of this document.";
  handleChat();
});
ui.loadModelBtn.addEventListener("click", loadLLM);

window.addEventListener("load", initSystem);
