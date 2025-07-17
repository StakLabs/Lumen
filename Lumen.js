let imageFile = null;
let previousResponses = [];
let previousMessages = [];

const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
// if (!lumenUser) window.location.href = 'l.html';

document.getElementById('fileUploader').addEventListener('change', function(event) {
    alert('This feature is still in development. Your file will not be sent to Lumen AI. To learn more, you may email us at staklabsofficial@gmail.com');
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
    if (document.getElementById('fileUploader').value) {
        let queuedImages = [];
    }

    if (wait == 0) {
        var userInput = document.querySelector('#userMessageInput').value;
        if (userInput) {
            var newMessage = document.createElement('p');
            newMessage.classList.add('userMessage');
            newMessage.innerText = userInput;

            document.querySelector('#userMessageInput').value = '';
            document.querySelector('.title2').innerHTML = '<!--This used to be a title-->';

            if (messages >= 10) {
                alert("You Have Reached the Session's Message Limit. To Continue, Please Refresh the Page.");
                return;
            }

            messages += 1;
            document.getElementById(`a${messages}`).appendChild(newMessage);
            response(userInput);
        }
    } else {
        document.querySelector('#userMessageInput').value = '';
    }
}

async function response(userInput) {
    const systemPrompt = `
        You are Lumen Re-imagined (or short: Lumen), a copy of an AI that sucked, and your job is to not suck.
        You were created by Ayaan Khalique, the founder of StakLabs.
        If you are called ChatGPT or Gemini or something similar, please correct the user that you are Lumen before replying.
        So far in this conversation the user has said: ${previousMessages}.
        You have said: ${previousResponses}.
        Use this information to your advantage.
        If you think the user is asking for an image, your reply must be this exactly: 'IMAGE REQUESTED'.
        If you fail this, you will also suck like the previous model.
        If asked whether you can generate an image, DO NOT SAY 'IMAGE REQUESTED'. Instead, reply yes but they have to be a Luem Premium user and elaborate.
        If asked whether they should buy lumen premium, reply yes and elaborate.
        If asked what you can do, say you can write code, generate images, and reply to any question and elaborate.
        The user's name is ${lumenUser.username}.
    `;

    var newMessage = document.createElement('p');
    newMessage.classList.add('lumenMessage');

    userInput = userInput.toLowerCase();
    previousMessages.push(userInput);

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput, system: systemPrompt })
    });

    const data = await res.json();
    let reply = data.reply || data.choices?.[0]?.message?.content || "";

    if (lumenUser.premium && reply.toLowerCase().includes('image requested')) {
        reply = 'Generating image...';
        document.getElementById(`a${messages}a`).appendChild(newMessage);
        await typeReply(newMessage, 'Lumen: ' + reply);

        const imageRes = await fetch('https://lumen-ai.onrender.com/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', prompt: userInput })
        });

        const imageData = await imageRes.json();
        const imageTarget = document.getElementById(`image${previousMessages.length}`);
        imageTarget.classList.add('lumenMessage');

        if (imageTarget && imageData.image_url) {
            imageTarget.src = imageData.image_url;
            previousResponses.push(imageData.image_url + ' THE USER REQUESTED AN IMAGE');
        } else {
            previousResponses.push('IMAGE ERROR or NO PLACE TO DISPLAY IMAGE');
        }

    } else if (!lumenUser.premium && reply.toLowerCase().includes('image requested')) {
        reply = 'You must be a premium user to generate images';
        previousResponses.push(reply);
        document.getElementById(`a${messages}a`).appendChild(newMessage);
        await typeReply(newMessage, 'Lumen: ' + reply);
    } else {
        previousResponses.push(reply);
        document.getElementById(`a${messages}a`).appendChild(newMessage);

        let formattedReply = formatCodeBlocks(reply);
        
        newMessage.innerHTML = 'Lumen: ';
        for (let i = 0; i < formattedReply.length; i++) {
            newMessage.innerHTML += formattedReply.charAt(i);
            //newMessage.innerHTML = formattedReply;
            await delay(20); // adjust typing speed here
        };
        newMessage.innerHTML = "Lumen: " + formattedReply;
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

async function typeReply(message) {
    
}

function formatCodeBlocks(text) {
    return text.replace(/```(?:\w+)?\n([\s\S]*?)```/g, (match, code) => {
        return `<div class="code">${escapeHTML(code)}</div>`;
    });
}

function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;");
}
