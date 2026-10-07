/* ============================================================
   相机补间：关键帧飞行 + OrbitControls 启停 / 手动接管
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var cam, controls;
  var tween = null; // {t, dur, fromP, toP, fromT, toT, cb}
  var tmpP = new THREE.Vector3(),
    tmpT = new THREE.Vector3();

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  QYL.cameraRig = {
    init: function () {
      cam = QYL.scene.camera;
      controls = QYL.scene.controls;
    },

    get position() {
      return cam.position;
    },
    get target() {
      return controls.target;
    },

    /** 飞往指定镜位（可带回调） */
    flyTo: function (pos, target, dur, cb) {
      // A cancelled camera flight must not execute its completion action.
      tween = {
        t: 0,
        dur: Math.max(0.05, dur || 1.6),
        fromP: cam.position.clone(),
        toP: new THREE.Vector3().fromArray(pos),
        fromT: controls.target.clone(),
        toT: new THREE.Vector3().fromArray(target),
        cb: cb || null,
      };
    },

    /** 立即置位（无动画） */
    snapTo: function (pos, target) {
      tween = null;
      cam.position.fromArray(pos);
      controls.target.fromArray(target);
      controls.update();
    },

    cancel: function () { tween = null; },

    /** 是否正在补间 */
    isFlying: function () {
      return !!tween;
    },

    /** 手动模式：允许 OrbitControls */
    enableControls: function (on) {
      controls.enabled = !!on;
    },

    update: function (dt) {
      if (tween) {
        tween.t += dt;
        var k = Math.min(1, tween.t / tween.dur);
        var e = easeInOutCubic(k);
        tmpP.lerpVectors(tween.fromP, tween.toP, e);
        tmpT.lerpVectors(tween.fromT, tween.toT, e);
        cam.position.copy(tmpP);
        controls.target.copy(tmpT);
        if (k >= 1) {
          var cb = tween.cb;
          tween = null;
          if (cb) cb();
        }
      }
      controls.update();
    },
  };
})();
