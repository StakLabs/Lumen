# Lumen 7 Axiom

## Browser Intelligence Setup Guide

Lumen 7 Axiom turns Lumen from an AI that can answer questions into an AI that can interact with the web.

Axiom works together with **Lumen Browser Intelligence**, a local Node.js server that controls a visible Chromium browser using Playwright.

This guide explains how to set up Lumen Browser Intelligence on:

- Windows
- macOS
- ChromeOS

---

# What You Need

Before starting, you need:

- Visual Studio Code
- Node.js
- An internet connection
- Lumen with Lumen 7 Axiom
- A computer that can run Chromium

## Windows

You need:

- Windows 10 or Windows 11
- Visual Studio Code
- Node.js

## macOS

You need:

- macOS
- Visual Studio Code
- Node.js

## ChromeOS

You need:

- A Chromebook that supports Linux
- Linux development environment enabled
- Visual Studio Code
- Node.js

---

# 1. Install Visual Studio Code

Download and install Visual Studio Code.

Open Visual Studio Code after installing it.

Create a new folder for Lumen Browser Intelligence.

For example:

```text
LumenBrowser
```

Open this folder in Visual Studio Code.

---

# 2. Install Node.js

Install the latest Node.js LTS release.

After installing Node.js, restart Visual Studio Code.

Open the VS Code terminal:

```text
Terminal → New Terminal
```

Check that Node.js is installed:

```bash
node --version
```

Then check npm:

```bash
npm --version
```

You should see a version number for both commands.

---

# Windows: Node.js Troubleshooting

If Windows cannot find Node.js, restart Visual Studio Code first.

You can also check the standard Node.js installation:

```powershell
& "C:\Program Files\nodejs\node.exe" --version
```

If PowerShell blocks npm or npx, use:

```powershell
npm.cmd --version
```

and:

```powershell
npx.cmd --version
```

---

# 3. Create the Project

Inside the `LumenBrowser` folder, open the VS Code terminal.

Run:

```bash
npm init -y
```

Then install the required packages:

```bash
npm install express cors playwright
```

Install Chromium:

```bash
npx playwright install chromium
```

## Windows PowerShell

If PowerShell blocks `npm` or `npx`, use:

```powershell
npm.cmd install express cors playwright
```

Then:

```powershell
npx.cmd playwright install chromium
```

---

# 4. Create index.js

Inside your `LumenBrowser` folder, create a file called:

```text
index.js
```

Paste your current Lumen Browser Intelligence `index.js` into this file.

The server should:

- Start an Express server on port `3000`
- Launch a visible Chromium browser
- Receive browser actions from Lumen 7 Axiom
- Navigate websites
- Click elements
- Type text
- Press keyboard keys
- Scroll through pages
- Extract information
- Display the Lumen Browser Intelligence overlay
- Return JSON responses

---

# 5. Start Lumen Browser Intelligence

Open the VS Code terminal in the `LumenBrowser` folder.

Run:

```bash
node index.js
```

You should see:

```text
Lumen Browser Intelligence listening on http://localhost:3000
Browser started.
Waiting for Axiom instructions...
```

A Chromium window should open automatically.

**Keep this terminal running while using Axiom.**

---

# 6. Check the Browser Intelligence Server

Open a browser and visit:

```text
http://localhost:3000/status
```

You should see something similar to:

```json
{
    "running": true,
    "browser": true,
    "page": true,
    "busy": false
}
```

This means Browser Intelligence is running correctly.

---

# 7. Test Browser Intelligence

Before using Axiom, you can manually test the browser.

## Windows

Open PowerShell and run:

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:3000/action" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"action":"navigate","url":"https://search.brave.com"}'
```

The Chromium window should navigate to:

```text
https://search.brave.com
```

## macOS / ChromeOS

Run:

```bash
curl -X POST http://localhost:3000/action \
    -H "Content-Type: application/json" \
    -d '{"action":"navigate","url":"https://search.brave.com"}'
```

---

# 8. Use Lumen 7 Axiom

Once Browser Intelligence is running:

1. Open Lumen.
2. Select **Lumen 7 Axiom**.
3. Enter a task.
4. Axiom generates browser actions.
5. Browser Intelligence receives the actions.
6. Playwright performs the actions.
7. Chromium visibly performs the task.
8. The Lumen Browser Intelligence overlay shows what is happening.

For example:

```text
Find the cheapest flight from Canberra to Melbourne.
```

Axiom can turn that goal into browser actions such as:

```json
{
    "actions": [
        {
            "action": "navigate",
            "url": "https://search.brave.com"
        },
        {
            "action": "type",
            "text": "Canberra to Melbourne flights"
        },
        {
            "action": "press",
            "key": "Enter"
        },
        {
            "action": "wait",
            "duration": 3000
        }
    ]
}
```

---

# How Axiom Works

Lumen 7 Axiom has two major parts.

## Lumen 7 Axiom

Axiom is the AI reasoning layer.

It decides:

- What the user wants
- What action should happen
- What website to visit
- What information to look for
- What should happen next

## Lumen Browser Intelligence

Browser Intelligence is the execution layer.

It controls the actual browser using Playwright.

```text
User
   ↓
