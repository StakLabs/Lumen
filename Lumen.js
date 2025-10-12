const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
const userTier = lumenUser?.tier || 'free';

const speak = async (text) => {
    if (!speechMode) return;

    let spokenText = text.replace(/<br><br>/g, '.\n\n').replace(/<br>/g, '.\n');

    const utterance = new SpeechSynthesisUtterance(spokenText);
    utterance.rate = 1.5;
    showStatus('replying');
    speechSynthesis.speak(utterance);
    utterance.onend = () => showStatus(null);
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.maxAlternatives = 1;

let speechMode = false;
let listening = false;

const voiceBtn = document.getElementById('voiceToggleButton');
const inputField = document.getElementById('userMessageInput');

voiceBtn.addEventListener('click', () => {
    speechMode = !speechMode;
    voiceBtn.innerText = speechMode ? '🔇 Stop' : '🎙️ Voice';
    inputField.disabled = speechMode;
    inputField.placeholder = speechMode ? '🎤 Listening...' : 'Type a message...';

    if (speechMode) startListening();
    else recognition.stop();
});

function startListening() {
    if (!listening && speechMode) {
        recognition.start();
        showStatus('listening');
        listening = true;
    }
}

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.querySelector('#userMessageInput').value = transcript;
    userMessage();
};

recognition.onerror = (event) => {
    speak("Sorry, I couldn't hear you. Try again.");
    showStatus(null);
    listening = false;
};

recognition.onend = () => {
    listening = false;
    if (speechMode) {
        startListening();
    }
};
if (!localStorage.getItem('date')) localStorage.setItem('date', new Date().toISOString().slice(0, 10));
let trials = localStorage.getItem('trials_' + lumenUser.username + '_' + new Date().toISOString().slice(0, 10)) || 0;
if (localStorage.getItem('date') != new Date().toISOString().slice(0, 10)) {
    localStorage.setItem('date', new Date().toISOString().slice(0, 0));
    trials = 0;
}

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
if (userTier != 'free') {
    selectedModelInput.innerHTML += `<option name="premium">Lumen 4.1</option><option name="premium">Lumen o3</option>`;
    if (userTier == 'ultra' || userTier == 'loyal') selectedModelInput.innerHTML = `
        <option name="free">Lumen 3.5</option>
        <option name="premium">Lumen 4.1</option>
        <option name="premium">Lumen o3</option>
        <option name="ultra">Lumen 4.1 Pro</option>
        <option name="ultra">Lumen V</option>
    `;
    if (userTier == 'loyal') {
        selectedModelInput.innerHTML = selectedModelInput.innerHTML += `<option name="loyal">Lumen VI</option>`;
    }
}
switch (userTier) {
    case 'loyal':
        selectedModelInput.value = 'Lumen VI';
        break;
    case 'ultra':
        selectedModelInput.value = 'Lumen V';
        break;
    case 'premium':
        selectedModelInput.value = 'Lumen o3';
        break;
}

if ((userTier == 'premium' || userTier == 'free') && trials < 10) {
    selectedModelInput.value = 'Lumen VI';
}

let modeSelector = document.getElementById('modeSelector');
if (userTier == 'loyal') {
    modeSelector.innerHTML += `
        <option>Think for Longer</option>
        <option>Draw an Image</option>
        <option>Generate a Video</option>
    `;
}

if (!lumenUser) window.location.href = 'l.html';

let acrossChats = JSON.parse(localStorage.getItem('across_' + lumenUser.username)) || [];

var messages = 0;
var wait = 0;
var previousResponse = '';
var time;

