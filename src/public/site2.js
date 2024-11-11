document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();

    let loginPath = '';
    if(document.getElementById("BAvuln").checked) {
        loginPath = '/login';
    } else {
        loginPath = '/loginSecure';
    }

    fetch(loginPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(document.getElementById("username").value)}&password=${encodeURIComponent(document.getElementById("password").value)}`
    }).then(res => res.json()).then(data => {
        console.log(data);
        const loginInfo = document.querySelector('.login-mess');
        loginInfo.innerHTML = '';
        const messP = document.createElement('p');
        messP.textContent = data.message;
        messP.classList.add('login-p2');
        loginInfo.appendChild(messP);
    }).catch(err => console.log(err));
});