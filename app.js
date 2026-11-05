/**
 * Nexus Agent Studio — Core Client Architecture & ReAct Agent Engine
 */

// Agent Personas & System Prompt Templates
const PERSONAS = {
  helpful: {
    name: "General Assistant",
    systemInstruction: "You are a helpful, empathetic, and knowledgeable AI assistant modeled after ChatGPT. You speak clearly, format structured responses with markdown, and use tool calling when external data or calculations are required."
  },
  coder: {
    name: "Senior Code Architect",
    systemInstruction: "You are an elite Senior Staff Software Engineer and System Architect. You write clean, production-grade code with error handling, proper type annotations, and performant algorithms. Prioritize modularity and clear architecture explanations."
  },
  analyst: {
    name: "Data & Math Specialist",
    systemInstruction: "You are a quantitative data analyst and mathematical reasoning engine. Always break down complex math problems step-by-step. Use the Math Engine tool for calculations to guarantee absolute precision."
  },
  researcher: {
    name: "Autonomous Researcher",
    systemInstruction: "You are an autonomous research agent using the ReAct (Reasoning + Acting) framework. When asked a question, formulate search queries, execute web search tools, evaluate sources, and synthesize comprehensive reports."
  }
};

// Tool Definitions Schema (JSON Schema format used by Gemini / OpenAI)
const TOOL_SCHEMAS = [
  {
    name: "web_search",
    description: "Search the web for real-time information, news, current events, or documentation.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query term" }
      },
      required: ["query"]
    }
  },
  {
    name: "run_calculator",
    description: "Perform accurate mathematical evaluations, percentages, formula solutions.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression to evaluate, e.g., '184.50 * 0.15' or '(240 + 15) / 3'" }
      },
      required: ["expression"]
    }
  },
  {
    name: "get_weather",
    description: "Fetch live weather reports and temperature for any city.",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "City and optional state/country, e.g. 'Tokyo', 'San Francisco, CA'" }
      },
      required: ["location"]
    }
  },
  {
    name: "execute_python",
    description: "Execute a snippet of Python code in a safe sandbox to compute outputs or transform data.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Valid Python 3 code block to execute" }
      },
      required: ["code"]
    }
  }
];

// Application State
const state = {
  currentPersona: "helpful",
  systemInstruction: PERSONAS.helpful.systemInstruction,
  temperature: 0.7,
  maxHistory: 20,
  apiKey: "",
  model: "gemini-2.5-flash",
  messages: [], // Array of { id, role: 'user'|'assistant'|'tool', content, tool_calls, tool_result, timestamp }
  activeTools: {
    web_search: true,
    run_calculator: true,
    get_weather: true,
    execute_python: true
  },
  isGenerating: false
};

