/* ============================================================
   耕作流程：五步状态机（牵引 → 入土 → 起土 → 翻土 → 回转）
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var STEPS = [
    {
      name: "牵引前行",
      desc:
        "牛犋的牵引力经曲轭、耕索传入犁盘，再由犁辕导向犁底。犁盘可转，牵引方向与犁身解耦。",
      cam: { p: [0.35, 0.5, 2.75], t: [0.3, 0.24, 0] },
      apply: function () {
        QYL.mechanics.setArrows(true);
        QYL.mechanics.setDepth(0.35);
        QYL.mechanics.setTurn(0);
        QYL.mechanics.stopSoil();
        QYL.scene.setFurrow(true);
      },
    },
    {
      name: "犁铲入土",
      desc:
        "薄刃切入土层，铲面推起土块。推进犁评展示加深趋势，读数和力箭头均为教学示意。",
      cam: { p: [1.42, 0.82, 1.52], t: [0.46, 0.1, 0.03] },
      apply: function () {
        QYL.mechanics.setArrows(true);
        QYL.mechanics.setDepth(0.9);
        QYL.mechanics.stopSoil();
        QYL.scene.setFurrow(true);
      },
    },
    {
      name: "起土抬垡",
      desc:
        "垡片自沟底剥离，顺铲面向犁壁过渡。犁壁曲面在此承接土垡，开始把它「扶」起来。",
      cam: { p: [1.62, 1.02, 1.78], t: [0.42, 0.16, 0.06] },
      apply: function () {
        QYL.mechanics.setArrows(true);
        QYL.mechanics.setDepth(0.9);
        QYL.mechanics.setSoil(0.32);
        QYL.scene.setFurrow(true);
      },
    },
    {
      name: "曲面翻土",
      desc:
        "大小不同的土团与土粒沿犁壁抬升、翻滚，离壁后分散落入沟侧。颗粒保持各自形状，动画为运动示意，不模拟真实土壤破裂。",
      cam: { p: [1.12, 0.92, 1.36], t: [0.22, 0.26, 0.09] },
      apply: function () {
        QYL.mechanics.setArrows(true);
        QYL.mechanics.setDepth(0.85);
        QYL.mechanics.playSoil(true);
        QYL.scene.setFurrow(true);
      },
    },
    {
      name: "回转掉头",
      desc:
        "耕至田头，牵引连接偏转，整犁随之调整方向。演示围绕前连接区域回转，不表示实测回转半径。",
      cam: { p: [2.35, 1.72, 2.62], t: [0.18, 0.42, 0] },
      apply: function () {
        QYL.mechanics.setArrows(false);
        QYL.mechanics.stopSoil();
        QYL.mechanics.setDepth(0.4);
        QYL.mechanics.playTurn();
        QYL.scene.setFurrow(true);
      },
    },
  ];

  var cur = -1;
  var playing = false;
  var timer = 0;

  function renderUI() {
    var wrap = document.getElementById("flow-steps");
    if (!wrap) return;
    if (!wrap.childElementCount) {
      STEPS.forEach(function (s, i) {
        var b = document.createElement("button");
        b.className = "step";
        b.innerHTML = '<span class="num">' + "一二三四五".charAt(i) + '</span><span class="txt">' + s.name + "</span>";
        b.addEventListener("click", function () {
          QYL.ui.takeover(); QYL.flow.goTo(i);
        });
        wrap.appendChild(b);
      });
    }
    var kids = wrap.children;
    for (var i = 0; i < kids.length; i++) {
      kids[i].classList.toggle("on", i === cur);
      kids[i].classList.toggle("done", i < cur);
    }

    var note = document.getElementById("flow-note");
    var title = document.getElementById("fn-title");
    var desc = document.getElementById("fn-desc");
    if (cur >= 0) {
      title.textContent = "「" + STEPS[cur].name + "」";
      desc.textContent = STEPS[cur].desc;
      note.classList.add("on");
    } else {
      note.classList.remove("on");
    }

    var btn = document.getElementById("btn-flow-play");
    if (btn) {
      btn.innerHTML = playing
        ? '<span class="glyph">❚❚</span>暂停演示'
        : '<span class="glyph">▶</span>连续演示';
    }
  }

  QYL.flow = {
    get current() {
      return cur;
    },

    steps: STEPS,

    init: function () {
      renderUI();
    },

    goTo: function (n, fromPlay) {
      n = Math.max(0, Math.min(STEPS.length - 1, n));
      if (!fromPlay) playing = false;
      QYL.ui.cancelDepthDemo(); QYL.mechanics.stopAnimations();
      cur = n;
      timer = 0;
      var s = STEPS[n];
      if (s.apply) s.apply();
      QYL.cameraRig.flyTo(s.cam.p, s.cam.t, 1.7);
      renderUI();
    },

    play: function () {
      playing = true;
      if (cur < 0) cur = 0;
      QYL.flow.goTo(cur, true);
      renderUI();
    },

    pause: function () {
      playing = false;
      QYL.mechanics.stopAnimations();
      renderUI();
    },

    toggle: function () {
      if (playing) QYL.flow.pause();
      else QYL.flow.play();
    },

    isPlaying: function () {
      return playing;
    },

    stop: function () {
      playing = false;
      cur = -1;
      renderUI();
    },

    update: function (dt) {
      if (!playing) return;
      timer += dt;
      if (timer > 7.2) {
        var next = cur + 1;
        if (next >= STEPS.length) next = 0;
        QYL.flow.goTo(next, true);
      }
    },
  };
})();
