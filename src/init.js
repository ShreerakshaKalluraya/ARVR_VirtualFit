// Import necessary modules from Three.js and other libraries
import * as THREE from 'three'; // Core Three.js library
import { XRDevice, metaQuest3 } from 'iwer'; // XR device management for Quest 3
import { DevUI } from '@iwer/devui'; // Development debugging UI
import { GamepadWrapper } from 'gamepad-wrapper'; // Gamepad utility for handling controllers
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Camera controls for non-VR mode
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'; // Room-like environment for realism
import { VRButton } from 'three/addons/webxr/VRButton.js'; // VR button to enter immersive mode
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js'; // Factory for rendering VR controllers

// Initialize variables for tracking user movement and time
let startTime = 0; // Tracks the time when the session starts
let elapsedTime = 0; // Cumulative time elapsed during the session
let lastLoggedTime = 0; // Time of the last console log update
let steps = 0; // Tracks the number of steps taken by the user
let totalDistance = 0; // Tracks the total distance moved
let previousPosition = new THREE.Vector3(); // Stores the last recorded position of the user

// Define user-specific data
const userHeight = 152; // User's height in centimeters
const userWeight = 50; // User's weight in kilograms

/**
 * Main initialization function to set up the scene, handle VR/AR devices, and manage rendering.
 * @param {Function} setupScene - Function to set up objects in the scene.
 * @param {Function} onFrame - Function to handle per-frame updates.
 */