// DOM Elements
const elements = {
  sidebar: document.getElementById('sidebar'),
  toggleSidebar: document.getElementById('toggleSidebar'),
  newChatBtn: document.getElementById('newChatBtn'),
  archetypeCards: document.querySelectorAll('.archetype-card'),
  chatViewport: document.getElementById('chatViewport'),
  welcomeContainer: document.getElementById('welcomeContainer'),
  messagesList: document.getElementById('messagesList'),
  chatForm: document.getElementById('chatForm'),
  userPrompt: document.getElementById('userPrompt'),
  sendBtn: document.getElementById('sendBtn'),
  modelSelect: document.getElementById('modelSelect'),
  inspectMemoryBtn: document.getElementById('inspectMemoryBtn'),
  apiKeyConfigBtn: document.getElementById('apiKeyConfigBtn'),
  openSettingsBtn: document.getElementById('openSettingsBtn'),
  settingsModal: document.getElementById('settingsModal'),
  closeSettingsBtn: document.getElementById('closeSettingsBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  resetSystemBtn: document.getElementById('resetSystemBtn'),
  systemPromptInput: document.getElementById('systemPromptInput'),
  tempSlider: document.getElementById('tempSlider'),
  tempValue: document.getElementById('tempValue'),
  maxHistorySelect: document.getElementById('maxHistorySelect'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  memoryModal: document.getElementById('memoryModal'),
  closeMemoryBtn: document.getElementById('closeMemoryBtn'),
  closeMemoryFooterBtn: document.getElementById('closeMemoryFooterBtn'),
  jsonPayloadPreview: document.getElementById('jsonPayloadPreview'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),
  starterCards: document.querySelectorAll('.starter-card'),
  modeBadge: document.getElementById('modeBadge'),
  // Tool checkboxes
  toolWebSearch: document.getElementById('toolWebSearch'),
  toolCalculator: document.getElementById('toolCalculator'),
  toolWeather: document.getElementById('toolWeather'),
  toolCodeInterpreter: document.getElementById('toolCodeInterpreter')
};

// Initialize Application
function init() {
  // Load saved API key from localStorage if available
  const savedKey = localStorage.getItem('nexus_gemini_api_key');
  if (savedKey) {
    state.apiKey = savedKey;
  }
  setupEventListeners();
  updateModeBadge();
  updateSystemPromptDisplay();
  autoResizeTextarea();
}

function setupEventListeners() {
  // Sidebar toggle for mobile
  elements.toggleSidebar?.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
  });

  // New Chat
  elements.newChatBtn?.addEventListener('click', resetChat);

  // Archetype Persona selection
  elements.archetypeCards.forEach(card => {
    card.addEventListener('click', () => {
      elements.archetypeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const personaKey = card.dataset.persona;
      if (PERSONAS[personaKey]) {
        state.currentPersona = personaKey;
        state.systemInstruction = PERSONAS[personaKey].systemInstruction;
        updateSystemPromptDisplay();
      }
    });
  });

  // Starter Prompts
  elements.starterCards.forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.dataset.prompt;
      if (prompt) {
        elements.userPrompt.value = prompt;
        autoResizeTextarea();
        handlePromptSubmit();
      }
    });
  });

  // Tool checkboxes
  elements.toolWebSearch?.addEventListener('change', e => state.activeTools.web_search = e.target.checked);
  elements.toolCalculator?.addEventListener('change', e => state.activeTools.run_calculator = e.target.checked);
  elements.toolWeather?.addEventListener('change', e => state.activeTools.get_weather = e.target.checked);
  elements.toolCodeInterpreter?.addEventListener('change', e => state.activeTools.execute_python = e.target.checked);

  // Form submit
  elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePromptSubmit();
  });

  // Textarea auto-resize & Enter key handling
  elements.userPrompt.addEventListener('input', autoResizeTextarea);
  elements.userPrompt.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit();
    }
  });

  // Model selection
  elements.modelSelect.addEventListener('change', (e) => {
    state.model = e.target.value;
    updateModeBadge();
  });

  // Settings Modal
  elements.openSettingsBtn.addEventListener('click', openSettingsModal);
  elements.apiKeyConfigBtn.addEventListener('click', openSettingsModal);
  elements.closeSettingsBtn.addEventListener('click', closeSettingsModal);
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.resetSystemBtn.addEventListener('click', () => {
    state.systemInstruction = PERSONAS[state.currentPersona].systemInstruction;
    state.temperature = 0.7;
    elements.systemPromptInput.value = state.systemInstruction;
    elements.tempSlider.value = 0.7;
    elements.tempValue.textContent = '0.7';
  });

  elements.tempSlider.addEventListener('input', (e) => {
    elements.tempValue.textContent = e.target.value;
  });

  // Raw Context / Memory Inspector
  elements.inspectMemoryBtn.addEventListener('click', openMemoryModal);
  elements.closeMemoryBtn.addEventListener('click', closeMemoryModal);
  elements.closeMemoryFooterBtn.addEventListener('click', closeMemoryModal);
  elements.copyJsonBtn.addEventListener('click', () => {
    const jsonStr = elements.jsonPayloadPreview.textContent;
    navigator.clipboard.writeText(jsonStr);
    elements.copyJsonBtn.textContent = 'Copied!';
    setTimeout(() => elements.copyJsonBtn.textContent = 'Copy JSON Payload', 2000);
  });

  // Close modals on backdrop click
  window.addEventListener('click', (e) => {
    if (e.target === elements.settingsModal) closeSettingsModal();
    if (e.target === elements.memoryModal) closeMemoryModal();
  });
}

function autoResizeTextarea() {
  elements.userPrompt.style.height = 'auto';
  elements.userPrompt.style.height = Math.min(elements.userPrompt.scrollHeight, 160) + 'px';
}

function updateSystemPromptDisplay() {
  elements.systemPromptInput.value = state.systemInstruction;
  elements.tempSlider.value = state.temperature;
  elements.tempValue.textContent = state.temperature.toString();
}

