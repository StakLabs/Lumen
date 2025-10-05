var email

var password

var clicked;

var username

var savedusername = '';

const verifypath = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

//JSON.parse(localStorage.getItem('users'))

let users = [
    {
      username: 'Ayaan',
      email: 'ayaan.khalique3@gmail.com',
      password: 'sd',
      tier: 'loyal'
    },
    {
      username: 'Khalique',
      email: 'khaliquer@gmail.com',
      password: 'Oyster@22',
      tier: 'premium'
    },
    {
      username: 'Aasma',
      email: 'nicezara@gmail.com',
      password: 'apple',
      tier: 'free'
    },
    {
      username: 'Babu',
      email: 'muhammadbashir@gmail.com',
      password: 'hi',
      tier: 'ultra'
    },
    {
      username: 'Emaan',
      email: 'emaan.khalique@gmail.com',
      password: 'nothing',
      tier: 'loyal'
   }
];
/*
[{
    username: 'Ayaan',
    email: 'ayaan@example.com',
    password: 'student123'
}, {
    username: 'Wasiullah',
    email: 'wasiullah@example.com', 
    password: 'teacher321'
}]
*/

async function signin() {
    const password = document.getElementById('password').value;
    const usernameOrEmail = document.getElementById('username').value;

    // Find user by username or email
    const user = users.find(u =>
        u.username === usernameOrEmail || u.email === usernameOrEmail
    );

    if (!user) {
        alert('Please Check Username or Email');
        return;
    }

    if (user.password !== password) {
        alert('Please Check Email or Password');
        return;
    }
    localStorage.setItem('lumenUser', JSON.stringify(user));

    document.querySelector('.all').classList.add('hidden');
    document.body.innerHTML += '<div id="load"></div>';
    document.getElementById('load').classList.add('load');
    // Redirect after a short delay if you want
    // await delay(1000);
    window.location.href = "https://staklabs.github.io/Lumen/";
}

function signup(newId) {
    email = document.getElementById('email2').value
    password = document.getElementById('password2').value
    username = document.getElementById('username2').value

    var newId

    if (users.length == 0) {
        newId = 0;
    }
    else {
        newId = users.length
    }

    if (!CheckUserExist(email)) {
        if (email.match(verifypath)) {
            if (username && password) {
                const newuser = {
                username,
                email,
                password,
                id: newId
                }
                users.push(newuser);
                alert('Thanks for Signing Up ' + username + '! Please Sign In to Continue')
                localStorage.setItem('lumenUser', JSON.stringify(users));

            }
            else {
                alert('Please Fill in Form Completely')
            }
        }
        else {
            alert('Please Input a Valid Email')
        }
    
    }
    else {
        alert('That Email is Already Registered');
    }
}

function CheckUserExist(email) {

    //fetching updated user from local storage
    users = JSON.parse(localStorage.getItem('users')) ? JSON.parse(localStorage.getItem('users')) : []
    let doesExist = false
    //debugger;
    users.forEach((check) => {
       if (check.email == email) {
        doesExist = true;
       }
    });
    return doesExist;
}


async function forgotPassword() {
    if (localStorage) {
        window.location.href="Forgot-Password.html";
    }
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

//localStorage.clear()
//johndoe@example.com
//teacher321
//student123
//0187009@schoolsnet.act.edu.au

/*
when signed in:
set local storage for login user
redirect to new page
do not allow user to paste url in browser
allow hompage to only allow users
localStorage.setItem('xyz', 'login successfully');
say welcome username in alert message
*/

function membership() {
    if (!clicked) {
        document.querySelector('.membership').innerText = 'Click to hide membership details';
        clicked = true;
        document.body.innerHTML += `<table>
                                        <tr>
                                            <th></th>
                                            <th>Free</th>
                                            <th>Premium</th>
                                        </tr>
                                        <tr>
                                            <td>Access to all buttons</td>
                                            <td>No</td>
                                            <td>Yes</td>
                                    </table>`
    } else {
        document.querySelector('.membership').innerText = 'Click to show membership details';
        clicked = false;
    }
}
