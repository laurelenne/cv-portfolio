/* jshint esversion: 6 */
(function () {
    "use strict";

    var DATA_BASE = "src/data/";
    var ERR_MSG = "Données indisponibles. Ouvrez la page via un serveur web local.";
    var DOMAIN_ORDER = ["frontend", "wordpress", "seo", "backend", "bdd", "outils", "methodologie"];
    var CV_SKILL_KEYS = {
        frontend: ["html", "css", "javascript", "vue", "responsive", "accessibilite", "bootstrap", "typescript", "json", "sass"],
        wordpress: ["wordpress", "astra", "gutenberg", "wordpress-css", "wordpress-forms", "wordpress-cache", "wordpress-menus", "wordpress-seo-plugins"],
        seo: ["seo-on-page", "meta-title-description", "heading-structure", "content-optimization", "search-console", "google-analytics", "keyword-research", "pagespeed", "lighthouse", "sitemap"],
        backend: ["java", "spring", "rest", "poo", "mvc"],
        bdd: ["sql", "postgresql", "mysql", "phpmyadmin"],
        outils: ["git", "github", "figma", "vscode", "canva", "npm", "devtools", "postman"],
        methodologie: ["markdown", "merise", "uml", "agile", "trello"]
    };
    var CV_TIMELINE_LIMITS = {
        experience: 4,
        formation: 2,
        diplome: 1
    };
    var CV_PROJECT_LIMIT = 3;
    var CV_PROJECT_ORDER = ["clicly.fr", "cv-portfolio", "freelance-webcore"];

    var DOMAIN_LABELS = {
        frontend: "Frontend",
        backend: "Backend",
        bdd: "Bases de données",
        wordpress: "WordPress",
        seo: "SEO",
        outils: "Outils",
        methodologie: "Méthodologie"
    };

    function escapeHtml(str) {
        return String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function fetchJSON(url) {
        return fetch(url).then(function (response) {
            if (!response.ok) throw new Error("HTTP " + response.status + " - " + url);
            return response.json();
        });
    }

    function setContent(id, html) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = html;
    }

    function setError(id, message) {
        setContent(id, '<p class="cv-loading">' + escapeHtml(message) + '</p>');
    }

    function renderIconHtml(iconString) {
        if (!iconString) return "";

        if (iconString.indexOf("icon:") === 0) {
            var filename = iconString.substring(5);
            return '<img src="public/assets/icons-skills/' + escapeHtml(filename) + '" alt="" class="icon-svg" loading="lazy">';
        }

        var iconClass = iconString.indexOf("fa:") === 0 ? iconString.substring(3) : iconString;
        return '<i class="' + escapeHtml(iconClass) + '" aria-hidden="true"></i>';
    }

    function buildSkillsHtml(data) {
        var html = '<div class="cv-skills-legend" aria-label="Légende des niveaux de compétences">'
            + '<span class="cv-skill-chip cv-skill-chip--mastery cv-skill-legend-chip">Maîtrise</span>'
            + '<span class="cv-skill-chip cv-skill-chip--intermediate cv-skill-legend-chip">Intermédiaire / notions</span>'
            + '</div>';

        sortDomains(data).forEach(function (domain) {
            var allowedKeys = CV_SKILL_KEYS[domain.domain];
            if (!allowedKeys) return;

            var shown = (domain.skills || []).filter(function (skill) {
                return allowedKeys.indexOf(skill.key) !== -1
                    && skill.showInCV !== false;
            }).sort(function (a, b) {
                return allowedKeys.indexOf(a.key) - allowedKeys.indexOf(b.key);
            });

            if (!shown.length) return;

            html += '<div class="cv-skill-domain">';
            html += '<p class="cv-skill-domain-title">' + escapeHtml(DOMAIN_LABELS[domain.domain] || domain.title) + '</p>';
            html += '<div class="cv-skill-chips">';

            shown.forEach(function (skill) {
                var levelClass = skill.level === "mastery" ? "cv-skill-chip--mastery" : "cv-skill-chip--intermediate";
                html += '<span class="cv-skill-chip ' + levelClass + '">';
                html += renderIconHtml(skill.icon);
                html += escapeHtml(skill.name);
                html += '</span>';
            });

            html += '</div></div>';
        });

        return html || '<p class="cv-loading">Aucune compétence trouvée.</p>';
    }

    function getDomainOrder(domain) {
        var index = DOMAIN_ORDER.indexOf(domain);
        return index === -1 ? DOMAIN_ORDER.length : index;
    }

    function sortDomains(data) {
        return (data || []).slice().sort(function (a, b) {
            return getDomainOrder(a.domain) - getDomainOrder(b.domain);
        });
    }

    function extractSortDate(item) {
        if (item.dateSort) {
            var parts = String(item.dateSort).split("/");
            if (parts.length === 2) {
                return (parseInt(parts[1], 10) || 0) * 100 + (parseInt(parts[0], 10) || 1);
            }
        }

        var match = String(item.date || "").match(/\d{4}/);
        return (match ? parseInt(match[0], 10) : 0) * 100;
    }

    function buildTimelineHtml(data) {
        var groups = {
            experience: [],
            formation: [],
            diplome: []
        };

        (data || [])
            .filter(function (item) {
                return item.showInCV !== false || item.onlyInCV === true;
            })
            .sort(function (a, b) {
                return extractSortDate(b) - extractSortDate(a);
            })
            .forEach(function (item) {
                if (item.tagType === "experience") groups.experience.push(item);
                if (item.tagType === "formation") groups.formation.push(item);
                if (item.tagType === "diplome") groups.diplome.push(item);
            });

        function getTimelineTypeLabel(item) {
            if (item.cvLabel) return item.cvLabel;
            if (item.tagType === "experience") return "Expérience";
            if (item.tagType === "formation") return "Formation";
            if (item.tagType === "diplome") return "Diplôme";
            return item.tag || "Parcours";
        }

        function renderItems(items) {
            if (!items.length) return "";

            return items.slice(0, CV_TIMELINE_LIMITS[items[0] && items[0].tagType] || 2).map(function (item) {
                    var desc = typeof item["desc-cv"] === "string" && item["desc-cv"] ? item["desc-cv"] : item.desc;
                    var chips = Array.isArray(item.chips) && item.chips.length
                        ? '<div class="cv-tl-chips">' + item.chips.map(function (chip) {
                            return '<span class="cv-tl-chip">' + escapeHtml(chip) + '</span>';
                        }).join("") + '</div>'
                        : "";

                    return '<div class="cv-tl-item">'
                        + '<div class="cv-tl-date">' + escapeHtml(item.date) + '</div>'
                        + '<div class="cv-tl-body">'
                        + '<span class="cv-tl-kind">' + escapeHtml(getTimelineTypeLabel(item)) + '</span>'
                        + '<p class="cv-tl-title">' + escapeHtml(item.title)
                        + (item.lieu ? ' <span class="cv-tl-lieu">- ' + escapeHtml(item.lieu) + '</span>' : "")
                        + '</p>'
                        + (desc ? '<p class="cv-tl-desc">' + escapeHtml(desc) + '</p>' : "")
                        + chips
                        + '</div></div>';
                }).join("");
        }

        return [
            renderItems(groups.experience),
            renderItems(groups.formation),
            renderItems(groups.diplome)
        ].join("") || '<p class="cv-loading">Aucune entrée trouvée.</p>';
    }

    function buildProjectsHtml(data) {
        var projects = (data || [])
            .filter(function (project) {
                return project.showInCV !== false;
            })
            .sort(function (a, b) {
                var orderA = CV_PROJECT_ORDER.indexOf(a.id);
                var orderB = CV_PROJECT_ORDER.indexOf(b.id);
                if (orderA !== -1 || orderB !== -1) {
                    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
                }
                var yearDiff = (Number(b.year) || 0) - (Number(a.year) || 0);
                return yearDiff || String(a.title || "").localeCompare(String(b.title || ""));
            })
            .slice(0, CV_PROJECT_LIMIT);

        if (!projects.length) {
            return '<p class="cv-loading">Aucun projet trouvé.</p>';
        }

        return projects.map(function (project) {
            var techHtml = (project.tech || []).slice(0, 6).map(function (tech) {
                return '<span class="cv-proj-chip">' + escapeHtml(tech) + '</span>';
            }).join("");

            var linksHtml = "";
            if (project.site) {
                linksHtml += '<a href="' + escapeHtml(project.site) + '" class="cv-proj-link" target="_blank" rel="noopener noreferrer">Site</a>';
            }
            if (project.github) {
                linksHtml += '<a href="' + escapeHtml(project.github) + '" class="cv-proj-link" target="_blank" rel="noopener noreferrer">GitHub</a>';
            }

            return '<article class="cv-proj">'
                + '<div class="cv-proj-meta">'
                + '<span class="cv-proj-year">' + escapeHtml(project.year) + '</span>'
                + '<span class="cv-proj-type">' + escapeHtml(project.type || "Projet") + '</span>'
                + (linksHtml ? '<span class="cv-proj-links">' + linksHtml + '</span>' : "")
                + '</div>'
                + '<p class="cv-proj-title">' + escapeHtml(project.title) + '</p>'
                + '<p class="cv-proj-lead">' + escapeHtml(project.lead) + '</p>'
                + (techHtml ? '<div class="cv-proj-chips">' + techHtml + '</div>' : "")
                + '</article>';
        }).join("");
    }

    function init() {
        fetchJSON(DATA_BASE + "skills.json")
            .then(function (data) { setContent("cv-skills", buildSkillsHtml(data)); })
            .catch(function () { setError("cv-skills", ERR_MSG); });

        fetchJSON(DATA_BASE + "timeline.json")
            .then(function (data) { setContent("cv-timeline", buildTimelineHtml(data)); })
            .catch(function () { setError("cv-timeline", ERR_MSG); });

        fetchJSON(DATA_BASE + "projects.json")
            .then(function (data) { setContent("cv-projects", buildProjectsHtml(data)); })
            .catch(function () { setError("cv-projects", ERR_MSG); });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
