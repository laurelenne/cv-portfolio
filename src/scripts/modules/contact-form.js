(function () {
    "use strict";

    function setStatus(statusEl, message, type) {
        if (!statusEl) return;
        statusEl.textContent = message || "";
        statusEl.classList.remove("is-success", "is-error");
        if (type) statusEl.classList.add(type);
    }

    function initContactForm() {
        var form = document.getElementById("contact-form");
        if (!form) return;

        var statusEl = document.getElementById("contact-status");
        var submitBtn = form.querySelector("button[type='submit']");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            var formData = new FormData(form);
            if (formData.get("_honey")) return;

            setStatus(statusEl, "Envoi en cours...", null);
            if (submitBtn) submitBtn.disabled = true;

            fetch(form.action, {
                method: "POST",
                body: formData,
                headers: {
                    Accept: "application/json"
                }
            })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("submit_failed");
                    }
                    return response.json().catch(function () { return {}; });
                })
                .then(function () {
                    form.reset();
                    setStatus(statusEl, "Message envoyé. Merci, je vous réponds rapidement.", "is-success");
                })
                .catch(function () {
                    setStatus(statusEl, "Envoi impossible pour le moment. Essayez à nouveau dans quelques instants.", "is-error");
                })
                .finally(function () {
                    if (submitBtn) submitBtn.disabled = false;
                });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initContactForm);
    } else {
        initContactForm();
    }
})();
