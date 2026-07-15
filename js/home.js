function showMe(){
    if (document.querySelector("#me-wrapper #me").style.opacity == "1"){
        document.querySelector("#me-wrapper #me").style.opacity = "0";
        document.querySelector("#me-wrapper #me").style.width = "0 !important";
        document.querySelector("#me-wrapper #me").style.height = "0 !important";
    } else {
        document.querySelector("#me-wrapper #me").style.opacity = "1";
        document.querySelector("#me-wrapper #me").style.width = "50px";
        document.querySelector("#me-wrapper #me").style.height = "50px";
    }
}

function openLargePlayer() {
    const main = document.getElementById('main');
    if (main) {
        main.src = 'pages/player.html';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const cover = document.querySelector('#player #cover');
    if (cover) {
        cover.addEventListener('click', openLargePlayer);
    }
});
