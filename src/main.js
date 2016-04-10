;(function(){
  // TODO backport those 2 in Detector.js
  var hasGetUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) ? true : false
  var hasMediaStreamTrackSources = MediaStreamTrack.getSources ? true : false
  var hasWebGL = ( function () { try { var canvas = document.createElement( 'canvas' ); return !! ( window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ) ); } catch ( e ) { return false; } } )()
  
  if( hasWebGL === false ){
    alert('your browser doesn\'t support navigator.getUserMedia()')			
  }
  if( hasMediaStreamTrackSources === false ){
    alert('your browser doesn\'t support MediaStreamTrack.getSources()')			
  }
  if( hasGetUserMedia === false ){
    alert('your browser doesn\'t support navigator.getUserMedia()')		
  }
})()

var detectMarkersStats = new Stats();
detectMarkersStats.setMode( 1 );
document.body.appendChild( detectMarkersStats.domElement );
detectMarkersStats.domElement.style.position = 'absolute'
detectMarkersStats.domElement.style.bottom = '0px'
detectMarkersStats.domElement.style.right = '0px'

var renderStats = new Stats();
renderStats.setMode( 0 );
document.body.appendChild( renderStats.domElement );
renderStats.domElement.style.position = 'absolute'
renderStats.domElement.style.bottom = '0px'
renderStats.domElement.style.left = '0px'

// init renderer
var renderer	= new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// array of functions for the rendering loop
var onRenderFcts = [];

// init scene and camera
var scene = new THREE.Scene()
var camera	= new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.z = 2;

var SPHERE_SIZE = 20;

var OVERLAY_MAT = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: false, transparent: true, opacity: 0.3 });
var RED_MAT = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true, transparent: true, opacity: 0.7 });
var GREEN_MAT = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.7 });
var BLUE_MAT = new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: true, transparent: true, opacity: 0.7 });

var arSceneManager = {
  setupMarker: function(markerId) {
    var markerObject = new THREE.Object3D();
    markerObject.visible = false;
    markerObject.name = markerId;
    markerObject.marker = true;

    scene.add(markerObject);
  },

  add: function(markerId, obj) {
    if (!scene.getObjectByName(markerId))
      this.setupMarker(markerId);

    scene.getObjectByName(markerId).add(obj);
  },

  addDebug: function(markerId) {
    var geometry = new THREE.PlaneGeometry(1,1,10,10);
    var material = new THREE.MeshBasicMaterial({ wireframe: true });
    var mesh = new THREE.Mesh(geometry, material);

    this.add(markerId, mesh);
    this.add(markerId, new THREE.AxisHelper());
  },

  // testing method
  insert: function(markerId) {
          var clone = PIG.clone();
          clone.applyMatrix(activeObj.matrixWorld);
          clone.traverse(function(cloneChild) {
            if (cloneChild instanceof THREE.Mesh)
              cloneChild.sphere = new THREE.Sphere(clone.position, SPHERE_SIZE);
              cloneChild.targetable = true;
              cloneChild.material = BLUE_MAT.clone();
          });
          scene.add(clone);
  },
  select: function(markerId) {
    console.log("SELECT");
    scene.traverseVisible(function(child) {
      if (child.targeted) {
        THREE.SceneUtils.attach(child.parent, scene, activeObj);
        child.targetable = false;
        child.targeted = false;
        child.selected = true;
      }
    });
  },
  release: function(markerId) {
    scene.traverseVisible(function(child) {
      if (child.selected) {
        THREE.SceneUtils.detach(child.parent, activeObj, scene);
        child.targetable = true;
        child.targeted = false;
        child.selected = false;
      }
    });
  },
  update: function(markers) {
    // activeObj.geometry.computeBoundingSphere();
    // var activeSphere = activeObj.geometry.boundingSphere;
    // activeSphere.center = activeObj.position.clone().applyMatrix4(activeObj.matrixWorld);
    // activeObj.worldToLocal(activeObj.position.clone());

    scene.traverseVisible(function(child) {
      if (child.marker) {
        child.reset = child.reset || 5;
        if (--child.reset === 0)
          child.visible = false
      }
    });
    markers.forEach(function(marker) {
      var markerObject = scene.getObjectByName(marker.id);
      if (markerObject) {
        markerObject.visible = true;
        jsArucoMarker.markerToObject3D(marker, markerObject);
      }
    });

    activeObj.sphere.center = activeObj.position.clone().setFromMatrixPosition(activeObj.matrixWorld);
    // console.log(activeObj.sphere);
    scene.traverseVisible(function(child) {
      if (child.targetable) {
        var sphere = child.sphere;
        // geometry && child.geometry.boundingSphere;
        if (activeObj.parent.visible && sphere && sphere.intersectsSphere(activeObj.sphere)) {
          console.log("INTERSECTION");
          child.material.color.setHex(0x00ff00);
          child.targeted = true;
        } else {
          child.material.color.setHex(0x0000ff);
          child.targeted = false;
        }
      }
    });
  }
};



function sphere(id) {
  var geo  = new THREE.SphereGeometry( SPHERE_SIZE*2, 32, 16 );
  //, transparent: true, opacity: 0.8 } );
  // var mesh = new THREE.Mesh( geo, [RED_MAT, OVERLAY_MAT]);
  var mesh = new THREE.SceneUtils.createMultiMaterialObject(geo, [RED_MAT, OVERLAY_MAT]);
  mesh.sphere = new THREE.Sphere(mesh.position.clone(), SPHERE_SIZE*2);
  window.activeObj = mesh;
  arSceneManager.add(id, mesh);
}

sphere(265);

function normalize(obj) {
  var box = new THREE.Box3();
  box.setFromObject(obj);

  var scale = 1.0 / box.size().length();
  obj.scale.x = scale;
  obj.scale.y = scale;
  obj.scale.z = scale;
}

  var loader = new THREE.OBJLoader();
  loader.load("./assets/obj/pig.obj", function(obj) {
    obj.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.geometry.scale(5, 5, 5);
      }
    });
    normalize(obj);
    window.PIG= obj;
    // arSceneManager.addDebug(265);
  });

// pig();
//////////////////////////////////////////////////////////////////////////////////
//		render the whole thing on the page
//////////////////////////////////////////////////////////////////////////////////

// handle window resize
window.addEventListener('resize', function(){
  renderer.setSize( window.innerWidth, window.innerHeight )
  camera.aspect	= window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
}, false)


// render the scene
onRenderFcts.push(function(){	
  renderStats.begin();
  renderer.render( scene, camera );
  renderStats.end();
})

// run the rendering loop
var previousTime = performance.now()
requestAnimationFrame(function animate(now){

  requestAnimationFrame( animate );

  onRenderFcts.forEach(function(onRenderFct){
    onRenderFct(now, now - previousTime)
  })

  previousTime	= now
})

// init the marker recognition
var jsArucoMarker	= new THREEx.JsArucoMarker();
var videoGrabbing = new THREEx.WebcamGrabbing();
jsArucoMarker.videoScaleDown = 2;
document.body.appendChild(videoGrabbing.domElement);

onRenderFcts.push(function(){
  var domElement	= videoGrabbing.domElement
  detectMarkersStats.begin();
  var markers	= jsArucoMarker.detectMarkers(domElement);
  detectMarkersStats.end();

  // if (markers.length) console.log(markers.map(function(e) { return e.id }))

  arSceneManager.update(markers);
})
