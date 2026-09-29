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

The server code:
```javascript
const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");
const { execFile } = require("child_process");

const app = express();
const PORT = 3000;

app.use(cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json({
    limit: "2mb"
}));

let browser = null;
let context = null;
let page = null;
let busy = false;

function speak(text) {
    return new Promise((resolve) => {
        if (!text) {
            resolve();
            return;
        }

        execFile(
            "powershell.exe",
            [
                "-NoProfile",
                "-Command",
                "$voice = New-Object -ComObject SAPI.SpVoice; $voice.Rate = 0; $voice.Volume = 100; $voice.Speak($env:LUMEN_SPEECH)"
            ],
            {
                windowsHide: true,
                env: {
                    ...process.env,
                    LUMEN_SPEECH: text
                }
            },
            () => {
                resolve();
            }
        );
    });
}

async function startBrowser() {
    if (browser && context && page) {
        try {
            if (!page.isClosed()) {
                return;
            }
        } catch {
        }
    }

    if (browser) {
        try {
            await browser.close();
        } catch {
        }
    }

    browser = await chromium.launch({
        headless: false
    });

    context = await browser.newContext();

    page = await context.newPage();

    page.on("popup", popup => {
        page = popup;
    });

    page.on("close", () => {
        if (page && page.isClosed()) {
            page = null;
        }
    });

    console.log("Browser started.");
}

async function ensurePage() {
    if (!browser || !context || !page) {
        await startBrowser();
        return;
    }

    try {
        if (page.isClosed()) {
            page = null;
            await startBrowser();
        }
    } catch {
        page = null;
        await startBrowser();
    }
}

async function updateLumenPanel(status, details) {
    try {
        await ensurePage();

        if (!page || page.isClosed()) {
            return;
        }

        const safeStatus = String(status || "");

        const safeDetails = String(details || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        await page.evaluate(({ status, details }) => {
            if (!document.body) {
                return;
            }

            let panel =
                document.getElementById(
                    "lumen-browser-panel"
                );

            if (!panel) {
                panel =
                    document.createElement("div");

                panel.id =
                    "lumen-browser-panel";

                Object.assign(
                    panel.style,
                    {
                        position: "fixed",
                        top: "20px",
                        right: "20px",
                        width: "360px",
                        padding: "20px",
                        background: "rgba(15, 15, 18, 0.96)",
                        color: "white",
                        borderRadius: "18px",
                        fontFamily: "Arial, sans-serif",
                        zIndex: "2147483647",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        backdropFilter: "blur(12px)"
                    }
                );

                document.body.appendChild(
                    panel
                );
            }

            panel.innerHTML = `
                <div style="font-size:12px;opacity:.55;margin-bottom:6px;">
                    LUMEN BROWSER INTELLIGENCE
                </div>

                <div style="font-size:20px;font-weight:600;margin-bottom:12px;">
                    ${status}
                </div>

                <div style="font-size:14px;line-height:1.6;opacity:.8;">
                    ${details}
                </div>
            `;
        }, {
            status: safeStatus,
            details: safeDetails
        });
    } catch {
    }
}

async function highlightElement(locator, label) {
    try {
        await ensurePage();

        if (!locator) {
            return false;
        }

        if (!(await locator.count())) {
            return false;
        }

        const element =
            locator.first();

        await element.scrollIntoViewIfNeeded();

        await element.evaluate(
            (element, label) => {
                if (
                    !element ||
                    !element.isConnected
                ) {
                    return;
                }

                element.dataset.lumenHighlighted =
                    "true";

                element.dataset.lumenPreviousOutline =
                    element.style.outline;

                element.dataset.lumenPreviousOutlineOffset =
                    element.style.outlineOffset;

                element.dataset.lumenPreviousTransition =
                    element.style.transition;

                element.dataset.lumenPreviousBoxShadow =
                    element.style.boxShadow;

                element.style.transition =
                    "outline 0.2s ease, box-shadow 0.2s ease";

                element.style.outline =
                    "3px solid #ffffff";

                element.style.outlineOffset =
                    "4px";

                element.style.boxShadow =
                    "0 0 0 6px rgba(255,255,255,0.15)";

                let indicator =
                    document.getElementById(
                        "lumen-action-indicator"
                    );

                if (!indicator) {
                    indicator =
                        document.createElement(
                            "div"
                        );

                    indicator.id =
                        "lumen-action-indicator";

                    Object.assign(
                        indicator.style,
                        {
                            position: "fixed",
                            zIndex: "2147483646",
                            padding: "7px 11px",
                            background: "rgba(15,15,18,0.95)",
                            color: "white",
                            borderRadius: "8px",
                            fontFamily: "Arial, sans-serif",
                            fontSize: "12px",
                            fontWeight: "600",
                            pointerEvents: "none",
                            boxShadow: "0 5px 20px rgba(0,0,0,0.3)",
                            border: "1px solid rgba(255,255,255,0.15)"
                        }
                    );

                    document.body.appendChild(
                        indicator
                    );
                }

                const rect =
                    element.getBoundingClientRect();

                indicator.textContent =
                    `Lumen: ${label}`;

                indicator.style.left =
                    `${Math.max(10, rect.left)}px`;

                indicator.style.top =
                    `${Math.max(10, rect.top - 38)}px`;

                indicator.style.display =
                    "block";
            },
            label
        );

        return true;
    } catch {
        return false;
    }
}

async function clearHighlight() {
    try {
        if (!page || page.isClosed()) {
            return;
        }

        await page.evaluate(() => {
            const highlighted =
                document.querySelectorAll(
                    '[data-lumen-highlighted="true"]'
                );

            highlighted.forEach(
                element => {
                    element.style.outline =
                        element.dataset.lumenPreviousOutline ||
                        "";

                    element.style.outlineOffset =
                        element.dataset.lumenPreviousOutlineOffset ||
                        "";

                    element.style.transition =
                        element.dataset.lumenPreviousTransition ||
                        "";

                    element.style.boxShadow =
                        element.dataset.lumenPreviousBoxShadow ||
                        "";

                    delete element.dataset.lumenHighlighted;
                    delete element.dataset.lumenPreviousOutline;
                    delete element.dataset.lumenPreviousOutlineOffset;
                    delete element.dataset.lumenPreviousTransition;
                    delete element.dataset.lumenPreviousBoxShadow;
                }
            );

            const indicator =
                document.getElementById(
                    "lumen-action-indicator"
                );

            if (indicator) {
                indicator.remove();
            }
        });
    } catch {
    }
}

function escapeRegExp(value) {
    return String(value).replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}

async function findElement(target) {
    await ensurePage();

    const regex =
        new RegExp(
            escapeRegExp(target),
            "i"
        );

    const strategies = [
        page.getByRole(
            "button",
            {
                name: regex
            }
        ),

        page.getByRole(
            "link",
            {
                name: regex
            }
        ),

        page.getByRole(
            "textbox",
            {
                name: regex
            }
        ),

        page.getByRole(
            "combobox",
            {
                name: regex
            }
        ),

        page.getByPlaceholder(
            regex
        ),

        page.getByLabel(
            regex
        ),

        page.getByText(
            regex,
            {
                exact: false
            }
        ),

        page.locator(
            `[aria-label*="${String(target).replace(/"/g, '\\"')}" i]`
        ),

        page.locator(
            `[title*="${String(target).replace(/"/g, '\\"')}" i]`
        )
    ];

    for (const locator of strategies) {
        try {
            const count =
                await locator.count();

            if (count > 0) {
                for (
                    let i = 0;
                    i < Math.min(count, 5);
                    i++
                ) {
                    const candidate =
                        locator.nth(i);

                    if (
                        await candidate
                            .isVisible()
                            .catch(() => false)
                    ) {
                        return candidate;
                    }
                }

                return locator.first();
            }
        } catch {
        }
    }

    return null;
}

