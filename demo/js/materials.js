/* ============================================================
   材质：木 / 铁 / 绳 / 土（PBR + 程序化木纹 CanvasTexture）
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var seed = 761;
  function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }

  /** 程序化木纹贴图（256×256，横向拉丝 + 噪点） */
  function makeWoodTexture() {
    var s = 256;
    var c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    var x = c.getContext("2d");

    var g = x.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, "#c5a277");
    g.addColorStop(0.5, "#b79368");
    g.addColorStop(1, "#c09b70");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);

    // 拉丝木纹：多条横向起伏曲线
    for (var i = 0; i < 46; i++) {
      var y0 = random() * s;
      var amp = 2 + random() * 9;
      var alpha = 0.05 + random() * 0.13;
      x.strokeStyle =
        random() > 0.5
          ? "rgba(60,38,20," + alpha + ")"
          : "rgba(215,178,132," + alpha * 0.9 + ")";
      x.lineWidth = 0.6 + random() * 2.2;
      x.beginPath();
      for (var px = 0; px <= s; px += 8) {
        var py = y0 + Math.sin((px / s) * Math.PI * 2 + i) * amp;
        if (px === 0) x.moveTo(px, py);
        else x.lineTo(px, py);
      }
      x.stroke();
    }

    // 细噪点
    var img = x.getImageData(0, 0, s, s);
    var d = img.data;
    for (var p = 0; p < d.length; p += 4) {
      var n = (random() - 0.5) * 18;
      d[p] += n;
      d[p + 1] += n;
      d[p + 2] += n;
    }
    x.putImageData(img, 0, 0);

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /** 土壤噪点贴图 */
  function makeSoilTexture() {
    var s = 128;
    var c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    var x = c.getContext("2d");
    // Fine monochrome grains, no colored rectangular patches.
    var pixels = x.createImageData(s, s);
    for (var i = 0; i < pixels.data.length; i += 4) {
      var shade = 205 + (random() - .5) * 45;
      if (random() < .09) shade -= 35;
      pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = shade;
      pixels.data[i+3] = 255;
    }
    x.putImageData(pixels, 0, 0);
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  var woodTex = null;
  var soilTex = null;

  QYL.materials = {
    /** 木构件 */
    wood: function (tint) {
      if (!woodTex) woodTex = makeWoodTexture();
      var m = new THREE.MeshStandardMaterial({
        map: woodTex,
        color: tint || 0xb98a5c,
        roughness: 0.78,
        metalness: 0,
      });
      return m;
    },

    /** 铁构件（犁铲 / 犁壁 / 犁盘 / 压铲） */
    iron: function (opts) {
      opts = opts || {};
      return new THREE.MeshStandardMaterial({
        color: opts.color || 0x5c6067,
        roughness: opts.roughness != null ? Math.max(0.48, opts.roughness) : 0.58,
        metalness: opts.metalness != null ? opts.metalness : 0.45,
        envMapIntensity: opts.env != null ? opts.env : 0.45,
        side: opts.side || THREE.FrontSide,
        flatShading: !!opts.flat,
      });
    },

    /** 绳索 */
    rope: function () {
      return new THREE.MeshStandardMaterial({
        color: 0x8a7355,
        roughness: 0.92,
        metalness: 0,
      });
    },

    /** 土壤 */
    soil: function () {
      if (!soilTex) soilTex = makeSoilTexture();
      var m = new THREE.MeshStandardMaterial({
        map: soilTex,
        color: 0x9c8261,
        roughness: 0.98,
        metalness: 0,
      });
      return m;
    },

    /** 土垡（翻土动画） */
    clod: function () {
      if (!soilTex) soilTex = makeSoilTexture();
      return new THREE.MeshStandardMaterial({
        map: soilTex,
        color: 0x80634a,
        bumpMap: soilTex,
        bumpScale: 0.0007,
        flatShading: true,
        roughness: 1,
        metalness: 0,
      });
    },
  };
})();
