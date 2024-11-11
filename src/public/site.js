function convertDate(date) {
    let new_date = (typeof date === "string" ? new Date(date) : date);
    const fmt = new Intl.DateTimeFormat("en-UK", {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'Europe/Zagreb'
    });
    new_date = fmt.format(new_date);
    return new_date;
}

document.getElementById("subbtn").addEventListener("click", function () {
    let ordPath = '';
    let body = '';
    if(document.getElementById("SQLvuln").checked) {
        ordPath = '/getOrderInfo'; 
        body = `orderId=${document.getElementById("orderId").value}`;
    } else {
        ordPath = '/getOrderInfoSecure';
        body = `orderId=${encodeURIComponent(document.getElementById("orderId").value)}`;
    }

    fetch(ordPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body
    }).then(res => res.json()).then(data => {
        const orderInfo = document.querySelector('.ord-info');
        orderInfo.innerHTML = '';

        if(!data.message && !data.error) {
            data.forEach(order => {
                const ordCont = document.createElement('div');
                const title = document.createElement('h2');
                title.textContent = `Podaci o narudžbi br. ${order.order_id}`;
                title.classList.add('ord-title');
                ordCont.appendChild(title);
                const cName = document.createElement('p');
                cName.textContent = `Kupac: ${order.customer_fname} ${order.customer_lname}`;
                cName.classList.add('ord-p');
                ordCont.appendChild(cName);
                const delAddr = document.createElement('p');
                delAddr.textContent = `Adresa za dostavu: ${order.del_adr}`;
                delAddr.classList.add('ord-p');
                ordCont.appendChild(delAddr);
                const createdAt = document.createElement('p');
                createdAt.textContent = `Vrijeme narudžbe: ${convertDate(order.created_at)}`;
                createdAt.classList.add('ord-p');
                ordCont.appendChild(createdAt);
                const ordState = document.createElement('p');
                ordState.textContent = `Stanje narudžbe: ${order.order_state}`;
                ordState.classList.add('ord-p');
                ordCont.appendChild(ordState);

                orderInfo.appendChild(ordCont);
            });
        } else if(data.message) {
            const messageP = document.createElement('p');
            messageP.textContent = data.message;
            messageP.classList.add('ord-p2');
            orderInfo.appendChild(messageP);
        } else {
            const errP = document.createElement('p');
            errP.textContent = data.error;
            errP.classList.add('ord-p2');
            orderInfo.appendChild(errP);
        }
    }).catch(err => {
        console.log(err);
    });
});