async function findSearchBox() {
    await ensurePage();

    const strategies = [
        page.getByRole(
            "textbox",
            {
                name: /search/i
            }
        ),

        page.getByPlaceholder(
            /search|ask anything|search the web/i
        ),

        page.locator(
            "#searchbox"
        ),

        page.locator(
            'textarea[name="q"]'
        ),

        page.locator(
            'input[name="q"]'
        ),

        page.locator(
            'input[type="search"]'
        ),

        page.locator(
            "textarea"
        )
    ];

    for (const locator of strategies) {
        try {
            const count =
                await locator.count();

            if (count > 0) {
                for (
                    let i = 0;
                    i < Math.min(count, 5);
                    i++
                ) {
                    const candidate =
                        locator.nth(i);

                    if (
                        await candidate
                            .isVisible()
                            .catch(() => false)
                    ) {
                        return candidate;
                    }
                }

                return locator.first();
            }
        } catch {
        }
    }

    return null;
}

async function performNavigate(action) {
    if (!action.url) {
        throw new Error(
            "No URL supplied."
        );
    }

    let url;

    try {
        url =
            new URL(
                action.url
            ).toString();
    } catch {
        throw new Error(
            `Invalid URL: ${action.url}`
        );
    }

    await ensurePage();

    await updateLumenPanel(
        "Navigating",
        `Opening ${url}`
    );

    await page.goto(
        url,
        {
            waitUntil: "domcontentloaded",
            timeout: 30000
        }
    );

    await page.waitForTimeout(
        1500
    );

    return {
        url: page.url()
    };
}