function updateModeBadge() {
  if (state.apiKey) {
    elements.modeBadge.textContent = `Connected Live API (${state.model})`;
    elements.modeBadge.style.color = '#10b981';
  } else {
    elements.modeBadge.textContent = `Demo Mode (Simulated LLM + Live ReAct)`;
    elements.modeBadge.style.color = '#9ca3af';
  }
}

function resetChat() {
  state.messages = [];
  elements.messagesList.innerHTML = '';
  elements.welcomeContainer.style.display = 'flex';
  elements.userPrompt.value = '';
  autoResizeTextarea();
}

// Open / Close Modals
function openSettingsModal() {
  elements.systemPromptInput.value = state.systemInstruction;
  elements.tempSlider.value = state.temperature;
  elements.tempValue.textContent = state.temperature.toString();
  elements.apiKeyInput.value = state.apiKey;
  elements.settingsModal.classList.add('open');
}

function closeSettingsModal() {
  elements.settingsModal.classList.remove('open');
}

function saveSettings() {
  state.systemInstruction = elements.systemPromptInput.value.trim();
  state.temperature = parseFloat(elements.tempSlider.value);
  state.maxHistory = parseInt(elements.maxHistorySelect.value, 10);
  state.apiKey = elements.apiKeyInput.value.trim();
  if (state.apiKey) {
    localStorage.setItem('nexus_gemini_api_key', state.apiKey);
  } else {
    localStorage.removeItem('nexus_gemini_api_key');
  }
  updateModeBadge();
  closeSettingsModal();
}

function openMemoryModal() {
  const payload = buildLLMContextPayload();
  elements.jsonPayloadPreview.textContent = JSON.stringify(payload, null, 2);
  elements.memoryModal.classList.add('open');
}

function closeMemoryModal() {
  elements.memoryModal.classList.remove('open');
}

/**
 * Builds the exact JSON payload sent to the LLM API
 * Shows System Instructions, Sliding History Window, and Available Tools
 */
function buildLLMContextPayload() {
  // Truncate memory history based on maxHistory state
  const historyToInclude = state.messages.slice(-state.maxHistory);

  const formattedHistory = historyToInclude.map(msg => ({
    role: msg.role,
    content: msg.content,
    ...(msg.tool_calls ? { tool_calls: msg.tool_calls } : {}),
    ...(msg.tool_result ? { tool_result: msg.tool_result } : {})
  }));

  const enabledToolSchemas = TOOL_SCHEMAS.filter(tool => state.activeTools[tool.name]);

  return {
    model: state.model,
    hyperparameters: {
      temperature: state.temperature,
      max_output_tokens: 2048,
      top_p: 0.95
    },
    system_instruction: {
      parts: [{ text: state.systemInstruction }]
    },
    tools: enabledToolSchemas.length > 0 ? [{ function_declarations: enabledToolSchemas }] : [],
    conversation_history: formattedHistory
  };
}

/**
 * Main Prompt Submission Handler
 */
async function handlePromptSubmit() {
  const promptText = elements.userPrompt.value.trim();
  if (!promptText || state.isGenerating) return;

  state.isGenerating = true;
  elements.sendBtn.disabled = true;

  // Hide Welcome Screen on first prompt
  elements.welcomeContainer.style.display = 'none';

  // 1. Add User Message to State & UI
  const userMsg = {
    id: Date.now().toString(),
    role: 'user',
    content: promptText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };
  state.messages.push(userMsg);
  appendUserMessageToUI(userMsg);

  elements.userPrompt.value = '';
  autoResizeTextarea();

  // Scroll to bottom
  scrollToBottom();

  // 2. Create Placeholder Assistant Message UI with Typing Dots
  const assistantMsgId = (Date.now() + 1).toString();
  const assistantRow = createAssistantMessageRow(assistantMsgId);
  elements.messagesList.appendChild(assistantRow);
  scrollToBottom();

  // 3. ReAct Agent Reasoning & Generation Loop
  try {
    if (state.model !== 'custom-sim' && state.apiKey) {
      // Live API Call to Gemini API
      await runLiveGeminiAgent(assistantMsgId, promptText);
    } else if (state.model !== 'custom-sim' && !state.apiKey) {
      // User selected a real Gemini model but hasn't entered an API key yet
      updateAssistantBubbleText(
        assistantMsgId,
        `🔑 **Gemini API Key Required**\n\nYou have selected **${state.model}**, which calls Google's actual Gemini LLM.\n\nPlease click **[API Connection]** in the top-right header or open **Settings** to enter your Gemini API key.\n\n*Don't have a key yet? You can generate a free Gemini key in seconds at [aistudio.google.com](https://aistudio.google.com/app/apikey). You can also switch the model dropdown to **Local ReAct Agent (Interactive Simulator)** to test without an API key.*`
      );
    } else {
      // Local ReAct Agent Simulator (Demonstrates tool execution + streaming response)
      await runSimulatedAgent(assistantMsgId, promptText);
    }
  } catch (err) {
    console.error("Agent error:", err);
    updateAssistantBubbleText(assistantMsgId, `⚠️ **Error executing agent loop:** ${err.message}`);
  } finally {
    state.isGenerating = false;
    elements.sendBtn.disabled = false;
  }
}

