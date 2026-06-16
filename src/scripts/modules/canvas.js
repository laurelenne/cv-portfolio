(function () {
    "use strict";

    var c = document.getElementById("canvas");
    if (!c) return;

    var ctx = c.getContext("2d");
    var header = document.querySelector("header.site-header") || document.querySelector("header");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var light = { x: 0, y: 0 };
    var SHADOW_COLOR = "rgba(2, 6, 14, 0.9)";

    /* Plans de profondeur : [count, sizeMin, sizeMax, speedMult, alpha, glowBlur, glowColor] */
    var LAYERS = [
        { count: 5,  sizeMin: 6,  sizeMax: 18, speedMult: 0.25, alpha: 0.15, glow: 0,  color: "rgba(103, 232, 249, 0.18)" },
        { count: 6,  sizeMin: 14, sizeMax: 32, speedMult: 0.55, alpha: 0.38, glow: 0,  color: "rgba(56, 189, 248, 0.38)"  },
        { count: 4,  sizeMin: 26, sizeMax: 46, speedMult: 1.0,  alpha: 0.58, glow: 18, color: "rgba(56, 189, 248, 0.65)"  }
    ];
    var LOGO_COUNT = 3;

    /* ── Logo ── */
    var logoImg = new Image();
    logoImg.src = "public/assets/images/logo-lp.webp";

    /* ── Resize ── */
    function resize() {
        var box = c.getBoundingClientRect();
        c.width  = box.width  || window.innerWidth;
        c.height = box.height || window.innerHeight;
        light.x = c.width  / 2;
        light.y = c.height / 2;
    }

    /* ── Fond navy + halo souris ── */
    function drawBackground() {
        var dist = Math.max(c.width, c.height);
        var bg = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, dist);
        bg.addColorStop(0,   "rgba(11, 24, 46, 1)");
        bg.addColorStop(0.6, "rgba(6, 14, 28, 1)");
        bg.addColorStop(1,   "rgba(2, 6, 14, 1)");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, c.width, c.height);
        var glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 340);
        glow.addColorStop(0, "rgba(56, 189, 248, 0.08)");
        glow.addColorStop(1, "rgba(56, 189, 248, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, c.width, c.height);
    }

    resize();

    if (reducedMotion) {
        drawBackground();
        window.addEventListener("resize", function () { resize(); drawBackground(); });
        return;
    }

    /* ── getDots helper ── */
    function getDots(x, y, half, r) {
        var q = (Math.PI * 2) / 4;
        return [
            { x: x + half * Math.sin(r),         y: y + half * Math.cos(r) },
            { x: x + half * Math.sin(r + q),     y: y + half * Math.cos(r + q) },
            { x: x + half * Math.sin(r + q * 2), y: y + half * Math.cos(r + q * 2) },
            { x: x + half * Math.sin(r + q * 3), y: y + half * Math.cos(r + q * 3) }
        ];
    }

    /* ── drawShadow helper ── */
    function drawShadow(dots) {
        var pts = dots.map(function (dot) {
            var angle = Math.atan2(light.y - dot.y, light.x - dot.x);
            return {
                sx: dot.x, sy: dot.y,
                ex: dot.x + 2000 * Math.sin(-angle - Math.PI / 2),
                ey: dot.y + 2000 * Math.cos(-angle - Math.PI / 2)
            };
        });
        for (var i = pts.length - 1; i >= 0; i--) {
            var n = (i + 1) % pts.length;
            ctx.beginPath();
            ctx.moveTo(pts[i].sx, pts[i].sy);
            ctx.lineTo(pts[n].sx, pts[n].sy);
            ctx.lineTo(pts[n].ex, pts[n].ey);
            ctx.lineTo(pts[i].ex, pts[i].ey);
            ctx.closePath();
            ctx.fillStyle = SHADOW_COLOR;
            ctx.fill();
        }
    }

    /* ── Box (avec couche de profondeur) ── */
    function Box(layer) {
        this.half_size  = Math.floor(Math.random() * (layer.sizeMax - layer.sizeMin) + layer.sizeMin);
        this.x          = Math.floor(Math.random() * c.width);
        this.y          = Math.floor(Math.random() * c.height);
        this.r          = Math.random() * Math.PI;
        this.layer      = layer;

        this.rotate = function () {
            var speed = ((48 - this.half_size) / 20) * this.layer.speedMult;
            this.r += speed * 0.002;
            this.x += speed * 0.38;
            this.y += speed * 0.38;
            if (this.y - this.half_size > c.height) this.y -= c.height + 100;
            if (this.x - this.half_size > c.width)  this.x -= c.width  + 100;
        };

        this.drawShadow = function () {
            drawShadow(getDots(this.x, this.y, this.half_size, this.r));
        };

        this.draw = function () {
            var d = getDots(this.x, this.y, this.half_size, this.r);
            /* Glow néon sur le plan avant uniquement */
            if (this.layer.glow > 0) {
                ctx.shadowBlur  = this.layer.glow;
                ctx.shadowColor = "rgba(56, 189, 248, 0.7)";
            }
            ctx.beginPath();
            ctx.moveTo(d[0].x, d[0].y);
            ctx.lineTo(d[1].x, d[1].y);
            ctx.lineTo(d[2].x, d[2].y);
            ctx.lineTo(d[3].x, d[3].y);
            ctx.closePath();
            ctx.fillStyle = this.layer.color;
            ctx.fill();
            if (this.layer.glow > 0) {
                ctx.shadowBlur  = 0;
                ctx.shadowColor = "transparent";
            }
        };
    }

    /* ── Logo dérivant ── */
    function LogoBox() {
        this.half_size = Math.floor(Math.random() * 28 + 18);
        this.x         = Math.floor(Math.random() * c.width);
        this.y         = Math.floor(Math.random() * c.height);
        this.r         = Math.random() * Math.PI;
        this.alpha     = Math.random() * 0.25 + 0.18;

        this.rotate = function () {
            var speed = (48 - this.half_size) / 20;
            this.r += speed * 0.002;
            this.x += speed * 0.38;
            this.y += speed * 0.38;
            if (this.y - this.half_size > c.height) this.y -= c.height + 100;
            if (this.x - this.half_size > c.width)  this.x -= c.width  + 100;
        };

        this.drawShadow = function () {
            drawShadow(getDots(this.x, this.y, this.half_size, this.r));
        };

        this.draw = function () {
            if (!logoImg.complete || logoImg.naturalWidth === 0) return;
            var sz = this.half_size * 2;
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.r);
            ctx.globalAlpha = this.alpha;
            ctx.globalCompositeOperation = "screen";
            ctx.drawImage(logoImg, -this.half_size, -this.half_size, sz, sz);
            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha = 1;
            ctx.restore();
        };
    }

    /* ── Création des objets par plan (arrière → avant) ── */
    var boxes = [];
    for (var l = 0; l < LAYERS.length; l++) {
        for (var i = 0; i < LAYERS[l].count; i++) {
            boxes.push(new Box(LAYERS[l]));
        }
    }
    for (var i = 0; i < LOGO_COUNT; i++) { boxes.push(new LogoBox()); }

    /* ── Boucle ── */
    var animRunning = false;
    var rafId = null;

    function draw() {
        if (!animRunning) return;
        ctx.clearRect(0, 0, c.width, c.height);
        drawBackground();
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].rotate();
            boxes[i].drawShadow();
        }
        for (var i = 0; i < boxes.length; i++) {
            boxes[i].draw();
        }
        rafId = requestAnimationFrame(draw);
    }

    function startAnim() {
        if (animRunning) return;
        animRunning = true;
        draw();
    }

    function stopAnim() {
        animRunning = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    /* ── Pause hors viewport ── */
    if ("IntersectionObserver" in window && header) {
        var io = new IntersectionObserver(function (entries) {
            entries[0].isIntersecting ? startAnim() : stopAnim();
        }, { threshold: 0.01 });
        io.observe(header);
    } else {
        startAnim();
    }

    /* ── Suivi souris ── */
    var trackTarget = header || c;
    trackTarget.addEventListener("mousemove", function (e) {
        var rect = c.getBoundingClientRect();
        light.x = e.clientX - rect.left;
        light.y = e.clientY - rect.top;
    }, { passive: true });
    trackTarget.addEventListener("mouseleave", function () {
        light.x = c.width  / 2;
        light.y = c.height / 2;
    }, { passive: true });

    window.addEventListener("resize", resize);

}());
