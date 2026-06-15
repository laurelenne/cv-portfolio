(function () {
    "use strict";

    var DATA_URL = "src/data/skills.json";
    var MOBILE_BREAKPOINT = 767;
    var MOBILE_VISIBLE_SKILLS = 8;
    var DOMAIN_ORDER = ["frontend", "backend", "bdd", "wordpress", "seo", "outils", "methodologie"];
    var hasBoundMobileControls = false;

    function prefersReducedMotion() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // Schema minimal de src/data/skills.json :
    // [
    //   {
    //     "domain": "frontend|backend|bdd|outils",
    //     "title": "Nom de la catégorie",
    //     "icon": "Classes Font Awesome",
    //     "description": "Texte court",
    //     "proof": ["Point 1", "Point 2"],
    //     "skills": [
    //       {
    //         "key": "identifiant-css",
    //         "name": "Nom affiche",
    //         "icon": "Classes Font Awesome",
    //         "level": "mastery|intermediate|notions",
    //         "featured": true,
    //         "methodo": false
    //       }
    //     ]
    //   }
    // ]

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Renders icon HTML supporting both local assets and Font Awesome formats:
     * - "icon:filename.ext" → <img src="public/assets/icons-skills/filename.ext">
     * - "fa:fab fa-icon" or "fab fa-icon" (legacy) → <i class="fab fa-icon">
     */
    function renderIconHtml(iconString) {
        if (!iconString) return "";
        
        // Local icon format (SVG, PNG, WebP, etc.)
        if (iconString.startsWith("icon:")) {
            var filename = iconString.substring(5); // Remove "icon:" prefix
            var iconPath = "public/assets/icons-skills/" + escapeHtml(filename);
            return '<img src="' + iconPath + '" alt="" class="icon-svg" loading="lazy" />';
        }
        
        // Font Awesome format (with or without "fa:" prefix)
        var iconClass = iconString.startsWith("fa:") ? iconString.substring(3) : iconString;
        return '<i class="' + escapeHtml(iconClass) + '" aria-hidden="true"></i>';
    }

    function getLevel(level) {
        if (level === "mastery") return { css: "level-1", label: "Bonne maîtrise" };
        if (level === "intermediate") return { css: "level-2", label: "Intermédiaire" };
        return { css: "level-3", label: "Notions" };
    }

    function buildSkillBadge(skill, domain) {
        var level = getLevel(skill.level);
        var badge = document.createElement("div");
        var favoriteHtml = "";

        badge.className = "skill-badge skill-" + escapeHtml(skill.key);
        badge.setAttribute("tabindex", "0");
        badge.setAttribute("data-domain", domain);
        badge.setAttribute("data-methodo", skill.methodo ? "true" : "false");

        if (skill.featured) {
            badge.classList.add("skill-featured");
            favoriteHtml =
                '<span class="skill-favorite-badge" aria-label="Competence preferee" title="Competence preferee">' +
                '<i class="fas fa-heart" aria-hidden="true"></i>' +
                '</span>';
        }

        badge.innerHTML =
            favoriteHtml +
            '<div class="skill-icon">' + renderIconHtml(skill.icon) + '</div>' +
            '<div class="skill-name">' + escapeHtml(skill.name) + '</div>' +
            '<span class="skills-level-chip ' + level.css + '">' + level.label + '</span>';

        return badge;
    }

    function buildSkillsCategory(category) {
        var wrapper = document.createElement("div");
        wrapper.className = "skills-category";
        wrapper.setAttribute("data-domain", category.domain);
        wrapper.setAttribute("data-show-all", "false");

        var proofHtml = (category.proof || []).map(function (item) {
            return "<li>" + escapeHtml(item) + "</li>";
        }).join("");

        wrapper.innerHTML =
            '<div class="skills-category-head">' +
            '<h5 class="skills-category-title">' + renderIconHtml(category.icon) + '<span class="skills-category-title-text">' + escapeHtml(category.title) + '</span></h5>' +
            '<button type="button" class="skills-category-toggle" aria-expanded="true" aria-label="Replier la catégorie">' +
            '<i class="fa fa-minus" aria-hidden="true"></i>' +
            '</button>' +
            '</div>' +
            '<div class="skills-category-body">' +
            '<p class="skills-category-description">' + escapeHtml(category.description) + '</p>' +
            '<ul class="skills-proof-list">' + proofHtml + '</ul>' +
            '<div class="skills-grid"></div>' +
            '<button type="button" class="skills-category-more" hidden>Voir plus</button>' +
            '</div>';

        var grid = wrapper.querySelector(".skills-grid");
        (category.skills || []).forEach(function (skill) {
            grid.appendChild(buildSkillBadge(skill, category.domain));
        });

        return wrapper;
    }

    function renderSkills(categories) {
        var container = document.getElementById("skills-categories-scroll");
        if (!container) return;

        container.innerHTML = "";

        var fragment = document.createDocumentFragment();
        sortCategories(categories).forEach(function (category) {
            fragment.appendChild(buildSkillsCategory(category));
        });

        container.appendChild(fragment);
    }

    function getDomainOrder(domain) {
        var index = DOMAIN_ORDER.indexOf(domain);
        return index === -1 ? DOMAIN_ORDER.length : index;
    }

    function sortCategories(categories) {
        return (categories || []).slice().sort(function (a, b) {
            return getDomainOrder(a.domain) - getDomainOrder(b.domain);
        });
    }

    function applyFilter(filter) {
        var badges = document.querySelectorAll(".skill-badge");
        var categories = document.querySelectorAll(".skills-category");
        var panel = document.getElementById("skills-categories-scroll");
        var visibleSkillsCount = 0;
        var visibleCategoriesCount = 0;

        if (panel) {
            panel.classList.add("is-filtering");
            panel.classList.toggle("is-filter-all", filter === "all");
        }

        badges.forEach(function (badge) {
            var domain = badge.getAttribute("data-domain");
            var shouldShow = false;

            if (filter === "all") {
                shouldShow = true;
            } else {
                shouldShow = domain === filter;
            }

            badge.classList.toggle("is-hidden", !shouldShow);
            if (shouldShow) {
                visibleSkillsCount++;
            }
        });

        categories.forEach(function (category) {
            var visibleBadges = category.querySelectorAll(".skill-badge:not(.is-hidden)");
            category.classList.toggle("is-hidden", visibleBadges.length === 0);
            category.style.display = "";
            if (visibleBadges.length > 0) {
                visibleCategoriesCount++;
            }
        });

        updateMobileSkillsLayout();

        updateFilterFeedback(filter, visibleSkillsCount, visibleCategoriesCount);

        if (panel) {
            requestAnimationFrame(function () {
                if (window.innerWidth > 991) {
                    var currentHeight = Math.ceil(panel.getBoundingClientRect().height);
                    var fixedHeight = Number(panel.getAttribute("data-fixed-height") || "0");

                    if (filter === "all" || fixedHeight === 0) {
                        fixedHeight = currentHeight;
                        panel.setAttribute("data-fixed-height", String(fixedHeight));
                    }

                    if (fixedHeight > 0) {
                        panel.style.height = fixedHeight + "px";
                    }
                } else {
                    panel.style.height = "";
                    panel.removeAttribute("data-fixed-height");
                }
                panel.classList.remove("is-filtering");
            });
        }
    }

    function isMobileSkillsViewport() {
        return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    function setCategoryCollapsed(category, shouldCollapse) {
        var toggle = category.querySelector(".skills-category-toggle");
        var body = category.querySelector(".skills-category-body");
        category.classList.toggle("is-collapsed", shouldCollapse);

        if (body) {
            if (!isMobileSkillsViewport()) {
                body.style.maxHeight = "";
            } else if (prefersReducedMotion()) {
                body.style.maxHeight = shouldCollapse ? "0px" : "none";
            } else if (shouldCollapse) {
                body.style.maxHeight = body.scrollHeight + "px";
                body.offsetHeight;
                body.style.maxHeight = "0px";
            } else {
                body.style.maxHeight = body.scrollHeight + "px";
                body.addEventListener("transitionend", function onEnd(event) {
                    if (event.propertyName !== "max-height") return;
                    body.style.maxHeight = "none";
                    body.removeEventListener("transitionend", onEnd);
                });
            }
        }

        if (!toggle) return;

        toggle.setAttribute("aria-expanded", shouldCollapse ? "false" : "true");
        toggle.setAttribute("aria-label", shouldCollapse ? "Développer la catégorie" : "Replier la catégorie");
        toggle.innerHTML = shouldCollapse
            ? '<i class="fa fa-plus" aria-hidden="true"></i>'
            : '<i class="fa fa-minus" aria-hidden="true"></i>';
    }

    function scrollCategoryIntoView(category) {
        if (!category || !isMobileSkillsViewport()) return;

        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                var nav = document.querySelector(".primary-nav");
                var navHeight = nav ? Math.ceil(nav.getBoundingClientRect().height) : 0;
                var top = category.getBoundingClientRect().top + window.pageYOffset - navHeight - 8;
                window.scrollTo({
                    top: Math.max(0, Math.floor(top)),
                    behavior: prefersReducedMotion() ? "auto" : "smooth"
                });
            });
        });
    }

    function resetMobileBadgeClipping(category) {
        var badges = category.querySelectorAll(".skill-badge");
        badges.forEach(function (badge) {
            badge.classList.remove("is-mobile-extra-hidden");
        });
    }

    function updateMobileCategoryBadgeLimit(category, isMobile) {
        var moreBtn = category.querySelector(".skills-category-more");
        if (!moreBtn) return;

        var isCollapsed = category.classList.contains("is-collapsed");
        var visibleBadges = Array.prototype.slice.call(category.querySelectorAll(".skill-badge:not(.is-hidden)"));
        var showAll = category.getAttribute("data-show-all") === "true";

        resetMobileBadgeClipping(category);

        if (!isMobile || isCollapsed) {
            moreBtn.hidden = true;
            return;
        }

        var requiresToggle = visibleBadges.length > MOBILE_VISIBLE_SKILLS;
        if (requiresToggle && !showAll) {
            visibleBadges.forEach(function (badge, index) {
                badge.classList.toggle("is-mobile-extra-hidden", index >= MOBILE_VISIBLE_SKILLS);
            });
        }

        moreBtn.hidden = !requiresToggle;
        if (requiresToggle) {
            moreBtn.textContent = showAll ? "Voir moins" : "Voir plus";
            moreBtn.setAttribute("aria-expanded", showAll ? "true" : "false");
        }
    }

    function updateMobileSkillsLayout() {
        var categories = Array.prototype.slice.call(document.querySelectorAll(".skills-category"));
        var isMobile = isMobileSkillsViewport();

        categories.forEach(function (category) {
            if (!isMobile) {
                setCategoryCollapsed(category, false);
                category.setAttribute("data-show-all", "false");
            } else if (!category.hasAttribute("data-mobile-ready")) {
                category.setAttribute("data-mobile-ready", "true");
                setCategoryCollapsed(category, true);
                category.setAttribute("data-show-all", "false");
            }

            updateMobileCategoryBadgeLimit(category, isMobile);
        });

        if (!isMobile) {
            return;
        }

        var visibleCategories = categories.filter(function (category) {
            return !category.classList.contains("is-hidden");
        });

        if (!visibleCategories.length) return;

        var opened = visibleCategories.filter(function (category) {
            return !category.classList.contains("is-collapsed");
        });

        if (opened.length > 1) {
            opened.slice(1).forEach(function (category) {
                setCategoryCollapsed(category, true);
                category.setAttribute("data-show-all", "false");
            });
        }

        visibleCategories.forEach(function (category) {
            updateMobileCategoryBadgeLimit(category, true);
        });
    }

    function initMobileControls() {
        if (hasBoundMobileControls) return;

        var container = document.getElementById("skills-categories-scroll");
        if (!container) return;

        hasBoundMobileControls = true;

        var lastResizeIsMobile = isMobileSkillsViewport();
        var lastResizeWidth = window.innerWidth;

        container.addEventListener("click", function (event) {
            var toggleButton = event.target.closest(".skills-category-toggle");
            if (toggleButton) {
            event.preventDefault();
            event.stopPropagation();

                if (!isMobileSkillsViewport()) return;

                var category = toggleButton.closest(".skills-category");
                if (!category) return;

                var isCollapsed = category.classList.contains("is-collapsed");
                if (isCollapsed) {
                    var visibleCategories = document.querySelectorAll(".skills-category:not(.is-hidden)");
                    visibleCategories.forEach(function (item) {
                        if (item !== category) {
                            setCategoryCollapsed(item, true);
                            item.setAttribute("data-show-all", "false");
                        }
                    });
                    setCategoryCollapsed(category, false);
                    updateMobileCategoryBadgeLimit(category, true);
                    scrollCategoryIntoView(category);
                } else {
                    setCategoryCollapsed(category, true);
                    updateMobileCategoryBadgeLimit(category, true);
                }

                category.setAttribute("data-show-all", "false");
                return;
            }

            var moreButton = event.target.closest(".skills-category-more");
            if (moreButton) {
                event.preventDefault();
                event.stopPropagation();

                var targetCategory = moreButton.closest(".skills-category");
                if (!targetCategory || !isMobileSkillsViewport()) return;

                var showAll = targetCategory.getAttribute("data-show-all") === "true";
                targetCategory.setAttribute("data-show-all", showAll ? "false" : "true");
                updateMobileCategoryBadgeLimit(targetCategory, true);
            }
        });

        window.addEventListener("resize", function () {
            var currentIsMobile = isMobileSkillsViewport();
            var currentWidth = window.innerWidth;
            var widthDelta = Math.abs(currentWidth - lastResizeWidth);

        // Sur mobile, la barre navigateur change souvent la hauteur et déclenche resize.
        // On ignore ces micro-resize pour éviter les états d'UI intermittents.
            if (currentIsMobile !== lastResizeIsMobile || widthDelta >= 24) {
                updateMobileSkillsLayout();
                lastResizeIsMobile = currentIsMobile;
            }

            lastResizeWidth = currentWidth;
        });
    }

    function getFilterLabel(filter) {
        if (filter === "frontend") return "Frontend";
        if (filter === "backend") return "Backend";
        if (filter === "bdd") return "BDD";
        if (filter === "outils") return "Outils";
        if (filter === "wordpress") return "WordPress";
        if (filter === "seo") return "SEO";
        if (filter === "methodologie") return "Méthodologie";
        return "Toutes";
    }

    function updateFilterFeedback(filter, skillsCount, categoriesCount) {
        var feedback = document.getElementById("skills-filter-feedback");
        if (!feedback) return;

        var label = getFilterLabel(filter);
        feedback.textContent = label + " : " + skillsCount + " compétences dans " + categoriesCount + " catégorie" + (categoriesCount > 1 ? "s" : "");
    }

    function ensureFilterFeedback() {
        var header = document.querySelector(".skills-col-right-header");
        if (!header) return;
        if (document.getElementById("skills-filter-feedback")) return;

        var feedback = document.createElement("p");
        feedback.id = "skills-filter-feedback";
        feedback.className = "skills-filter-feedback";
        feedback.setAttribute("aria-live", "polite");
        header.appendChild(feedback);
    }

    function setActiveFilterButton(filter) {
        var buttons = document.querySelectorAll(".skills-filter-btn");
        buttons.forEach(function (btn) {
            var isActive = (btn.getAttribute("data-filter") || "") === filter;
            btn.classList.toggle("is-active", isActive);
            btn.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function initPanelResizeBehavior() {
        var panel = document.getElementById("skills-categories-scroll");
        if (!panel) return;

        window.addEventListener("resize", function () {
            if (window.innerWidth <= 991) {
                panel.style.height = "";
                panel.removeAttribute("data-fixed-height");
            } else {
                var fixedHeight = Number(panel.getAttribute("data-fixed-height") || "0");
                if (fixedHeight > 0) {
                    panel.style.height = fixedHeight + "px";
                }
            }
        });
    }

    function initFilters() {
        var buttons = document.querySelectorAll(".skills-filter-btn");
        if (!buttons.length) return;

        buttons.forEach(function (button) {
            button.addEventListener("click", function () {
                var filter = button.getAttribute("data-filter") || "all";

                buttons.forEach(function (btn) {
                    var active = btn === button;
                    btn.classList.toggle("is-active", active);
                    btn.setAttribute("aria-pressed", active ? "true" : "false");
                });

                applyFilter(filter);
            });
        });
    }

    function initSkillsEnhancer() {
        fetch(DATA_URL)
            .then(function (res) {
                if (!res.ok) throw new Error("Impossible de charger les compétences.");
                return res.json();
            })
            .then(function (categories) {
                renderSkills(categories);
                ensureFilterFeedback();
                initFilters();
                initPanelResizeBehavior();
                initMobileControls();
                setActiveFilterButton("frontend");
                applyFilter("frontend");
                document.dispatchEvent(new CustomEvent("portfolio:layout-stable"));
            })
            .catch(function (err) {
                console.warn("Skills:", err.message);
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSkillsEnhancer);
    } else {
        initSkillsEnhancer();
    }
})();
