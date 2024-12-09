import * as THREE from 'three';
const backgroundMusic = new Audio('./audio/bard.bgm.mp3');

//BGM setup
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2;
function startBackgroundMusic(){
  backgroundMusic.play()
  .then(() => console.log("Background music is playing."))
  .catch(err => console.error("Error playing background music:", err));
}

function adjustVolume(distance, maxDistance){
  const minVolume = 0.2;
  const maxVolume = 1.0;

  const volume = THREE.MathUtils.clamp(
    1 - distance / maxDistance, //Inverse linear mapping
    minVolume,
    maxVolume
  );
  backgroundMusic.volume = volume;
}


//setup
let dotsLit = 0;
const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const light = new THREE.AmbientLight(0x404040, 0);
scene.add(light);
camera.position.set(0, 0, 50);
camera.rotation.x = Math.PI / 30; // Tilts the camera 22.5 degrees down

//Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

//Plane
const planeGeometry = new THREE.PlaneGeometry(400, 400);
const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
scene.add(plane);

//Ball
const geometry = new THREE.SphereGeometry(5, 32, 16);
const material = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xffaa00,
  emissiveIntensity: 1,
  transparent: true,
  opacity: 1
});
const ball = new THREE.Mesh(geometry, material);
ball.position.set(0, 4.5, 0);

// Ball Light
//let brightness = mapping the distance between the ball to the closest dot, map it so that the dimmest is 15, and brightest is 50.
const ballLight = new THREE.PointLight(0xffaa00, 50, 25); // Color, intensity, distance
ballLight.castShadow = true; // Enable shadows for more realism
ballLight.position.set(0, 0, 0); //potentially can be adjusted to create interesting light source
ball.add(ballLight); // Attach the light to the ball so it moves with it

scene.add(ball);

//Class for Dots (in cylinder form)
class Dot {
  constructor(position, color = 0xffff00, radius = 4, height = 0.1) {
    // Geometry
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 64);

    // Material
    const material = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0,
      emissive: 0x000000, // No glow initially
      emissiveIntensity: 0,
    });

    // Mesh
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(position.x, position.y, position.z);

    // PointLight
    this.pointLight = new THREE.PointLight(0xffffff, 0, 10); // color, intensity, distance
    this.pointLight.position.set(position.x, position.y + 1, position.z); // Position above the dot
    this.pointLight.castShadow = true; // Enable shadows for realism

    // Timer properties
    this.timer = 0; // Time the ball has been on the dot
    this.glowing = false; // Whether the dot is glowing
  }

  //Reveal when ball rolls over it but hasn't stand on it
  setReveal(revealGlowColor = 0xffffff, opacity = 0.2, emissiveIntensity = 0.2) {
    const material = this.mesh.material;
    material.opacity = opacity; //Slightly visible
    material.emissive.set(revealGlowColor);
    material.emissiveIntensity = emissiveIntensity;
  }

  //Glows after ball stands on it
  setGlow(glowColor = 0xffffff, intensity = 1, visible = true) {
    const material = this.mesh.material;
    if (visible) {
      material.emissive.set(glowColor); // Set emissive color
      material.emissiveIntensity = intensity; // Set emissive intensity
      material.opacity = 1; // Make visible
      this.pointLight.intensity = 50; // Turn on the light
    } else {
      material.emissive.set(0x000000); // Turn off emissive
      material.emissiveIntensity = 0;
      material.opacity = 0; // Make transparent
      this.pointLight.intensity = 0; // Turn off the light
    }
  }

  reset(){
    const material = this.mesh.material;
    material.opacity = 0; //change to transparent
    material.emissive.set(0x000000); //Turn off glow
    material.emissiveIntensity = 0; //No glow
    this.pointLight.intensity = 0;
    this.timer = 0;
    this.glowing = false;
  }

}

