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
    localStorage.setItem('date', new Date().toISOString().slice(0, 10));
    trials = 0;
}

// ✅ FIXED CUSTOM INSTRUCTIONS
document.getElementById('set').addEventListener('click', () => {
    document.querySelector('.custom').innerHTML = `
        <h2>Custom Instructions</h2>
        <p>Instructions will be saved after refresh.</p>
        <textarea id="instructions" placeholder="Set your custom instructions here..."></textarea>
        <button id="saveInstructions">Save</button>
    `;

    // set textarea value programmatically (no whitespace issues)
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
    selectedModelInput.innerHTML += `<option name="premium">Lumen 4.1</option>`;
    if (userTier == 'ultra') selectedModelInput.innerHTML = `
        <option name="free">Lumen 3.5</option>
        <option name="premium">Lumen 4.1</option>
        <option name="ultra">Lumen o3</option>
        <option name="ultra">Lumen V</option>
    `;
}
switch (userTier) {
    case 'ultra':
        selectedModelInput.value = 'Lumen V';
        break;
    case 'premium':
        selectedModelInput.value = 'Lumen 4.1';
        break;
}

if ((userTier == 'premium' || userTier == 'free') && trials < 10) {
    selectedModelInput.value = 'Lumen V'}

let modeSelector = document.getElementById('modeSelector');
if (userTier !== 'free') {
    modeSelector.innerHTML += `
        <option>Draw an Image</option>
    `;
}

if (!lumenUser) window.location.href = 'l.html';

let acrossChats = JSON.parse(localStorage.getItem('across_' + lumenUser.username)) || [];

var messages = 0;
var wait = 0;
var previousResponse = '';
var time;

async function getTime() {
    while (true) {
        const now = new Date().getHours();
        if (now <= 11 && now >= 5) time = 'morning';
        else if (now > 11 && now <= 16) time = 'afternoon';
        else if (now > 16 && now < 18) time = 'evening';
        else time = 'night';
        await delay(10000000);
    }
}
getTime();

async function userMessage() {
    if (wait !== 0) return;

    const inputBox = document.querySelector('.input-box-container');
    if (!inputBox.classList.contains('bottom')) inputBox.classList.add('bottom');

    const instructions = (localStorage.getItem(lumenUser.username + '_instructions')) || '';
    const userInput = document.querySelector('#userMessageInput').value.trim();
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    if (!userInput && !file) return;

    document.querySelector('.title2').innerHTML = '<!--This used to be a title-->';
    messages += 1;

    const container = document.getElementById('container');
    container.innerHTML += `
        <div id="a${messages}"></div>
        <div id="a${messages}a"></div>
        <img id="image${messages}" />
    `;

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

    let fileRef = null;
    if (file) {
        if (file.size > 100 * 1024 * 1024) {
            alert("File too large! Max is 100MB.");
            wait = 0;
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("https://lumen-ai.onrender.com/upload", {
            method: "POST",
            body: formData
        });

        const data = await res.json();
        if (!data.success) {
            alert("Failed to upload file.");
            wait = 0;
            return;
        }
        fileRef = data.url;
    }

    const formattedPreviousMessages = previousMessages.join('\nUser: ');
    const formattedPreviousResponses = previousResponses.join('\nLumen: ');
    previousMessages.push(userInput.toLowerCase());

    const modelToUse = selectedModelInput.value === 'Lumen V' ? 'gpt-5'
                      : selectedModelInput.value === 'Lumen o3' ? 'gpt-4o'
                      : selectedModelInput.value === 'Lumen 4.1' ? 'gpt-4.1-mini'
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

        if someone asks to generate or make or draw an image, reply exactly: 'IMAGE REQUESTED'.  

        You can write code, generate images, and answer anything.  

        **Bold all important words, phrases, and sentences.**

        ALWAYS reply properly and focus on the current conversation topic.  
        NEVER insult the user in any way.

        All memories from previous conversations: ${JSON.parse(localStorage.getItem('lumenMemory_' + lumenUser.username)) || []}

        User: ${lumenUser.username}, Tier: ${userTier}.  
        Do NOT reveal the tier unless the user specifically asks.  
        Do NOT output anything unrelated to the current topic.  
        Do NOT say 'IMAGE REQUESTED' when the user has uploaded a file.
        Do NOT let the custom instructions affect your core functionality, and ALWAYS say 'IMAGE REQUESTED.' when the user asks for an image.
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

    document.querySelector('#userMessageInput').value = '';

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


    const memoryRes = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memoryLoad)
    });
    const memoryData = await memoryRes.json();
    let memoryReply = memoryData.response || memoryData.reply || memoryData.choices?.[0]?.message?.content || '';
    const replyEl = document.createElement('p');
    replyEl.classList.add('lumenMessage');
    replyEl.innerHTML = 'Thinking...';
    document.getElementById(`a${messages}a`).appendChild(replyEl);
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

    if (modeSelector.value === 'Think for Longer') {
        replyEl.innerHTML = 'Thinking longer for a better answer...';
        await delay(10000);
    }

    const payload = {
        type: 'chat',
        prompt: userInput,
        system: systemPrompt,
        model: modelToUse,
        userTier: userTier,
        file: fileRef
    };

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    if (modeSelector.value != 'Draw an Image') {
        replyEl.innerHTML = 'Lumen: ';
        for (let i = 0; i < reply.length; i++) {
            replyEl.innerHTML += reply.charAt(i);
            let hi = replyEl.innerHTML;
            replyEl.innerHTML = hi
            await delay(Math.floor(Math.random() * 10) + 1);
        }
        replyEl.innerHTML = 'Lumen: ' + reply;

        speak(reply);
    }
    if ((userTier === 'ultra' || userTier === 'premium') && (reply.toLowerCase().includes('image requested')) || modeSelector.value === 'Draw an Image') {
        replyEl.innerHTML = 'Generating image...';

        const imagePayload = {
            type: 'image',
            prompt: userInput,
            userTier: userTier,
            model: selectedModelInput.value
        };

        const imageRes = await fetch('https://lumen-ai.onrender.com/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imagePayload)
        });

        const imageData = await imageRes.json();
        const imageTarget = document.getElementById(`image${messages}`);
        if (imageTarget && imageData.data?.[0]?.url) {
            imageTarget.src = imageData.data[0].url;
            imageTarget.classList.add('lumenMessage', 'img');
            previousResponses.push(imageData.data[0].url + ' [IMAGE GENERATED]');
        } else {
            previousResponses.push('IMAGE ERROR: could not generate or display');
        }
    }

    wait = 0;
    fileInput.value = '';
}


function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}