export async function init(setupScene = () => {}, onFrame = () => {}) {
    let nativeWebXRSupport = false; // Flag to check native WebXR support

    // Check if the browser supports WebXR
    if (navigator.xr) {
        nativeWebXRSupport = await navigator.xr.isSessionSupported('immersive-vr');
    }

    // If native WebXR is not supported, initialize using the 'iwer' library for Quest 3 devices
    if (!nativeWebXRSupport) {
        const xrDevice = new XRDevice(metaQuest3); // Create an XR device for Meta Quest 3
        xrDevice.installRuntime(); // Install the necessary runtime for XR functionality
        xrDevice.fovy = (100 / 180) * Math.PI; // Set the field of view in radians
        xrDevice.ipd = 40; // Set the interpupillary distance (IPD) in millimeters
        window.xrdevice = xrDevice; // Expose XRDevice globally for debugging

        // Initialize default positions and orientations for the controllers
        xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
        xrDevice.controllers.right.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );
        xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
        xrDevice.controllers.left.quaternion.set(
            0.14766305685043335,
            0.02471366710960865,
            -0.0037767395842820406,
            0.9887216687202454,
        );

        // Initialize a development UI for debugging XR applications
        new DevUI(xrDevice);
    }

    // Create a container element for the rendering canvas and append it to the document
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Initialize the Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xC6FCFF); // Set a sky-blue background color

    // Set up the perspective camera
    const camera = new THREE.PerspectiveCamera(
        90, // Field of view in degrees
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.05, // Near clipping plane
        90, // Far clipping plane
    );
    camera.position.set(-27, 1.5, 50); // Set the initial camera position

    // Create and configure OrbitControls for camera navigation in non-VR mode
    const controls = new OrbitControls(camera, container);
    controls.target.set(0, 1.3, 0); // Set the focus point for the camera
    controls.update(); // Apply the updated settings

    // Initialize the WebGL renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio); // Adjust for high-DPI displays
    renderer.setSize(window.innerWidth, window.innerHeight); // Set the rendering size

    // Enable WebXR and add event listener for when a VR session starts
    renderer.xr.addEventListener('sessionstart', () => {
        player.position.set(-27, -0.5, 40); // Adjust player position when entering VR
        camera.position.set(0, 0, 0); // Reset camera position relative to player
    });
    renderer.xr.enabled = true; // Enable VR rendering
    container.appendChild(renderer.domElement); // Add the canvas to the container

    // Create a realistic room environment
    const environment = new RoomEnvironment(renderer);
    const pmremGenerator = new THREE.PMREMGenerator(renderer); // Precompute environment lighting
    scene.environment = pmremGenerator.fromScene(environment).texture; // Apply room lighting

    // Create a player group and add the camera to it
    const player = new THREE.Group();
    scene.add(player); // Add the player group to the scene
    player.add(camera); // Add the camera to the player
    player.position.set(0, 1.5, 50); // Set the initial player position

    // Initialize XR controllers using the factory
    const controllerModelFactory = new XRControllerModelFactory();
    const controllers = {
        left: null,
        right: null,
    };
    for (let i = 0; i < 2; i++) {
        const raySpace = renderer.xr.getController(i); // Get the XR ray controller
        const gripSpace = renderer.xr.getControllerGrip(i); // Get the XR grip controller
        const mesh = controllerModelFactory.createControllerModel(gripSpace); // Create a visual model for the controller
        gripSpace.add(mesh); // Add the model to the grip controller
        player.add(raySpace, gripSpace); // Add controllers to the player group
        raySpace.visible = false; // Hide by default
        gripSpace.visible = false;

        // Handle controller connection events
        gripSpace.addEventListener('connected', (e) => {
            raySpace.visible = true; // Show the ray controller
            gripSpace.visible = true; // Show the grip controller
            const handedness = e.data.handedness; // Determine left or right hand
            controllers[handedness] = {
                raySpace,
                gripSpace,
                mesh,
                gamepad: new GamepadWrapper(e.data.gamepad), // Wrap gamepad for easy access
            };
        });

        // Handle controller disconnection events
        gripSpace.addEventListener('disconnected', (e) => {
            raySpace.visible = false;
            gripSpace.visible = false;
            const handedness = e.data.handedness;
            controllers[handedness] = null;
        });
    }

    // Handle browser window resize events
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
        camera.updateProjectionMatrix(); // Update camera projection matrix
        renderer.setSize(window.innerWidth, window.innerHeight); // Adjust renderer size
    }
    window.addEventListener('resize', onWindowResize); // Add resize event listener

    // Store all global objects for reference
    const globals = {
        scene,
        camera,
        renderer,
        player,
        controllers,
    };

    // Call the setupScene function to add objects to the scene
    setupScene(globals);

    // Initialize a clock for timing
    const clock = new THREE.Clock();

    /**
     * Helper function to calculate calories burned based on user weight and session duration.
     * @param {number} weight - User's weight in kilograms.
     * @param {number} duration - Exercise duration in minutes.
     * @returns {number} Estimated calories burned.
     */
    function calculateCaloriesBurned(weight, duration) {
        const caloriesPerMinute = 8; // Approximate calories burned per minute
        return (weight / 100) * caloriesPerMinute * duration;
    }

    /**
     * Main animation loop that updates the scene and user data.
     */
    function animate() {
        const delta = clock.getDelta(); // Time elapsed since the last frame
        const time = clock.getElapsedTime(); // Total time elapsed

        // Initialize startTime when the animation loop starts
        if (startTime === 0) {
            startTime = time;
        }

        // Update elapsed time
        elapsedTime += delta;

        // Log user activity every 10 seconds
        if (elapsedTime - lastLoggedTime >= 10) {
            console.log(`Time Elapsed: ${elapsedTime.toFixed(2)} seconds`);
            console.log(`Steps Taken: ${steps}`);
            console.log(`Total Distance: ${totalDistance.toFixed(2)} meters`);
            console.log(`Calories Burned: ${calculateCaloriesBurned(userWeight, elapsedTime / 60).toFixed(2)}`);
            lastLoggedTime = elapsedTime;
        }

        // Call the user-defined frame update function
        onFrame(globals, delta, time);

        // Render the scene
        renderer.render(scene, camera);

        // Request the next animation frame
        renderer.setAnimationLoop(animate);
    }

    // Start the animation loop
    animate();

    // Add VR button to the document
    document.body.appendChild(VRButton.createButton(renderer));
}