/**
 * UI Helper Functions for Chat Bubbles
 */
function appendUserMessageToUI(msg) {
  const row = document.createElement('div');
  row.className = 'message-row user-row';
  row.innerHTML = `
    <div class="message-avatar">U</div>
    <div class="message-content-wrapper">
      <div class="message-bubble">${escapeHTML(msg.content)}</div>
      <div class="message-meta">${msg.timestamp}</div>
    </div>
  `;
  elements.messagesList.appendChild(row);
}

function createAssistantMessageRow(id) {
  const row = document.createElement('div');
  row.className = 'message-row assistant-row';
  row.id = `msg-${id}`;
  row.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content-wrapper" id="wrapper-${id}">
      <div class="message-bubble" id="bubble-${id}">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
      <div class="message-meta" id="meta-${id}">Nexus Agent • Thinking</div>
    </div>
  `;
  return row;
}

function updateAssistantBubbleText(id, text) {
  const bubble = document.getElementById(`bubble-${id}`);
  const meta = document.getElementById(`meta-${id}`);
  if (bubble) {
    bubble.innerHTML = formatMarkdown(text);
  }
  if (meta) {
    meta.textContent = `Nexus Agent • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
}

function appendToolExecutionStep(id, toolName, args, result) {
  const wrapper = document.getElementById(`wrapper-${id}`);
  if (!wrapper) return;

  const toolCard = document.createElement('div');
  toolCard.className = 'tool-step-card';
  toolCard.innerHTML = `
    <div class="tool-step-header">
      <span>⚡ ReAct Action: Executing Tool [${toolName}]</span>
    </div>
    <div class="tool-step-args">Input: ${JSON.stringify(args)}</div>
    <div class="tool-step-result">Result: ${typeof result === 'object' ? JSON.stringify(result) : result}</div>
  `;
  
  // Insert before the text bubble
  const bubble = document.getElementById(`bubble-${id}`);
  wrapper.insertBefore(toolCard, bubble);
}

function scrollToBottom() {
  elements.chatViewport.scrollTop = elements.chatViewport.scrollHeight;
}

/**
 * ReAct Tool Execution Engine (Client-side implementation)
 */
function executeToolLocally(toolName, args) {
  switch (toolName) {
    case 'web_search': {
      const q = args.query.toLowerCase();
      if (q.includes('chatgpt') || q.includes('architecture') || q.includes('agent')) {
        return {
          query: args.query,
          results: [
            { title: "ChatGPT Architecture Overview", snippet: "ChatGPT uses a Transformer decoder-based LLM with autoregressive token generation, system instructions, and multi-turn context arrays." },
            { title: "ReAct: Synergizing Reasoning and Acting in Language Models", snippet: "ReAct prompts LLMs to generate reasoning traces and task-specific tool calls in an interleaved manner." }
          ]
        };
      }
      return {
        query: args.query,
        results: [
          { title: `Search result for "${args.query}"`, snippet: `Found 3 relevant knowledge articles regarding ${args.query}. Latest status updated.` }
        ]
      };
    }
    case 'run_calculator': {
      try {
        // Safe math evaluation
        const sanitized = args.expression.replace(/[^0-9+\-*/().\s]/g, '');
        const val = Function(`'use strict'; return (${sanitized})`)();
        return { expression: args.expression, result: val };
      } catch (e) {
        return { expression: args.expression, error: "Invalid math expression" };
      }
    }
    case 'get_weather': {
      const city = args.location;
      const temps = { 'Tokyo': '18°C, Partly Cloudy, 65% Humidity', 'San Francisco': '16°C, Foggy, Wind 12mph', 'New York': '22°C, Sunny' };
      const defaultWeather = '20°C, Clear skies, Wind 8mph';
      return { location: city, forecast: temps[city] || defaultWeather };
    }
    case 'execute_python': {
      return {
        code: args.code,
        stdout: "Output: Execution successful.\nProcessed array of 10 elements in 0.002s."
      };
    }
    default:
      return { error: `Tool ${toolName} not found` };
  }
}

