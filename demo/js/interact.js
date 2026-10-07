/* ============================================================
   交互：Raycaster 点选 / 悬停高亮 / 部件信息卡
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var raycaster = new THREE.Raycaster();
  var pointer = new THREE.Vector2();
  var downX = 0,
    downY = 0,
    downT = 0;
  var hoveredId = null;
  var selectedId = null;

  var HILITE = new THREE.Color(0xb03a2e);
  var NONE = new THREE.Color(0x000000);

  function setEmissive(id, mode) {
    var meshes = QYL.model.meshes[id] || [];
    meshes.forEach(function (m) {
      if (!m.material || !m.material.emissive) return;
      if (mode === "sel") {
        m.material.emissive.copy(HILITE);
        m.material.emissiveIntensity = 0.3;
      } else if (mode === "hover") {
        m.material.emissive.copy(HILITE);
        m.material.emissiveIntensity = 0.13;
      } else {
        m.material.emissive.copy(NONE);
        m.material.emissiveIntensity = 1;
      }
    });
  }

  function pick(clientX, clientY) {
    var rect = QYL.scene.renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, QYL.scene.camera);
    var hits = raycaster.intersectObjects(QYL.model.pickables, false);
    return hits.length ? hits[0].object.userData.partId : null;
  }

  function fillCard(id) {
    var meta = QYL.getPart(id);
    if (!meta) return;
    document.getElementById("pc-name").textContent = meta.name;
    document.getElementById("pc-alias").textContent = meta.alias;
    document.getElementById("pc-func").textContent = meta.func;
    document.getElementById("pc-desc").innerHTML = "<p>" + meta.desc + "</p>";
    var q = document.getElementById("pc-quote");
    if (meta.quote) {
      q.innerHTML = meta.quote + "<cite>—— " + meta.quoteSrc + "</cite>";
      q.style.display = "";
    } else {
      q.style.display = "none";
    }
    document.getElementById("pc-mech").innerHTML = meta.mech;
    document.getElementById("part-card").classList.add("on");
  }

  QYL.interact = {
    init: function () {
      var el = QYL.scene.renderer.domElement;

      el.addEventListener("pointerdown", function (e) {
        downX = e.clientX;
        downY = e.clientY;
        downT = performance.now();
      });

      el.addEventListener("pointerup", function (e) {
        var dx = e.clientX - downX,
          dy = e.clientY - downY;
        if (dx * dx + dy * dy > 36) return; // 拖动视为旋转
        if (performance.now() - downT > 620) return;
        var id = pick(e.clientX, e.clientY);
        if (id) QYL.interact.select(id);
        else QYL.interact.clear();
      });

      el.addEventListener("pointermove", function (e) {
        if (e.buttons) return;
        var id = pick(e.clientX, e.clientY);
        if (id !== hoveredId) {
          QYL.interact.hoverPart(hoveredId, false);
          hoveredId = id;
          QYL.interact.hoverPart(hoveredId, true);
          el.style.cursor = id ? "pointer" : "grab";
        }
      });

      document.getElementById("pc-close").addEventListener("click", function () {
        QYL.interact.clear();
      });
    },

    hoverPart: function (id, on) {
      if (!id) return;
      if (on) {
        if (id !== selectedId) setEmissive(id, "hover");
      } else {
        if (id !== selectedId) setEmissive(id, "none");
      }
    },

    select: function (id) {
      if (selectedId) setEmissive(selectedId, "none");
      selectedId = id;
      if (!id) {
        document.getElementById("part-card").classList.remove("on");
        QYL.labels.setSelected(null);
        return;
      }
      setEmissive(id, "sel");
      fillCard(id);
      QYL.labels.setSelected(id);
    },

    clear: function () {
      QYL.interact.select(null);
    },

    get selected() {
      return selectedId;
    },
  };
})();
