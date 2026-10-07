/* ============================================================
   标注层：世界坐标 → 屏幕坐标，HTML 标签 + SVG 折线引线 + 简易避让
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var layer, svg, camera, canvas;
  var items = []; // { meta, el, line, dot, side, base }
  var mode = "key"; // "key" | "all" | "none"
  var selected = null;
  var hovered = null;

  var KEY_PARTS = ["beam", "ping", "share", "wall", "pan", "handle"];
  var LABEL_W = 118; // 估算标签宽度，用于避让

  function sideOffset(side) {
    switch (side) {
      case "left":
        return [-104, -22];
      case "right":
        return [104, -22];
      case "up":
        return [22, -52];
      case "down":
        return [22, 52];
      default:
        return [92, -22];
    }
  }

  QYL.labels = {
    init: function () {
      layer = document.getElementById("labels-layer");
      svg = document.getElementById("leaders");
      camera = QYL.scene.camera;
      canvas = QYL.scene.renderer.domElement;

      QYL.PARTS.forEach(function (meta) {
        var el = document.createElement("div");
        el.className = "part-label";
        el.innerHTML =
          '<span class="dot"></span><span class="nm">' +
          meta.name +
          '</span><span class="fn">' +
          meta.func.replace(" ", "") +
          "</span>";
        el.addEventListener("mouseenter", function () {
          hovered = meta.id;
          QYL.interact.hoverPart(meta.id, true);
        });
        el.addEventListener("mouseleave", function () {
          hovered = null;
          QYL.interact.hoverPart(meta.id, false);
        });
        el.addEventListener("click", function (e) {
          e.stopPropagation();
          QYL.ui.takeover();
          QYL.interact.select(meta.id);
        });
        layer.appendChild(el);

        var line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        svg.appendChild(line);
        var dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("r", "2.6");
        svg.appendChild(dot);

        items.push({
          meta: meta,
          el: el,
          line: line,
          dot: dot,
          off: sideOffset(meta.labelSide),
        });
      });
    },

    setMode: function (m) {
      mode = m;
    },

    setSelected: function (id) {
      selected = id;
      items.forEach(function (it) {
        it.el.classList.toggle("sel", it.meta.id === id);
        it.line.classList.toggle("sel", it.meta.id === id);
      });
    },

    /** 每帧更新 */
    update: function () {
      if (!camera || !canvas) return;
      var rect = canvas.getBoundingClientRect();
      var w = rect.width,
        h = rect.height;
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);

      var v = new THREE.Vector3();
      var visible = [];

      items.forEach(function (it) {
        var g = QYL.model.groups[it.meta.id];
        if (!g) return;

        // 锚点：group 局部坐标 → 世界 → 屏幕
        v.copy(g.userData.anchor);
        g.localToWorld(v);
        v.project(camera);

        var on = v.z > -1 && v.z < 1;
        var x = (v.x * 0.5 + 0.5) * w;
        var y = (-v.y * 0.5 + 0.5) * h;
        it.sx = x;
        it.sy = y;
        it.onScreen = on && x > -40 && x < w + 40 && y > -40 && y < h + 40;
        it.depth = v.z;

        var show =
          it.onScreen &&
          (mode === "all" ||
            (mode === "key" && KEY_PARTS.indexOf(it.meta.id) >= 0) ||
            it.meta.id === selected ||
            it.meta.id === hovered);
        it.show = show;
        if (show) visible.push(it);
      });

      // Position labels, not their model anchors; solve from fresh dimensions each frame.
      var placed = [];
      var left = 8, bottom = h - 80;
      if (!QYL.state.clean) {
        if (w > 900) left = document.getElementById("sidebar").offsetWidth + 12;
        bottom = document.getElementById("controlbar").getBoundingClientRect().top - 8;
        ["part-card", "flow-note", "subtitle", "gauge", "force-controls"].forEach(function (id) {
          var el = document.getElementById(id);
          if (el && (id === "force-controls" || el.classList.contains("on"))) {
            var r = el.getBoundingClientRect(); placed.push({x:r.x,y:r.y,w:r.width,h:r.height});
          }
        });
      }
      if(QYL.state.clean) {
        var forceRect=document.getElementById("force-controls").getBoundingClientRect();
        placed.push({x:forceRect.x,y:forceRect.y,w:forceRect.width,h:forceRect.height});
      }
      document.querySelectorAll(".force-caption:not([hidden])").forEach(function(el){
        var r=el.getBoundingClientRect();placed.push({x:r.x,y:r.y,w:r.width,h:r.height});
      });
      visible.sort(function (a,b) { return a.sy - b.sy; });
      visible.forEach(function (it) {
        var width = it.el.offsetWidth || 100, height = it.el.offsetHeight || 26;
        var x = it.sx + it.off[0] - (it.off[0] < 0 ? width : 0);
        x = Math.max(left, Math.min(w - width - 8, x));
        var desired = Math.max(66, Math.min(bottom - height - 8, it.sy + it.off[1] - height / 2));
        var y = desired, found = false;
        for (var step = 0; step < 30 && !found; step++) {
          var candidate = desired + (step % 2 ? 1 : -1) * Math.ceil(step / 2) * (height + 8);
          if (candidate < 66 || candidate > bottom - height) continue;
          found = !placed.some(function (r) { return x < r.x + r.w + 6 && x + width + 6 > r.x && candidate < r.y + r.h + 6 && candidate + height + 6 > r.y; });
          if (found) y = candidate;
        }
        it.lx = x; it.ly = y; it.labelWidth = width; it.labelHeight = height;
        placed.push({x:x,y:y,w:width,h:height});
      });

      items.forEach(function (it) {
        it.el.classList.toggle("show", !!it.show);
        it.el.classList.toggle("hot", it.meta.id === hovered);
        it.line.classList.toggle("hot", it.meta.id === hovered);
        it.line.style.opacity = it.show ? (it.meta.id === selected ? 1 : 0.62) : 0;
        it.dot.style.opacity = it.show ? 0.85 : 0;
        if (!it.show) return;

        var lx = it.lx;
        var ly = it.ly;
        it.el.style.left = lx + "px";
        it.el.style.top = ly + "px";
        it.el.style.transform =
          "none";

        // 引线：锚点 → 折点 → 标签
        var midX = it.sx + it.off[0] * 0.32;
        it.line.setAttribute(
          "points",
          it.sx.toFixed(1) + "," + it.sy.toFixed(1) + " " +
            midX.toFixed(1) + "," + (it.sy + it.off[1] * 0.42).toFixed(1) + " " +
            (lx + (it.off[0] < 0 ? it.labelWidth : 0)).toFixed(1) + "," + (ly + it.labelHeight / 2).toFixed(1)
        );
        it.dot.setAttribute("cx", it.sx.toFixed(1));
        it.dot.setAttribute("cy", it.sy.toFixed(1));
      });
    },
  };
})();
