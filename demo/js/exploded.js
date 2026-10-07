/* ============================================================
   拆解视图：爆炸位移插值 + 与标注联动
   group.position = basePos + dy + explodeDir * dist * t
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var t = 0;
  var anim = null; // {from, to, t, dur, cb}

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  var rootQ = new THREE.Quaternion(), parentQ = new THREE.Quaternion(), direction = new THREE.Vector3();

  function apply() {
    var groups = QYL.model.groups;
    QYL.model.root.getWorldQuaternion(rootQ);
    for (var id in groups) {
      var g = groups[id];
      if (!g.userData.basePos) continue;
      var o = g.userData.offset;
      g.position.set(
        g.userData.basePos[0] + (o ? o.x : 0),
        g.userData.basePos[1] + (o ? o.y : 0),
        g.userData.basePos[2] + (o ? o.z : 0)
      );
      if (g.userData.explodeDir && g.userData.explodeDist) {
        g.parent.getWorldQuaternion(parentQ);
        direction.copy(g.userData.explodeDir).applyQuaternion(rootQ).applyQuaternion(parentQ.invert());
        g.position.addScaledVector(direction, g.userData.explodeDist * t);
      }
    }
  }

  QYL.exploded = {
    get t() {
      return t;
    },

    set: function (v) {
      t = Math.max(0, Math.min(1, Number(v) || 0));
      anim = null;
      apply();
    },

    animateTo: function (v, dur, cb) {
      anim = { from: t, to: Math.max(0, Math.min(1, Number(v) || 0)), t: 0, dur: dur || 1.15, cb: cb || null };
    },

    isAnimating: function () {
      return !!anim;
    },

    /** 供 mechanics 调用：动态位移（犁评）改变后重算 */
    refresh: apply,

    update: function (dt) {
      if (!anim) return;
      anim.t += dt;
      var k = Math.min(1, anim.t / anim.dur);
      t = anim.from + (anim.to - anim.from) * easeInOutCubic(k);
      apply();
      if (k >= 1) {
        var cb = anim.cb;
        anim = null;
        if (cb) cb();
      }
    },
  };
})();
