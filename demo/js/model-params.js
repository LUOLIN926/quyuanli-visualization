/* ============================================================
   模型参数：单一参数源
   坐标系：+X 前进（犁盘/曲轭端） · +Y 上 · +Z 左 · 单位 米
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var P = {
    /* ---------- 主要尺寸 ---------- */
    beamRadius: 0.036,
    beamSection: [0.085, 0.065],
    handleSection: [0.065, 0.052],
    joints: { rear: [-0.72, 0.585, 0], arrowFoot: [-0.31, 0.1255, 0] },
    wallThickness: 0.008, // 犁壁实体厚度
    handleRadius: 0.03,
    yokeRadius: 0.021,
    ropeRadius: 0.007,

    /* ---------- 犁辕曲线（曲辕）---------- */
    beamCurve: [
      [1.3, 0.265, 0],
      [1.0, 0.34, 0],
      [0.62, 0.53, 0],
      [0.22, 0.7, 0],
      [-0.16, 0.735, 0],
      [-0.46, 0.68, 0],
      [-0.72, 0.585, 0],
    ],

    /* ---------- 同端点直辕形态对比---------- */
    beamStraight: [
      [1.3, 0.265, 0],
      [0.29, 0.425, 0],
      [-0.72, 0.585, 0],
    ],

    /* ---------- 犁梢（后上扬把手）---------- */
    handleCurve: [
      [-0.72, 0.1255, 0],
      [-0.72, 0.585, 0],
      [-0.84, 0.84, 0],
      [-0.92, 1.04, 0],
    ],
    handleGripY: 1.04, // 握把横杆高度
    handleGripLen: 0.3,

    /* ---------- 曲轭（牛轭：中间低两端高，贴合牛颈） ---------- */
    yokeCurve: [
      [1.315, 0.402, -0.165],
      [1.375, 0.372, -0.095],
      [1.408, 0.356, 0],
      [1.375, 0.372, 0.095],
      [1.315, 0.402, 0.165],
    ],

    /* ---------- 耕索（两根，带垂度）---------- */
    ropeAttach: [-0.028, 0.032, 0.058],
    ropeSag: 0.018,

    /* ---------- 犁床（底梁）---------- */
    bed: { len: 1.06, h: 0.075, w: 0.095, pos: [-0.225, 0.088, 0] },

    /* ---------- 犁箭 / 犁评 / 犁建 ---------- */
    arrow: { w: 0.052, h: 0.7, d: 0.052, pos: [-0.31, 0.4755, 0] },
    pingXRange: [-0.385, -0.235], // 犁评进退范围（深 ← 进）
    pingY: 0.618, // 静态登记基准；装配位置由 applyPose 求解
    ping: { w: 0.145, h: 0.072, d: 0.118 },
    jian: { r: 0.0135, len: 0.185 },

    /* ---------- 策额 ---------- */
    ce: {
      w: 0.87, h: 0.045, d: 0.048, pos: [-0.285, 0.19, 0],
      post: { x: 0.13, w: 0.04, d: 0.04, baseY: 0.1255 },
      wallGap: 0.006, // 以犁壁三角面真实下表面裁定立木高度，留可见间隙
    },

    /* ---------- 压铲 ---------- */
    press: { w: 0.075, h: 0.020, d: 0.110, pos: [0.240, 0.1365, 0], rotZ: 0, wallGap: 0.006 },

    /* ---------- 犁盘 ---------- */
    pan: {
      pos: [1.315, 0.245, 0],
      r: 0.125,
      h: 0.03,
      pinR: 0.024,
      pinH: 0.2,
    },

    /* ---------- 犁铲 ---------- */
    share: {
      outline: [[0.222, -0.1], [0.5, -0.08], [0.658, 0], [0.5, 0.08], [0.222, 0.1]],
      heel: [0.222, 0.113], shoulder: [0.5, 0.067], tip: [0.658, -0.018],
      thickness: [0.028, 0.004],
    },

    /* ---------- 犁壁（空间曲面参数）---------- */
    wall: {
      // 脊线（XY 平面内的翻土轮廓，自铲顶向后上方卷曲）
      spine: [
        [0.5, 0.067], [0.425, 0.092], [0.32, 0.155],
        [0.19, 0.235], [0.05, 0.29], [-0.1, 0.3], [-0.22, 0.27],
      ],
      width: 0.25, // Z 向宽度
      zStart: 0,
      twist: 1.25, // 扭转角（弧度）
      uSeg: 26,
      vSeg: 44,
    },

    /* ---------- 运动学 ---------- */
    headTravel: 0.105, // 调深时犁体总成的竖向行程（米）
    depthCm: [8, 18], // 耕深读数范围
    handlePivot: [-0.72, 0.1255, 0], // 犁梢与犁床连接基准

    /* ---------- 土垡（翻土动画）---------- */
    soilSlice: {
      particles: 240, batches: 4, clearance: 0.004, duration: 5.8,
    },
  };

  P.wall.spine[0] = P.share.shoulder.slice();
  P.shareTopY = function (x) {
    var a = x <= P.share.shoulder[0] ? P.share.heel : P.share.shoulder;
    var b = x <= P.share.shoulder[0] ? P.share.shoulder : P.share.tip;
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  };

  /* ---------- 犁壁参数曲面 ----------
   * u ∈ [0,1] 横向（沿 Z 宽度） v ∈ [0,1] 沿脊线（自铲顶至卷尾）
   * 脊线处的截面绕切线逐渐扭转，形成开放翻土曲面
   */
  P.buildWallSurface = function (u, v, target) {
    if (!P._wallSpine) {
      var pts = [];
      for (var i = 0; i < P.wall.spine.length; i++) {
        pts.push(
          new THREE.Vector3(P.wall.spine[i][0], P.wall.spine[i][1], 0)
        );
      }
      P._wallSpine = new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
      P._wallTan = function (t) {
        return P._wallSpine.getTangent(Math.min(0.999, Math.max(0.001, t)));
      };
    }
    var pos = target || new THREE.Vector3();
    P._wallSpine.getPoint(v, pos);
    var tan = P._wallTan(v);
    // 宽度方向：初始沿 +Z，随 v 绕脊线切线扭转
    var ang = -P.wall.twist * Math.pow(v, 1.15) * (0.32 + 0.68 * u);
    var w = new THREE.Vector3(0, 0, 1).applyAxisAngle(tan, ang);
    pos.addScaledVector(w, (u - 0.5) * 0.16 * (1 - v) + u * P.wall.width * v);
    return pos;
  };

  /** 供土垡动画取样：沿犁壁曲面中线的路径点 */
  P.wallCenterPath = function (n) {
    n = n || 40;
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var v = i / n;
      pts.push(P.buildWallSurface(0.42, v, new THREE.Vector3()));
    }
    return pts;
  };

  QYL.params = P;
})();
