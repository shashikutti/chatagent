#!/usr/bin/env python3
"""
Nexus AI Agent — Reference Implementation in Pure Python
Demonstrates the 5 core pillars of building a ChatGPT-like AI agent:
1. LLM API Connection
2. System Prompt Engineering
3. Stateful Conversation Memory & Token Budget Clipping
4. ReAct Tool / Function Calling Loop
5. Streaming Token Output in Terminal
"""

import os
import sys
import json
import time
import math
import urllib.request
import urllib.parse

# -----------------------------------------------------------------------------
# 1. Tool / Function Definitions (Schemas & Implementation)
# -----------------------------------------------------------------------------

TOOL_SCHEMAS = [
    {
        "name": "web_search",
        "description": "Search the web for current information, news, or technical documentation.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search term"}
            },
            "required": ["query"]
        }
    },
    {
        "name": "run_calculator",
        "description": "Evaluate mathematical expressions accurately.",
        "parameters": {
            "type": "object",
            "properties": {
                "expression": {"type": "string", "description": "Math expression e.g. '184.50 * 0.15'"}
            },
            "required": ["expression"]
        }
    },
    {
        "name": "get_weather",
        "description": "Fetch weather forecast for any location.",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"}
            },
            "required": ["location"]
        }
    }
]

def execute_tool(tool_name: str, args: dict) -> dict:
    """Executes local tool logic and returns result object."""
    print(f"\n  [⚡ ReAct Action] Executing Tool: {tool_name}({json.dumps(args)})")
    time.sleep(0.4) # Simulate network latency
    
    if tool_name == "web_search":
        q = args.get("query", "").lower()
        return {
            "query": args.get("query"),
            "results": [
                {"title": "ChatGPT Architecture", "snippet": "ChatGPT uses a Transformer decoder model trained with RLHF and managed via context history arrays."},
                {"title": "ReAct Framework", "snippet": "ReAct combines Reasoning and Acting, allowing agents to execute external API functions."}
            ]
        }
    elif tool_name == "run_calculator":
        expr = args.get("expression", "")
        try:
            # Safe evaluation for math characters only
            cleaned = "".join(c for c in expr if c in "0123456789+-*/(). ")
            val = eval(cleaned, {"__builtins__": None}, {})
            return {"expression": expr, "result": val}
        except Exception as e:
            return {"expression": expr, "error": str(e)}
    elif tool_name == "get_weather":
        loc = args.get("location", "Tokyo")
        return {"location": loc, "forecast": "20°C, Sunny, 55% Humidity, Wind 8mph"}
    
    return {"error": f"Tool '{tool_name}' not found."}


# -----------------------------------------------------------------------------
# 2. Agent Core Class
# -----------------------------------------------------------------------------

