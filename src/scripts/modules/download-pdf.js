(function () {
    "use strict";

    var PDF_SCRIPTS = [
        "public/assets/vendor/html2canvas.min.js",
        "public/assets/vendor/jspdf.umd.min.js"
    ];
    var loadingPromise = null;

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[src="' + src + '"]');
            if (existing) {
                if (existing.dataset.loaded === "true") {
                    resolve();
                    return;
                }
                existing.addEventListener("load", resolve, { once: true });
                existing.addEventListener("error", reject, { once: true });
                return;
            }

            var script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = function () {
                script.dataset.loaded = "true";
                resolve();
            };
            script.onerror = function () {
                reject(new Error("Impossible de charger " + src));
            };
            document.head.appendChild(script);
        });
    }

    function loadPdfTools() {
        if (window.html2canvas && window.jspdf && window.jspdf.jsPDF) {
            return Promise.resolve();
        }
        if (!loadingPromise) {
            loadingPromise = PDF_SCRIPTS.reduce(function (chain, src) {
                return chain.then(function () { return loadScript(src); });
            }, Promise.resolve());
        }
        return loadingPromise.then(function () {
            if (!window.html2canvas || !window.jspdf || !window.jspdf.jsPDF) {
                throw new Error("Outils PDF indisponibles");
            }
        });
    }

    function waitForRender() {
        var fontReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        var images = Array.prototype.slice.call(document.images || []);
        var imageReady = Promise.all(images.map(function (image) {
            if (image.complete) return Promise.resolve();
            return new Promise(function (resolve) {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
            });
        }));

        return Promise.all([fontReady, imageReady]).then(function () {
            return new Promise(function (resolve) {
                window.requestAnimationFrame(function () {
                    window.requestAnimationFrame(resolve);
                });
            });
        });
    }

    function setButtonState(isLoading) {
        var button = document.querySelector("[data-cv-download]");
        if (!button) return;

        button.disabled = isLoading;
        button.classList.toggle("is-loading", isLoading);
        button.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    window.downloadCVasPDF = function () {
        var element = document.querySelector(".cv-document");
        if (!element) {
            window.alert("Le contenu du CV est introuvable.");
            return;
        }

        setButtonState(true);
        document.body.classList.add("is-pdf-export");

        loadPdfTools()
            .then(waitForRender)
            .then(function () {
                return window.html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    scrollX: 0,
                    scrollY: 0
                });
            })
            .then(function (canvas) {
                var pdf = new window.jspdf.jsPDF({
                    unit: "mm",
                    format: "a4",
                    orientation: "portrait",
                    compress: true
                });

                pdf.addImage(
                    canvas.toDataURL("image/jpeg", 0.98),
                    "JPEG",
                    0,
                    0,
                    210,
                    297
                );
                pdf.save("cv-laurelenne-poussin.pdf");
            })
            .catch(function (error) {
                window.alert("Le PDF n'a pas pu être généré : " + error.message);
            })
            .finally(function () {
                document.body.classList.remove("is-pdf-export");
                setButtonState(false);
            });
    };
})();
