Command

Command connects ChatGPT to your local VS Code workspace using the official Model Context Protocol (MCP).

It allows ChatGPT to safely:

List files

Read files

Create files and folders

Apply patches to code

Modify your project

All file operations happen locally on your machine.

Installation

Install globally using npm:

npm install -g command-connect


After installation, you can use the command CLI.

How To Use
1. Open Your Project

In your terminal:

cd your-project-folder

2. Start Command

Run:

command connect


You will see output like:

Session ID: ...
Connect ChatGPT to:
https://your-relay-url/mcp/<session-id>
Connected to relay.
Command MCP listening on http://localhost:8787


Leave this terminal running.

3. Connect In ChatGPT

Open ChatGPT.

Go to Settings → Connected Apps.

Click Add MCP Server.

Fill in:

Name

Command


Description

Connect ChatGPT to my local workspace


MCP Server URL
Paste the full URL printed in your terminal.

Authentication: None

Click Connect.

Important

Every time you run:

command connect


A new session ID is generated.

If you:

Close the terminal

Restart your machine

Stop the CLI

The connection ends.

You must run command connect again and update the MCP URL in ChatGPT.

Each session requires a new link.

Stopping Command

Press:

Ctrl + C


In the terminal running command connect.

Requirements

Node.js 18+

npm

ChatGPT with MCP support