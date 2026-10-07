/* ============================================================
   自动导览：章节脚本执行 / 字幕 / 进度 / 净屏 / 手动接管
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var idx = -1;
  var timer = 0;
  var running = false;
  var speed = 1;
  var preset = "short"; // "short" | "long"
  var tweens = [];
  var resumeBtn = null;

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  /* ---------------- 数值补间 ---------------- */
  function tween(get, set, to, dur) {
    tweens.push({ get: get, set: set, from: get(), to: to, t: 0, dur: dur });
  }

  function updateTweens(dt) {
    for (var i = tweens.length - 1; i >= 0; i--) {
      var w = tweens[i];
      w.t += dt;
      var k = Math.min(1, w.t / w.dur);
      w.set(w.from + (w.to - w.from) * easeInOutCubic(k));
      if (k >= 1) tweens.splice(i, 1);
    }
  }

  /* ---------------- 动作指令 ---------------- */
  function runAct(str) {
    if (!str) return;
    String(str)
      .split("|")
      .forEach(function (cmd) {
        if (!cmd) return;
        var kv = cmd.split(":");
        var k = kv[0].trim(),
          v = kv[1];
        var f = parseFloat(v);
        switch (k) {
          case "explode":
            QYL.exploded.animateTo(f, 1.5);
            break;
          case "depth":
            tween(
              function () {
                return QYL.mechanics.depth;
              },
              function (x) {
                QYL.mechanics.setDepth(x);
                var sl = document.getElementById("sl-depth");
                if (sl) sl.value = x * 100;
                QYL.ui && QYL.ui.syncDepthLabel && QYL.ui.syncDepthLabel();
              },
              f,
              1.35
            );
            break;
          case "turn":
            tween(
              function () {
                return QYL.mechanics.turn;
              },
              function (x) {
                QYL.mechanics.setTurn(x);
                var sl = document.getElementById("sl-turn");
                if (sl) sl.value = x * (100 / 35);
                QYL.ui && QYL.ui.syncTurnLabel && QYL.ui.syncTurnLabel();
              },
              f,
              1.2
            );
            break;
          case "soil":
            if (v === "play") QYL.mechanics.playSoil(true);
            else if (v === "stop") QYL.mechanics.stopSoil();
            else QYL.mechanics.setSoil(f);
            break;
          case "turnplay":
            QYL.mechanics.playTurn();
            break;
          case "arrows":
            QYL.mechanics.setArrows(!!f);
            break;
          case "beam":
            QYL.mechanics.setBeamStraight(v === "straight");
            break;
          case "lever":
            QYL.mechanics.setLever(!!f);
            break;
          case "mode":
            QYL.setMode && QYL.setMode(v);
            break;
          case "focus":
            QYL.interact.select(v === "null" ? null : v);
            break;
          case "labels":
            QYL.labels.setMode(v);
            break;
          case "step":
            QYL.flow.goTo(f);
            break;
          case "gauge":
            QYL.state.gauge = !!f;
            break;
        }
      });
  }

  /* ---------------- 字幕 ---------------- */
  function showSubtitle(chapter, text) {
    var note = document.getElementById("flow-note");
    if (note) note.classList.remove("on");
    var el = document.getElementById("subtitle");
    el.querySelector(".ch").textContent = chapter;
    el.querySelector(".tx").textContent = text;
    el.classList.add("on");
  }

  function hideSubtitle() {
    document.getElementById("subtitle").classList.remove("on");
  }

  /* ---------------- 进度条 ---------------- */
  function buildDots() {
    var wrap = document.querySelector("#tour-progress .dots");
    wrap.innerHTML = "";
    var list = steps();
    var total = totalDur();
    var acc = 0;
    var seen = {};
    list.forEach(function (s) {
      if (!seen[s.ch]) {
        seen[s.ch] = true;
        var i = document.createElement("i");
        i.style.left = (acc / total) * 100 + "%";
        wrap.appendChild(i);
      }
      acc += durOf(s);
    });
    return wrap;
  }

  function durOf(s) {
    return preset === "short" ? (s.sDur != null ? s.sDur : 0) : s.dur;
  }

  function steps() {
    return QYL.TOUR.filter(function (s) {
      return preset === "short" ? s.sDur != null : true;
    });
  }

  function totalDur() {
    return steps().reduce(function (a, s) {
      return a + durOf(s);
    }, 0);
  }

  function updateProgress() {
    var list = steps();
    var total = totalDur();
    var acc = 0;
    for (var i = 0; i < idx && i < list.length; i++) acc += durOf(list[i]);
    var frac = (acc + Math.min(timer, durOf(list[idx] || { sDur: 0 }))) / total;
    document.querySelector("#tour-progress .bar").style.width = frac * 100 + "%";
  }

  /* ---------------- 接管提示 ---------------- */
  function ensureResumeBtn() {
    if (resumeBtn) return resumeBtn;
    resumeBtn = document.createElement("button");
    resumeBtn.className = "btn primary";
    resumeBtn.id = "tour-resume";
    resumeBtn.textContent = "▶ 继续导览";
    resumeBtn.style.cssText =
      "position:fixed;left:50%;bottom:72px;transform:translateX(-50%);z-index:80;display:none;";
    resumeBtn.addEventListener("click", function () {
      QYL.tour.resume();
    });
    document.body.appendChild(resumeBtn);
    return resumeBtn;
  }

  /* ---------------- 导览 ---------------- */
  QYL.tour = {
    get running() {
      return running;
    },

    setPreset: function (p) {
      preset = p === "long" ? "long" : "short";
    },

    setSpeed: function (s) {
      speed = s;
    },

    start: function (p) {
      if (p) QYL.tour.setPreset(p);
      QYL.ui.cancelDepthDemo(); QYL.mechanics.stopAnimations();
      QYL.setMode("overview"); QYL.mechanics.setDepth(0.5); QYL.mechanics.setTurn(0);
      QYL.mechanics.setBeamStraight(false); QYL.exploded.set(0); QYL.mechanics.setArrows(true);
      idx = -1;
      timer = 0;
      tweens = [];
      running = true;
      document.getElementById("tour-progress").classList.add("on");
      buildDots();
      ensureResumeBtn().style.display = "none";
      QYL.cameraRig.enableControls(false);
      QYL.setClean && QYL.setClean(true);
      QYL.tour.next();
      QYL.tour._syncButton();
    },

    next: function () {
      var list = steps();
      idx++;
      if (idx >= list.length) {
        QYL.tour.stop(true);
        return;
      }
      timer = 0;
      var s = list[idx];
      runAct(s.act);
      showSubtitle(s.ch, s.text);
      var d = Math.min(3.4, durOf(s) * 0.55);
      QYL.cameraRig.flyTo(s.cam.p, s.cam.t, d);
      updateProgress();
    },

    pause: function () {
      if (!running) return;
      running = false;
      tweens = []; QYL.mechanics.stopAnimations(); QYL.ui.cancelDepthDemo(); QYL.cameraRig.cancel();
      ensureResumeBtn().style.display = "inline-flex";
      QYL.cameraRig.enableControls(true);
      QYL.tour._syncButton();
    },

    resume: function () {
      if (running) return;
      running = true;
      ensureResumeBtn().style.display = "none";
      QYL.cameraRig.enableControls(false);
      if (idx >= 0) runAct(steps()[idx].act);
      QYL.tour._syncButton();
    },

    stop: function (finished) {
      running = false;
      tweens = [];
      QYL.mechanics.stopAnimations(); QYL.ui.cancelDepthDemo(); QYL.cameraRig.cancel();
      idx = -1;
      timer = 0;
      hideSubtitle();
      document.getElementById("tour-progress").classList.remove("on");
      if (resumeBtn) resumeBtn.style.display = "none";
      QYL.cameraRig.enableControls(true);
      if (finished) {
        QYL.setClean && QYL.setClean(false);
        QYL.setMode && QYL.setMode("overview");
      }
      QYL.tour._syncButton();
    },

    /** 用户手动接管 */
    takeover: function () {
      if (!running) return;
      QYL.tour.pause();
      tweens = [];
      QYL.mechanics.stopAnimations(); QYL.ui.cancelDepthDemo(); QYL.cameraRig.cancel();
      showSubtitle("手动接管", "已切换为手动视角 —— 点击下方按钮继续导览");
    },

    _syncButton: function () {
      var b = document.getElementById("btn-tour");
      if (!b) return;
      b.innerHTML = running
        ? '<span class="glyph">❚❚</span>暂停导览'
        : '<span class="glyph">▶</span>自动导览';
      b.classList.toggle("on", running);
    },

    update: function (dt) {
      if (!running) return;
      updateTweens(dt);
      timer += dt * speed;
      var list = steps();
      if (idx >= 0 && idx < list.length && timer >= durOf(list[idx])) {
        QYL.tour.next();
      }
      updateProgress();
    },
  };
})();
