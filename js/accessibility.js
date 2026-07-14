class accessibility {
    keydown(e) {
        console.log(e);  
    }
}

if (!window.player && window.top == window.self) {
    document.addEventListener('DOMContentLoaded', () => {
        window.accessibilityAPI = new accessibility();
    });
}

document.addEventListener('keydown', function(e) {
  top.accessibilityAPI.keydown(e.code);
});