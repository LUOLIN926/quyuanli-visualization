/* ============================================================
   部件几何构建（13 件）+ 运动学分组

   root
   ├── beamGroup        （调深：绕后连接点改变姿态）
   │   ├── beam           犁辕
   │   └── panPivot       犁盘转向枢轴（rotation.y = 转角）
   │       ├── pan / yoke / rope
   ├── headGroup        （调深：position.y 竖向行程）
   │   ├── bed / share / wall / press / ce / arrow
   │   └── handle         犁梢固定连接
   └── pingGroup / jianGroup  （调深：沿主梁调节区域进退）

   坐标系：+X 前进 · +Y 上 · +Z 左 · 单位 米
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var P;

  /* ---------------- 通用几何工具 ---------------- */

  function curve(points) {
    var pts = points.map(function (p) {
      return new THREE.Vector3(p[0], p[1], p[2] || 0);
    });
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.5);
  }

  function tube(points, radius, tubularSegments, radialSegments) {
    return new THREE.TubeGeometry(
      curve(points),
      tubularSegments || 64,
      radius,
      radialSegments || 12,
      false
    );
  }

  /** 参数曲面：fn(u,v, target) -> Vector3 */
  function parametricSurface(fn, uSeg, vSeg) {
    var positions = [],
      normals = [],
      uvs = [],
      indices = [];
    var eps = 0.0015;
    var p = new THREE.Vector3(),
      pu1 = new THREE.Vector3(),
      pu2 = new THREE.Vector3(),
      pv1 = new THREE.Vector3(),
      pv2 = new THREE.Vector3(),
      n = new THREE.Vector3(),
      du = new THREE.Vector3(),
      dv = new THREE.Vector3();

    for (var j = 0; j <= vSeg; j++) {
      for (var i = 0; i <= uSeg; i++) {
        var u = i / uSeg,
          v = j / vSeg;
        fn(u, v, p);
        positions.push(p.x, p.y, p.z);
        uvs.push(u, 1 - v);

        fn(Math.min(1, u + eps), v, pu1);
        fn(Math.max(0, u - eps), v, pu2);
        fn(u, Math.min(1, v + eps), pv1);
        fn(u, Math.max(0, v - eps), pv2);
        du.subVectors(pu1, pu2);
        dv.subVectors(pv1, pv2);
        n.crossVectors(dv, du); // 外法线朝向土垡一侧
        if (n.lengthSq() < 1e-12) n.set(0, 1, 0);
        n.normalize();
        normals.push(n.x, n.y, n.z);
      }
    }
    for (var jj = 0; jj < vSeg; jj++) {
      for (var ii = 0; ii < uSeg; ii++) {
        var a = jj * (uSeg + 1) + ii,
          b = a + 1,
          c = a + uSeg + 1,
          d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    return g;
  }

  /** 由二维轮廓挤出（Z 向），并居中 */
  function extrude(points2D, depth, bevel) {
    var shape = new THREE.Shape();
    shape.moveTo(points2D[0][0], points2D[0][1]);
    for (var i = 1; i < points2D.length; i++) shape.lineTo(points2D[i][0], points2D[i][1]);
    shape.closePath();
    var g = new THREE.ExtrudeGeometry(shape, {
      depth: depth,
      bevelEnabled: bevel !== false,
      bevelThickness: 0.011,
      bevelSize: 0.011,
      bevelSegments: 2,
      curveSegments: 12,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }

  /** Rounded rectangular timber; UV u follows the grain along the member. */
  function timber(points, section, segments) {
    var path = curve(points), frames = path.computeFrenetFrames(segments, false);
    var ring = [], positions = [], uvs = [], indices = [];
    var hw = section[0] / 2, hh = section[1] / 2, r = Math.min(hw, hh) * 0.24;
    for (var corner = 0; corner < 4; corner++) {
      var angle = corner * Math.PI / 2;
      var cx = (corner === 0 || corner === 3 ? 1 : -1) * (hw - r);
      var cy = (corner < 2 ? 1 : -1) * (hh - r);
      for (var k = 0; k <= 3; k++) {
        var a = angle + k * Math.PI / 6;
        ring.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    }
    var n = ring.length;
    for (var j = 0; j <= segments; j++) {
      var center = path.getPointAt(j / segments);
      for (var i = 0; i < n; i++) {
        var v = center.clone().addScaledVector(frames.normals[j], ring[i][0]).addScaledVector(frames.binormals[j], ring[i][1]);
        positions.push(v.x, v.y, v.z); uvs.push(j / segments * path.getLength() * 2, i / n);
        if (j < segments) {
          var a = j * n + i, b = j * n + (i + 1) % n;
          indices.push(a, b, a + n, b, b + n, a + n);
        }
      }
    }
    for (var end = 0; end < 2; end++) {
      var center = path.getPointAt(end), ci = positions.length / 3, off = end * segments * n;
      positions.push(center.x, center.y, center.z); uvs.push(0.5, 0.5);
      for (var i = 0; i < n; i++) {
        var a = off + i, b = off + (i + 1) % n;
        if (end) indices.push(ci, a, b); else indices.push(ci, b, a);
      }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices); g.computeVertexNormals(); return g;
  }

  /** Thin cutting edge, thicker heel; XZ footprint rather than a thick XY extrusion. */
  function shareGeometry() {
    var outline = P.share.outline;
    var positions = [], indices = [], n = outline.length;
    for (var layer = 0; layer < 2; layer++) outline.forEach(function (p) {
      var t = (p[0] - P.share.heel[0]) / (P.share.tip[0] - P.share.heel[0]);
      var y = P.shareTopY(p[0]);
      var thickness = P.share.thickness[0] * (1 - t) + P.share.thickness[1] * t;
      positions.push(p[0], y - layer * thickness, p[1]);
    });
    for (var i = 1; i < n - 1; i++) indices.push(0, i + 1, i, n, n + i, n + i + 1);
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n; indices.push(i, j, n + i, j, n + j, n + i);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices); g.computeVertexNormals(); return g.toNonIndexed();
  }

  /** Closed shell: front, back and all four boundary strips. */
  function wallGeometry() {
    var surface = parametricSurface(P.buildWallSurface, P.wall.uSeg, P.wall.vSeg);
    var pos = surface.attributes.position, norm = surface.attributes.normal, uv = surface.attributes.uv;
    var positions = [], uvs = [], indices = Array.from(surface.index.array), n = pos.count;
    for (var layer = 0; layer < 2; layer++) for (var i = 0; i < n; i++) {
      positions.push(pos.getX(i) - layer * norm.getX(i) * P.wallThickness,
        pos.getY(i) - layer * norm.getY(i) * P.wallThickness,
        pos.getZ(i) - layer * norm.getZ(i) * P.wallThickness);
      uvs.push(uv.getX(i), uv.getY(i));
    }
    var front = indices.slice();
    for (var i = 0; i < front.length; i += 3) indices.push(front[i] + n, front[i + 2] + n, front[i + 1] + n);
    var boundary = [], stride = P.wall.uSeg + 1;
    for (var i = 0; i <= P.wall.uSeg; i++) boundary.push(i);
    for (var j = 1; j <= P.wall.vSeg; j++) boundary.push(j * stride + P.wall.uSeg);
    for (var i = P.wall.uSeg - 1; i >= 0; i--) boundary.push(P.wall.vSeg * stride + i);
    for (var j = P.wall.vSeg - 1; j > 0; j--) boundary.push(j * stride);
    for (var i = 0; i < boundary.length; i++) {
      var a = boundary[i], b = boundary[(i + 1) % boundary.length];
      indices.push(a, b, a + n, b, b + n, a + n);
    }
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); surface.dispose(); return g;
  }

  /** Clip the actual wall triangles to a support footprint, including thin back skin. */
  function undersideInFootprint(geometry, cx, cz, width, depth) {
    var pos = geometry.attributes.position, indices = geometry.index.array;
    var minY = Infinity;
    function clip(polygon, axis, limit, sign) {
      var result = [];
      for (var i = 0; i < polygon.length; i++) {
        var a = polygon[i], b = polygon[(i + 1) % polygon.length];
        var da = sign * (a[axis] - limit), db = sign * (b[axis] - limit);
        if (da >= 0) result.push(a);
        if ((da >= 0) !== (db >= 0)) {
          var t = da / (da - db);
          result.push(a.clone().lerp(b, t));
        }
      }
      return result;
    }
    for (var i = 0; i < indices.length; i += 3) {
      var polygon = [0,1,2].map(function (j) { return new THREE.Vector3().fromBufferAttribute(pos, indices[i+j]); });
      polygon = clip(polygon, "x", cx-width/2, 1);
      polygon = clip(polygon, "x", cx+width/2, -1);
      polygon = clip(polygon, "z", cz-depth/2, 1);
      polygon = clip(polygon, "z", cz+depth/2, -1);
      polygon.forEach(function (v) { minY = Math.min(minY, v.y); });
    }
    return minY;
  }

  /* ---------------- 构件登记 ---------------- */

  var model = {
    groups: {},
    meshes: {},
    pickables: [],
  };

  function part(id, parent, basePos) {
    var g = new THREE.Group();
    g.name = id;
    g.userData.partId = id;
    g.userData.basePos = (basePos || [0, 0, 0]).slice();
    g.userData.offset = new THREE.Vector3(); // 动态位移（调深 / 转向）
    g.position.fromArray(g.userData.basePos);
    parent.add(g);
    model.groups[id] = g;
    model.meshes[id] = [];
    return g;
  }

  function addMesh(group, geom, material, opts) {
    opts = opts || {};
    var m = new THREE.Mesh(geom, material);
    if (material.map && geom.type === "BoxGeometry") {
      var pos = geom.attributes.position, uv = geom.attributes.uv, normal = geom.attributes.normal;
      var dims = [geom.parameters.width, geom.parameters.height, geom.parameters.depth];
      var longAxis = dims.indexOf(Math.max.apply(Math, dims));
      for (var i = 0; i < pos.count; i++) {
        var faceAxis = Math.abs(normal.getX(i)) > 0.5 ? 0 : Math.abs(normal.getY(i)) > 0.5 ? 1 : 2;
        var uAxis = longAxis === faceAxis ? (faceAxis + 1) % 3 : longAxis;
        var vAxis = [0,1,2].filter(function (axis) { return axis !== uAxis && axis !== faceAxis; })[0];
        uv.setXY(i, pos.array[i * 3 + uAxis] * 2, pos.array[i * 3 + vAxis] * 6);
      }
    }
    if (opts.pos) m.position.fromArray(opts.pos);
    if (opts.rot) m.rotation.fromArray(opts.rot);
    m.castShadow = opts.castShadow !== false;
    m.receiveShadow = opts.receiveShadow !== false;
    m.userData.partId = group.userData.partId;
    group.add(m);
    model.meshes[group.userData.partId].push(m);
    model.pickables.push(m);
    return m;
  }

  /* ================= 构建 ================= */

  model.build = function () {
    P = QYL.params;
    model.beamPaths = [curve(P.beamCurve), curve(P.beamStraight)];

    var root = new THREE.Group();
    root.name = "plowRoot";
    model.root = root;

    var beamGroup = new THREE.Group();
    beamGroup.name = "beamGroup";
    root.add(beamGroup);
    model.beamGroup = beamGroup;

    var headGroup = new THREE.Group();
    headGroup.name = "headGroup";
    root.add(headGroup);
    model.headGroup = headGroup;

    /* ---------- 1. 犁辕 ---------- */
    var gBeam = part("beam", beamGroup, [0, 0, 0]);
    model.beamMesh = addMesh(
      gBeam,
      timber(P.beamCurve, P.beamSection, 64),
      QYL.materials.wood()
    );
    model.beamGeomFactory = function (straight) {
      return timber(straight ? P.beamStraight : P.beamCurve, P.beamSection, 64);
    };

    /* ---------- 犁盘转向枢轴 ---------- */
    var panPivot = new THREE.Group();
    panPivot.name = "panPivot";
    panPivot.position.fromArray(P.pan.pos);
    beamGroup.add(panPivot);
    model.panPivot = panPivot;

    /* ---------- 2. 犁盘 ---------- */
    var gPan = part("pan", panPivot, [0, 0, 0]);
    addMesh(
      gPan,
      new THREE.CylinderGeometry(P.pan.r, P.pan.r * 0.9, P.pan.h, 40),
      QYL.materials.iron({ color: 0x53565c, roughness: 0.42 })
    );
    addMesh(
      gPan,
      new THREE.CylinderGeometry(P.pan.pinR, P.pan.pinR, P.pan.pinH, 18),
      QYL.materials.wood(0xa87b52),
      { pos: [0, P.pan.pinH / 2 - P.pan.h / 2, 0] }
    );
    for (var t = 0; t < 3; t++) {
      addMesh(
        gPan,
        new THREE.BoxGeometry(0.03, 0.012, 0.058),
        QYL.materials.iron({ color: 0x53565c }),
        {
          pos: [
            Math.cos((t / 3) * Math.PI * 2) * P.pan.r * 0.8,
            P.pan.h / 2 + 0.005,
            Math.sin((t / 3) * Math.PI * 2) * P.pan.r * 0.8,
          ],
          rot: [0, -(t / 3) * Math.PI * 2, 0],
        }
      );
    }

    /* ---------- 3. 曲轭（相对 panPivot） ---------- */
    var yokeLocal = P.yokeCurve.map(function (p) {
      return [p[0] - P.pan.pos[0], p[1] - P.pan.pos[1], p[2] - P.pan.pos[2]];
    });
    var gYoke = part("yoke", panPivot, [0, 0, 0]);
    addMesh(gYoke, tube(yokeLocal, P.yokeRadius, 48, 12), QYL.materials.wood(0xbb8b5c));
    // 两端挂索环
    [-1, 1].forEach(function (s) {
      addMesh(
        gYoke,
        new THREE.TorusGeometry(0.026, 0.008, 8, 20),
        QYL.materials.iron({ color: 0x5c5f66, roughness: 0.5 }),
        {
          pos: [yokeLocal[4][0], yokeLocal[4][1] - 0.022, s * 0.158],
          rot: [Math.PI / 2, 0, 0],
        }
      );
    });

    /* ---------- 4. 耕索（两根，带垂度） ---------- */
    var gRope = part("rope", panPivot, [0, 0, 0]);
    for (var r = 0; r < 2; r++) {
      var s = r === 0 ? -1 : 1;
      var a = [yokeLocal[4][0], yokeLocal[4][1] - 0.036, s * 0.155];
      var b = [P.ropeAttach[0], P.ropeAttach[1], s * P.ropeAttach[2]];
      var mid = [
        (a[0] + b[0]) / 2 - 0.018,
        (a[1] + b[1]) / 2 - P.ropeSag,
        (a[2] + b[2]) / 2,
      ];
      addMesh(gRope, tube([a, mid, b], P.ropeRadius, 24, 8), QYL.materials.rope());
    }

    /* ---------- 5. 犁梢（与犁床保持固定装配） ---------- */
    var hp = P.handlePivot;
    var handleLocal = P.handleCurve.map(function (p) {
      return [p[0] - hp[0], p[1] - hp[1], (p[2] || 0) - hp[2]];
    });
    var gHandle = part("handle", headGroup, hp);
    addMesh(gHandle, timber(handleLocal, P.handleSection, 40), QYL.materials.wood(0xb0804f));
    addMesh(
      gHandle,
      new THREE.CylinderGeometry(0.026, 0.024, P.handleGripLen, 16),
      QYL.materials.wood(0xc08f5e),
      {
        pos: [handleLocal[3][0], P.handleGripY - hp[1], 0],
        rot: [Math.PI / 2, 0, 0],
      }
    );
    [-1, 1].forEach(function (s) {
      addMesh(
        gHandle,
        new THREE.SphereGeometry(0.033, 14, 10),
        QYL.materials.wood(0xc08f5e),
        {
          pos: [handleLocal[3][0], P.handleGripY - hp[1], (s * P.handleGripLen) / 2],
        }
      );
    });
    model.handleGroup = gHandle;

    /* ---------- 6. 犁箭 ---------- */
    var gArrow = part("arrow", headGroup, [0, 0, 0]);
    model.arrowMesh = addMesh(gArrow, new THREE.BoxGeometry(P.arrow.w, 1, P.arrow.d), QYL.materials.wood(0xa97c52));
    // Visible rear timber joint pin; assigned to handle for picking/explosion.
    addMesh(gHandle, new THREE.CylinderGeometry(0.012, 0.012, 0.09, 12), QYL.materials.wood(0xd0a070),
      { pos: [0, P.joints.rear[1] - hp[1], 0], rot: [Math.PI / 2, 0, 0] });

    /* ---------- 7. 犁评（进退可动，楔形） ---------- */
    var gPing = part("ping", root, [P.pingXRange[0], P.pingY, 0]);
    [-1, 1].forEach(function (side) {
      addMesh(gPing, extrude([[-0.09,-0.026],[0.09,-0.026],[0.09,0.03],[-0.09,0.014]], 0.023),
        QYL.materials.wood(0xc0905f), { pos: [0, 0, side * 0.047] });
    });
    model.pingGroup = gPing;

    /* ---------- 8. 犁建（随犁评） ---------- */
    var gJian = part("jian", root, [P.pingXRange[0], P.pingY + 0.012, 0]);
    addMesh(
      gJian,
      new THREE.CylinderGeometry(P.jian.r, P.jian.r, P.jian.len, 14),
      QYL.materials.wood(0xd0a070),
      { rot: [Math.PI / 2, 0, 0] }
    );
    [-1, 1].forEach(function (s) {
      addMesh(
        gJian,
        new THREE.SphereGeometry(0.022, 12, 10),
        QYL.materials.wood(0xd0a070),
        { pos: [0, 0, (s * P.jian.len) / 2] }
      );
    });
    model.jianGroup = gJian;

    /* ---------- 9. 犁床 ---------- */
    var gBed = part("bed", headGroup, [0, 0, 0]);
    addMesh(
      gBed,
      new THREE.BoxGeometry(P.bed.len, P.bed.h, P.bed.w),
      QYL.materials.wood(0xa87a50),
      { pos: P.bed.pos }
    );

    /* ---------- 10. 策额 ---------- */
    var wallGeom = wallGeometry();
    var beamCeiling = undersideInFootprint(wallGeom, P.ce.pos[0], P.ce.pos[2], P.ce.w, P.ce.d);
    if (Number.isFinite(beamCeiling)) P.ce.pos[1] = Math.min(P.ce.pos[1], beamCeiling-P.ce.wallGap-P.ce.h/2);
    var gCe = part("ce", headGroup, [0, 0, 0]);
    addMesh(
      gCe,
      new THREE.BoxGeometry(P.ce.w, P.ce.h, P.ce.d),
      QYL.materials.wood(0xb5855a),
      { pos: P.ce.pos }
    );

    var post = P.ce.post;
    var postTop = undersideInFootprint(wallGeom, post.x, 0, post.w, post.d) - P.ce.wallGap;
    if (!Number.isFinite(postTop) || postTop <= post.baseY) throw new Error("策额支撑参数无法形成有效间隙");
    model.ceWallClearance = P.ce.wallGap;
    addMesh(gCe, new THREE.BoxGeometry(post.w, postTop-post.baseY, post.d), QYL.materials.wood(0xb5855a),
      { pos: [post.x, (postTop+post.baseY)/2, 0] });

    /* ---------- 11. 犁铲 ---------- */
    var gShare = part("share", headGroup, [0, 0, 0]);
    addMesh(
      gShare,
      shareGeometry(),
      QYL.materials.iron({ color: 0x4a4e55, roughness: 0.32 }),
      { pos: [0, 0, 0] }
    );

    /* ---------- 12. 犁壁（空间曲面） ---------- */
    var gWall = part("wall", headGroup, [0, 0, 0]);
    addMesh(
      gWall,
      wallGeom,
      QYL.materials.iron({ color: 0x565b63, roughness: 0.3, side: THREE.FrontSide })
    );

    /* ---------- 13. 压铲 ---------- */
    var gPress = part("press", headGroup, [0, 0, 0]);
    // Compact clamp rests on the bed at the share heel, below the working face.
    var pressBottom = P.bed.pos[1] + P.bed.h / 2 + 0.001;
    var pressLimit = undersideInFootprint(wallGeom, P.press.pos[0], 0, P.press.w, P.press.d);
    var pressHeight = Math.min(P.press.h, pressLimit - P.press.wallGap - pressBottom);
    if (pressHeight < 0.010) throw new Error("压铲安装空间不足");
    var pressMaterial = QYL.materials.iron({color: 0x5a5f67, roughness: 0.6});
    addMesh(gPress, new THREE.BoxGeometry(P.press.w, pressHeight, P.press.d), pressMaterial,
      {pos: [P.press.pos[0], pressBottom + pressHeight / 2, 0]});
    // Side cheeks straddle the timber and bear on the share root.
    [-1, 1].forEach(function(side) {
      var bottom = P.shareTopY(P.press.pos[0]) + 0.001;
      addMesh(gPress, new THREE.BoxGeometry(0.018, pressBottom - bottom, 0.009), pressMaterial,
        {pos: [P.press.pos[0], (pressBottom + bottom) / 2, side * 0.0525]});
    });
    model.pressWallClearance = pressLimit - pressBottom - pressHeight;

    /* ---------- 元数据 → 组（爆炸向量 / 锚点换算） ---------- */
    root.updateMatrixWorld(true);
    var world = new THREE.Vector3();
    QYL.PARTS.forEach(function (meta) {
      var g = model.groups[meta.id];
      if (!g) return;
      g.userData.explodeDir = new THREE.Vector3().fromArray(meta.explodeDir).normalize();
      g.userData.explodeDist = meta.explodeDist;
      // 锚点声明于 plowRoot 静止坐标，换算到该 group 的局部空间
      world.fromArray(meta.anchor);
      g.updateWorldMatrix(true, false);
      var box = new THREE.Box3().setFromObject(g);
      g.userData.anchor = g.worldToLocal(box.getCenter(new THREE.Vector3()));
      if (meta.id === "beam") g.userData.anchor.fromArray(P.beamCurve[3]);
      if (meta.id === "wall") g.userData.anchor.copy(P.buildWallSurface(0.5,0.55,new THREE.Vector3()));
    });

    return root;
  };

  /** 直辕 / 曲辕切换 */
  model.setBeamStraight = function (straight) {
    var g = model.groups.beam;
    if (!g) return;
    if (model.beamStraight === !!straight) return;
    var old = model.beamMesh.geometry;
    model.beamMesh.geometry = model.beamGeomFactory(straight);
    old.dispose();
    model.beamStraight = !!straight;
    model.applyPose && model.applyPose(model.depth == null ? 0.5 : model.depth);
  };

  /** All assembled motion is resolved here before explosion offsets. */
  model.applyPose = function (depth) {
    model.depth = depth;
    var dy = (0.5 - depth) * P.headTravel, angle = (depth - 0.5) * 0.10;
    var hinge = new THREE.Vector3().fromArray(P.joints.rear);
    model.headGroup.position.y = dy;
    model.beamGroup.rotation.z = angle;
    model.beamGroup.position.copy(hinge).sub(hinge.clone().applyAxisAngle(new THREE.Vector3(0,0,1), angle));
    model.beamGroup.position.y += dy;
    var path = model.beamPaths[model.beamStraight ? 1 : 0];
    function onBeam(x) {
      var lo = 0, hi = 1, point;
      for (var i = 0; i < 32; i++) {
        var t = (lo + hi) / 2;
        point = path.getPoint(t).sub(hinge).applyAxisAngle(new THREE.Vector3(0,0,1), angle).add(hinge);
        if (point.x > x) lo = t; else hi = t;
      }
      point.y += dy; return point;
    }
    var top = onBeam(P.arrow.pos[0]), foot = P.joints.arrowFoot;
    // Arrow is a rigid timber: only the beam crossing/visible exposed length changes.
    var height = P.arrow.h;
    model.arrowMesh.scale.y = height;
    model.arrowMesh.position.set(foot[0], foot[1] + height / 2, foot[2]);
    var px = P.pingXRange[0] + depth * (P.pingXRange[1] - P.pingXRange[0]);
    var seat = onBeam(px); seat.y += P.beamSection[0] / 2 + 0.024;
    [model.pingGroup, model.jianGroup].forEach(function (g) {
      g.userData.offset.copy(seat).sub(new THREE.Vector3().fromArray(g.userData.basePos));
      if (g === model.jianGroup) g.userData.offset.y += 0.032;
    });
    // Dynamic label anchors are local to each part, including moving wedge and arrow.
    model.groups.arrow.userData.anchor.set(foot[0], foot[1] + height * 0.8, 0);
    model.pingGroup.userData.anchor.set(0, 0.035, 0.05);
    model.jianGroup.userData.anchor.set(0, 0, 0.09);
    model.connectionErrors = {
      arrowBed: Math.abs(foot[1] - (P.bed.pos[1] + P.bed.h / 2)),
      rearHinge: model.beamGroup.localToWorld(hinge.clone()).distanceTo(model.headGroup.localToWorld(hinge.clone())),
      arrowGuideX: Math.abs(top.x - foot[0]),
    };
  };

  QYL.model = model;
})();