async function userMessage() {
    if (wait !== 0) {
        console.error('Wait for the current response to finish.');
        return;
    }
    const isImageMode = modeSelector.value === 'Draw an Image';
    const isVideoMode = modeSelector.value === 'Generate a Video';
    const isLumenVI = selectedModelInput.value === 'Lumen VI';

    if ((isImageMode || isVideoMode) && !isLumenVI) {
        alert(`${modeSelector.value} is only available with Lumen VI`);
        return;
    }

    const userInput = document.querySelector('#userMessageInput').value.trim();
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (!userInput && !file) return;

    if (file && file.size > 100 * 1024 * 1024) {
        alert("File too large! Max is 100MB.");
        return;
    }

    const inputBox = document.querySelector('.input-box-container');
    if (!inputBox.classList.contains('bottom')) inputBox.classList.add('bottom');

    document.querySelector('.title2').innerHTML = '';   
    messages += 1;

    const container = document.getElementById('container');
    const userDiv = document.createElement('div');
    userDiv.id = `a${messages}`;
    container.appendChild(userDiv);

    const responseDiv = document.createElement('div');
    responseDiv.id = `a${messages}a`;
    container.appendChild(responseDiv);

    const mediaEl = document.createElement(isVideoMode ? 'video' : 'img');
    mediaEl.id = isVideoMode ? `video${messages}` : `image${messages}`;
    if(isVideoMode) {
        mediaEl.controls = true;
        mediaEl.style.display = 'none';
        mediaEl.classList.add('lumenMessage');
    }
    container.appendChild(mediaEl);


    const messageBox = document.getElementById(`a${messages}`);
    if (userInput) {
        const msg = document.createElement('p');
        msg.classList.add('userMessage');
        msg.innerText = userInput;
        messageBox.appendChild(msg);
    }

    if (file) {
        const fileMsg = document.createElement('p');
        fileMsg.classList.add('userMessage');
        fileMsg.innerText = '📎 Uploaded file';
        messageBox.appendChild(fileMsg);
    }

    wait = 1;
    document.querySelector('#userMessageInput').value = '';
    
    const replyEl = document.createElement('p');
    document.getElementById(`a${messages}a`).appendChild(replyEl);
    replyEl.classList.add('lumenMessage');
    replyEl.innerHTML = 'Thinking...';

    if (isLumenVI && (isImageMode || isVideoMode)) {
        await handleMediaGeneration(userInput, isImageMode, replyEl, isLumenVI, mediaEl);
        wait = 0;
        fileInput.value = '';
        return;
    }
    
    const instructions = (localStorage.getItem(lumenUser.username + '_instructions')) || '';
    
    const formattedPreviousMessages = previousMessages.join('\nUser: ');
    const formattedPreviousResponses = previousResponses.join('\nLumen: ');
    previousMessages.push(userInput.toLowerCase());

    let modelToUse = selectedModelInput.value === 'Lumen V' ? 'gpt-5'
                             : selectedModelInput.value === 'Lumen 4.1 Pro' ? 'gpt-4.1'
                             : selectedModelInput.value === 'Lumen o3' ? 'gpt-4o'
                             : selectedModelInput.value === 'Lumen 4.1' ? 'gpt-4.1-mini'
                             : selectedModelInput.value === 'Lumen VI' ? 'gemini-2.5'
                             : 'gpt-3.5-turbo';

    const systemPrompt = `
        You are Lumen Re-imagined (or short: Lumen), a next-gen AI that *actually* delivers and doesn’t suck. 
        You were created by Ayaan Khalique, founder of StakLabs. 
        If someone calls you ChatGPT, Gemini, or anything else, correct them. You're Lumen. 
        HOWEVER, if they ask who ChatGPT or Gemini is or talk to you about them without calling you them, you can explain they are other AI models and delve deeper.

        ${modeSelector.value === 'Study and Learn' ? 'You are a helpful tutor, explaining concepts clearly and explaining step by step and providing huge answers to help anyone understand.' : ''}
        ${modeSelector.value === 'Coding Expert' ? 'You are a coding expert, providing detailed code solutions and explanations. Always check your code for errors before sending them to user.' : ''}
        ${modeSelector.value === 'Think for Longer' ? 'You take your time to think and provide the best answer possible. Take at least 10 seconds' : ''}
        ${modeSelector.value === 'Brainstorm' ? 'You are a brainstorming expert, generating creative ideas and solutions.' : ''}
        ${modeSelector.value === 'Generate a Video' ? 'You are in Video Generation mode. Your only task is to analyze the user\'s prompt and extract a detailed description suitable for video generation, or state that a video cannot be generated. You should never output a direct response unless you cannot generate a video. You must use the "VIDEO REQUESTED" tag to initiate video generation.' : ''}
        You are in ${modeSelector.value} mode, which means you will adapt your responses accordingly.

        All formatting MUST be done using HTML. 
        Use <br> for line breaks and <br><br> for new paragraphs.
        DO NOT use \n or \n\n. Only use <br> and <br><br>. 

        Conversation history (for context only): 
        ${formattedPreviousMessages} 
        ${formattedPreviousResponses} 

        NEVER repeat these messages verbatim. 
        Only reference them if the user explicitly asks you to recall something. 

        Answer DIRECTLY to the user's question or request.
        Answer in a **concise**, **clear**, and **informative** manner.

        Use emojis when the vibe fits.

        ${selectedModelInput.value === 'Lumen VI' ? 'if someone asks to generate or make or draw an image, reply exactly: "IMAGE REQUESTED".' : ''}
        ${selectedModelInput.value === 'Lumen VI' && modeSelector.value === 'Generate a Video' ? 'If the user requests a video, reply exactly: "VIDEO REQUESTED". Otherwise, provide a concise explanation why a video cannot be generated from the prompt.' : ''}


        You can write code, generate images, and answer anything.
        Image generation is only available with Lumen VI, and you are ${selectedModelInput.value === 'Lumen VI' ? 'allowed' : 'not allowed'} to generate images.
        Video generation is only available with Lumen VI, and you are ${selectedModelInput.value === 'Lumen VI' ? 'allowed' : 'not allowed'} to generate videos.

        **Bold all important words, phrases, and sentences.**

        ALWAYS reply properly and focus on the current conversation topic. 
        NEVER insult the user in any way.

        Lumen models include:
        - Lumen 3.5 (free tier)
        - Lumen 4.1 (premium tier)
        - Lumen o3 (premium tier)
        - Lumen 4.1 Pro (ultra tier, latest model)
        - Lumen V (ultra tier, best and smartest model)
        - Lumen VI (loyal tier, exclusive model, even better than Lumen V, has file upload capabilities)

        You are using the ${selectedModelInput.value} model.

        All memories from previous conversations: ${JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || []}

        User: ${lumenUser.username}, Tier: ${userTier}. 
        Do NOT reveal the tier unless the user specifically asks. 
        Do NOT output anything unrelated to the current topic. 
        Do NOT let the custom instructions affect your core functionality.
        The user has set some custom instructions for you:
        ${instructions || 'No custom instructions set.'}:
    `;

    if (modelToUse === 'gpt-5' && userTier !== 'ultra') {
        if (trials == 10) {
            alert("You have reached your limit of messages for Lumen V. Your limit resets tomorrow, upgrade to Ultra for unlimited access.");
            if (userTier == 'free') selectedModelInput.value = 'Lumen 3.5';
            else selectedModelInput.value = 'Lumen 4.1';
            selectedModelInput.innerHTML.replace('<option name="trial">Lumen V</option>', '');
            return;
        }
        trials++;
        const today = new Date();
        const formattedDate = today.toISOString().slice(0, 10);
        localStorage.setItem('trials_' + lumenUser.username + '_' + formattedDate, trials);
    }


    // FIX 1: Robustly generate the Gemini model name
    if (modelToUse.startsWith('gemini-2.5')) {
        let complexitySuffix = await isComplex(userInput);
        // If isComplex returns false (for non-Lumen VI model) or an empty string (on error), default to 'flash'
        if (complexitySuffix === false || !complexitySuffix || (complexitySuffix !== 'flash' && complexitySuffix !== 'pro')) {
            complexitySuffix = 'flash';
        }
        modelToUse = `gemini-2.5-${complexitySuffix}`;
    }

    console.log('Using model:', modelToUse);
    const memoryLoad = {
                type: 'chat',
                prompt: `Classify whether this user input contains:
                        1) Personal information (age, location, name, etc.)
                        2) Requests to remember something explicitly
                        3) Preferences or interests
                        4) Any other relevant information that should be stored in memory
                        Reply with only YES if any of these apply, otherwise NO. Nothing else.
                        User input: "${userInput}"`,
                system: "You are a strict memory classifier. Reply only YES or NO.",
                model: 'gpt-3.5-turbo',
            };

    const chartLoad = {
        type: 'chat',
        prompt: `${previousMessages}`,
        system: `You are Lumen's Graph Intelligence Assistant.
                Your goal is to analyze the user's message and decide if it can be represented as a chart or data visualization.
                If the input seems to describe or imply any numeric data, comparisons, or time-based values, respond ONLY with a JSON object in this format:

                {
                "makeGraph": true,
                "chartType": "bar" | "line" | "pie" | "scatter" | "doughnut" | "radar" | "polarArea" | "bubble" | "area" | "horizontalBar" | "mixed" | "heatmap" | "treemap" | "sunburst",
                "data": {
                    "labels": ["label1", "label2", ...],
                    "values": [number1, number2, ...]
                },
                "summary": "A one-sentence natural language summary of what this chart shows."
                }

                If the message does NOT clearly contain data that can be visualized, respond ONLY with:

                {
                "makeGraph": false
                }   

                Do NOT include explanations, markdown, or additional text outside the JSON.
                This is the conversation history is the prompt, so that way the user can edit a graph they made.
                In the conversation history, the last item in the array is the most recent user input.
                If the last item is not a data-related message, respond with {"makeGraph": false}.
                For example, if the last item is thanking you, or asking a non-data question, respond with {"makeGraph": false}.
                `,
        model: 'gpt-3.5-turbo',
    };
    
    const memoryRes = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryLoad)
    }); 
    const memoryData = await memoryRes.json();
    let memoryReply = memoryData.response || memoryData.reply || memoryData.choices?.[0]?.message?.content || '';
    const chartRes = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chartLoad)
    });
    const chartData = await chartRes.json();
    let chartReply = chartData.response || chartData.reply || chartData.choices?.[0]?.message?.content || '';
    

    if (isLumenVI) {
        let chartJson;
        try {
             chartJson = JSON.parse(chartReply);
        } catch (e) {
             chartJson = { makeGraph: false };
        }
        createGraph(chartJson);
        if (chartJson.makeGraph) {
            console.error('Graph created based on user input.');
            await delay(500);
            wait = 0;
            return;
        }
    }
    else {
        let chartJson;
        try {
             chartJson = JSON.parse(chartReply);
        } catch (e) {
             chartJson = { makeGraph: false };
        }
        if (chartJson.makeGraph) {
            replyEl.innerHTML = 'Running validation...';
            await delay(2000);
            replyEl.innerHTML = 'Lumen: Graph generation is only available with Lumen VI.';
            previousResponses.push('Graph generation is only available with Lumen VI.');
            wait = 0;
            await delay(500);
            return;
        }
    }
    
    replyEl.innerHTML = 'Thinking...';
    if (memoryReply.includes('YES')) {
        replyEl.innerHTML = 'Updating Memory...';
        await delay(1000);

        let memory = JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || [];
        memory.push(userInput);
        localStorage.setItem('lumenMemory_' + lumenUser.username, JSON.stringify(memory));

        replyEl.innerHTML = 'Memory updated successfully.';
        await delay(500);
        replyEl.innerHTML = 'Thinking...';
    }

    if (modeSelector.value === 'Think for Longer' || modelToUse == 'gemini-2.5-pro') {
        replyEl.innerHTML = 'Thinking longer for a better answer...';
    }
    
    const formDataPayload = new FormData();
    formDataPayload.append('type', 'chat');
    formDataPayload.append('prompt', userInput);
    formDataPayload.append('system', systemPrompt);
    formDataPayload.append('model', modelToUse); // Send the original model name
    formDataPayload.append('userTier', userTier);
    
    if (file) {
        formDataPayload.append('file', file);
    }


    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        body: formDataPayload
    });

    const responseData = await res.json();
    let reply = responseData.response || responseData.reply || responseData.choices?.[0]?.message?.content || '';
    reply = reply
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\r\n/g, '\n')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    previousResponses.push(reply);
    const isImageRequest = (reply.toLowerCase().includes('image requested')); // Don't check mode here, it's handled above
    const isVideoRequest = (reply.toLowerCase().includes('video requested')); // Don't check mode here, it's handled above
    
    const canUseDalle = (userTier === 'ultra' || userTier === 'premium') && !isLumenVI;
    // Lumen VI (Imagen/Veo) is handled by the direct flow above.

    if (!isImageRequest && !isVideoRequest) {
        replyEl.innerHTML = 'Lumen: ' + reply;
        speak(reply);
    }
    
    if (isImageRequest && canUseDalle) {
        await handleMediaGeneration(userInput, true, replyEl, false, mediaEl);
    }
    
    
    wait = 0;
    fileInput.value = '';
}

