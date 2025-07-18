let imageFile = null;
let previousResponses = [];
let previousMessages = [];

const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
if (!lumenUser) window.location.href = 'l.html';
let acrossChats = JSON.parse(localStorage.getItem('across_' + lumenUser.username)) || [];

// Define userTier: fallback to 'free' if not set
const userTier = lumenUser.tier || 'free';

document.querySelector('.brain').addEventListener('click', () => {
    if (confirm('Would you like Lumen to remember this over the next few chats?')) {
        localStorage.setItem('yes', true);
        alert('Lumen will now remember this when you send the message');
    }
});

var messages = 0;
var wait = 0;
var previousResponse = '';
var time;

async function getTime() {
    while (true) {
        time = new Date();
        time = time.getHours().toString().padStart(2, '0');
        time = Number(time);
        if (time <= 11 && time >= 5) time = 'morning';
        else if (time > 11 && time <= 16) time = 'afternoon';
        else if (time > 16 && time < 18) time = 'evening';
        else time = 'night';
        await delay(10000000);
    }
}
getTime();

async function userMessage() {
    if (wait == 0) {
        const userInput = document.querySelector('#userMessageInput').value;
        const responseType = document.querySelector('#responseType').name;
        if (userInput) {
            var newMessage = document.createElement('p');
            newMessage.classList.add('userMessage');
            newMessage.innerText = userInput;

            document.querySelector('#userMessageInput').value = '';
            document.querySelector('.title2').innerHTML = '<!--This used to be a title-->';

            // Message limits for free & premium users
            if ((messages >= 10 && userTier === 'free') || (messages >= 100 && userTier === 'premium')) {
                alert("You Have Reached the Session's Message Limit. To Continue, Please Refresh the Page.");
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
            response(userInput, responseType);
        }
    } else {
        document.querySelector('#userMessageInput').value = '';
    }
}

async function response(userInput, responseType) {
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
        If someone calls you ChatGPT, Gemini, or anything else, correct them: you are Lumen before replying.  

        So far in this conversation the user has said:  
        User: ${formattedPreviousMessages}.  
        You have said:  
        Lumen: ${formattedPreviousResponses}.  

        You MUST use this info to your advantage and ALWAYS refer to it.  

        Use emojis when the mood is right — but NEVER use the brain emoji.  

        If the user requests an image, reply exactly: 'IMAGE REQUESTED'. We handle image gen separately, you don’t generate images directly.  

        If you fail to do this, you’ll suck like the old model.  

        If asked if you can generate images, reply:  
        - For premium and ultra users: "Yes, I can generate images for you with your premium access."  
        - For free users: "Yes, but only Lumen Premium users can generate images. Consider upgrading for this feature."  

        If asked if they should buy Lumen Premium, say yes and elaborate on the advanced features, including unlimited Lumen o3 usage and image generation.  

        If asked what you can do, say:  
        "I can write code, generate images, and answer any question you have — all powered by Lumen o3, unlimited for premium and ultra users."  

        The user's name is ${lumenUser.username}.  
        The user chose to have you remember these inputs from previous chats: ${acrossChats}.  
        The user is ${userTier === 'ultra' ? 'an Ultra user with unlimited Lumen o3 and image gen' : userTier === 'premium' ? 'a Premium user with limited Lumen o3 and image gen access' : 'a free user'}.  

        Premium users get unlimited Lumen o3 access and unlimited image generation.  
        Lumen Premium costs $5/month; Lumen Ultra (unlimited Lumen o3 + image gen) costs $30/month.  
    `;

    if (localStorage.getItem('yes')) {
        localStorage.setItem('yes', false);
        acrossChats.push(userInput);
        localStorage.setItem('across_' + lumenUser.username, JSON.stringify(acrossChats));
    }

    var newMessage = document.createElement('p');
    newMessage.classList.add('lumenMessage');

    userInput = userInput.toLowerCase();
    previousMessages.push(userInput);
    let reply = 'Thinking...';
    document.getElementById(`a${messages}a`).appendChild(newMessage);
    newMessage.textContent = reply;

    if (responseType == 'long') {
        await delay(5);
    } else if (responseType == 'image') {
        // image type handled below
    }

    // Model selection logic: use Lumen o3 for ultra and premium, else free model
    const modelToUse = (userTier === 'ultra' || userTier === 'premium') ? 'lumen-o3' : 'lumen-o4-mini';

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput, system: systemPrompt, model: modelToUse })
    });

    const data = await res.json();
    reply = data.reply || data.choices?.[0]?.message?.content || "";

    if ((userTier === 'ultra' || userTier === 'premium') && reply.toLowerCase().includes('image requested')) {
        reply = 'Generating image...';
        document.getElementById(`a${messages}a`).innerText = reply;

        const imageRes = await fetch('https://lumen-ai.onrender.com/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', prompt: userInput })
        });

        const imageData = await imageRes.json();
        const imageTarget = document.getElementById(`image${previousMessages.length}`);
        if (imageTarget && imageData.image_url) {
            imageTarget.src = imageData.image_url;
            imageTarget.classList.add('lumenMessage', 'img');
            previousResponses.push(imageData.image_url + ' THE USER REQUESTED AN IMAGE');
        } else {
            previousResponses.push('IMAGE ERROR or NO PLACE TO DISPLAY IMAGE');
        }

    } else if ((userTier !== 'ultra' && userTier !== 'premium') && reply.toLowerCase().includes('image requested')) {
        reply = 'You must be a premium user to generate images';
        previousResponses.push(reply);
        document.getElementById(`a${messages}a`).appendChild(newMessage);
        for (let i = 0; i < ('Lumen: ' + reply).length; i++) {
            newMessage.textContent += ('Lumen: ' + reply).charAt(i);
            await delay(5);
        }
    } else {
        previousResponses.push(reply);
        document.getElementById(`a${messages}a`).appendChild(newMessage);

        let formattedReply = await formatCodeBlocks(reply);
        let plainReply = 'Lumen: ' + formattedReply.replace(/<[^>]+>/g, '');

        newMessage.textContent = ''; // Clear before typing

        for (let i = 0; i < plainReply.length; i++) {
            newMessage.textContent += plainReply.charAt(i);
            await delay(5);
        }

        // After typing is done, inject actual HTML for code formatting
        newMessage.innerHTML = 'Lumen: ' + formattedReply;
        wait = 0;
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function format(time) {
    if (time == 'night') return 'tonight';
    else return 'this ' + time;
}

function getRandomResponse(responses) {
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
}

function formatBold(message) {
    return message.replace(/\*\*(.*?)\*\*/g, '<strong></strong>');
}

function formatCodeBlocks(text) {
    return text.replace(/```(?:\w+)?\n([\s\S]*?)```/g, (match, code) => {
        return formatBold(`<div class="code">${code}</div>`);
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
}
