(function () {
    "use strict";

    var DATA_URL = "src/data/projects.json";
    var lightboxState = {
        images: [],
        index: 0,
        root: null
    };

    function getProjectId() {
        var params = new URLSearchParams(window.location.search);
        return params.get("id") || "";
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function getStatusLabels(project) {
        if (Array.isArray(project.status) && project.status.length) {
            return project.status;
        }
        if (typeof project.status === "string" && project.status.trim()) {
            return [project.status.trim()];
        }
        return ["Terminé"];
    }

    function getStatusClassName(status) {
        return String(status || "termine")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function isVideoUrl(url) {
        return /\.(mp4|webm|ogg)(?:[?#].*)?$/i.test(url);
    }

    function isImageUrl(url) {
        return /\.(gif|png|jpe?g|webp|avif|svg)(?:[?#].*)?$/i.test(url);
    }

    function detectMediaType(url) {
        if (isVideoUrl(url)) return "video";
        if (isImageUrl(url)) return "image";
        return "link";
    }

    function normalizeMediaItem(rawItem, projectTitle, index) {
        var item = null;
        if (typeof rawItem === "string") {
            item = { src: rawItem };
        } else if (rawItem && typeof rawItem === "object") {
            item = rawItem;
        }

        if (!item || !item.src) return null;

        var type = item.type;
        if (type !== "image" && type !== "video" && type !== "link") {
            type = detectMediaType(item.src);
        }

        return {
            src: String(item.src),
            type: type,
            alt: item.alt || ("Media " + (index + 1) + " du projet " + projectTitle),
            caption: item.caption || "",
            poster: item.poster || ""
        };
    }

    function getProjectMedia(project) {
        var media = [];

        if (Array.isArray(project.medias)) {
            for (var i = 0; i < project.medias.length; i++) {
                var normalized = normalizeMediaItem(project.medias[i], project.title, media.length);
                if (normalized) media.push(normalized);
            }
        }

        if (!media.length && project.apercu) {
            media.push({
                src: String(project.apercu),
                type: "image",
                alt: project.apercu_alt || ("Aperçu du projet " + project.title),
                caption: "",
                poster: ""
            });
        }

        var deduped = [];
        var seen = Object.create(null);
        for (var j = 0; j < media.length; j++) {
            if (seen[media[j].src]) continue;
            seen[media[j].src] = true;
            deduped.push(media[j]);
        }

        return deduped;
    }

    function renderVideoPreview(project) {
        var previewEl = document.getElementById("proj-apercu-video");
        if (!previewEl) return;
        var previewBlock = previewEl.closest(".project-block");

        var previewUrl = project.apercuVideo || project.demo;
        if (!previewUrl) {
            previewEl.innerHTML = "";
            if (previewBlock) previewBlock.hidden = true;
            return;
        }

        if (previewBlock) previewBlock.hidden = false;

        if (isVideoUrl(previewUrl)) {
            previewEl.innerHTML =
                '<video class="project-video-preview-media" autoplay muted loop controls preload="metadata" playsinline>' +
                    '<source src="' + escapeHtml(previewUrl) + '">' +
                    'Votre navigateur ne supporte pas la lecture video.' +
                '</video>';
            return;
        }

        if (isImageUrl(previewUrl)) {
            previewEl.innerHTML =
                '<img class="project-video-preview-media" src="' + escapeHtml(previewUrl) + '" alt="Aperçu vidéo du projet ' + escapeHtml(project.title) + '">';
            return;
        }

        previewEl.innerHTML =
            '<a class="project-code-link" href="' + escapeHtml(previewUrl) + '" target="_blank" rel="noopener noreferrer">' +
                '<i class="fa fa-external-link" aria-hidden="true"></i> Ouvrir l\'apercu video' +
            '</a>';
    }

    function buildMediaCard(item, index, projectTitle, imageIndex) {
        var mediaHtml = "";

        if (item.type === "video") {
            mediaHtml =
                '<video class="project-gallery-media" controls preload="metadata" playsinline ' +
                (item.poster ? 'poster="' + escapeHtml(item.poster) + '" ' : "") +
                'aria-label="Video ' + (index + 1) + ' du projet ' + escapeHtml(projectTitle) + '">' +
                    '<source src="' + escapeHtml(item.src) + '">' +
                    'Votre navigateur ne supporte pas la lecture video.' +
                '</video>';
        } else if (item.type === "link") {
            mediaHtml =
                '<a class="project-gallery-link" href="' + escapeHtml(item.src) + '" target="_blank" rel="noopener noreferrer">' +
                    '<i class="fa fa-external-link" aria-hidden="true"></i> Ouvrir la demo' +
                '</a>';
        } else {
            mediaHtml =
                '<button type="button" class="project-gallery-zoom-trigger" data-gallery-image-index="' + imageIndex + '" aria-label="Agrandir l\'image ' + (imageIndex + 1) + ' du projet ' + escapeHtml(projectTitle) + '">' +
                    '<img class="project-gallery-media" src="' + escapeHtml(item.src) + '" alt="' + escapeHtml(item.alt) + '" loading="lazy">' +
                    '<span class="project-gallery-zoom-hint"><i class="fa fa-search-plus" aria-hidden="true"></i> Agrandir</span>' +
                '</button>';
        }

        return (
            '<figure class="project-media-card project-gallery-item">' +
                mediaHtml +
                (item.caption ? '<figcaption>' + escapeHtml(item.caption) + '</figcaption>' : "") +
            '</figure>'
        );
    }

    function ensureLightbox() {
        if (lightboxState.root) return lightboxState.root;

        var root = document.createElement("div");
        root.className = "media-lightbox";
        root.setAttribute("hidden", "");
        root.setAttribute("aria-hidden", "true");
        root.innerHTML =
            '<div class="media-lightbox-backdrop" data-lightbox-close="true"></div>' +
            '<div class="media-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Visualisation image projet">' +
                '<button type="button" class="media-lightbox-close" aria-label="Fermer la visionneuse">' +
                    '<i class="fa fa-times" aria-hidden="true"></i>' +
                '</button>' +
                '<button type="button" class="media-lightbox-nav media-lightbox-nav--prev" aria-label="Image precedente">' +
                    '<i class="fa fa-chevron-left" aria-hidden="true"></i>' +
                '</button>' +
                '<figure class="media-lightbox-figure">' +
                    '<img class="media-lightbox-image" src="" alt="" loading="eager">' +
                    '<figcaption class="media-lightbox-caption"></figcaption>' +
                    '<p class="media-lightbox-counter" aria-live="polite"></p>' +
                '</figure>' +
                '<button type="button" class="media-lightbox-nav media-lightbox-nav--next" aria-label="Image suivante">' +
                    '<i class="fa fa-chevron-right" aria-hidden="true"></i>' +
                '</button>' +
            '</div>';

        document.body.appendChild(root);
        lightboxState.root = root;

        root.addEventListener("click", function (event) {
            if (event.target.hasAttribute("data-lightbox-close") || event.target.classList.contains("media-lightbox")) {
                closeLightbox();
            }
        });

        var closeBtn = root.querySelector(".media-lightbox-close");
        var prevBtn = root.querySelector(".media-lightbox-nav--prev");
        var nextBtn = root.querySelector(".media-lightbox-nav--next");
        if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
        if (prevBtn) prevBtn.addEventListener("click", function () { stepLightbox(-1); });
        if (nextBtn) nextBtn.addEventListener("click", function () { stepLightbox(1); });

        document.addEventListener("keydown", function (event) {
            if (!isLightboxOpen()) return;
            if (event.key === "Escape") {
                closeLightbox();
                return;
            }
            if (event.key === "ArrowLeft") {
                stepLightbox(-1);
                return;
            }
            if (event.key === "ArrowRight") {
                stepLightbox(1);
            }
        });

        return root;
    }

    function isLightboxOpen() {
        return !!(lightboxState.root && !lightboxState.root.hasAttribute("hidden"));
    }

    function updateLightboxImage() {
        var root = ensureLightbox();
        var total = lightboxState.images.length;
        if (!total) return;

        if (lightboxState.index < 0) lightboxState.index = total - 1;
        if (lightboxState.index >= total) lightboxState.index = 0;

        var current = lightboxState.images[lightboxState.index];
        var imageEl = root.querySelector(".media-lightbox-image");
        var captionEl = root.querySelector(".media-lightbox-caption");
        var counterEl = root.querySelector(".media-lightbox-counter");
        var prevBtn = root.querySelector(".media-lightbox-nav--prev");
        var nextBtn = root.querySelector(".media-lightbox-nav--next");

        if (imageEl) {
            imageEl.src = current.src;
            imageEl.alt = current.alt;
        }

        if (captionEl) {
            captionEl.textContent = current.caption;
            captionEl.hidden = !current.caption;
        }

        if (counterEl) {
            counterEl.textContent = (lightboxState.index + 1) + " / " + total;
        }

        if (prevBtn) prevBtn.disabled = total < 2;
        if (nextBtn) nextBtn.disabled = total < 2;
    }

    function openLightbox(index) {
        if (!lightboxState.images.length) return;
        lightboxState.index = Number(index) || 0;
        updateLightboxImage();

        var root = ensureLightbox();
        root.removeAttribute("hidden");
        root.setAttribute("aria-hidden", "false");
        document.body.classList.add("lightbox-open");

        var closeBtn = root.querySelector(".media-lightbox-close");
        if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
        if (!lightboxState.root) return;
        lightboxState.root.setAttribute("hidden", "");
        lightboxState.root.setAttribute("aria-hidden", "true");
        document.body.classList.remove("lightbox-open");
    }

    function stepLightbox(delta) {
        if (!lightboxState.images.length) return;
        lightboxState.index += delta;
        updateLightboxImage();
    }

    function bindGalleryZoom(galleryEl) {
        if (!galleryEl) return;
        galleryEl.addEventListener("click", function (event) {
            var trigger = event.target.closest(".project-gallery-zoom-trigger");
            if (!trigger || !galleryEl.contains(trigger)) return;

            var index = Number(trigger.getAttribute("data-gallery-image-index"));
            if (Number.isNaN(index)) return;

            event.preventDefault();
            openLightbox(index);
        });
    }

    function renderMediaGallery(project) {
        var galleryEl = document.getElementById("proj-gallery");
        if (!galleryEl) return;

        var media = getProjectMedia(project);
        var imageItems = [];
        if (!media.length) {
            galleryEl.innerHTML = '<p class="project-gallery-empty">Aucun media disponible pour ce projet.</p>';
            return;
        }

        galleryEl.innerHTML = media.map(function (item, index) {
            var imageIndex = -1;
            if (item.type === "image") {
                imageIndex = imageItems.length;
                imageItems.push({
                    src: item.src,
                    alt: item.alt,
                    caption: item.caption || project.title
                });
            }
            return buildMediaCard(item, index, project.title, imageIndex);
        }).join("");

        lightboxState.images = imageItems;
        if (isLightboxOpen()) closeLightbox();
        ensureLightbox();
        bindGalleryZoom(galleryEl);
    }

    function renderExtraSections(project) {
        var container = document.getElementById("proj-extra-sections");
        if (!container) return;

        var sections = Array.isArray(project.sectionsDetails) ? project.sectionsDetails : [];
        if (!sections.length) {
            container.innerHTML = "";
            return;
        }

        container.innerHTML = sections.map(function (section) {
            var title = section && section.title ? section.title : "Detail";
            var content = section ? section.content : "";
            var contentHtml = "";

            if (Array.isArray(content)) {
                contentHtml = '<ul class="project-list">' + content.map(function (item) {
                    return "<li>" + escapeHtml(item) + "</li>";
                }).join("") + "</ul>";
            } else {
                contentHtml = "<p>" + escapeHtml(content || "") + "</p>";
            }

            return (
                '<article class="project-block">' +
                    "<h2>" + escapeHtml(title) + "</h2>" +
                    contentHtml +
                "</article>"
            );
        }).join("");
    }

    function renderProject(project) {
        document.title = "Projet - " + project.title;
        var statusesEl = document.getElementById("proj-statuses");
        var statusLabels = getStatusLabels(project);

        var metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute("content", "Etude de cas - " + project.title);

        setText("proj-eyebrow", project.eyebrow || "Etude de cas");
        setText("proj-title", project.title);
        setText("proj-lead", project.lead);
        setText("proj-objectif", project.objectif);

        if (statusesEl) {
            statusesEl.innerHTML = statusLabels.map(function (statusLabel) {
                return '<span class="project-status-badge project-status-badge--' + escapeHtml(getStatusClassName(statusLabel)) + '">' + escapeHtml(statusLabel) + '</span>';
            }).join("");
        }

        var techEl = document.getElementById("proj-tech");
        if (techEl && Array.isArray(project.tech)) {
            techEl.innerHTML = project.tech.map(function (t) {
                return "<span>" + escapeHtml(t) + "</span>";
            }).join("");
        }

        var travailEl = document.getElementById("proj-travail");
        if (travailEl && Array.isArray(project.travailRealise)) {
            travailEl.innerHTML = project.travailRealise.map(function (item) {
                return "<li>" + escapeHtml(item) + "</li>";
            }).join("");
        }

        renderExtraSections(project);
        renderMediaGallery(project);
        renderVideoPreview(project);

        var siteBlockEl = document.getElementById("proj-site-block");
        var siteEl = document.getElementById("proj-site");
        if (siteBlockEl && siteEl) {
            var siteUrl = project.site || project.website || project.live || "";
            if (typeof siteUrl === "string") siteUrl = siteUrl.trim();
            if (siteUrl) {
                siteBlockEl.hidden = false;
                siteEl.innerHTML =
                    '<a class="project-code-link" href="' + escapeHtml(siteUrl) + '" target="_blank" rel="noopener noreferrer">' +
                        '<i class="fa fa-globe" aria-hidden="true"></i> Ouvrir le site' +
                    '</a>';
            } else {
                siteBlockEl.hidden = true;
                siteEl.innerHTML = "";
            }
        }

        var codeEl = document.getElementById("proj-code");
        if (codeEl) {
            if (project.github) {
                codeEl.innerHTML = '<a class="project-code-link" href="' + escapeHtml(project.github) + '" target="_blank" rel="noopener noreferrer"><i class="fab fa-github" aria-hidden="true"></i> Voir sur GitHub</a>';
            } else {
                codeEl.innerHTML = '<span class="project-code-link is-disabled"><i class="fa fa-lock" aria-hidden="true"></i> Depot prive</span>';
            }
        }
    }

    function showError(message) {
        var main = document.querySelector(".project-detail-main");
        if (!main) return;
        main.innerHTML =
            '<section class="project-hero">' +
                '<p class="project-eyebrow">Erreur</p>' +
                '<h1 class="project-title">' + escapeHtml(message) + '</h1>' +
                '<a href="index.html#realisations" class="project-back-link">' +
                    '<i class="fa fa-arrow-left" aria-hidden="true"></i> Retour aux realisations' +
                '</a>' +
            '</section>';
    }

    function init() {
        var id = getProjectId();
        if (!id) {
            showError("Aucun projet specifie.");
            return;
        }

        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error("Impossible de charger les donnees projet.");
                return res.json();
            })
            .then(function (projects) {
                var project = null;
                for (var i = 0; i < projects.length; i++) {
                    if (projects[i].id === id) {
                        project = projects[i];
                        break;
                    }
                }
                if (!project) {
                    showError("Projet introuvable.");
                    return;
                }
                renderProject(project);
            })
            .catch(function () {
                showError("Erreur de chargement des donnees.");
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
