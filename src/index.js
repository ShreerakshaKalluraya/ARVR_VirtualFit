// Import necessary modules for the application
// GLTFLoader is used to load 3D models in GLTF/GLB format
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Troika-Three-Text is used to render 3D text in a Three.js scene
import { Text } from 'troika-three-text';

// `init` is a custom initialization module for setting up the Three.js scene
import { init } from './init.js';

// Create a new Text object to display the score in the 3D scene
const scoreText = new Text();

// Configure various properties of the score text
scoreText.fontSize = 0.52; // Sets the size of the text in world units
scoreText.font = 'assets/SpaceMono-Bold.ttf'; // Specifies the font file to be used for rendering text
scoreText.position.z = -2; // Positions the text along the Z-axis (2 units behind the origin)
scoreText.color = 0xffa276; // Sets the text color in hexadecimal (light orange)
scoreText.anchorX = 'center'; // Centers the text horizontally based on its anchor point
scoreText.anchorY = 'middle'; // Centers the text vertically based on its anchor point

/**
 * Function to set up the 3D scene
 * This function is passed to the `init` function for initializing the scene.
 * @param {Object} scene - The Three.js scene object where objects are added
 */
function setupScene({ scene }) {
    // Create an instance of GLTFLoader to load 3D models in GLTF/GLB format
    const gltfLoader = new GLTFLoader();

    // Load the 3D model from the specified GLB file
    // The callback function is triggered after the model is successfully loaded
    gltfLoader.load('assets/models/scene2.glb', (gltf) => {
        // Add the loaded model (gltf.scene) to the Three.js scene
        scene.add(gltf.scene);

        // Set the scale of the loaded model to ensure it appears at the desired size
        gltf.scene.scale.set(1, 1, 1); // Scale the model equally in X, Y, and Z dimensions
    });

    // Add the score text object to the scene
    // This makes the score visible in the rendered 3D view
    scene.add(scoreText);
}

// Initialize the 3D environment by calling the `init` function
// Pass the `setupScene` function to handle the scene setup logic
init(setupScene);