async function performClick(action) {
    if (!action.target) {
        throw new Error(
            "No click target supplied."
        );
    }

    await ensurePage();

    const element =
        await findElement(
            action.target
        );

    if (!element) {
        throw new Error(
            `Could not find "${action.target}".`
        );
    }

    await updateLumenPanel(
        "Interacting",
        `Finding and clicking "${action.target}".`
    );

    await highlightElement(
        element,
        `Clicking ${action.target}`
    );

    await page.waitForTimeout(
        700
    );

    const oldPage =
        page;

    const popupPromise =
        oldPage
            .waitForEvent(
                "popup",
                {
                    timeout: 3000
                }
            )
            .catch(() => null);

    await element.click({
        timeout: 15000
    });

    const popup =
        await popupPromise;

    if (popup) {
        page = popup;

        await page
            .waitForLoadState(
                "domcontentloaded",
                {
                    timeout: 15000
                }
            )
            .catch(() => {});
    }

    await page.waitForTimeout(
        1500
    );

    await clearHighlight();

    return {
        target: action.target,
        url: page.url()
    };
}

async function performType(action) {
    if (action.text === undefined || action.text === null) {
        throw new Error("No text supplied.");
    }

    await ensurePage();

    let element = null;

    // First try finding an actual editable text box for the requested target
    if (action.target) {
        const regex = new RegExp(escapeRegExp(action.target), "i");
        const inputStrategies = [
            page.getByRole("textbox", { name: regex }),
            page.getByRole("combobox", { name: regex }),
            page.getByPlaceholder(regex),
            page.getByLabel(regex)
        ];

        for (const locator of inputStrategies) {
            try {
                if ((await locator.count()) > 0 && (await locator.first().isVisible())) {
                    element = locator.first();
                    break;
                }
            } catch {}
        }
    }

    // Fall back to general search box finder if target wasn't an input
    if (!element) {
        element = await findSearchBox();
    }

    if (element) {
        await updateLumenPanel("Typing", "Entering information into the page.");
        await highlightElement(element, "Typing");
        await page.waitForTimeout(500);

        // Click first if it's an element that needs focus before fill
        await element.click().catch(() => {});
        await element.fill(String(action.text));

        await clearHighlight();
    } else {
        await updateLumenPanel("Typing", "Typing into active page.");
        await page.keyboard.type(String(action.text));
    }

    return { text: String(action.text) };
}

async function performPress(action) {
    if (!action.key) {
        throw new Error(
            "No key supplied."
        );
    }

    await ensurePage();

    await updateLumenPanel(
        "Keyboard action",
        `Pressing ${action.key}.`
    );

    await page.keyboard.press(
        action.key
    );

    await page.waitForTimeout(
        1000
    );

    return {
        key: action.key
    };
}

async function performScroll(action) {
    if (!action.target) {
        throw new Error(
            "No scroll target supplied."
        );
    }

    await ensurePage();

    const element =
        await findElement(
            action.target
        );

    if (!element) {
        throw new Error(
            `Could not find "${action.target}".`
        );
    }

    await updateLumenPanel(
        "Finding information",
        `Moving to "${action.target}".`
    );

    await highlightElement(
        element,
        `Finding ${action.target}`
    );

    await page.waitForTimeout(
        600
    );

    await element.scrollIntoViewIfNeeded();

    await page.waitForTimeout(
        1000
    );

    await clearHighlight();

    return {
        target: action.target
    };
}

async function performWait(action) {
    const duration =
        Math.max(
            0,
            Math.min(
                Number(action.duration) || 1000,
                60000
            )
        );

    await ensurePage();

    await page.waitForTimeout(
        duration
    );

    return {
        duration
    };
}

async function performAction(action) {
    if (
        !action ||
        typeof action !== "object"
    ) {
        throw new Error(
            "Invalid action."
        );
    }

    if (!action.action) {
        throw new Error(
            "Action is missing its action type."
        );
    }

    switch (action.action) {
        case "navigate":
            return await performNavigate(
                action
            );

        case "click":
            return await performClick(
                action
            );

        case "type":
            return await performType(
                action
            );

        case "press":
            return await performPress(
                action
            );

        case "scroll":
            return await performScroll(
                action
            );

        case "wait":
            return await performWait(
                action
            );

        default:
            throw new Error(
                `Unknown action "${action.action}".`
            );
    }
}