/**
 * Simulated ReAct Agent Loop with Token Streaming
 */
async function runSimulatedAgent(msgId, promptText) {
  const text = promptText.toLowerCase();
  
  // Detect if tools are needed
  const toolSteps = [];
  
  if ((text.includes('weather') || text.includes('tokyo') || text.includes('san francisco')) && state.activeTools.get_weather) {
    const loc = text.includes('tokyo') ? 'Tokyo' : (text.includes('san francisco') ? 'San Francisco' : 'New York');
    const result = executeToolLocally('get_weather', { location: loc });
    toolSteps.push({ name: 'get_weather', args: { location: loc }, result });
  }

  if ((text.includes('calculate') || text.includes('math') || text.includes('tip') || text.includes('%') || text.includes('+') || text.includes('*')) && state.activeTools.run_calculator) {
    let expr = '184.50 * 0.15';
    if (text.includes('184.50')) expr = '184.50 * 0.15';
    const result = executeToolLocally('run_calculator', { expression: expr });
    toolSteps.push({ name: 'run_calculator', args: { expression: expr }, result });
  }

  if ((text.includes('search') || text.includes('react') || text.includes('architecture') || text.includes('chatgpt')) && state.activeTools.web_search) {
    const result = executeToolLocally('web_search', { query: promptText });
    toolSteps.push({ name: 'web_search', args: { query: promptText }, result });
  }

  // Render Tool Execution Visualizer Cards
  for (const step of toolSteps) {
    await sleep(600); // Simulate tool network latency
    appendToolExecutionStep(msgId, step.name, step.args, step.result);
    scrollToBottom();
  }

  // Formulate Final Response Text based on persona and tools
  let finalResponseText = "";

  if (toolSteps.length > 0) {
    finalResponseText = `I executed the necessary tools to process your request:\n\n`;
    toolSteps.forEach(step => {
      if (step.name === 'get_weather') {
        finalResponseText += `🌤️ **Weather in ${step.result.location}:** ${step.result.forecast}\n\n`;
      } else if (step.name === 'run_calculator') {
        finalResponseText += `🧮 **Calculation Output:** \`${step.result.expression}\` = **${step.result.result}**\n\n`;
      } else if (step.name === 'web_search') {
        finalResponseText += `🌐 **Web Search Results:** Found ${step.result.results.length} articles.\n- *${step.result.results[0].title}*: ${step.result.results[0].snippet}\n\n`;
      }
    });
    finalResponseText += `Let me know if you would like me to perform additional data processing or explain the ReAct logic step-by-step!`;
  } else if (text.includes('chatgpt') || text.includes('history') || text.includes('memory')) {
    finalResponseText = `Building an AI Agent like **ChatGPT** relies on 5 foundational architectural layers:

### 1. The Core LLM Engine & API Integration
The agent connects to an autoregressive Large Language Model (e.g., Gemini 3.6 / GPT-4). You pass a prompt sequence and the model predicts the next tokens probabilistically.

### 2. Conversation Memory & Context Windows
Unlike humans, LLMs have no persistent internal memory between API calls. To give the illusion of memory, the client application maintains an array of message objects:

\`\`\`json
[
  { "role": "system", "content": "You are a helpful assistant..." },
  { "role": "user", "content": "Hello! My name is Shashi." },
  { "role": "assistant", "content": "Hi Shashi! How can I help you today?" }
]
\`\`\`

When history grows beyond the model's context window limit (e.g. 128k tokens), a **Sliding Window** or **Summarization Memory** manager truncates older messages.

### 3. Real-Time Token Streaming (Server-Sent Events)
ChatGPT streams tokens instantly using SSE chunked responses instead of waiting for the full response to generate.

### 4. ReAct Tool Calling (Reasoning + Acting)
Agents can invoke tools like Python interpreters, Web Search, or SQL databases:
1. User asks: *"What is 15% tip on $184.50?"*
2. LLM outputs tool call request: \`run_calculator(expression="184.50 * 0.15")\`
3. Agent Runtime executes the tool and receives result: \`27.675\`
4. LLM receives tool output and generates final response: *"15% tip is $27.68."*

### 5. System Instructions & Persona Tuning
System prompts set guardrails, output formatting rules, and domain expertise.`;
  } else if (text.includes('code') || text.includes('python') || text.includes('stream')) {
    finalResponseText = `Here is a complete, minimal Python example showing how to build a stateful ChatGPT-like AI agent loop with streaming:

\`\`\`python
import os
import google.generativeai as genai

# Configure API Key
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

# 1. Initialize Model with System Instructions
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash",
    system_instruction="You are a helpful AI coding assistant modeled after ChatGPT."
)

# 2. Start a Stateful Chat Session
chat = model.start_chat(history=[])

print("🤖 AI Agent Initialized! Type 'exit' to quit.\n")

while True:
    user_input = input("User > ")
    if user_input.lower() in ["exit", "quit"]:
        break
        
    print("Agent > ", end="", flush=True)
    
    # 3. Stream Response Tokens
    response = chat.send_message(user_input, stream=True)
    for chunk in response:
        print(chunk.text, end="", flush=True)
    print("\n")
\`\`\``;
  } else {
    finalResponseText = `Hello! I am your custom **Nexus AI Agent** (operating in persona: *${state.currentPersona}*).

I am currently running in local interactive simulation mode demonstrating full stateful conversation memory and tool execution loops.

Try asking me:
- *"Calculate 15% tip on $184.50"* (Triggers Math Tool)
- *"What's the weather in Tokyo right now?"* (Triggers Weather Tool)
- *"Show me code for an AI agent in Python"* (Displays code architecture)`;
  }

  // Stream text chunk by chunk to emulate ChatGPT typing effect
  await streamTextToBubble(msgId, finalResponseText);

  // Save Assistant Message to State
  state.messages.push({
    id: msgId,
    role: 'assistant',
    content: finalResponseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
}

/**
 * Live Gemini API call implementation (used when user inputs an API key)
 */
async function runLiveGeminiAgent(msgId, promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.model}:generateContent?key=${state.apiKey}`;

  const payload = buildLLMContextPayload();
  
  // Format history for Gemini REST API
  const contents = state.messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents,
    systemInstruction: {
      parts: [{ text: state.systemInstruction }]
    },
    generationConfig: {
      temperature: state.temperature,
      maxOutputTokens: 2048
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || response.statusText);
  }

  const data = await response.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response text received.";

  await streamTextToBubble(msgId, responseText);

  state.messages.push({
    id: msgId,
    role: 'assistant',
    content: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
}

/**
 * Smooth character/token streaming effect
 */
async function streamTextToBubble(id, fullText) {
  const bubble = document.getElementById(`bubble-${id}`);
  if (!bubble) return;

  const words = fullText.split(' ');
  let currentText = "";

  for (let i = 0; i < words.length; i++) {
    currentText += (i === 0 ? "" : " ") + words[i];
    bubble.innerHTML = formatMarkdown(currentText);
    scrollToBottom();
    // Delay for natural streaming feel
    await sleep(Math.floor(Math.random() * 20) + 15);
  }
}

// Utility Sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTML Escaping
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Markdown formatting helper (code blocks, bold, lists, headings)
function formatMarkdown(str) {
  let html = escapeHTML(str);

  // Fenced Code Blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre class="json-code-block"><code>${code}</code></pre>`;
  });

  // Inline Code
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; font-family:var(--font-mono); font-size:0.85em;">$1</code>');

  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3 style="margin: 0.8em 0 0.4em 0; font-size:1.05em; font-weight:700; color:var(--text-main);">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 style="margin: 1em 0 0.5em 0; font-size:1.2em; font-weight:700; color:var(--accent-cyan);">$1</h2>');

  // Bold & Italics
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#fff;">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet Lists
  html = html.replace(/^\- (.*$)/gim, '<li style="margin-left: 1.2rem; list-style-type: disc;">$1</li>');

  return html;
}

// Start app on DOM loaded
document.addEventListener('DOMContentLoaded', init);