//Dots
// Array to store dots
const dots = [];
//Create the dots
const dot1 = new Dot(new THREE.Vector3(-50, 0, -50));
const dot2 = new Dot(new THREE.Vector3(0, 0, 80));
const dot3 = new Dot(new THREE.Vector3(50, 0, -50));
const dot4 = new Dot(new THREE.Vector3(0, 0, -25));
const dot5 = new Dot(new THREE.Vector3(-75, 0, 0));
const dot6 = new Dot(new THREE.Vector3(75, 0, 0));
const dot7 = new Dot(new THREE.Vector3(35, 0, 45));
const dot8 = new Dot(new THREE.Vector3(-35, 0, 45));

//Add dots to the scene
scene.add(dot1.mesh);
scene.add(dot1.pointLight);

scene.add(dot2.mesh);
scene.add(dot2.pointLight);

scene.add(dot3.mesh);
scene.add(dot3.pointLight);

scene.add(dot4.mesh);
scene.add(dot4.pointLight);

scene.add(dot5.mesh);
scene.add(dot5.pointLight);

scene.add(dot6.mesh);
scene.add(dot6.pointLight);

scene.add(dot7.mesh);
scene.add(dot7.pointLight);

scene.add(dot8.mesh);
scene.add(dot8.pointLight);


// Add to array
dots.push(dot1, dot2, dot3, dot4, dot5, dot6, dot7, dot8);

//A class for all text
class text {
  constructor(scene, fontSize = 50, padding = 20, planeHeight = 20) {
    this.scene = scene;
    this.fontSize = fontSize;
    this.padding = padding;
    this.planeHeight = planeHeight;
    this.activeTexts = []; // Array of { mesh, startTime, endTime, followBall, fadeIn, fadeOut, ... }
  }

  createTextMesh(line) {
    // Measure text
    const measureCanvas = document.createElement('canvas');
    const measureCtx = measureCanvas.getContext('2d');
    measureCtx.font = `${this.fontSize}px Arial`;
    const metrics = measureCtx.measureText(line);
    const textWidth = Math.ceil(metrics.width);

    // Draw text onto a canvas
    const canvas = document.createElement('canvas');
    canvas.width = textWidth + this.padding;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${this.fontSize}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(line, canvas.width / 2, canvas.height / 2);

    // Create texture & material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 1.0
    });

    // Calculate aspect ratio and create geometry
    const aspectRatio = canvas.width / canvas.height;
    const planeWidth = this.planeHeight * aspectRatio;
    const geometry = new THREE.PlaneGeometry(planeWidth, this.planeHeight);

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    return mesh;
  }
}

const text1 = new text(scene);
const lines = [
  "Welcome to Connect the Stars!",
  "To start playing, click anywhere on the screen..."
];

let currentTextMesh = null;
let currentLineIndex = 0;
let introTextActive = true;

function introText() {
  if (currentTextMesh) {
    scene.remove(currentTextMesh);
    currentTextMesh.geometry.dispose();
    currentTextMesh.material.dispose();
  }
  const line = lines[currentLineIndex];
  currentTextMesh = text1.createTextMesh(line);
  currentTextMesh.position.set(0,0.1,15);
  scene.add(currentTextMesh);
  currentLineIndex = (currentLineIndex + 1) % lines.length;
}

if (introTextActive){
  introText();
}

setInterval(() => {
  if (introTextActive) {
    introText();
  }
}, 3000);


//Ball Movement 2
// Request pointer lock on click
renderer.domElement.addEventListener('click', () => {
  startBackgroundMusic();
  renderer.domElement.requestPointerLock();
});



function onMouseMove(event) {
  if (document.pointerLockElement === renderer.domElement) {
    mouseMoved = true;
    // Adjust the virtual mouse position based on relative movement
    VirtualMouse.x += event.movementX * 0.1; // scale down for sensitivity
    VirtualMouse.y -= event.movementY * 0.1;

    // Constrain the virtual mouse position within the control radius
    if (VirtualMouse.length() > controlRadius) {
      VirtualMouse.setLength(controlRadius);
    }
  }
}

