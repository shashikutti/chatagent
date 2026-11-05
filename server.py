#!/usr/bin/env python3
"""
Lightweight HTTP Server for Nexus AI Agent Web Studio
"""
import http.server
import socketserver
import os
import sys

PORT = 3000

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and caching headers for dev server
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

def main():
    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    
    handler = CustomHTTPRequestHandler
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"🚀 Nexus Agent Studio Web Server running at http://localhost:{PORT}")
        print(f"Press Ctrl+C to stop server.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopping web server.")

if __name__ == "__main__":
    main()
