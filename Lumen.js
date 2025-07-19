let imageFile = null;
let previousResponses = [];
let previousMessages = [];

const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
const userTier = lumenUser?.tier || 'free';

let selectedModelInput = document.getElementById('selectedModel');
if (userTier != 'free') {
    selectedModelInput.innerHTML += `
        <option name="premium">Lumen 4.1</option>
    `;
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
    if (wait === 0) {
        const userInput = document.querySelector('#userMessageInput').value.trim();
        if (userInput) {
            console.log("Sending input to Lumen:", userInput);
            const newMessage = document.createElement('p');
            newMessage.classList.add('userMessage');
            newMessage.innerText = userInput;

            document.querySelector('#userMessageInput').value = '';
            document.querySelector('.title2').innerHTML = '<!--This used to be a title-->';

            if ((messages >= 10 && userTier === 'free') || (messages >= 100 && userTier === 'premium')) {
                alert("You Have Reached the Session's Message Limit. Please Refresh.");
                return;
            }

            messages += 1;
            const container = document.getElementById('container');
            container.innerHTML += `
                <div id="a${messages}"></div>
                <div id="a${messages}a"></div>
                <img id="image${messages}" />
            `;
            document.getElementById(`a${messages}`).appendChild(newMessage);
            response(userInput);
        }
    } else {
        document.querySelector('#userMessageInput').value = '';
    }
}

async function response(userInput) {
    wait = 1;
    if (userTier === 'free') await delay(3);

    if (userInput.toLowerCase().trim() === "lumen.exe") {
        window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
        return;
    }

    const formattedPreviousMessages = previousMessages.join('\nUser: ');
    const formattedPreviousResponses = previousResponses.join('\nLumen: ');

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

    acrossChats.push(userInput);
    localStorage.setItem('across_' + lumenUser.username, JSON.stringify(acrossChats));

    previousMessages.push(userInput.toLowerCase());

    const modelToUse = selectedModelInput.value === 'Lumen o3' ? 'gpt-4o'
                      : selectedModelInput.value === 'Lumen 4.1' ? 'gpt-4.1-mini'
                      : 'gpt-3.5-turbo';

    const containerId = `a${messages}a`;
    const newMessage = document.createElement('p');
    newMessage.classList.add('lumenMessage');
    newMessage.textContent = 'Thinking...';
    document.getElementById(containerId).appendChild(newMessage);

    const payload = {
        type: 'chat',
        prompt: userInput,
        system: systemPrompt,
        model: modelToUse,
        userTier: userTier
    };

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await res.json();
    let reply = data.reply || data.choices?.[0]?.message?.content || '';

    if ((userTier === 'ultra' || userTier === 'premium') && reply.toLowerCase().includes('image requested')) {
        newMessage.textContent = 'Generating image...';

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
        const imageTarget = document.getElementById(`image${previousMessages.length}`);
        if (imageTarget && imageData.data?.[0]?.url) {
            imageTarget.src = imageData.data[0].url;
            imageTarget.classList.add('lumenMessage', 'img');
            previousResponses.push(imageData.data[0].url + ' [IMAGE GENERATED]');
                      
        } else {
            previousResponses.push('IMAGE ERROR: could not generate or display');
        }

    } else {
        previousResponses.push(reply);
        newMessage.textContent = 'Lumen: ';
        for (let i = 0; i < reply.length; i++) {
            newMessage.textContent += reply.charAt(i);
            await delay(5);
        }
    }

    newMessage.innerHTML = 'Lumen: ' + reply;

    wait = 0;
}
function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}
