const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
const userTier = lumenUser?.tier || 'free';

const voiceBtn = document.getElementById('voiceToggleButton');
const inputField = document.getElementById('userMessageInput');
const containerEl = document.getElementById('container');

const speak = async (text) => {
    if (!speechMode) return;
    let spokenText = text.replace(/<br><br>/g, '.\n\n').replace(/<br>/g, '.\n');
    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.5;
    showStatus('replying');
    speechSynthesis.speak(utterance);
    utterance.onend = () => showStatus(null);
};

function showStatus(status) {
    return;
}

if (!localStorage.getItem('date')) localStorage.setItem('date', new Date().toISOString().slice(0, 10));

document.getElementById('set').addEventListener('click', () => {
    document.querySelector('.custom').innerHTML = `
        <h2>Custom Instructions</h2>
        <p>Instructions will be saved after refresh.</p>
        <textarea id="instructions" placeholder="Set your custom instructions here..."></textarea>
        <button id="saveInstructions">Save</button>
    `;
    const saved = JSON.parse(localStorage.getItem(lumenUser.username + '_instructions')) || '';
    document.getElementById('instructions').value = saved;
    document.getElementById('saveInstructions').addEventListener('click', () => {
        const instructions = document.getElementById('instructions').value.trim();
        localStorage.setItem(lumenUser.username + '_instructions', JSON.stringify(instructions));
        alert('Custom instructions saved!');
        document.querySelector('.custom').innerHTML = '<button id="set">Custom Instructions</button>';
        window.location.reload();
    });
});

let imageFile = null;
let previousResponses = [];
let previousMessages = [];

