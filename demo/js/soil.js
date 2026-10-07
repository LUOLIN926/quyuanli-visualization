/* Seeded, rigid earth crumbs. Instanced meshes are pooled; only rigid transforms
 * change during playback. Surface guidance and ballistic release are illustrative. */
(function () {
  "use strict";
  window.QYL = window.QYL || {};
  var P, group, particles = [], batches = [], field = [], rows = 160, columns = 24;
  var dummy = new THREE.Object3D(), point = new THREE.Vector3(), normal = new THREE.Vector3();
  var rotation = new THREE.Quaternion();
  function noise(a,b,c) {var n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return n-Math.floor(n);}
  function surfaceNormal(u,v) {
    var du=P.buildWallSurface(Math.min(1,u+.002),v,new THREE.Vector3()).sub(P.buildWallSurface(Math.max(0,u-.002),v,new THREE.Vector3()));
    var dv=P.buildWallSurface(u,Math.min(1,v+.002),new THREE.Vector3()).sub(P.buildWallSurface(u,Math.max(0,v-.002),new THREE.Vector3()));
    return new THREE.Vector3().crossVectors(dv,du).normalize();
  }
  function cacheField() {
    for(var j=0;j<=rows;j++) {
      var row=[];
      for(var i=0;i<=columns;i++) {
        var u=.12+.76*i/columns,v=j/rows;
        row.push({pos:P.buildWallSurface(u,v,new THREE.Vector3()),normal:surfaceNormal(u,v)});
      }
      field.push(row);
    }
  }
  function sample(u,v) {
    var x=Math.min(columns-.00001,u*columns),y=Math.min(rows-.00001,v*rows);
    var i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j;
    point.set(0,0,0);normal.set(0,0,0);
    for(var a=0;a<2;a++)for(var b=0;b<2;b++) {
      var weight=(a?fx:1-fx)*(b?fy:1-fy),f=field[j+b][i+a];
      point.addScaledVector(f.pos,weight);normal.addScaledVector(f.normal,weight);
    }
    normal.normalize();
  }
  function build() {
    var palette=[0x75604b,0x806b55,0x8c7660,0x665442,0x98816a];
    for(var b=0;b<P.soilSlice.batches;b++) {
      var geometry=new THREE.IcosahedronGeometry(1,b%2),pos=geometry.attributes.position;
      for(var k=0;k<pos.count;k++) {
        var x=pos.getX(k),y=pos.getY(k),z=pos.getZ(k);
        var rough=.72+.28*noise(x*10,y*10,z*10+b);
        pos.setXYZ(k,x*rough,y*rough*(.7+b*.06),z*rough*.88);
      }
      geometry.computeVertexNormals();geometry.computeBoundingSphere();
      var count=Math.ceil((P.soilSlice.particles-b)/P.soilSlice.batches);
      var mesh=new THREE.InstancedMesh(geometry,QYL.materials.clod(),count);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.name='soil-grains-'+b;group.add(mesh);batches.push(mesh);
      for(var i=0;i<count;i++) {
        var id=i*P.soilSlice.batches+b;
        var size=id%7===0?.014+noise(id,2,3)*.008:.004+noise(id,3,1)*.007;
        var axis=new THREE.Vector3(noise(id,8,2)-.5,noise(id,2,9)-.5,noise(id,6,4)-.5).normalize();
        var p={batch:b,index:i,size:size,radius:size*geometry.boundingSphere.radius,
          u:.05+.9*noise(id,4,6),offset:noise(id,7,2),axis:axis,spin:2+noise(id,3,9)*4,
          initial:new THREE.Quaternion().setFromEuler(new THREE.Euler(id*.77,id*.31,id*.93)),
          vx:-.10-noise(id,1,6)*.12,vz:.12+noise(id,9,7)*.13,vy:.025+noise(id,2,8)*.05,
          position:new THREE.Vector3(),visible:false,landed:false};
        particles.push(p);mesh.setColorAt(i,new THREE.Color(palette[id%palette.length]));
      }
    }
  }
  function update(p,phase) {
    var ground=-QYL.model.headGroup.position.y+.008;
    var radius=p.radius,age=0,spinTime=phase*P.soilSlice.duration;
    p.landed=false;
    if(phase<.16) {
      var t=phase/.16,x=.79-(.79-P.share.shoulder[0])*t;
      var y=x>P.share.tip[0]?ground:Math.max(ground,P.shareTopY(x));
      point.set(x,y,(p.u-.5)*.12);normal.set(.29,1,0).normalize();
      point.addScaledVector(normal,radius+P.soilSlice.clearance);
    } else if(phase<.64) {
      sample(p.u,(phase-.16)/.48);
      point.addScaledVector(normal,radius+P.soilSlice.clearance);
    } else {
      sample(p.u,1);point.addScaledVector(normal,radius+P.soilSlice.clearance);
      age=(phase-.64)*P.soilSlice.duration;
      var floor=ground+radius;
      // Different release speeds and angular velocities avoid a coordinated sheet.
      var height=Math.max(0,point.y-floor),gravity=1.25;
      var impact=(p.vy+Math.sqrt(p.vy*p.vy+2*gravity*height))/gravity;
      var motionAge=Math.min(age,impact+.16);
      point.x+=p.vx*motionAge;point.z+=p.vz*motionAge;
      if(age<impact) point.y+=p.vy*age-.5*gravity*age*age;
      else {
        var bounce=Math.min(.16,age-impact);
        point.y=floor+Math.max(0,.10*bounce-.625*bounce*bounce);
        if(age>=impact+.16){p.landed=true;spinTime=.64*P.soilSlice.duration+impact+.16;}
      }
      point.y=Math.max(floor,point.y);
    }
    p.position.copy(point);
    dummy.position.copy(point);
    rotation.setFromAxisAngle(p.axis,spinTime*p.spin);dummy.quaternion.copy(rotation).multiply(p.initial);
    dummy.scale.setScalar(p.visible?p.size:0);dummy.updateMatrix();
    batches[p.batch].setMatrixAt(p.index,dummy.matrix);
  }
  QYL.soil={
    init:function(parent) {
      P=QYL.params;group=new THREE.Group();group.name='soil-flow';group.visible=false;parent.add(group);
      cacheField();build();
    },
    set:function(value,loop) {
      var value=Math.max(0,Math.min(1,Number(value)||0));
      group.visible=!!loop||(value>.001&&value<.999);if(!group.visible)return;
      particles.forEach(function(p) {
        var birth=p.offset*.18,phase=loop?(value+p.offset)%1:(value-birth)/(1-birth);
        p.visible=phase>=0&&phase<1;
        update(p,Math.max(0,Math.min(1,phase)));
      });
      batches.forEach(function(mesh){mesh.instanceMatrix.needsUpdate=true;});
    },
    get group(){return group;},get particles(){return particles;},get batches(){return batches;}
  };
})();