Lumen 7 Axiom
   ↓
Browser Action
   ↓
Lumen Browser Intelligence
   ↓
Playwright
   ↓
Chromium
   ↓
Website
```

---

# Supported Actions

Browser Intelligence currently supports:

## Navigate

```json
{
    "action": "navigate",
    "url": "https://example.com"
}
```

## Click

```json
{
    "action": "click",
    "target": "Google"
}
```

## Type

```json
{
    "action": "type",
    "text": "Hello world"
}
```

## Press

```json
{
    "action": "press",
    "key": "Enter"
}
```

## Scroll

```json
{
    "action": "scroll",
    "target": "Flight prices"
}
```

## Wait

```json
{
    "action": "wait",
    "duration": 3000
}
```

## Extract

```json
{
    "action": "extract",
    "target": "Flight price",
    "title": "Cheapest flight"
}
```

## Display

```json
{
    "action": "display",
    "title": "Result",
    "text": "The cheapest flight is $120."
}
```

---

# Important URL Rule

Axiom must send plain URLs.

Correct:

```json
{
    "action": "navigate",
    "url": "https://search.brave.com"
}
```

Incorrect:

```json
{
    "action": "navigate",
    "url": "[https://search.brave.com](https://search.brave.com)"
}
```

Do not use Markdown links inside JSON URLs.

---

# Project Structure

Your project should look approximately like this:

```text
LumenBrowser/
│
├── index.js
├── package.json
├── package-lock.json
└── node_modules/
```

---

# Troubleshooting

## `node` is not recognized

Restart Visual Studio Code after installing Node.js.

On Windows, try:

```powershell
& "C:\Program Files\nodejs\node.exe" --version
```

---

## `npm.ps1 cannot be loaded`

Use:

```powershell
npm.cmd
```

For example:

```powershell
npm.cmd install express cors playwright
```

---

## `npx.ps1 cannot be loaded`

Use:

```powershell
npx.cmd playwright install chromium
```

---

## Chromium does not open

Run:

```bash
npx playwright install chromium
```

Then restart:

```bash
node index.js
```

---

## Port 3000 is already in use

Another program is using port 3000.

On Windows:

```powershell
netstat -ano | findstr :3000
```

Close the existing Browser Intelligence process and restart the server.

---

## `Expected an actions array`

The current `/task` endpoint expects:

```json
{
    "actions": [
        {
            "action": "navigate",
            "url": "https://search.brave.com"
        }
    ]
}
```

It does **not** expect:

```json
{
    "action": {
        "action": "navigate",
        "url": "https://search.brave.com"
    }
}
```

Make sure your Lumen frontend and `index.js` use the same API format.

---

## Axiom returns a Markdown URL

If Axiom returns:

```text
[https://search.brave.com](https://search.brave.com)
```

instead of:

```text
https://search.brave.com
```

the Axiom prompt needs to explicitly tell it to return plain URLs.

---

# Windows Speech

The supplied speech implementation uses:

```text
PowerShell
SAPI.SpVoice
```

This means spoken Browser Intelligence messages currently work with the supplied implementation on Windows.

The browser automation itself is handled by:

```text
Node.js
Express
Playwright
Chromium
```

---

# macOS Speech

The supplied speech implementation uses Windows PowerShell and SAPI, so that specific implementation does not work on macOS.

The browser automation can still use:

```text
Node.js
Express
Playwright
Chromium
```

A macOS-compatible speech implementation would need to replace the Windows `speak()` function.

---

# ChromeOS Speech

The supplied speech implementation is also Windows-specific.

ChromeOS/Linux users can run the browser automation through the Linux environment, but the speech implementation needs to be replaced with a Linux/ChromeOS-compatible solution if spoken output is required.

---

# Security

Lumen Browser Intelligence runs locally on:

```text
http://localhost:3000
```

Do not expose the Browser Intelligence server directly to the public internet.

Browser Intelligence can control the browser and interact with websites using the browser's available access.

Only run tasks that you understand and trust.

---

# Stopping Browser Intelligence

To stop Browser Intelligence, go to the VS Code terminal where it is running and press:

```text
Ctrl + C
```

The server will stop and the browser will close.

---

# Lumen 7 Axiom

Lumen started as an AI that could answer questions.

Axiom takes the next step.

It can reason about a goal, control a browser, interact with websites and work toward completing the task.

```text
Understand.
Decide.
Act.
```

## Lumen 7 Axiom

**From answering questions to getting things done.**
