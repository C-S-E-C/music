async function loading() {
    // Polling safety: wait until api object and user properties exist
    if (typeof api === 'undefined' || !api.me) {
        setTimeout(loading, 200);
        return;
    }

    const loadingEl = document.getElementById("loading");

    // Scenario A: User is not in beta (Fade out loader overlay immediately)
    if (!api.me.is_beta || localStorage.getItem("settings.beta-loading-page") === "false") {
        hideLoader(loadingEl);
        return;
    }

    // Scenario B: Beta user (Trigger handwriting class)
    loadingEl.classList.add("animate-path");

    // Clean up loader layer after the 5s animation completes
    setTimeout(() => {
        hideLoader(loadingEl);
    }, 5000);
}

function hideLoader(element) {
    if (!element) return;
    element.classList.add("fade-out");
    
    // Completely remove element visibility from DOM flow after transitions complete
    setTimeout(() => {
        element.style.display = "none";
    }, 1000);
}

// Initialization
document.addEventListener("DOMContentLoaded", () => {
    loading();
});