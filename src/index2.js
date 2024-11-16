
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Text } from 'troika-three-text';
import { init } from './init.js';


const scoreText = new Text();
scoreText.fontSize = 0.52;
scoreText.font = 'assets/SpaceMono-Bold.ttf';
scoreText.position.z = -2;
scoreText.color = 0xffa276;
scoreText.anchorX = 'center';
scoreText.anchorY = 'middle';

function setupScene({ scene}) {
    const gltfLoader = new GLTFLoader();
    
    // Load room
    gltfLoader.load('assets/models/park.glb', (gltf) => {
        scene.add(gltf.scene);
        gltf.scene.scale.set(1, 1, 1);
    });

    
    
    // Add score display to the scene
    scene.add(scoreText);

    
}


init(setupScene);