window.addEventListener('mousemove', onMouseMove);

let gameState = "playing";

function gameEnd() {
  gameState = "end";
  console.log("End state reached.");
  //Delay and then reset game
  animateCameraToCenter(() => {
    setTimeout(() => {
      resetGame();
      gameState = "playing";
      resetCameraPosition();
    }, 3000);
  });
}

function animateCameraToCenter(onComplete) {
  // Target position in the center of the scene
  const targetPosition = new THREE.Vector3(0, 150, 25); // Center of the canvas
  const targetLookAt = new THREE.Vector3(0, 0, 0); // Looking towards the scene center

  let progress = 0;
  const duration = 1.5; // Animation duration in seconds
  const fps = 60; // Frames per second
  const totalFrames = fps * duration;

  const startPosition = camera.position.clone();
  const startLookAt = ball.position.clone();

  function animate() {
    progress++;

    const t = progress / totalFrames;
    camera.position.lerpVectors(startPosition, targetPosition, t);
    const currentLookAt = startLookAt.clone().lerp(targetLookAt, t);
    camera.lookAt(currentLookAt);
    //console.log(`Progress: ${t.toFixed(2)}, Position: ${camera.position.toArray()}, LookAt: ${currentLookAt.toArray()}`);

    renderer.render(scene, camera);

    if (progress < totalFrames) {
      requestAnimationFrame(animate);
    } else if (onComplete) {
      onComplete();
    }
  }

  animate();
}

function resetCameraPosition() {
  camera.position.set(0, 75, 50);
  camera.lookAt(ball.position);
}

function resetGame() {
  dotsLit = 0;
  ball.position.set(0, 4.5, 0);
  ballStartedMoving = false;
  startMovingTime = null;
  introTextActive = true;
  dots.forEach(dot => {
    dot.reset();
  });
    introText();
  console.log("Game reset");
}

//Movement variables
let velocityX = 0;
let velocityZ = 0;
const controlRadius = 10; //Radius of the control circle
const friction = 0.85; //Slows down the ball
const maxSpeed = 0.8;
const VirtualMouse = new THREE.Vector2(0, 0);
let mouseMoved = false;

//Text animation based on ball movement variables
let ballStartedMoving = false;
let startMovingTime = null;
const fadeDelay = 500;
const fadeDuration = 1000;

