/* ============================================================
   主程序：启动装配 / 界面模式 / 控件接线 / 渲染循环 / URL 参数
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  QYL.state = {
    mode: "overview",
    clean: false,
    gauge: false,
    mech: "curve",
  };

  /* ---------------- 原理讲解文案 ---------------- */
  var MECH_INFO = {
    curve: {
      title: "曲辕之妙",
      desc:
        "曲辕连接前端牵引构件与后部犁体。本演示采用同尺寸直／曲辕形态对照，便于观察主梁轮廓与构件关系；不据此推算省力程度、重心或历史尺寸。",
    },
    depth: {
      title: "犁评调深",
      desc:
        "犁箭穿接犁辕与犁床，犁评与犁建用于调节、固定。本模型以后连接点为基准联动犁辕和犁箭，展示进退与深浅的关系；8—18 cm 为示意读数，不是真实耕深测量。",
    },
    turn: {
      title: "犁盘转向",
      desc:
        "犁盘允许牵引连接相对犁辕偏转。本演示以 ±35° 为观察范围，整犁回转仅展示转向过程，不代表真实田间轨迹或最小回转半径。",
    },
    soil: {
      title: "犁壁翻土",
      desc:
        "犁铲刃口切入土层，犁面推力使不规则土团和土粒沿犁壁抬升、翻滚，离壁后分散落下。箭头区分作用于犁的牵引力、土壤反力及作用于土块的犁面推力，仅表示方向；翻转动画为示意，不代表土壤物理仿真。",
    },
    lever: {
      title: "犁梢杠杆",
      desc:
        "农人通过犁梢操纵整犁姿态。本演示让装配整体微倾，以表达握持操纵的效果；犁梢与木架保持连接，不将其表现为独立铰接摇杆。",
    },
  };

  function showNote(title, desc) {
    // 与导览字幕互斥，避免底部浮层重叠
    document.getElementById("subtitle").classList.remove("on");
    document.getElementById("fn-title").textContent = title;
    document.getElementById("fn-desc").textContent = desc;
    document.getElementById("flow-note").classList.add("on");
  }
  function hideNote() {
    document.getElementById("flow-note").classList.remove("on");
  }

  /* ---------------- 模式 ---------------- */
  QYL.setMode = function (mode) {
    QYL.ui.cancelDepthDemo();
    QYL.mechanics.stopAnimations();
    if (mode !== "flow") QYL.flow.stop();
    QYL.state.mode = mode;

    document.querySelectorAll("#mode-tabs button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.mode === mode);
    });
    document.querySelectorAll(".ctx").forEach(function (c) {
      c.classList.toggle("on", c.dataset.ctx === mode);
    });
    document.querySelectorAll("#chapter-nav button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.goto === mode);
    });

    if (mode === "overview") {
      QYL.labels.setMode("key");
      QYL.state.gauge = true;
      QYL.scene.setFurrow(false);
      hideNote();
      QYL.exploded.animateTo(0, 0.8);
    } else if (mode === "explode") {
      QYL.labels.setMode("all");
      QYL.state.gauge = false;
      QYL.scene.setFurrow(false);
      hideNote();
    } else if (mode === "mechanics") {
      QYL.labels.setMode("key");
      QYL.state.gauge = true;
      QYL.scene.setFurrow(false);
      QYL.exploded.animateTo(0, 0.8);
      if (!QYL.tour.running) QYL.ui.applyMech(QYL.state.mech);
    } else if (mode === "flow") {
      QYL.labels.setMode("key");
      QYL.state.gauge = true;
      QYL.scene.setFurrow(true);
      QYL.exploded.animateTo(0, 0.8);
      QYL.flow.goTo(QYL.flow.current < 0 ? 0 : QYL.flow.current, true);
    }
  };

  QYL.setClean = function (on) {
    QYL.state.clean = !!on;
    document.body.classList.toggle("clean", !!on);
    QYL.scene.fitDesktop();
    var sb = document.getElementById("btn-clean");
    if (sb) sb.classList.toggle("on", !!on);
    if (!on) hideNote();
  };

  /* ---------------- UI 辅助 ---------------- */
  QYL.ui = {
    cancelDepthDemo: function () {
      clearInterval(QYL.ui._depthTimer); QYL.ui._depthTimer = null;
    },
    takeover: function () {
      QYL.ui.cancelDepthDemo(); QYL.tour.takeover(); QYL.flow.pause();
      QYL.mechanics.stopAnimations(); QYL.cameraRig.cancel();
    },
    syncDepthLabel: function () {
      var v = document.getElementById("sl-depth-val");
      if (v) v.textContent = QYL.mechanics.depthCm.toFixed(1) + " cm";
      var sl = document.getElementById("sl-depth"); if (sl) { sl.value = QYL.mechanics.depth * 100; sl.style.setProperty("--fill", sl.value + "%"); }
    },
    syncTurnLabel: function () {
      var v = document.getElementById("sl-turn-val");
      if (v) v.textContent = Math.round(QYL.mechanics.turn) + "°";
      var sl = document.getElementById("sl-turn"); if (sl) { sl.value = QYL.mechanics.turn * 100 / 35; sl.style.setProperty("--fill", (Number(sl.value) + 100) / 2 + "%"); }
    },
    syncExplodeLabel: function () {
      var v = document.getElementById("sl-explode-val");
      if (v) v.textContent = Math.round(QYL.exploded.t * 100) + "%";
      var sl = document.getElementById("sl-explode");
      if (sl) {
        sl.value = QYL.exploded.t * 100;
        sl.style.setProperty("--fill", QYL.exploded.t * 100 + "%");
      }
    },
    applyMech: function (key) {
      QYL.ui.cancelDepthDemo();
      QYL.mechanics.stopAnimations();
      QYL.state.mech = key;
      document.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("on", c.dataset.mech === key);
      });
      var info = MECH_INFO[key];
      if (info) showNote("「" + info.title + "」", info.desc);

      var M = QYL.mechanics;
      if (key === "curve") {
        M.setBeamStraight(false);
        M.setArrows(true);
        M.stopSoil();
        M.setLever(false);
        QYL.scene.setFurrow(false);
        QYL.cameraRig.flyTo([0.22, 0.78, 3.05], [0.22, 0.4, 0], 1.7);
      } else if (key === "depth") {
        M.setBeamStraight(false);
        M.setArrows(false);
        M.stopSoil();
        M.setLever(false);
        QYL.scene.setFurrow(true);
        M.setDepth(0.08);
        QYL.cameraRig.flyTo([0.82, 1.08, 1.5], [-0.06, 0.5, 0], 1.7);
        // 自动扫一遍深浅
        var t0 = performance.now();
        clearInterval(QYL.ui._depthTimer);
        QYL.ui._depthTimer = setInterval(function () {
          var k = (performance.now() - t0) / 3600;
          if (k > 1) {
            QYL.ui.cancelDepthDemo();
            return;
          }
          var x = 0.08 + 0.85 * (0.5 - 0.5 * Math.cos(k * Math.PI * 2));
          QYL.mechanics.setDepth(x);
          var sl = document.getElementById("sl-depth");
          if (sl) {
            sl.value = x * 100;
            sl.style.setProperty("--fill", x * 100 + "%");
          }
          QYL.ui.syncDepthLabel();
        }, 33);
      } else if (key === "turn") {
        M.setArrows(false);
        M.stopSoil();
        M.setLever(false);
        QYL.scene.setFurrow(false);
        QYL.cameraRig.flyTo([2.55, 1.02, 1.5], [1.36, 0.3, 0], 1.7);
      } else if (key === "soil") {
        M.setArrows(true);
        M.setLever(false);
        M.setBeamStraight(false);
        QYL.scene.setFurrow(true);
        M.playSoil(true);
        QYL.cameraRig.flyTo([1.12, 0.92, 1.36], [0.24, 0.22, 0.08], 1.7);
      } else if (key === "lever") {
        M.setArrows(false);
        M.stopSoil();
        M.setBeamStraight(false);
        QYL.scene.setFurrow(false);
        M.setLever(true);
        QYL.cameraRig.flyTo([-1.95, 1.18, 1.72], [-0.86, 0.56, 0], 1.7);
      }
    },
  };

  /* ---------------- 控件接线 ---------------- */
  function bindUI() {
    // 开场
    document.getElementById("btn-enter").addEventListener("click", function () {
      document.getElementById("intro-card").classList.add("off");
    });

    // 导览 / 净屏
    document.getElementById("btn-tour").addEventListener("click", function () {
      if (QYL.tour.running) QYL.tour.takeover();
      else QYL.tour.start();
    });
    function toggleClean() {
      QYL.setClean(!QYL.state.clean);
    }
    document.getElementById("btn-clean").addEventListener("click", toggleClean);
    document.getElementById("clean-exit").addEventListener("click", toggleClean);

    // 模式
    document.querySelectorAll("#mode-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        QYL.tour.stop();
        QYL.setMode(b.dataset.mode);
      });
    });

    // 章节导航
    document.querySelectorAll("#chapter-nav button").forEach(function (b) {
      b.addEventListener("click", function () {
        QYL.tour.stop();
        QYL.setMode(b.dataset.goto);
      });
    });

    // 滑块：耕深
    var slDepth = document.getElementById("sl-depth");
    slDepth.addEventListener("input", function () {
      var x = slDepth.value / 100;
      QYL.ui.takeover();
      QYL.mechanics.setDepth(x);
      slDepth.style.setProperty("--fill", slDepth.value + "%");
      QYL.ui.syncDepthLabel();
    });

    // 滑块：转向
    var slTurn = document.getElementById("sl-turn");
    slTurn.addEventListener("input", function () {
      var deg = (slTurn.value / 100) * 35;
      QYL.ui.takeover();
      QYL.mechanics.setTurn(deg);
      slTurn.style.setProperty("--fill", ((Number(slTurn.value) + 100) / 2) + "%");
      QYL.ui.syncTurnLabel();
    });

    // 滑块：拆解
    var slEx = document.getElementById("sl-explode");
    slEx.addEventListener("input", function () {
      var amount = slEx.value / 100; QYL.ui.takeover();
      QYL.exploded.set(amount);
      QYL.ui.syncExplodeLabel();
    });
    document.getElementById("btn-explode-anim").addEventListener("click", function () {
      QYL.ui.takeover();
      var to = QYL.exploded.t > 0.5 ? 0 : 1;
      QYL.exploded.animateTo(to, 1.5, QYL.ui.syncExplodeLabel);
    });
    document.getElementById("btn-explode-reset").addEventListener("click", function () {
      QYL.ui.takeover();
      QYL.exploded.animateTo(0, 1.1, QYL.ui.syncExplodeLabel);
    });

    // 开关
    var swArrows = document.getElementById("sw-arrows");
    swArrows.addEventListener("click", function () {
      QYL.ui.takeover();
      var on = !swArrows.classList.contains("on");
      swArrows.classList.toggle("on", on);
      QYL.mechanics.setArrows(on, true);
    });
    document.getElementById("force-master").addEventListener("click",function(){
      QYL.mechanics.setArrows(!QYL.mechanics.arrows,true);
    });
    document.getElementById("force-labels").addEventListener("click",function(){
      QYL.mechanics.setForceLabels(!QYL.mechanics.forceLabels);
    });
    document.querySelectorAll("[data-force]").forEach(function(button){
      button.addEventListener("click",function(){var id=button.dataset.force;QYL.mechanics.setForce(id,!QYL.mechanics.forces[id]);});
    });
    var swStraight = document.getElementById("sw-straight");
    swStraight.addEventListener("click", function () {
      QYL.ui.takeover();
      var on = !swStraight.classList.contains("on");
      swStraight.classList.toggle("on", on);
      QYL.mechanics.setBeamStraight(on);
      if (on) {
        showNote(
          "「同尺寸直／曲辕形态对照」",
          "直辕与曲辕采用相同端点和装配基准，只比较主梁形态。该对照不是汉代耕犁的完整复原，不能用于比较整机长度、重量或牵引效率。"
        );
      } else {
        QYL.ui.applyMech("curve");
      }
    });

    // 原理 chips
    document.querySelectorAll(".chip").forEach(function (c) {
      c.addEventListener("click", function () {
      QYL.ui.takeover();
        QYL.ui.applyMech(c.dataset.mech);
      });
    });
    document.getElementById("btn-mech-play").addEventListener("click", function () {
      QYL.ui.takeover();
      if (!QYL.tour.running) QYL.ui.applyMech(QYL.state.mech);
    });

    // 流程播放
    document.getElementById("btn-flow-play").addEventListener("click", function () {
      QYL.tour.takeover(); QYL.ui.cancelDepthDemo(); QYL.cameraRig.cancel();
      QYL.flow.toggle();
    });

    // 快捷键
    window.addEventListener("keydown", function (e) {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === "h" || e.key === "H") toggleClean();
      else if (e.key === " ") {
        e.preventDefault();
        if (QYL.tour.running) QYL.tour.takeover();
        else if (QYL.state.mode === "flow") QYL.flow.toggle();
        else QYL.tour.start();
      } else if (e.key === "Escape") {
        if (QYL.state.clean) QYL.setClean(false);
        QYL.interact.clear();
      }
    });

    // 手动接管
    var canvas = document.getElementById("scene");
    ["pointerdown", "wheel"].forEach(function (ev) {
      canvas.addEventListener(
        ev,
        function () {
          QYL.ui.takeover();
        },
        { passive: true }
      );
    });
  }

  /* ---------------- URL 参数 ---------------- */
  function applyUrlParams() {
    var q = {};
    location.search
      .replace(/^\?/, "")
      .split("&")
      .forEach(function (kv) {
        var p = kv.split("=");
        if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "");
      });

    var views = {
      side: [[0.22, 0.78, 3.05], [0.22, 0.4, 0]],
      front: [[3.1, 1.15, 0.35], [0.3, 0.35, 0]],
      iso: [[2.35, 1.72, 2.62], [0.18, 0.42, 0]],
      top: [[2.1, 2.55, 2.7], [0.15, 0.55, 0.12]],
    };
    if (q.view && views[q.view]) QYL.cameraRig.snapTo(views[q.view][0], views[q.view][1]);
    if (q.t != null) {
      QYL.exploded.set(parseFloat(q.t));
      QYL.ui.syncExplodeLabel();
    }
    if (q.step != null) QYL.flow.goTo(parseInt(q.step, 10));
    if (q.mode) QYL.setMode(q.mode);
    if (q.clean === "1") QYL.setClean(true);
    if (q.intro === "0" || q.tour === "1") {
      document.getElementById("intro-card").style.display = "none";
    }
    if (q.preset) QYL.tour.setPreset(q.preset);
    if (q.speed) QYL.tour.setSpeed(parseFloat(q.speed));
    if (q.tour === "1") {
      QYL.tour.start(q.preset);
    }
  }

  /* ---------------- 渲染循环 ---------------- */
  var clock;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock.getDelta(), 0.05);
    QYL.cameraRig.update(dt);
    QYL.exploded.update(dt);
    QYL.mechanics.update(dt);
    QYL.flow.update(dt);
    QYL.tour.update(dt);
    QYL.labels.update();
    QYL.scene.render();
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    QYL.scene.init();
    QYL.model.build();
    QYL.scene.scene.add(QYL.model.root);

    QYL.cameraRig.init();
    QYL.labels.init();
    QYL.mechanics.init();
    QYL.interact.init();
    QYL.flow.init();

    bindUI();
    QYL.setMode("overview");
    QYL.ui.syncDepthLabel();
    QYL.ui.syncTurnLabel();
    QYL.ui.syncExplodeLabel();

    clock = new THREE.Clock();
    applyUrlParams();
    animate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