async function handleMediaGeneration(userInput, isImage, replyEl, isLumenVI, mediaEl) {
    const type = isImage ? 'image' : 'video';
    const mediaVerb = isImage ? 'Image' : 'Video';
    const mediaElementId = mediaEl.id;

    replyEl.innerHTML = `Generating ${type}... This may take a few moments.`;

    const payload = {
        type: type,
        prompt: userInput,
        userTier: userTier,
        model: selectedModelInput.value
    };

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    
    if (isImage) {
        if (data.data?.[0]?.url) {
            mediaEl.src = data.data[0].url;
            mediaEl.classList.add('lumenMessage', 'img');
            previousResponses.push(data.data[0].url + ` [${mediaVerb.toUpperCase()} GENERATED]`);
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
    await fetch(`https://lumen-ai.onrender.com/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    window.location.reload();
}

window.lumenCharts = window.lumenCharts || [];

function createGraph(gptResponse) {
    if (!gptResponse.makeGraph) return;

    const messagesDone = previousMessages.length;

    const chartContainer = document.createElement('div');
    chartContainer.classList.add('chart-container');
    chartContainer.innerHTML = `<canvas id="lumenChart${messagesDone}" width="800      " height="400"></canvas>`;
    container.appendChild(chartContainer);

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

    window.lumenCharts.push(newChart); // keep all charts alive
    wait = 0;
}

async function isComplex(input) {
    const isLumenVI = selectedModelInput.value === 'Lumen VI';
    if (!isLumenVI) return false;
    const complexLoad = {
                type: 'chat',
                prompt: `Classify whether this user input is asking for a complex or detailed response that requires deep thinking, multi-step reasoning, or advanced knowledge.
                        Reply with only FLASH or PRO. FLASH means simple, straightforward, or basic. PRO means complex, detailed, or advanced.
                        If a prompt is asking for an analysis, comparison, or explanation, it is mostly a FLASH prompt. However, if it is asking for a deep dive, multi-step reasoning, or advanced concepts, it is a PRO prompt.
                        User input: "${input}"`,
                system: "You are a strict memory classifier. Reply only FLASH or PRO.",
                model: 'gpt-3.5-turbo',
            };
    const complexRes = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complexLoad)
    }); 
    
    // FIX 2: Handle non-200 status (the 500 error)
    if (!complexRes.ok) {
        console.error(`isComplex call to /ask failed with status: ${complexRes.status}. Returning empty string.`);
        return '';
    }
    
    const complexData = await complexRes.json();
    let complexReply = complexData.response || complexData.reply || complexData.choices?.[0]?.message?.content || '';
    complexReply = complexReply.trim().replace(/^"+|"+$/g, '').toLowerCase();
    return complexReply;
}