function animate() {
  if (gameState === "playing"){
  //Update the camera position to follow the ball
  camera.position.set(ball.position.x, ball.position.y + 75, ball.position.z + 50); //xyz position is the same as camera position set
  camera.lookAt(ball.position);

  //Ball Movement 2
  const ballRadius = geometry.parameters.radius; // Use the ball's radius

  if (mouseMoved) {
    // Calculate direction for the ball based on the virtual mouse position
    const direction = VirtualMouse.clone().multiplyScalar(0.1); // Scale down for smoother movement

    // Apply direction to ball movement, with a max speed limit
    if (direction.length() > maxSpeed) {
      direction.setLength(maxSpeed);
    }

    // Update velocity based on mouse direction
    velocityX = direction.x;
    velocityZ = -direction.y;
    mouseMoved = false; // Reset flag
  } else {
    // Gradually reduce velocities using friction
    // velocityX *= friction;
    // velocityZ *= friction;

    // Stop completely if velocity is very small (smooth threshold)
    if (Math.abs(velocityX) < 0.0001) velocityX = 0;
    if (Math.abs(velocityZ) < 0.0001) velocityZ = 0;
  }

  // Apply movement to the ball with friction
  ball.position.x += velocityX;
  ball.position.z += velocityZ;
  velocityX *= friction;
  velocityZ *= friction;

  // Add rotation to the ball based on movement direction
  if (velocityX !== 0 || velocityZ !== 0) {
    const rotationX = velocityZ / ballRadius; // Rotation around X-axis due to Z movement
    const rotationZ = -velocityX / ballRadius; // Rotation around Z-axis due to X movement
    ball.rotation.x += rotationX;
    ball.rotation.z += rotationZ;
  }

  // Calculate closest dot
  let closestDot = null;
  let closestDistance = Infinity;

  dots.forEach(dot => {
    //distance from ball to dot
    const distance = ball.position.distanceTo(dot.mesh.position);
    //Finding the dot that's the closest to the ball
    if (distance < closestDistance) {
      //Updating the closest distance when there's a closer dot
      closestDistance = distance;
      closestDot = dot;
    }
    //Defining when the ball is inside the dot
    const isInside = distance < (dot.mesh.geometry.parameters.radiusTop + 5);

    //Mechenic for when ball is inside for the dot
    if (isInside) {
      dot.timer += 1 / 60; // Increment the timer (assuming 60 FPS)
    
      if (dot.timer < 1.5) {
        dot.setReveal(0xffffff, 0.5, 0.2); // Reveal effect
      } else if (!dot.glowing) {
        dot.setGlow(0xffffff, 1, true); // Activate glow
        dot.glowing = true; // Mark as glowing
        dotsLit++;
      }
    } else if (!dot.glowing) {
      dot.reset(); // Reset only if the dot is not glowing
    }

    //Volume mechanics
    const maxDistance = 100;
    adjustVolume(closestDistance, maxDistance);
    
  });

  //Adjusting the ball's brightness and pointlight based on the distance to the closest dot
  if (closestDot) {
    const maxDistance = 100; // Maximum distance for mapping brightness
    const minBrightness = 0.1; // Minimum brightness to keep it visible
    const maxBrightness = 1.0; // Maximum brightness

    // Map distance (Similar to map in p5) to a brightness value
    const brightness = THREE.MathUtils.clamp(
      1 - closestDistance / maxDistance, // Linear mapping
      minBrightness,
      maxBrightness
    );

    // Apply brightness to the ball's emissive intensity and light intensity
    ball.material.emissiveIntensity = brightness;
    ballLight.intensity = brightness * 50; // Scale the light intensity

    //Adjust ball speed when it's closer to a dot
    const slowdownRange = 15;
    const minSpeedFactor = 0.2; //slowing down by 20% of the original speed

    if (closestDistance < slowdownRange) {
      const speedFactor = THREE.MathUtils.mapLinear(
        closestDistance,
        0,
        slowdownRange,
        minSpeedFactor,
        1
      );
      velocityX *= speedFactor;
      velocityZ *= speedFactor;
    }
  }

  //Ball & Text Interactions
  //Check if ball has started moving
  const ballSpeed = Math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
  //If ball is moving, start counting the time
  if (ballSpeed > 0 && !ballStartedMoving){
    ballStartedMoving = true;
    startMovingTime = performance.now();
  }
  //Fade if the ball has started moving after a certain amount of time
  if (ballStartedMoving && introTextActive){
    const currentTime = performance.now();
    const elapsed = currentTime - startMovingTime;

    if (elapsed > fadeDelay){
      const fadeProgress = (elapsed - fadeDelay) / fadeDuration;
      const newOpacity = Math.max(1 - fadeProgress, 0);

      currentTextMesh.material.opacity = newOpacity;

      if (newOpacity <= 0){
        scene.remove(currentTextMesh);
        currentTextMesh.geometry.dispose();
        currentTextMesh.material.dispose();
        introTextActive = false;
        console.log("intro text deactiviated.");
      }
    }
  }
  //Game ends
  if (dotsLit == 2){
    gameEnd();
  }

  renderer.render(scene, camera);
}
}

renderer.setAnimationLoop(animate);

// Exit pointer lock if needed
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement) {
    VirtualMouse.set(0, 0); // Reset the virtual mouse when pointer lock is lost
  }
});