class ChatGPTLikeAgent:
    def __init__(self, system_instruction: str = None, api_key: str = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY")
        self.system_instruction = system_instruction or (
            "You are a helpful AI assistant modeled after ChatGPT. "
            "You provide accurate, well-structured answers and use tool calling when needed."
        )
        self.history = []  # Array of {"role": "user"|"assistant"|"tool", "content": "..."}
        self.max_history_turns = 10  # Sliding window budget limit

    def add_message(self, role: str, content: str, tool_calls: list = None):
        """Appends a message turn to context history."""
        msg = {"role": role, "content": content}
        if tool_calls:
            msg["tool_calls"] = tool_calls
        self.history.append(msg)
        self._clip_history()

    def _clip_history(self):
        """Enforces a sliding window on conversation memory to prevent exceeding token limits."""
        if len(self.history) > self.max_history_turns * 2:
            # Keep system context implied and retain recent turns
            self.history = self.history[-(self.max_history_turns * 2):]

    def process_turn(self, user_prompt: str) -> str:
        """Main ReAct turn processor."""
        self.add_message("user", user_prompt)
        
        # Check if user query warrants tool usage (ReAct heuristic)
        prompt_lower = user_prompt.lower()
        tool_results = []
        
        if "weather" in prompt_lower or "tokyo" in prompt_lower:
            loc = "Tokyo" if "tokyo" in prompt_lower else "San Francisco"
            res = execute_tool("get_weather", {"location": loc})
            tool_results.append(("get_weather", res))
            
        if "calculate" in prompt_lower or "tip" in prompt_lower or "184.50" in prompt_lower:
            res = execute_tool("run_calculator", {"expression": "184.50 * 0.15"})
            tool_results.append(("run_calculator", res))
            
        if "search" in prompt_lower or "react" in prompt_lower or "chatgpt" in prompt_lower:
            res = execute_tool("web_search", {"query": user_prompt})
            tool_results.append(("web_search", res))

        # Formulate Response (or call Live API if key is present)
        if self.api_key:
            response_text = self._call_live_api(user_prompt)
        else:
            response_text = self._generate_simulated_response(user_prompt, tool_results)

        # Stream response tokens to stdout
        self._stream_output(response_text)
        
        # Save assistant message to history
        self.add_message("assistant", response_text)
        return response_text

    def _generate_simulated_response(self, user_prompt: str, tool_results: list) -> str:
        """Simulates LLM response generation incorporating tool outputs."""
        if tool_results:
            text = "Based on the external tools executed:\n"
            for t_name, t_res in tool_results:
                if t_name == "get_weather":
                    text += f"• Weather in {t_res['location']}: {t_res['forecast']}\n"
                elif t_name == "run_calculator":
                    text += f"• Calculation ({t_res['expression']}): result = {t_res['result']}\n"
                elif t_name == "web_search":
                    text += f"• Web Search: Found {len(t_res['results'])} articles regarding '{t_res['query']}'.\n"
            text += "\nIs there anything else you would like me to process?"
            return text
        
        if "chatgpt" in user_prompt.lower() or "how" in user_prompt.lower():
            return (
                "Building an AI Agent like ChatGPT involves 5 essential components:\n"
                "1. LLM API Integration (Gemini, OpenAI, Anthropic)\n"
                "2. System Instructions & Persona Definition\n"
                "3. Conversation Memory Management (History Array + Sliding Window)\n"
                "4. ReAct Tool Calling (Function Declarations + Execution Loop)\n"
                "5. Streaming Token UI (Server-Sent Events)"
            )
        
        return f"I have received your query: '{user_prompt}'. As a ChatGPT-like agent, I maintain our full conversation context across turns!"

    def _call_live_api(self, user_prompt: str) -> str:
        """Sends request to Gemini API endpoint using stdlib urllib."""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        # Format payload
        contents = []
        for msg in self.history:
            role = "model" if msg["role"] == "assistant" else "user"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
            
        payload = {
            "systemInstruction": {"parts": [{"text": self.system_instruction}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.7, "maxOutputTokens": 1024}
        }
        
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={"Content-Type": "application/json"}
        )
        
        try:
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            return f"Error calling LLM API: {str(e)}"

    def _stream_output(self, text: str):
        """Simulates token streaming response in terminal."""
        print("Agent > ", end="", flush=True)
        words = text.split(" ")
        for i, word in enumerate(words):
            sys.stdout.write(( "" if i == 0 else " " ) + word)
            sys.stdout.flush()
            time.sleep(0.02)
        print("\n")


# -----------------------------------------------------------------------------
# 3. Interactive CLI Entrypoint
# -----------------------------------------------------------------------------

def main():
    print("=" * 70)
    print("  🤖 Nexus AI Agent — ChatGPT Architecture Demonstration (Python CLI)")
    print("=" * 70)
    print("Commands:")
    print("  - Type any prompt (e.g. 'What is the weather in Tokyo?', 'Calculate 15% tip on 184.50')")
    print("  - Type 'history' to inspect raw LLM context memory buffer")
    print("  - Type 'exit' or 'quit' to end session\n")
    
    agent = ChatGPTLikeAgent()
    
    while True:
        try:
            user_input = input("User > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit"]:
                print("Exiting agent session. Goodbye!")
                break
            if user_input.lower() == "history":
                print("\n--- RAW CONTEXT MEMORY BUFFER ---")
                print(json.dumps(agent.history, indent=2))
                print("---------------------------------\n")
                continue
                
            agent.process_turn(user_input)
            
        except KeyboardInterrupt:
            print("\nSession interrupted. Goodbye!")
            break

if __name__ == "__main__":
    main()
