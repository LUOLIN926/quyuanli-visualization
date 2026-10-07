/* ============================================================
   场景：Renderer / Camera / 灯光 / 地面（纸面融合）/ 尺寸自适应
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var scene, camera, renderer, controls;
  var groundGroup, furrowGroup;

  /** 地面：径向 alpha 渐隐的土色圆盘（边缘溶入纸面） */
  function buildGround() {
    var s = 256;
    var c = document.createElement("canvas");
    c.width = c.height = s;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(150,124,88,0.42)");
    g.addColorStop(0.42, "rgba(150,124,88,0.3)");
    g.addColorStop(0.72, "rgba(154,130,96,0.13)");
    g.addColorStop(1, "rgba(154,130,96,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    // 细土粒
    for (var i = 0; i < 260; i++) {
      var r = Math.random() * s * 0.5;
      var a = Math.random() * Math.PI * 2;
      var px = s / 2 + Math.cos(a) * r,
        py = s / 2 + Math.sin(a) * r;
      x.fillStyle = "rgba(120,96,66," + (0.1 * (1 - r / (s * 0.5))).toFixed(3) + ")";
      x.fillRect(px, py, 2.2, 1.6);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;

    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 96),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0;
    disc.renderOrder = -2;
    groundGroup.add(disc);

    // 承影层
    var shadow = new THREE.Mesh(
      new THREE.CircleGeometry(3.0, 64),
      new THREE.ShadowMaterial({ opacity: 0.22 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    shadow.receiveShadow = true;
    groundGroup.add(shadow);
  }

  /** 犁沟（流程模式显示）：两侧土垡留出沟槽 */
  function buildFurrow() {
    furrowGroup = new THREE.Group();
    furrowGroup.visible = false;
    scene.add(furrowGroup);

    var mat = QYL.materials.soil();
    mat.transparent = true;
    mat.opacity = 0.92;

    function slab(x0, x1, z0, z1, h) {
      var w = x1 - x0,
        d = z1 - z0;
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
      m.castShadow = true;
      m.receiveShadow = true;
      furrowGroup.add(m);
      return m;
    }

    // 左侧已翻土（+Z 侧，犁壁翻土方向）
    slab(-1.35, 2.35, 0.055, 0.72, 0.055);
    // 右侧未耕（-Z 侧）
    slab(-1.35, 2.35, -0.78, -0.285, 0.042);
  }

  /** 环境贴图：程序化渐变穹顶（金属高光 / 反射来源） */
  function buildEnv(renderer, scene) {
    var c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    var x = c.getContext("2d");
    var g = x.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#fff8e8");
    g.addColorStop(0.42, "#ecdfc4");
    g.addColorStop(0.58, "#b99c72");
    g.addColorStop(1, "#6d583e");
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 128);
    // 主光斑（呼应 DirectionalLight 位置）
    var rg = x.createRadialGradient(82, 28, 2, 82, 28, 52);
    rg.addColorStop(0, "rgba(255,252,240,1)");
    rg.addColorStop(1, "rgba(255,252,240,0)");
    x.fillStyle = rg;
    x.fillRect(0, 0, 256, 128);
    var rg2 = x.createRadialGradient(196, 52, 2, 196, 52, 40);
    rg2.addColorStop(0, "rgba(232,238,248,0.75)");
    rg2.addColorStop(1, "rgba(232,238,248,0)");
    x.fillStyle = rg2;
    x.fillRect(0, 0, 256, 128);

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;

    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var env = pmrem.fromEquirectangular(tex).texture;
    scene.environment = env;
    pmrem.dispose();
    tex.dispose();
    return env;
  }

  QYL.scene = {
    init: function () {
      var canvas = document.getElementById("scene");
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.06;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      scene = new THREE.Scene();
      buildEnv(renderer, scene);

      camera = new THREE.PerspectiveCamera(
        40,
        window.innerWidth / window.innerHeight,
        0.05,
        60
      );
      camera.position.set(2.35, 1.72, 2.62);

      controls = new THREE.OrbitControls(camera, canvas);
      controls.target.set(0.18, 0.42, 0);
      controls.enableDamping = true;
      controls.dampingFactor = 0.075;
      controls.minDistance = 1.15;
      controls.maxDistance = 14;
      controls.maxPolarAngle = Math.PI * 0.495;
      controls.update();

      /* ---- 灯光 ---- */
      var key = new THREE.DirectionalLight(0xfff2dc, 1.5);
      key.position.set(2.9, 5.4, 2.4);
      key.castShadow = true;
      key.shadow.mapSize.set(2048, 2048);
      key.shadow.camera.left = -2.3;
      key.shadow.camera.right = 2.3;
      key.shadow.camera.top = 2.3;
      key.shadow.camera.bottom = -2.3;
      key.shadow.camera.near = 0.5;
      key.shadow.camera.far = 12;
      key.shadow.bias = -0.0002;
      key.shadow.normalBias = 0.022;
      key.shadow.radius = 3;
      scene.add(key);

      var fill = new THREE.DirectionalLight(0xdce6f0, 0.44);
      fill.position.set(-3, 2.4, -2.6);
      scene.add(fill);

      var rim = new THREE.DirectionalLight(0xffe9c8, 0.3);
      rim.position.set(-1.6, 1.2, 3.2);
      scene.add(rim);

      scene.add(new THREE.HemisphereLight(0xf6eedc, 0x8b7355, 0.55));

      /* ---- 地面 ---- */
      groundGroup = new THREE.Group();
      scene.add(groundGroup);
      buildGround();
      buildFurrow();

      this.renderer = renderer;
      this.camera = camera;
      this.controls = controls;
      this.scene = scene;
      this.groundGroup = groundGroup;

      this.fitDesktop();
      window.addEventListener("resize", QYL.scene.resize);
    },

    fitDesktop: function () {
      var sidebar = document.getElementById("sidebar");
      var width = window.innerWidth, height = window.innerHeight;
      if (width > 900 && !document.body.classList.contains("clean")) {
        var reserved = sidebar.offsetWidth;
        camera.setViewOffset(width, height, -reserved / 2, 0, width, height);
        camera.zoom = Math.min(1, (width - reserved) / width * 1.12);
      } else {
        camera.clearViewOffset(); camera.zoom = 1;
      }
      camera.updateProjectionMatrix();
    },

    setFurrow: function (on) {
      if (furrowGroup) furrowGroup.visible = !!on;
    },

    resize: function () {
      var w = window.innerWidth,
        h = window.innerHeight;
      camera.aspect = w / h;
      QYL.scene.fitDesktop();
      renderer.setSize(w, h);
    },

    render: function () {
      renderer.render(scene, camera);
    },
  };
})();