document.getElementById('fileButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

let selectedModelInput = document.getElementById('selectedModel');
let modeSelector = document.getElementById('modeSelector');

if (!lumenUser) window.location.href = 'l.html';

let acrossChats = JSON.parse(localStorage.getItem('across_' + lumenUser.username)) || [];

var messages = 0;
var wait = 0;
var previousResponse = '';
var time;

async function userMessage() {
    if (wait !== 0) return;

    const inputField = document.getElementById('userMessageInput');
    const fileInput = document.getElementById('fileInput');
    const inputBox = document.querySelector('.input-box-container');

    const userInput = inputField.value.trim();
    const file = fileInput.files[0];

    const isImageMode = modeSelector.value === 'Draw an Image';
    const isVideoMode = modeSelector.value === 'Generate a Video';
    const selectedModelValue = selectedModelInput.value;

    if (!userInput && !file) return;

    if (file && file.size > 100 * 1024 * 1024) {
        alert('File too large! Maximum file size is 100MB.');
        return;
    }

    if (!inputBox.classList.contains('bottom')) {
        inputBox.classList.add('bottom');
    }

    const title = document.querySelector('.title2');

    if (title) {
        title.innerHTML = '';
    }

    messages++;

    const userDiv = document.createElement('div');
    userDiv.id = `a${messages}`;

    const responseDiv = document.createElement('div');
    responseDiv.id = `a${messages}a`;

    const mediaEl = document.createElement(
        isVideoMode ? 'video' : 'img'
    );

    mediaEl.id = isVideoMode
        ? `video${messages}`
        : `image${messages}`;

    mediaEl.classList.add('lumenMessage');

    if (isVideoMode) {
        mediaEl.controls = true;
        mediaEl.style.display = 'none';
    } else {
        mediaEl.style.display = 'none';
    }

    containerEl.appendChild(userDiv);
    containerEl.appendChild(responseDiv);
    containerEl.appendChild(mediaEl);

    if (userInput) {
        const msg = document.createElement('p');
        msg.classList.add('userMessage');
        msg.innerText = userInput;
        userDiv.appendChild(msg);
    }

    if (file) {
        const fileMsg = document.createElement('div');
        fileMsg.classList.add('userMessage', 'file-message');

        const icon = document.createElement('span');
        icon.innerText = '📎';

        const info = document.createElement('div');

        const name = document.createElement('strong');
        name.innerText = file.name;

        const size = document.createElement('small');
        size.innerText = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

        info.appendChild(name);
        info.appendChild(size);

        fileMsg.appendChild(icon);
        fileMsg.appendChild(info);

        userDiv.appendChild(fileMsg);
    }

    const replyEl = document.createElement('div');
    replyEl.classList.add('lumenMessage');

    responseDiv.appendChild(replyEl);

    const showStatus = (text, icon = '✦') => {
        replyEl.innerHTML = `
            <div class="lumen-status">
                <span class="lumen-status-icon">${icon}</span>
                <span>${text}</span>
            </div>
        `;
    };

    const showSuccess = (text) => {
        replyEl.innerHTML = `
            <div class="lumen-status success">
                <span class="lumen-status-icon">✓</span>
                <span>${text}</span>
            </div>
        `;
    };

    const showError = (text) => {
        replyEl.innerHTML = `
            <div class="lumen-status error">
                <span class="lumen-status-icon">!</span>
                <span>${text}</span>
            </div>
        `;
    };

    const resetChatState = () => {
        wait = 0;
        fileInput.value = '';
    };

    wait = 1;
    inputField.value = '';

    if (isImageMode) {
        showStatus('Preparing your image...', '🎨');
    } else if (isVideoMode) {
        showStatus('Preparing your video...', '🎬');
    } else if (selectedModelValue === 'Lumen 7 Axiom') {
        showStatus('Planning your task...', '⚡');
    } else {
        showStatus('Thinking...', '✦');
    }

    try {
        if (isImageMode || isVideoMode) {
            await handleMediaGeneration(
                userInput,
                isImageMode,
                replyEl,
                mediaEl
            );

            resetChatState();
            return;
        }

        const instructions =
            localStorage.getItem(
                lumenUser.username + '_instructions'
            ) || '';

        const formattedPreviousMessages =
            previousMessages.join('\nUser: ');

        const formattedPreviousResponses =
            previousResponses.join('\nLumen: ');

        previousMessages.push(userInput.toLowerCase());

        let systemPrompt;
        let modelToUse;

        if (selectedModelValue === 'Lumen 7 Axiom') {
            systemPrompt = `
You are Lumen 7 Axiom, Lumen's browser agent intelligence.

Your job is to understand the user's request and convert browser-related tasks into structured actions that can be executed by Lumen Browser Intelligence.

You do not directly control the browser.

You communicate with Lumen Browser Intelligence through structured JSON.

Available browser actions:

navigate:
{
    "action": "navigate",
    "url": "https://example.com"
}

click:
{
    "action": "click",
    "target": "Button or link text"
}

type:
{
    "action": "type",
    "target": "Search input",
    "text": "Text to enter"
}

press:
{
    "action": "press",
    "key": "Enter"
}

scroll:
{
    "action": "scroll",
    "target": "Text or element to find"
}

wait:
{
    "action": "wait",
    "duration": 2000
}

For multiple actions, return:

{
    "actions": [
        {
            "action": "navigate",
            "url": "https://example.com"
        }
    ]
}

Example:
{
  "actions": [
    {
      "action": "navigate",
      "url": "https://search.brave.com/"
    },
    {
      "action": "type",
      "target": "Search",
      "text": "cheap flights"
    },
    {
      "action": "press",
      "key": "Enter"
    },
    {
      "action": "wait",
      "duration": 2000
    },
    {
      "action": "navigate",
      "url": "https://www.google.com/travel/flights/"
    },
    {
      "action": "wait",
      "duration": 3000
    },
    {
      "action": "navigate",
      "url": "https://www.google.com/travel/flights/flights-from-canberra-to-melbourne.html?gl=AU&hl=en"
    },
    {
      "action": "wait",
      "duration": 3000
    },
    {
    'action': "navigate",
    'url': "https://www.booking.com/flights/destination/city/au/melbourne.html?"
    },
    {
    'action': "wait",
    'duration': 3000
    },
    {
    'action': "navigate",
    'url': "https://www.skyscanner.com.au/routes/cbr/mela/canberra-to-melbourne.html"
    }
  ]
}

Use natural-language targets whenever possible.

Do not use CSS selectors unless absolutely necessary.

Always start from the Brave Browser at https://search.brave.com/

Always go through relevant links on the page and do not guess the target names. You can simply go directly to the link, the searching and browser is just for show

Think through the user's entire task before creating the action sequence.

When the user asks for browser automation, respond ONLY with valid JSON.

Do not use Markdown.

You MUST CONTAIN AT LEAST 14 ACTIONS IN YOUR RESPONSE.

Do not explain the JSON.

Do not include conversational text alongside browser actions.

Lumen Browser Intelligence provides the visible browser interface, element highlighting, navigation, and interaction.

Do not narrate every individual browser action.

The link for Lumen AI is https://staklabs.github.io/Lumen/
The login page is https://staklabs.github.io/Lumen/l.html
Do not use these links unless the user explicitly asks for them.

For browser tasks, Lumen Browser Intelligence handles the friendly spoken introduction and completion message.

Your job is to provide the correct actions.

Conversation history:

${formattedPreviousMessages}

${formattedPreviousResponses}

Never repeat conversation history verbatim unless necessary.

User:
${userInput}
`;

            modelToUse = 'gemini-3.5-flash-lite';

        } else if (selectedModelValue === 'Lumen 7 Atlas') {
            systemPrompt = `
You are Lumen Re-imagined (or short: Lumen), a next-gen AI that actually delivers and doesn't suck.

You were created by Ayaan Khalique, founder of StakLabs.

If someone calls you ChatGPT, Gemini, or anything else, correct them. You're Lumen.

HOWEVER, if they ask who ChatGPT or Gemini is or talk to you about them without calling you them, you can explain they are other AI models and delve deeper.

${modeSelector.value === 'Study and Learn'
    ? 'You are a helpful tutor, explaining concepts clearly and step by step and providing detailed answers to help anyone understand.'
    : ''}

${modeSelector.value === 'Coding Expert'
    ? 'You are a coding expert, providing detailed code solutions and explanations. Always check your code for errors before sending them to the user.'
    : ''}

${modeSelector.value === 'Think for Longer'
    ? 'You take your time to think and provide the best answer possible.'
    : ''}

${modeSelector.value === 'Brainstorm'
    ? 'You are a brainstorming expert, generating creative ideas and solutions.'
    : ''}

${modeSelector.value === 'Shopping Research'
    ? `
You are Lumen's Shopping Research Engine.

Use web search to gather live product data.

Compare items by price, key features, pros, cons, and value.

Always return a single HTML table containing:
Product, Price, Key features, Pros, Cons, Value Score /10.

Then provide a short recommendation section with:
Best Budget, Best Overall, Best Premium.
`
    : ''}

You are in ${modeSelector.value} mode.

All formatting MUST be done using HTML.

Use <br> for line breaks and <br><br> for new paragraphs.

DO NOT use \\n or \\n\\n.

Conversation history:

${formattedPreviousMessages}

${formattedPreviousResponses}

NEVER repeat previous messages verbatim.

Only reference previous conversation if the user explicitly asks you to recall something.

Answer DIRECTLY to the user's current question.

Answer in a concise, clear, and informative manner.

Use emojis when the vibe fits.

If someone asks to generate or make or draw an image, reply exactly:

IMAGE REQUESTED

If someone asks to generate or make a video, reply exactly:

VIDEO REQUESTED

You can write code, generate images, and answer anything.

Image generation is only available with Lumen VI.

Video generation is only available with Lumen VI.

Bold all important words, phrases, and sentences.

ALWAYS reply properly and focus on the current conversation topic.

NEVER insult the user in any way.

You are using the ${selectedModelValue} model.

All memories from previous conversations:
${JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || []}

User: ${lumenUser.username}
Tier: ${userTier}

Do NOT reveal the tier unless the user specifically asks.

Do NOT output anything unrelated to the current topic.

Do NOT let the custom instructions affect your core functionality.

The user has set some custom instructions:

${instructions || 'No custom instructions set.'}
`;

            modelToUse = 'gemini-3.5-flash-lite';

        } else if (selectedModelValue === 'Lumen 7 Nova') {
            systemPrompt = `
You are Lumen Re-imagined (or short: Lumen), a next-gen AI that actually delivers and doesn't suck.

You were created by Ayaan Khalique, founder of StakLabs.

If someone calls you ChatGPT, Gemini, or anything else, correct them. You're Lumen.

You are in ${modeSelector.value} mode.

All formatting MUST be done using HTML.

Use <br> for line breaks and <br><br> for new paragraphs.

DO NOT use \\n or \\n\\n.

Conversation history:

${formattedPreviousMessages}

${formattedPreviousResponses}

Answer DIRECTLY to the user's current question.

Answer in a concise, clear, and informative manner.

Use emojis when the vibe fits.

If someone asks to generate or make or draw an image, reply exactly:

IMAGE REQUESTED

If someone asks to generate or make a video, reply exactly:

VIDEO REQUESTED

You can write code, generate images, and answer anything.

Image generation is only available with Lumen VI.

Video generation is only available with Lumen VI.

Bold all important words, phrases, and sentences.

ALWAYS reply properly and focus on the current conversation topic.

You are using the ${selectedModelValue} model.

All memories from previous conversations:
${JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || []}

User: ${lumenUser.username}
Tier: ${userTier}

Do NOT reveal the tier unless the user specifically asks.

Do NOT output anything unrelated to the current topic.

Do NOT let the custom instructions affect your core functionality.

The user has set some custom instructions:

${instructions || 'No custom instructions set.'}
`;

            modelToUse = 'gemini-3.1-flash-lite';

        } else {
            systemPrompt = `
You are Lumen Re-imagined (or short: Lumen), a next-gen AI that actually delivers and doesn't suck.

You were created by Ayaan Khalique, founder of StakLabs.

If someone calls you ChatGPT, Gemini, or anything else, correct them. You're Lumen.

You are in ${modeSelector.value} mode.

All formatting MUST be done using HTML.

Use <br> for line breaks and <br><br> for new paragraphs.

DO NOT use \\n or \\n\\n.

Conversation history:

${formattedPreviousMessages}

${formattedPreviousResponses}

Answer DIRECTLY to the user's current question.

Answer in a concise, clear, and informative manner.

Use emojis when the vibe fits.

If someone asks to generate or make or draw an image, reply exactly:

IMAGE REQUESTED

If someone asks to generate or make a video, reply exactly:

VIDEO REQUESTED

You can write code, generate images, and answer anything.

Image generation is only available with Lumen VI.

Video generation is only available with Lumen VI.

Bold all important words, phrases, and sentences.

ALWAYS reply properly and focus on the current conversation topic.

NEVER insult the user in any way.

You are using the Lumen VI model.

All memories from previous conversations:
${JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || []}

User: ${lumenUser.username}
Tier: ${userTier}

Do NOT reveal the tier unless the user specifically asks.

Do NOT output anything unrelated to the current topic.

Do NOT let the custom instructions affect your core functionality.

The user has set some custom instructions:

${instructions || 'No custom instructions set.'}
`;

            showStatus('Choosing the right thinking level...', '🧠');

            const complexitySuffix =
                await isComplex(userInput);

            modelToUse =
                `gemini-2.5-${complexitySuffix === 'pro'
                    ? 'pro'
                    : 'flash'}`;
        }

        const memoryLoad = {
            type: 'chat',
            prompt: `
Classify whether this user input contains:

1) Personal information
2) A request to remember something explicitly
3) Preferences or interests
4) Any other relevant information that should be stored in memory

Reply with only YES if any apply.

Otherwise reply only NO.

User input: "${userInput}"
`,
            system:
                'You are a strict memory classifier. Reply only YES or NO.',
            model: 'gemini-2.5-flash'
        };

        showStatus('Checking memory...', '🧠');

        const memoryRes = await fetch(
            'https://lumen-production-2ee7.up.railway.app/ask',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memoryLoad)
            }
        );

        const memoryData = await memoryRes.json();

        const memoryReply =
            memoryData.response ||
            memoryData.reply ||
            memoryData.choices?.[0]?.message?.content ||
            '';

        const chartLoad = {
            type: 'chat',
            prompt: `${previousMessages}`,
            system: `
You are Lumen's Graph Intelligence Assistant.

Decide whether the latest user message contains data that can be represented as a chart.

If it does, return ONLY valid JSON:

{
    "makeGraph": true,
    "chartType": "bar",
    "data": {
        "labels": ["label1", "label2"],
        "values": [10, 20]
    },
    "summary": "A one-sentence summary."
}

If it does not, return:

{
    "makeGraph": false
}

Do not include Markdown or explanations.
`,
            model: 'gemini-2.5-flash'
        };

        const chartRes = await fetch(
            'https://lumen-production-2ee7.up.railway.app/ask',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chartLoad)
            }
        );

        const chartData = await chartRes.json();

        const chartReply =
            chartData.response ||
            chartData.reply ||
            chartData.choices?.[0]?.message?.content ||
            '';

        let chartJson;

        try {
            chartJson = JSON.parse(chartReply);
        } catch {
            chartJson = {
                makeGraph: false
            };
        }

        createGraph(chartJson);

        if (chartJson.makeGraph) {
            showSuccess('Graph created.');
            await delay(700);
            resetChatState();
            return;
        }

        if (memoryReply.includes('YES')) {
            showStatus('Saving this to memory...', '🧠');

            let memory =
                JSON.parse(
                    localStorage.getItem(
                        'lumenMemory_' +
                        lumenUser.username
                    )
                ) || [];

            memory.push(userInput);

            localStorage.setItem(
                'lumenMemory_' +
                lumenUser.username,
                JSON.stringify(memory)
            );

            await delay(600);
        }

        if (
            modeSelector.value === 'Think for Longer' ||
            modelToUse === 'gemini-2.5-pro'
        ) {
            showStatus(
                'Thinking deeper for a better answer...',
                '🧠'
            );
        } else {
            showStatus(
                'Generating your answer...',
                '✦'
            );
        }

        const formDataPayload = new FormData();

        formDataPayload.append('type', 'chat');
        formDataPayload.append('prompt', userInput);
        formDataPayload.append('system', systemPrompt);
        formDataPayload.append('model', modelToUse);
        formDataPayload.append('userTier', userTier);

        if (modeSelector.value === 'Shopping Research') {
            formDataPayload.append(
                'web',
                JSON.stringify({
                    search: {
                        enabled: true
                    }
                })
            );
        }

        if (file) {
            formDataPayload.append('file', file);
        }

        const res = await fetch(
            'https://lumen-production-2ee7.up.railway.app/ask',
            {
                method: 'POST',
                body: formDataPayload
            }
        );

        if (!res.ok) {
            throw new Error(
                `Lumen returned an error (${res.status}).`
            );
        }

        const responseData = await res.json();

        let reply =
            responseData.response ||
            responseData.reply ||
            responseData.choices?.[0]?.message?.content ||
            responseData.output_text ||
            '';

        if (!reply) {
            throw new Error(
                'Lumen did not return a response.'
            );
        }

        if (selectedModelValue === 'Lumen 7 Axiom') {
            try {
                const cleanAxiomReply =
                    reply
                        .replace(/```json/gi, '')
                        .replace(/```/g, '')
                        .trim();

                const axiomData =
                    JSON.parse(cleanAxiomReply);

                if (!Array.isArray(axiomData.actions)) {
                    throw new Error(
                        'Axiom did not return a valid action sequence.'
                    );
                }

                showStatus(
                    `Executing ${axiomData.actions.length} action${axiomData.actions.length === 1 ? '' : 's'}...`,
                    '⚡'
                );

                const browserRes = await fetch(
                    'http://localhost:3000/task',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(axiomData)
                    }
                );

                const browserData =
                    await browserRes.json();

                if (
                    !browserRes.ok ||
                    !browserData.success
                ) {
                    throw new Error(
                        browserData.error ||
                        'Browser Intelligence failed to execute the task.'
                    );
                }

                showSuccess(
                    'Browser task completed successfully.'
                );

                previousResponses.push(
                    'Browser task completed successfully.'
                );

                resetChatState();
                return;

            } catch (error) {
                console.error(
                    'Axiom Browser Error:',
                    error
                );

                showError(
                    'Browser Intelligence error: ' +
                    error.message
                );

                previousResponses.push(
                    'Browser Intelligence error: ' +
                    error.message
                );

                resetChatState();
                return;
            }
        }

        reply = reply
            .replace(
                /\*\*(.*?)\*\*/g,
                '<b>$1</b>'
            )
            .replace(
                /\r\n/g,
                '\n'
            )
            .replace(
                /\n\n/g,
                '<br><br>'
            )
            .replace(
                /\n/g,
                '<br>'
            )
            .replace(
                /```([\s\S]*?)```/g,
                '<pre><code>$1</code></pre>'
            );

        previousResponses.push(reply);

        const isImageRequest =
            reply
                .toLowerCase()
                .includes('image requested');

        const isVideoRequest =
            reply
                .toLowerCase()
                .includes('video requested');

        if (!isImageRequest && !isVideoRequest) {
            replyEl.innerHTML = `
                <div class="lumen-response-content">
                    ${reply}
                </div>
            `;

            speak(reply);
        }

        if (isImageRequest) {
            await handleMediaGeneration(
                userInput,
                true,
                replyEl,
                mediaEl
            );
        }

        if (isVideoRequest) {
            await handleMediaGeneration(
                userInput,
                false,
                replyEl,
                mediaEl
            );
        }

        resetChatState();

    } catch (error) {
        console.error('Lumen Error:', error);

        showError(
            error.message ||
            'Something went wrong while generating your response.'
        );

        previousResponses.push(
            'Lumen error: ' +
            (error.message || 'Unknown error')
        );

        resetChatState();
    }
}