async function autoExtractFinalResult() {
    try {
        if (!page || page.isClosed()) return false;

        const extractedText = await page.evaluate(() => {
            const isVisible = (elem) => {
                if (!elem) return false;
                const style = window.getComputedStyle(elem);
                return style.display !== 'none' && 
                       style.visibility !== 'hidden' && 
                       style.opacity !== '0' && 
                       elem.offsetWidth > 0;
            };

            // Look for common currency symbols and numbers
            const priceRegex = /(?:AUD|USD|EUR|GBP|\$|£|€)\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})?/i;

            // Find elements containing prices that aren't massive page wrappers
            const candidates = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, li, strong'))
                .filter(el => {
                    return isVisible(el) && 
                           el.textContent.length < 200 && 
                           el.children.length <= 4 && 
                           priceRegex.test(el.textContent);
                });

            if (candidates.length > 0) {
                // Sort by position on page (travel sites usually put the cheapest/best at the top)
                const sortedCandidates = candidates.sort((a, b) => {
                    const rectA = a.getBoundingClientRect();
                    const rectB = b.getBoundingClientRect();
                    // Prioritize elements actually in the viewport
                    if (rectA.top >= 0 && rectB.top < 0) return -1;
                    return rectA.top - rectB.top;
                });

                let bestMatch = sortedCandidates[0];

                // Step up one parent level to capture surrounding context (like airline name)
                if (bestMatch.parentElement && bestMatch.parentElement.textContent.trim().length < 150) {
                    bestMatch = bestMatch.parentElement;
                }

                return bestMatch.textContent.trim().replace(/\s+/g, ' ');
            }

            // Fallback: If no price is found, grab the main heading
            const h1 = document.querySelector('h1');
            if (h1 && isVisible(h1)) {
                return h1.textContent.trim().replace(/\s+/g, ' ');
            }

            return null;
        });

        if (extractedText) {
            const cleanText = extractedText.length > 130 ? extractedText.substring(0, 130) + "..." : extractedText;
            await updateLumenPanel("Found Result", cleanText);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Auto-extraction failed:", error);
        return false;
    }
}

async function runTask(actions) {
    const results = [];
    let hasCustomResult = false;

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];

        if (!hasCustomResult) {
            await updateLumenPanel(
                "Working",
                `Step \({i + 1} of\){actions.length}`
            );
        }

        try {
            const result = await performAction(action);

            if (
                action.action === "extract" ||
                action.action === "display" ||
                action.action === "result"
            ) {
                hasCustomResult = true;
            }

            results.push({
                action: action.action,
                result,
                success: true
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.warn(
                `Action ${i + 1} could not be completed:`,
                message
            );

            results.push({
                action: action.action,
                success: false,
                error: message
            });

            if (!hasCustomResult) {
                await updateLumenPanel(
                    "Task complete",
                    "Lumen reached the relevant page."
                );
            }

            break;
        }
    }

    await clearHighlight();

    if (!hasCustomResult) {
        await updateLumenPanel(
            "Complete",
            "Lumen has finished the requested task."
        );
    }

    await speak("Done. I've finished that for you.");

    return results;
}
async function performExtract(action) {
    if (!action.target) {
        throw new Error("No extract target supplied.");
    }

    await ensurePage();

    const element = await findElement(action.target);

    if (!element) {
        throw new Error(`Could not find "${action.target}" to extract.`);
    }

    await highlightElement(element, `Extracting ${action.target}`);
    await page.waitForTimeout(500);

    const extractedText = (await element.innerText()).trim();
    const title = action.title || action.label || "Found Result";

    await updateLumenPanel(title, extractedText);
    await page.waitForTimeout(1000);
    await clearHighlight();

    return {
        title,
        text: extractedText
    };
}

async function performDisplay(action) {
    const title = action.title || action.label || "Result";
    const text = action.text || action.details || action.value || "";

    await ensurePage();

    await updateLumenPanel(title, text);
    await page.waitForTimeout(1000);

    return {
        title,
        text
    };
}

async function performAction(action) {
    if (!action || typeof action !== "object") {
        throw new Error("Invalid action.");
    }

    if (!action.action) {
        throw new Error("Action is missing its action type.");
    }

    switch (action.action) {
        case "navigate":
            return await performNavigate(action);

        case "click":
            return await performClick(action);

        case "type":
            return await performType(action);

        case "press":
            return await performPress(action);

        case "scroll":
            return await performScroll(action);

        case "wait":
            return await performWait(action);

        case "extract":
            return await performExtract(action);

        case "display":
        case "result":
            return await performDisplay(action);

        default:
            throw new Error(`Unknown action "${action.action}".`);
    }
}

