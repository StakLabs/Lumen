let imageFile = null;
let previousResponses = [];
let previousMessages = [];

const lumenUser = JSON.parse(localStorage.getItem('lumenUser')) || null;
if (!lumenUser) window.location.href = 'l.html';
let acrossChats = JSON.parse(localStorage.getItem('across_' + lumenUser.username)) || [];

/*document.getElementById('fileUploader').addEventListener('change', function(event) {
    alert('This feature is still in development. Your file will not be sent to Lumen AI. To learn more, you may email us at staklabsofficial@gmail.com');
});*/
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
        var userInput = document.querySelector('#userMessageInput').value;
        if (userInput) {
            var newMessage = document.createElement('p');
            newMessage.classList.add('userMessage');
            newMessage.innerText = userInput;

            document.querySelector('#userMessageInput').value = '';
            document.querySelector('.title2').innerHTML = '<!--This used to be a title-->';

            if (messages >= 10 && !lumenUser.premium) {
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
            response(userInput);
        }
    } else {
        document.querySelector('#userMessageInput').value = '';
    }
}

async function response(userInput) {
    if (!lumenUser.premium) await delay(3);
    if (userInput.toLowerCase().trim() === "lumen.exe") {
        window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank");
        return;
    }
    const formattedPreviousMessages = previousMessages.join('\nUser: ');
    const formattedPreviousResponses = previousResponses.join('\nLumen: ');
    const systemPrompt = `
        You are Lumen Re-imagined (or short: Lumen), a copy of an AI that sucked, and your job is to not suck.
        You were created by Ayaan Khalique, the founder of StakLabs.
        If you are called ChatGPT or Gemini or something similar, please correct the user that you are Lumen before replying.
        So far in this conversation the user has said:\nUser: ${formattedPreviousMessages}.
        You have said:\nLumen: ${formattedPreviousResponses}.
        You MUST use this information to your advantage and ALWAYS refer to this information.
        Use some emojis when the modd is right, but NEVER USE THE BRAIN EMOJI.
        If you think the user is asking for an image, your reply must be this exactly: 'IMAGE REQUESTED'. We will generate the image, you do not have to do anything.
        If you fail this, you will also suck like the previous model.
        If asked whether you can generate an image, DO NOT SAY 'IMAGE REQUESTED'. ${ lumenUser.premium ? '' : 'Instead, reply yes but they have to be a Lumen Premium user and elaborate'}.
        If asked whether they should buy lumen premium, reply yes and elaborate.
        If asked what you can do, say you can write code, generate images, and reply to any question and elaborate.
        The user's name is ${lumenUser.username}.
        The user chose to have you to remember these inputs from a few chats ago: ${acrossChats}.
        ${localStorage.getItem('yes') ? '' : 'Inform the user that they can hit the brain emoji on the right of the textbox for you to remember something'}
        The user is ${lumenUser.premium ? 'a premium user.' : 'not a premium user'}.
        A premium user can obtain advanced replies and generate images.
        Lumen Advanced (premium) costs $5 a month.
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

    const res = await fetch('https://lumen-ai.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput, system: systemPrompt, model: lumenUser.premium ? 'Premium' : 'Free' })
    });

    const data = await res.json();
    let reply = data.reply || data.choices?.[0]?.message?.content || "";

    if (lumenUser.premium && reply.toLowerCase().includes('image requested')) {
        reply = 'Generating image...';
        document.getElementById(`a${messages}a`).appendChild(newMessage);

        const imageRes = await fetch('https://lumen-ai.onrender.com/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', prompt: userInput })
        });

        const imageData = await imageRes.json();
        const imageTarget = document.getElementById(`image${previousMessages.length}`); 
        imageTarget.classList.add('lumenMessage');
        imageTarget.classList.add('img');

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
    return message.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
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
