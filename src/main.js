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

var light = new THREE.PointLight( 0xff0000, 1, 100 );
light.position.set( 0, 0, 0 );
scene.add( light );

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

    var box = new THREE.Box3();
    box.setFromObject(obj);

    var scale = 1.0 / box.size().length();
    obj.scale.x = scale;
    obj.scale.y = scale;
    obj.scale.z = scale;
    obj.translateY(2);

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
  release: function(markerId) {
    scene.add(scene.getObjectByName(markerId).clone());
  },
  update: function(markers) {
    scene.traverseVisible(function(child) {
      if (child.marker)
        child.visible = false;
    });

    markers.forEach(function(marker) {
      var markerObject = scene.getObjectByName(marker.id);
      if (markerObject) {
        markerObject.visible = true;
        jsArucoMarker.markerToObject3D(marker, markerObject);
      }
    });
  }
};

var loader = new THREE.OBJLoader();
var material = new THREE.MeshBasicMaterial({
  color: 0x7777ff,
  wireframe: true,
  wireframeLinecap: "square",
  wireframeLinejoin: "miter"
});

loader.load("./assets/obj/pig.obj", function(obj) {
  obj.traverse(function(child) {
    if (child instanceof THREE.Mesh)
      child.material = material;
  });
  arSceneManager.add(265, obj);
  arSceneManager.addDebug(265);
});

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