app.get(
    "/status",
    (req, res) => {
        let browserOpen = false;
        let pageOpen = false;

        try {
            browserOpen =
                !!browser &&
                browser.isConnected();

            pageOpen =
                !!page &&
                !page.isClosed();
        } catch {
        }

        res.json({
            running: true,
            browser: browserOpen,
            page: pageOpen,
            busy
        });
    }
);

app.post(
    "/action",
    async (req, res) => {
        if (busy) {
            res.status(409).json({
                success: false,
                error:
                    "Lumen is already performing another action."
            });

            return;
        }

        busy = true;

        try {
            const action =
                req.body;

            console.log(
                "Received action:",
                JSON.stringify(action)
            );

            if (
                !action ||
                typeof action !== "object" ||
                !action.action
            ) {
                res.status(400).json({
                    success: false,
                    error:
                        "No valid action supplied."
                });

                return;
            }

            await ensurePage();

            const result =
                await performAction(
                    action
                );

            console.log(
                "Action completed:",
                action.action
            );

            res.status(200).json({
                success: true,
                action: action.action,
                result
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                "Browser action failed:",
                error
            );

            try {
                await clearHighlight();
            } catch {
            }

            try {
                await updateLumenPanel(
                    "Action failed",
                    message
                );
            } catch {
            }

            res.status(500).json({
                success: false,
                error: message
            });
        } finally {
            busy = false;
        }
    }
);

app.post(
    "/task",
    async (req, res) => {
        if (busy) {
            res.status(409).json({
                success: false,
                error:
                    "Lumen is already performing another task."
            });

            return;
        }

        busy = true;

        try {
            const actions =
                req.body?.actions;

            if (!Array.isArray(actions)) {
                res.status(400).json({
                    success: false,
                    error:
                        "Expected an actions array."
                });

                return;
            }

            if (actions.length === 0) {
                res.status(400).json({
                    success: false,
                    error:
                        "The actions array cannot be empty."
                });

                return;
            }

            if (actions.length > 50) {
                res.status(400).json({
                    success: false,
                    error:
                        "A task cannot contain more than 50 actions."
                });

                return;
            }

            for (const action of actions) {
                if (
                    !action ||
                    typeof action !== "object" ||
                    typeof action.action !== "string"
                ) {
                    res.status(400).json({
                        success: false,
                        error:
                            "One or more actions are invalid."
                    });

                    return;
                }
            }

            console.log(
                "Received task:",
                JSON.stringify(actions)
            );

            await ensurePage();

            await speak(
                "Alright, I'll take a look at that for you."
            );
            
    const results = await runTask(actions);

            await clearHighlight();
            
            // Attempt to find and display the final result autonomously
            const didExtract = await autoExtractFinalResult();

            // Fallback if nothing notable was found on the page
            if (!didExtract) {
                await updateLumenPanel(
                    "Complete",
                    "Lumen has finished the requested task."
                );
            }

            await speak("Done. I've finished that for you.");

res.status(200).json({
    success: true,
    results
});
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                "Browser task failed:",
                error
            );

            try {
                await clearHighlight();
            } catch {
            }

            try {
                await updateLumenPanel(
                    "Task Complete",
                    message
                );
            } catch {
            }

            res.status(500).json({
                success: false,
                error: message
            });
        } finally {
            busy = false;
        }
    }
);

app.use(
    (error, req, res, next) => {
        console.error(
            "Unhandled Express error:",
            error
        );

        if (res.headersSent) {
            return next(error);
        }

        res.status(500).json({
            success: false,
            error:
                error?.message ||
                "Internal Browser Intelligence error."
        });
    }
);

app.listen(
    PORT,
    async () => {
        console.log(
            `Lumen Browser Intelligence listening on http://localhost:${PORT}`
        );

        try {
            await startBrowser();

            console.log(
                "Waiting for Axiom instructions..."
            );
        } catch (error) {
            console.error(
                "Failed to start browser:",
                error
            );
        }
    }
);

process.on(
    "SIGINT",
    async () => {
        try {
            if (browser) {
                await browser.close();
            }
        } catch {
        }

        process.exit(0);
    }
);

process.on(
    "SIGTERM",
    async () => {
        try {
            if (browser) {
                await browser.close();
            }
        } catch {
        }

        process.exit(0);
    }
);
```

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

# 6. Use Lumen 7 Axiom

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
