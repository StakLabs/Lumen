let imageFile = null;
let previousResponses = [];
let previousMessages = [];

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
        You are Lumen Re-imagined, a copy of an AI that sucked, and your job is to not suck.
        So far in this conversation the user has said: ${previousMessages}.
        You have said: ${previousResponses}.
        Use this information to your advantage.
        If you think the user is asking for an image, your reply must be this exactly: 'IMAGE REQUESTED'.
        If you fail this, you will also suck like the previous model.
    `;

    var newMessage = document.createElement('p');
    newMessage.classList.add('lumenMessage');

    userInput = userInput.toLowerCase();
    previousMessages.push(userInput);

    const res = await fetch('https://timely-2.onrender.com/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userInput, system: systemPrompt })
    });

    const data = await res.json();
    const reply = data.reply || data.choices?.[0]?.message?.content || "";
    const lumenUser = { premium: true };

    if (lumenUser.premium && reply.toLowerCase().includes('image requested')) {
        const imageRes = await fetch('https://timely-2.onrender.com/ask', {
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
    } else if (!lumenUser.premium) {
        reply = 'You must be a premium user to generate images';
        previousResponses.push(reply);
    } else {
        previousResponses.push(reply);
    }

    document.getElementById(`a${messages}a`).appendChild(newMessage);

    let formattedReply = reply.replace(/```/g, (match, offset, string) => {
        const count = (string.slice(0, offset).match(/```/g) || []).length;
        return count % 2 === 0 ? '<div class="code">' : '</div>';
    });

    newMessage.innerHTML = 'Lumen: ' + formattedReply;
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