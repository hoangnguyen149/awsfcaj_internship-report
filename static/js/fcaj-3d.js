/* =====================================================================
   FCAJ Internship Report — 3D background, tilt & homepage layout
   ===================================================================== */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isVi = /\/vi\//.test(document.body.getAttribute("data-url") || location.pathname);

  /* ---------------- 1. Trang chủ: dựng lại bố cục ---------------- */
  function buildHome() {
    if (!document.body.classList.contains("fx-home")) return;
    var inner = document.getElementById("body-inner");
    if (!inner || inner.querySelector(".fx-hero")) return;

    var h1 = inner.querySelector("h1");
    var heads = inner.querySelectorAll("h3");
    var infoHead = heads[0], listHead = heads[1];
    var list = inner.querySelector("ol");
    var img = inner.querySelector("img");

    // Thông tin sinh viên: các <p> bắt đầu bằng <strong>Label:</strong>
    var tiles = [], name = "", position = "", company = "", duration = "";
    Array.prototype.forEach.call(inner.querySelectorAll("p"), function (p) {
      var s = p.querySelector("strong");
      if (!s || p.firstElementChild !== s) return;
      var label = s.textContent.replace(/:\s*$/, "").trim();
      var clone = p.cloneNode(true);
      clone.removeChild(clone.querySelector("strong"));
      var value = clone.innerHTML.replace(/^(\s|&nbsp;|&emsp;| )+/, "").trim();
      var key = label.toLowerCase();
      if (/full name|họ và tên|họ tên/.test(key)) name = clone.textContent.trim();
      if (/position|vị trí/.test(key)) position = clone.textContent.trim();
      if (/company|công ty|đơn vị/.test(key)) company = clone.textContent.trim();
      if (/duration|thời gian/.test(key)) duration = clone.textContent.trim();
      tiles.push({ label: label, html: value });
      p.remove();
    });

    var T = isVi ? {
      eyebrow: "AWS · First Cloud AI Journey",
      lead: "Nhật ký thực tập, đề xuất dự án, blog, sự kiện và workshop triển khai hạ tầng trên AWS.",
      start: "Xem Worklog", workshop: "Xem Workshop",
      info: "Thông tin sinh viên", contents: "Nội dung báo cáo", open: "Xem chi tiết →"
    } : {
      eyebrow: "AWS · First Cloud AI Journey",
      lead: "Internship worklog, project proposal, blogs, events and a hands-on AWS infrastructure workshop.",
      start: "Open Worklog", workshop: "Open Workshop",
      info: "Student Information", contents: "Report Contents", open: "Open →"
    };

    var links = list ? list.querySelectorAll("a") : [];
    var firstHref = links[0] ? links[0].getAttribute("href") : "#";
    var wsHref = links[4] ? links[4].getAttribute("href") : firstHref;

    // Hero
    var hero = document.createElement("section");
    hero.className = "fx-hero";
    var left = document.createElement("div");
    left.innerHTML =
      '<div class="fx-eyebrow">' + T.eyebrow + "</div>";
    if (h1) left.appendChild(h1);
    var sub = document.createElement("p");
    sub.className = "fx-sub";
    sub.innerHTML = (name ? "<b>" + escapeHtml(name) + "</b> — " : "") + T.lead;
    left.appendChild(sub);
    var badges = document.createElement("div");
    badges.className = "fx-badges";
    [company, position, duration].forEach(function (t) {
      if (!t) return;
      var b = document.createElement("span"); b.textContent = t; badges.appendChild(b);
    });
    left.appendChild(badges);
    var cta = document.createElement("div");
    cta.className = "fx-cta";
    cta.innerHTML =
      '<a class="fx-btn primary" href="' + firstHref + '"><i class="fas fa-calendar-week"></i>' + T.start + "</a>" +
      '<a class="fx-btn" href="' + wsHref + '"><i class="fab fa-aws"></i>' + T.workshop + "</a>";
    left.appendChild(cta);
    hero.appendChild(left);

    if (img) {
      var wrap = document.createElement("div");
      wrap.className = "fx-avatar-wrap";
      var holder = img.closest("p");
      img.classList.add("fx-avatar");
      wrap.appendChild(img);
      hero.appendChild(wrap);
      if (holder && !holder.textContent.trim() && !holder.querySelector("img")) holder.remove();
    }

    // Thông tin → lưới tile
    var infoTitle = document.createElement("h2"); infoTitle.className = "fx-h2"; infoTitle.textContent = T.info;
    var grid = document.createElement("div"); grid.className = "fx-info";
    tiles.forEach(function (t) {
      var d = document.createElement("div"); d.className = "fx-tile fx-tilt";
      d.innerHTML = "<small>" + escapeHtml(t.label) + "</small><div>" + t.html + "</div>";
      grid.appendChild(d);
    });

    // Mục lục → thẻ
    var contentsTitle = document.createElement("h2"); contentsTitle.className = "fx-h2"; contentsTitle.textContent = T.contents;
    var icons = ["fa-calendar-week", "fa-file-signature", "fa-pen-nib", "fa-users", "fab fa-aws", "fa-user-check", "fa-comments"];
    var cards = document.createElement("ul"); cards.className = "fx-cards";
    Array.prototype.forEach.call(links, function (a, i) {
      var li = document.createElement("li");
      var ic = icons[i] || "fa-folder-open";
      var cls = ic.indexOf("fab") === 0 ? ic : "fas " + ic;
      li.innerHTML = '<a class="fx-card fx-tilt" href="' + a.getAttribute("href") + '">' +
        '<span class="n">' + String(i + 1).padStart(2, "0") + "</span>" +
        '<i class="' + cls + '"></i><b>' + escapeHtml(a.textContent) + "</b>" +
        '<span class="go">' + T.open + "</span></a>";
      cards.appendChild(li);
    });

    // Lắp vào trang
    var anchor = infoHead || list || inner.firstChild;
    inner.insertBefore(hero, anchor);
    if (infoHead) infoHead.remove();
    if (listHead) listHead.remove();
    if (list) list.remove();
    inner.insertBefore(infoTitle, hero.nextSibling);
    inner.insertBefore(grid, infoTitle.nextSibling);
    inner.insertBefore(contentsTitle, grid.nextSibling);
    inner.insertBefore(cards, contentsTitle.nextSibling);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- 2. Tilt 3D (chỉ với chuột) ---------------- */
  function bindTilt() {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.addEventListener("pointermove", function (e) {
      var c = e.target.closest && e.target.closest(".fx-tilt"); if (!c) return;
      var r = c.getBoundingClientRect();
      var rx = ((e.clientY - r.top) / r.height - .5) * -10;
      var ry = ((e.clientX - r.left) / r.width - .5) * 10;
      c.style.transform = "perspective(900px) rotateX(" + rx + "deg) rotateY(" + ry + "deg)";
    });
    document.addEventListener("pointerout", function (e) {
      var c = e.target.closest && e.target.closest(".fx-tilt");
      if (c && !c.contains(e.relatedTarget)) c.style.transform = "";
    });
  }

  /* ---------------- 3. Nền Three.js ---------------- */
  function bg3d() {
    if (!window.THREE) return;
    var canvas = document.createElement("canvas");
    canvas.id = "fx-bg3d"; canvas.setAttribute("aria-hidden", "true");
    document.body.insertBefore(canvas, document.body.firstChild);
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "low-power" }); }
    catch (e) { canvas.remove(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0A1020, 0.016);
    var camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, .1, 500);
    camera.position.z = 32;

    var cyan = 0x38BDF8, blue = 0x60A5FA, aws = 0xFF9900;
    var group = new THREE.Group();
    var geo = new THREE.IcosahedronGeometry(11, 1);
    group.add(new THREE.LineSegments(new THREE.WireframeGeometry(geo), new THREE.LineBasicMaterial({ color: blue, transparent: true, opacity: .26 })));
    group.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: cyan, size: .5, transparent: true, opacity: .95 })));
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 0),
      new THREE.MeshStandardMaterial({ color: 0x1E3A8A, emissive: 0x0B2447, metalness: .75, roughness: .25, flatShading: true, transparent: true, opacity: .8 }));
    group.add(core);
    var orbit = new THREE.Group(), sats = [];
    for (var i = 0; i < 6; i++) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1),
        new THREE.MeshStandardMaterial({ color: i % 2 ? aws : cyan, emissive: i % 2 ? 0x3a2200 : 0x0a2a44, metalness: .5, roughness: .3 }));
      var a = i / 6 * Math.PI * 2;
      m.position.set(Math.cos(a) * 16, Math.sin(a * 2) * 2.5, Math.sin(a) * 16);
      orbit.add(m); sats.push(m);
    }
    group.add(orbit);
    scene.add(group);
    scene.add(new THREE.AmbientLight(0x8fa3bf, 1.2));
    var l1 = new THREE.PointLight(cyan, 2.2, 140); l1.position.set(20, 18, 25); scene.add(l1);
    var l2 = new THREE.PointLight(aws, 1.2, 140); l2.position.set(-22, -12, 18); scene.add(l2);

    var N = innerWidth < 800 ? 600 : 1300, pos = new Float32Array(N * 3);
    for (var j = 0; j < N * 3; j++) pos[j] = (Math.random() - .5) * 120;
    var pg = new THREE.BufferGeometry(); pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var stars = new THREE.Points(pg, new THREE.PointsMaterial({ color: cyan, size: .08, transparent: true, opacity: .7, blending: THREE.AdditiveBlending }));
    scene.add(stars);

    function place() {
      var w = innerWidth, h = innerHeight;
      group.position.x = w > 1100 ? 16 : 0;          // lệch phải, tránh sidebar & chữ
      group.scale.setScalar(w > 1100 ? 1 : w > 800 ? .8 : .62);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }
    place(); addEventListener("resize", place);

    var mx = 0, my = 0, sy = scrollY, visible = true;
    addEventListener("pointermove", function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
    addEventListener("scroll", function () { sy = scrollY; }, { passive: true });
    document.addEventListener("visibilitychange", function () { visible = !document.hidden; });

    if (reduce) { group.rotation.set(.4, .6, 0); renderer.render(scene, camera); return; }
    var clock = new THREE.Clock();
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      var t = clock.getElapsedTime();
      var s = sy / Math.max(1, document.documentElement.scrollHeight - innerHeight);
      group.rotation.y += (mx * .7 + t * .1 + s * 3 - group.rotation.y) * .05;
      group.rotation.x += (my * .5 + s * 1.1 - group.rotation.x) * .05;
      core.rotation.y = -t * .3; core.rotation.z = t * .12;
      orbit.rotation.y = t * .35;
      for (var k = 0; k < sats.length; k++) { sats[k].rotation.x = t + k; sats[k].rotation.y = t * .8 + k; }
      group.position.y = -s * 7;
      stars.rotation.y = -t * .012; stars.rotation.x = t * .006;
      renderer.render(scene, camera);
    })();
  }

  function init() { buildHome(); bindTilt(); bg3d(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
