# Nexus AI Agent — Building a ChatGPT-Like Conversational AI Agent

This workspace contains a complete, working reference implementation and interactive studio for building a ChatGPT-like AI Agent.

---

## 🌟 The 5 Architecture Pillars of a ChatGPT Agent

```
 ┌────────────────────────────────────────────────────────┐
 │                   User Interface (UI)                  │
 │  - Real-time token streaming (Server-Sent Events)      │
 │  - ReAct tool execution cards & system persona switch  │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │              Conversation Memory Manager               │
 │  - History Array: [{role: 'user'|'assistant'}, ...]   │
 │  - Sliding Context Window & Token Budget Truncation    │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┐
 │                 ReAct Tool Calling Engine              │
 │  - Function Schemas (Search, Math, Weather, Code)      │
 │  - Reasoning-Action loop: Plan -> Act -> Observe      │
 └───────────────────────────┬────────────────────────────┘
                             │
 ┌───────────────────────────▼────────────────────────────┘
 │                  LLM Model & System Prompt             │
 │  - Persona instructions & safety guardrails           │
 │  - Gemini / GPT-4 Autoregressive Token Generation     │
 └────────────────────────────────────────────────────────┘
```

---

## 🚀 Workspace Contents

| File | Description |
| :--- | :--- |
| [`index.html`](./index.html) | Interactive Web Studio UI with Glassmorphism styling |
| [`styles.css`](./styles.css) | Custom modern dark theme, glow effects, responsive layout |
| [`app.js`](./app.js) | Full client-side ReAct agent engine, memory inspector, token streaming |
| [`agent.py`](./agent.py) | Standalone Python 3 CLI Agent (Zero external dependencies) |
| [`server.py`](./server.py) | Python HTTP server hosting the web application on port 3000 |

---

## ⚡ How to Run

### 1. Interactive Web Application
- 🌐 **Live Public Demo (GitHub Pages):** **[https://shashikutti.github.io/chatagent/](https://shashikutti.github.io/chatagent/)**
- 💻 **Local Dev Server:** Run `python3 server.py` and open **[http://localhost:3000](http://localhost:3000)**

You can open this URL in your browser to interact with the agent, test tool calls, inspect the raw JSON context payload sent to the LLM, and customize hyperparameters like temperature and system instructions.

### 2. Standalone Python CLI Agent
To run the terminal-based agent:
```bash
python3 agent.py
```

---

## 💡 Core Code Snippet (Python Agent Loop)

```python
class ChatGPTLikeAgent:
    def __init__(self, system_instruction: str):
        self.system_instruction = system_instruction
        self.history = []  # Context memory buffer

    def process_turn(self, user_input: str) -> str:
        # 1. Add user turn to conversation history
        self.history.append({"role": "user", "content": user_input})
        
        # 2. Check if tools (Search, Math, Weather) are needed (ReAct)
        tool_results = self.check_and_execute_tools(user_input)

        # 3. Generate response with LLM API or ReAct synthesis
        response = self.call_llm_api(self.history, tool_results)

        # 4. Save assistant response to context memory
        self.history.append({"role": "assistant", "content": response})
        return response
```
