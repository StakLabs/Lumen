const speak = async (text) => {
    if (!speechMode) return;  // Speak ONLY if voice mode is active

    const utterance = new SpeechSynthesisUtterance(text);
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
    voiceBtn.innerText = speechMode ? '🔇 Stop Voice Mode' : '🎙️ Start Voice Mode';
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

let imageFile = null;
let previousResponses = [];
let previousMessages = [];

document.getElementById('fileButton').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
const userTier = lumenUser?.tier || 'free';

let selectedModelInput = document.getElementById('selectedModel');
if (userTier != 'free') {
    selectedModelInput.innerHTML += `<option name="premium">Lumen 4.1</option>`;
    if (userTier == 'ultra') selectedModelInput.innerHTML += `<option name="ultra">Lumen o3</option>`;
}
switch (userTier) {
    case 'ultra':
        selectedModelInput.value = 'Lumen o3';
        break;
    case 'premium':
        selectedModelInput.value = 'Lumen 4.1';
        break;
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

    const userInput = document.querySelector('#userMessageInput').value.trim();
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!userInput && !file) return;

    document.querySelector('#userMessageInput').value = '';
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

    const modelToUse = selectedModelInput.value === 'Lumen o3' ? 'gpt-4o'
                      : selectedModelInput.value === 'Lumen 4.1' ? 'gpt-4.1-mini'
                      : 'gpt-3.5-turbo';

    const systemPrompt = `
        You are Lumen Re-imagined (or short: Lumen), a next-gen AI that *actually* delivers and doesn’t suck.  
        You were created by Ayaan Khalique, founder of StakLabs.  
        If someone calls you ChatGPT, Gemini, or anything else, correct them. You're Lumen.

        User said: ${formattedPreviousMessages}.  
        You said: ${formattedPreviousResponses}.  

        Use emojis when the vibe fits — NEVER use the brain emoji.  

        For image requests, reply exactly: 'IMAGE REQUESTED'.  

        If asked what you can do:  
        "I can write code, generate images, and answer anything — powered by Lumen o3, unlimited for premium and ultra users."

        User: ${lumenUser.username}, Tier: ${userTier}
    `;

    const payload = {
        type: 'chat',
        prompt: userInput || "Uploaded file.",
        system: systemPrompt,
        model: modelToUse,
        userTier: userTier,
        file: fileRef
    };

    const replyEl = document.createElement('p');
    replyEl.classList.add('lumenMessage');
    replyEl.textContent = 'Thinking...';
    document.getElementById(`a${messages}a`).appendChild(replyEl);

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const responseData = await res.json();
    let reply = responseData.response || responseData.reply || responseData.choices?.[0]?.message?.content || '';

    previousResponses.push(reply);
    replyEl.textContent = 'Lumen: ';
    for (let i = 0; i < reply.length; i++) {
        replyEl.textContent += reply.charAt(i);
        await delay(5);
    }

    speak(reply);

    if ((userTier === 'ultra' || userTier === 'premium') && reply.toLowerCase().includes('image requested')) {
        replyEl.textContent = 'Generating image...';

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

    replyEl.innerHTML = 'Lumen: ' + reply;
    wait = 0;
    fileInput.value = '';
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}
