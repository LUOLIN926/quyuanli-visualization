/* ============================================================
   力学机构动效
   - 调深：犁评进退 ↔ 犁体升降 ↔ 耕深读数
   - 转向：犁盘绕销轴转动；整犁回转演示
   - 翻土：土垡沿犁壁曲面滑升翻转
   - 力分解：牵引 / 切土 / 抬土 三向箭头
   - 犁梢杠杆
   ============================================================ */
(function () {
  "use strict";

  window.QYL = window.QYL || {};

  var P;
  var headGroup, panPivot, pingGroup, jianGroup, handleGroup, root;
  var arrowsGroup = null;
  var soilAnim = null; // {t, speed, loop}
  var turnAnim = null;
  var leverAnim = null;

  var state = {
    depth: 0.5,
    turn: 0,
    arrows: true,
    soilP: 0,
    soilPlaying: false,
    lever: 0,
  };

  function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  /* ---------------- 力示意箭头 ---------------- */

  var forceItems = {}, forceEnabled = {traction:true, reaction:true, lift:true};
  var forceLabels = true, forcePreference = null;
  // DOM glass labels let the actual scene show through a blurred, tinted panel.
  function makeForceLabel(d) {
    var anchor=new THREE.Object3D(),el=document.createElement("div");
    el.className="force-caption";el.dataset.forceCaption=d.id;
    el.style.setProperty("--caption-ink",d.css);el.style.setProperty("--caption-tint",d.tint);
    var title=document.createElement("strong"),subject=document.createElement("span");
    title.textContent=d.label;subject.textContent=d.subject;
    el.appendChild(title);el.appendChild(subject);document.getElementById("stage").appendChild(el);
    anchor.userData.element=el;return anchor;
  }
  var forceLabelPoint=new THREE.Vector3(),forceView=new THREE.Vector3();
  var forceNormal=new THREE.Vector3(),forceWidth=new THREE.Vector3(),forceBasis=new THREE.Matrix4();
  function overlap(a,b) {
    return Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
      Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
  }
  function updateForceLabels() {
    if(!QYL.scene.camera||!arrowsGroup)return;
    var camera=QYL.scene.camera,rect=QYL.scene.renderer.domElement.getBoundingClientRect();
    var reaction=forceItems.reaction;
    if(reaction) {
      // Rotate the thin face around its force axis to remain readable from either side.
      // Its direction stays in model coordinates; only the face normal follows the view.
      camera.getWorldPosition(forceView);arrowsGroup.worldToLocal(forceView);
      forceView.sub(reaction.body.position).normalize();
      var axis=reaction.body.userData.direction;
      forceNormal.copy(forceView).addScaledVector(axis,-forceView.dot(axis));
      if(forceNormal.lengthSq()>.00001) {
        forceNormal.normalize();forceWidth.crossVectors(axis,forceNormal).normalize();
        forceBasis.makeBasis(forceWidth,axis,forceNormal);reaction.body.quaternion.setFromRotationMatrix(forceBasis);
      }
    }
    arrowsGroup.updateWorldMatrix(true,true);
    var blockers=[];
    Object.keys(forceItems).forEach(function(id){
      var item=forceItems[id];if(!state.arrows||!forceEnabled[id])return;
      var mesh=item.body.children[0],box=mesh.geometry.boundingBox;
      if(!box){mesh.geometry.computeBoundingBox();box=mesh.geometry.boundingBox;}
      var bounds={x:Infinity,y:Infinity,right:-Infinity,bottom:-Infinity};
      for(var corner=0;corner<8;corner++) {
        forceLabelPoint.set(corner&1?box.max.x:box.min.x,corner&2?box.max.y:box.min.y,corner&4?box.max.z:box.min.z);
        forceLabelPoint.applyMatrix4(mesh.matrixWorld).project(camera);
        var x=rect.left+(forceLabelPoint.x*.5+.5)*rect.width,y=rect.top+(-forceLabelPoint.y*.5+.5)*rect.height;
        bounds.x=Math.min(bounds.x,x);bounds.right=Math.max(bounds.right,x);
        bounds.y=Math.min(bounds.y,y);bounds.bottom=Math.max(bounds.bottom,y);
      }
      item.screenBounds={x:bounds.x-12,y:bounds.y-12,w:bounds.right-bounds.x+24,h:bounds.bottom-bounds.y+24};
      blockers.push(item.screenBounds);
    });
    var panel=document.getElementById("force-controls").getBoundingClientRect();
    blockers.push({x:panel.x,y:panel.y,w:panel.width,h:panel.height});
    Object.keys(forceItems).forEach(function(id){
      var item=forceItems[id],el=item.label.userData.element;
      var show=state.arrows&&forceEnabled[id]&&forceLabels;
      el.hidden=!show;if(!show)return;
      item.label.getWorldPosition(forceLabelPoint);forceLabelPoint.project(camera);
      show=forceLabelPoint.z>=-1&&forceLabelPoint.z<=1;el.hidden=!show;if(!show)return;
      var x=rect.left+(forceLabelPoint.x*.5+.5)*rect.width,y=rect.top+(-forceLabelPoint.y*.5+.5)*rect.height;
      var w=el.offsetWidth||180,h=el.offsetHeight||60,candidates=[[x,y]],best,score=Infinity;
      blockers.forEach(function(b){
        candidates.push([x,b.y-h/2-8],[x,b.y+b.h+h/2+8],
          [b.x-w/2-8,y],[b.x+b.w+w/2+8,y]);
      });
      candidates.forEach(function(c){
        var cx=Math.max(w/2+8,Math.min(rect.width-w/2-8,c[0]));
        var cy=Math.max(h/2+8,Math.min(rect.height-h/2-8,c[1]));
        var candidate={x:cx-w/2,y:cy-h/2,w:w,h:h};
        var penalty=blockers.reduce(function(sum,b){return sum+overlap(candidate,b)*10000;},0);
        var cost=(cx-x)*(cx-x)+(cy-y)*(cy-y)+penalty;
        if(cost<score){score=cost;best=candidate;}
      });
      el.style.left=(best.x+w/2)+"px";el.style.top=(best.y+h/2)+"px";blockers.push(best);
    });
  }
  function syncForces() {
    if(arrowsGroup)arrowsGroup.visible=state.arrows;
    Object.keys(forceItems).forEach(function(id){
      forceItems[id].group.visible=forceEnabled[id];forceItems[id].label.visible=forceLabels;
      var button=document.querySelector('[data-force="'+id+'"]');
      if(button)button.setAttribute("aria-pressed",String(forceEnabled[id]));
    });
    var master=document.getElementById("force-master"),labels=document.getElementById("force-labels");
    if(master){master.setAttribute("aria-pressed",String(state.arrows));master.textContent=state.arrows?"力示意 · 开":"力示意 · 关";}
    if(labels)labels.setAttribute("aria-pressed",String(forceLabels));
    updateForceLabels();
    var panel=document.getElementById("force-controls");if(panel)panel.classList.toggle("disabled",!state.arrows);
    var sw=document.getElementById("sw-arrows");if(sw)sw.classList.toggle("on",state.arrows);
  }
  function buildArrows() {
    arrowsGroup=new THREE.Group();arrowsGroup.name="arrows";headGroup.add(arrowsGroup);
    var defs=[
      {id:"traction",dir:[.92,.4,0],origin:[1.3,.3,0],len:.30,color:0x730b18,css:"#922b36",tint:"rgba(183,48,67,.18)",label:"牵引力",subject:"作用于犁 · 向前牵引",offset:[0,.15,0]},
      {id:"reaction",dir:[-1,.15,-.10],origin:[.72,.18,.30],len:.25,color:0x0b286f,css:"#244f96",tint:"rgba(44,96,184,.18)",label:"土壤反力",subject:"作用于犁 · 阻碍前行",offset:[.12,.13,.03]},
      {id:"lift",dir:[-.6,.8,.15],origin:[.38,.14,.18],len:.36,color:0x064827,css:"#206943",tint:"rgba(42,133,82,.18)",label:"犁面推力",subject:"作用于土 · 抬升翻土",offset:[-.02,.07,.09]}
    ];
    defs.forEach(function(d){
      var arrow=new THREE.Group(),dir=new THREE.Vector3().fromArray(d.dir).normalize();
      var body=new THREE.Group();body.position.fromArray(d.origin);
      body.userData.direction=dir.clone();
      body.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);arrow.add(body);
      var glass=new THREE.MeshPhysicalMaterial({color:d.color,roughness:.16,metalness:0,
        transmission:.28,thickness:.045,ior:1.45,transparent:true,opacity:.83,
        clearcoat:1,clearcoatRoughness:.08,depthWrite:false,emissive:d.color,emissiveIntensity:.045});
      glass.color.convertSRGBToLinear();
      // A flat arrow silhouette with a 6 mm edge, rather than a round shaft/cone.
      var shoulder=d.len-.105,shape=new THREE.Shape();
      shape.moveTo(-.022,0);shape.lineTo(.022,0);shape.lineTo(.022,shoulder);
      shape.lineTo(.064,shoulder);shape.lineTo(0,d.len);
      shape.lineTo(-.064,shoulder);shape.lineTo(-.022,shoulder);shape.closePath();
      var geometry=new THREE.ExtrudeGeometry(shape,{depth:.006,bevelEnabled:true,
        bevelThickness:.001,bevelSize:.001,bevelSegments:1,steps:1});
      geometry.translate(0,0,-.003);
      glass.transmission=.05;glass.opacity=.93;glass.thickness=.006;glass.roughness=.45;glass.clearcoat=.35;
      if(d.id==="reaction") {
        // Transmission is rendered before transparent soil slabs in Three.js.
        // Use tinted transparency here so this qualitative overlay draws last.
        glass.transmission=0;glass.depthTest=false;
      }
      var silhouette=new THREE.Mesh(geometry,glass);
      if(d.id==="reaction")silhouette.renderOrder=18; // qualitative overlay stays visible over soil/wall
      body.add(silhouette);
      var label=makeForceLabel(d);label.position.fromArray(d.origin).addScaledVector(dir,d.id==="traction"?d.len*.45:d.len+.055).add(new THREE.Vector3().fromArray(d.offset));
      arrow.add(label);arrowsGroup.add(arrow);forceItems[d.id]={group:arrow,label:label,body:body};
    });
  }

  /* ---------------- 连续土垡曲面翻覆 ---------------- */
  var _pivot = new THREE.Vector3(), _rotatedPivot = new THREE.Vector3();
  function setSoil(p) {
    state.soilP = Math.max(0, Math.min(1, Number(p) || 0));
    QYL.soil.set(state.soilP, !!soilAnim && soilAnim.loop);
  }

  /* ---------------- 对外接口 ---------------- */

  QYL.mechanics = {
    init: function () {
      P = QYL.params;
      root = QYL.model.root;
      headGroup = QYL.model.headGroup;
      panPivot = QYL.model.panPivot;
      pingGroup = QYL.model.pingGroup;
      jianGroup = QYL.model.jianGroup;
      handleGroup = QYL.model.handleGroup;

      buildArrows();
      QYL.soil.init(headGroup);
      this.setDepth(0.5);
      this.setTurn(0);
      this.setArrows(true);
    },

    /* ---- 调深 ---- */
    setDepth: function (t) {
      state.depth = Math.max(0, Math.min(1, Number(t) || 0));
      var d = state.depth;
      QYL.model.applyPose(d);
      QYL.exploded.refresh();

      var cm = P.depthCm[0] + (P.depthCm[1] - P.depthCm[0]) * d;
      state.depthCm = cm;
      var gv = document.getElementById("gauge-val");
      if (gv) gv.textContent = cm.toFixed(1);
      QYL.ui && QYL.ui.syncDepthLabel();
    },

    get depth() {
      return state.depth;
    },
    get depthCm() {
      return state.depthCm;
    },

    /* ---- 转向 ---- */
    setTurn: function (deg) {
      state.turn = Math.max(-35, Math.min(35, Number(deg) || 0));
      panPivot.rotation.y = (state.turn * Math.PI) / 180;
      QYL.ui && QYL.ui.syncTurnLabel();
    },
    get turn() {
      return state.turn;
    },

    /* ---- 力示意 ---- */
    setArrows: function (on, userChoice) {
      if(userChoice)forcePreference=!!on;
      state.arrows=forcePreference===null?!!on:forcePreference;
      syncForces();
    },
    setForce: function(id,on) {if(id in forceEnabled){forceEnabled[id]=!!on;syncForces();}},
    setForceLabels: function(on) {forceLabels=!!on;syncForces();},
    get forceLabels(){return forceLabels;},
    get forces(){return Object.assign({},forceEnabled);},
    get forceItems(){return forceItems;},
    get arrows() {
      return state.arrows;
    },

    /* ---- 直辕对比 ---- */
    setBeamStraight: function (on) {
      QYL.model.setBeamStraight(on);
      QYL.exploded.refresh();
      var sw = document.getElementById("sw-straight"); if (sw) sw.classList.toggle("on", !!on);
    },
    get straight() {
      return !!QYL.model.beamStraight;
    },

    /* ---- 翻土 ---- */
    setSoil: setSoil,
    get soilP() {
      return state.soilP;
    },

    playSoil: function (loop) {
      state.soilPlaying = true;
      soilAnim = { t: state.soilP >= 0.999 ? 0 : state.soilP, speed: 1 / P.soilSlice.duration, loop: loop !== false };
    },
    stopSoil: function () {
      state.soilPlaying = false;
      soilAnim = null;
      setSoil(0);
    },

    /* ---- 整犁回转演示 ---- */
    playTurn: function () {
      if (turnAnim) return;
      turnAnim = { t: 0, startTurn: state.turn };
    },
    isTurning: function () {
      return !!turnAnim;
    },

    /* ---- 犁梢杠杆 ---- */
    setLever: function (on) {
      leverAnim = on ? { t: 0 } : null;
      if (!on) {
        root.rotation.x = 0; root.rotation.z = 0;
        state.lever = 0;
      }
    },

    stopAnimations: function () {
      this.stopSoil(); this.setLever(false);
      if (turnAnim) this.setTurn(turnAnim.startTurn);
      turnAnim = null; root.rotation.y = 0; root.position.set(0,0,0);
    },

    /* ---- 每帧 ---- */
    update: function (dt) {
      // 翻土循环
      if (soilAnim) {
        soilAnim.t += dt * soilAnim.speed;
        if (soilAnim.t >= 1) {
          if (soilAnim.loop) soilAnim.t %= 1;
          else {
            soilAnim.t = 1;
            soilAnim = null;
            state.soilPlaying = false;
          }
        }
        setSoil(soilAnim ? soilAnim.t : 1);
      }

      // 回转演示：0 → -120° → 0
      if (turnAnim) {
        turnAnim.t += dt;
        var initialTurn = turnAnim.startTurn;
        var T = turnAnim.t;
        var ang = 0;
        if (T < 2.2) ang = -120 * easeInOutCubic(T / 2.2);
        else if (T < 3.0) ang = -120;
        else if (T < 5.2) ang = -120 * (1 - easeInOutCubic((T - 3.0) / 2.2));
        else {
          ang = 0;
          turnAnim = null;
          this.setTurn(initialTurn);
        }
        root.rotation.y = (ang * Math.PI) / 180;
        // 转向盘同步偏转（解耦示意）
        if (turnAnim) {
          var sw = ang < -1 ? 32 : 0;
          this.setTurn(sw);
        }
      }

      // 握持操纵：整犁微倾
      if (leverAnim) {
        leverAnim.t += dt;
        var a = Math.sin(leverAnim.t * 1.5) * 0.085;
        var b = Math.sin(leverAnim.t * 1.5 + 1.1) * 0.055;
        // Tilting the assembled plow keeps every timber joint connected.
        root.rotation.z = a * 0.3; root.rotation.x = b * 0.35;
      }

      // Rotate the whole assembly about its current front coupling during the turn demo.
      QYL.model.beamGroup.updateMatrix();
      _pivot.fromArray(P.pan.pos).applyMatrix4(QYL.model.beamGroup.matrix);
      root.position.copy(_pivot).sub(_rotatedPivot.copy(_pivot).applyEuler(root.rotation));

      updateForceLabels();
      this.updateGauge();
    },

    /* ---- 耕深标尺浮层 ---- */
    updateGauge: function () {
      var el = document.getElementById("gauge");
      if (!el) return;
      var show = QYL.state && QYL.state.gauge;
      el.classList.toggle("on", !!show);
      if (!show) return;

      var cam = QYL.scene.camera;
      var rect = QYL.scene.renderer.domElement.getBoundingClientRect();
      var v = new THREE.Vector3(0.63, 0.02, 0.0);
      QYL.model.headGroup.localToWorld(v);
      v.project(cam);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) {
        el.classList.remove("on");
        return;
      }
      el.style.left = Math.min(rect.width - 120, Math.max(10, (v.x * 0.5 + 0.5) * rect.width + rect.left + 28)) + "px";
      el.style.top = Math.min(rect.height - 100, Math.max(10, (-v.y * 0.5 + 0.5) * rect.height + rect.top + 26)) + "px";
    },
  };
})();