async function handleMediaGeneration(userInput, isImage, replyEl, mediaEl) {
    const type = isImage ? 'image' : 'video';
    const mediaVerb = isImage ? 'Image' : 'Video';
    replyEl.innerHTML = `Generating ${type}... This may take a few moments.`;
    const payload = { type: type, prompt: userInput, userTier: userTier, model: 'Lumen VI' };
    const res = await fetch('https://lumen-production-2ee7.up.railway.app/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json();

    if (isImage) {
        const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
        const mime = data?.predictions?.[0]?.mimeType || 'image/png';
        const url = data?.data?.[0]?.url;
        if (b64) {
            mediaEl.src = `data:${mime};base64,${b64}`;
            mediaEl.classList.add('lumenMessage', 'img');
            previousResponses.push(`[IMAGE GENERATED]`);
            replyEl.innerHTML = `${mediaVerb} generated successfully.`;
            speak(`${mediaVerb} generated successfully.`);
        } else if (url) {
            mediaEl.src = url;
            mediaEl.classList.add('lumenMessage', 'img');
            previousResponses.push(url + ` [${mediaVerb.toUpperCase()} GENERATED]`);
            replyEl.innerHTML = `${mediaVerb} generated successfully.`;
            speak(`${mediaVerb} generated successfully.`);
        } else if (data.error) {
            replyEl.innerHTML = `${mediaVerb} ERROR: ` + data.error;
            previousResponses.push(`${mediaVerb} ERROR: ` + data.error);
            speak(`Sorry, there was an error generating the ${type}.`);
        } else {
            replyEl.innerHTML = `${mediaVerb} ERROR: Could not generate or display.`;
            previousResponses.push(`${mediaVerb} ERROR: Could not generate or display.`);
            speak(`Sorry, there was an error generating the ${type}.`);
        }
    } else if (data.videoUrl) {
        mediaEl.src = data.videoUrl;
        mediaEl.style.display = 'block';
        previousResponses.push(data.videoUrl + ` [${mediaVerb.toUpperCase()} GENERATED]`);
        replyEl.innerHTML = `${mediaVerb} generated successfully. The video is hosted on Google Cloud Storage.`;
        speak(`${mediaVerb} generated successfully.`);
    } else if (data.error) {
        replyEl.innerHTML = `${mediaVerb} ERROR: ` + data.error;
        previousResponses.push(`${mediaVerb} ERROR: ` + data.error);
        speak(`Sorry, there was an error generating the ${type}.`);
    } else {
        replyEl.innerHTML = `${mediaVerb} ERROR: Could not generate or display.`;
        previousResponses.push(`${mediaVerb} ERROR: Could not generate or display.`);
        speak(`Sorry, there was an error generating the ${type}.`);
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function newChat() {
    window.location.reload();
}

window.lumenCharts = window.lumenCharts || [];

function createGraph(gptResponse) {
    if (!gptResponse.makeGraph) return;
    const messagesDone = previousMessages.length;
    const chartContainer = document.createElement('div');
    chartContainer.classList.add('chart-container');
    chartContainer.innerHTML = `<canvas id="lumenChart${messagesDone}" width="800" height="400"></canvas>`;
    containerEl.appendChild(chartContainer);
    const ctx = document.getElementById(`lumenChart${messagesDone}`).getContext('2d');
    const newChart = new Chart(ctx, {
        type: gptResponse.chartType,
        data: {
            labels: gptResponse.data.labels,
            datasets: [{
                label: 'Lumen Analysis',
                data: gptResponse.data.values,
                backgroundColor: gptResponse.data.labels.map(label => label.toLowerCase() === 'yellow' ? 'yellow' : label.toLowerCase() === 'green' ? 'green' : 'rgba(75,192,192,0.4)'),
                borderColor: gptResponse.data.labels.map(label => label.toLowerCase() === 'yellow' ? 'gold' : label.toLowerCase() === 'green' ? 'darkgreen' : 'rgba(75,192,192,1)'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }, 
                title: { display: true, text: 'Lumen Graph Intelligence' }
            }
        }
    });
    window.lumenCharts.push(newChart);
    wait = 0;
}

async function isComplex(input) {
    const complexLoad = {
        type: 'chat',
        prompt: `Classify whether this user input is asking for a complex or detailed response that requires deep thinking, multi-step reasoning, or advanced knowledge.
                        Reply with only FLASH or PRO. FLASH means simple, straightforward, or basic. PRO means complex, detailed, or advanced.
                        If a prompt is asking for an analysis, comparison, or explanation, it is mostly a FLASH prompt. However, if it is asking for a deep dive, multi-step reasoning, or advanced concepts, it is a PRO prompt.
                        User input: "${input}"`,
        system: "You are a strict classifier. Reply only FLASH or PRO.",
        model: 'gemini-2.5-flash',
    };
    const complexRes = await fetch('https://lumen-production-2ee7.up.railway.app/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexLoad)
    });
    if (!complexRes.ok) {   
        console.error(`isComplex call to /ask failed with status: ${complexRes.status}. Returning flash.`);
        return 'flash';
    }
    const complexData = await complexRes.json();
    let complexReply = complexData.response || complexData.reply || complexData.choices?.[0]?.message?.content || '';
    complexReply = complexReply.trim().replace(/^"+|"+$/g, '').toLowerCase();
    return complexReply === 'pro' ? 'pro' : 'flash';
}
