// Final Sliceable Fruit Component
import { Component, Property } from '@wonderlandengine/api';
import { vec3 } from 'gl-matrix';

/**
 * Sliceable Fruit Component - Makes objects sliceable by the VRSword
 * Attach this to any object you want to be sliceable
 */
export class SliceableFruit extends Component {
    static TypeName = 'sliceable-fruit';
    
    static Properties = {
        // Points awarded for slicing this fruit
        pointValue: Property.int(10),
        
        // Optional: Different fruit types (0=apple, 1=orange, etc.)
        fruitType: Property.int(0),
        
        // Optional: Particle effect to spawn on hit
        hitEffectPrefab: Property.object(),
        
        // Optional: Sound to play on hit
        hitSoundName: Property.string(''),
        
        // Delay before destroying hit effect (if spawned)
        effectLifetime: Property.float(2.0)
    };

    init() {
        // Track if this fruit has been destroyed
        this.isDestroyed = false;
        
        // Store initial position for effect spawning
        this.hitPosition = vec3.create();
    }

    update(dt) {
        // Update logic can go here if needed
        // For example, you could add a lifetime or boundary check
        
        // Optional: Uncomment to enable automatic boundary checking
        // this.checkBounds();
    }

    /**
     * Called when the fruit is hit by the sword
     * @param {vec3} hitPosition - Position where the sword hit
     * @param {vec3} hitVelocity - Velocity of the sword at hit
     */
    onHit(hitPosition, hitVelocity) {
        if (this.isDestroyed) return;
        
        // Mark as destroyed immediately to prevent double hits
        this.isDestroyed = true;
        
        // Store hit position
        if (hitPosition) {
            vec3.copy(this.hitPosition, hitPosition);
        } else {
            this.object.getPositionWorld(this.hitPosition);
        }
        
        // Add score
        this.addScore(this.pointValue);
        
        // Play sound effect
        if (this.hitSoundName) {
            this.playSoundEffect();
        }
        
        // Spawn particle effect
        if (this.hitEffectPrefab) {
            this.spawnParticles(this.hitPosition);
        }
        
        // Destroy the fruit object immediately
        this.object.destroy();
    }

    /**
     * Add score (integrate with your game manager)
     */
    addScore(points) {
        console.log(`Fruit sliced! +${points} points`);
        
        // If you have a game manager, call it here:
        // Example 1: Using global reference
        // if (window.gameManager) {
        //     window.gameManager.addScore(points);
        // }
        
        // Example 2: Finding game manager in scene
        // const gameManager = this.engine.scene.findByName('GameManager')[0];
        // if (gameManager) {
        //     const gmComponent = gameManager.getComponent('game-manager');
        //     if (gmComponent && gmComponent.addScore) {
        //         gmComponent.addScore(points);
        //     }
        // }
    }

    /**
     * Play a sound effect when hit
     */
    playSoundEffect() {
        // Wonderland Engine audio implementation examples:
        
        // Example 1: Using Howler audio source component
        // const audioSource = this.object.getComponent('howler-audio-source');
        // if (audioSource) {
        //     audioSource.play();
        // }
        
        // Example 2: Using global audio manager
        // if (this.engine.audio) {
        //     this.engine.audio.play(this.hitSoundName);
        // }
        
        // Example 3: Finding audio manager in scene
        // const audioManager = this.engine.scene.findByName('AudioManager')[0];
        // if (audioManager) {
        //     const am = audioManager.getComponent('audio-manager');
        //     if (am && am.playSound) {
        //         am.playSound(this.hitSoundName);
        //     }
        // }
        
        console.log(`Playing sound: ${this.hitSoundName}`);
    }

    /**
     * Spawn particle effects at hit position
     */
    spawnParticles(position) {
        if (!this.hitEffectPrefab) return;
        
        try {
            // Clone the effect prefab
            const effect = this.engine.scene.addObject(this.object.parent);
            
            // Position the effect at hit location
            effect.setPositionWorld(position);
            
            // Copy components from prefab if needed
            // Note: You may need to implement your own prefab cloning system
            // or manually set up particle systems here
            
            // Example: If using particle system component
            // const particles = effect.addComponent('particle-system');
            // particles.play();
            
            // Auto-remove effect after delay
            if (this.effectLifetime > 0) {
                setTimeout(() => {
                    if (effect && !effect.markedDestroyed) {
                        effect.destroy();
                    }
                }, this.effectLifetime * 1000);
            }
            
            console.log('Spawned hit effect at position:', position);
        } catch (error) {
            console.error('Error spawning particle effect:', error);
        }
    }

    /**
     * Optional: Check if fruit is out of bounds (call from update if needed)
     */
    checkBounds() {
        const pos = vec3.create();
        this.object.getPositionWorld(pos);
        
        // Example: Destroy if falls below y = -5
        if (pos[1] < -5.0) {
            console.log('Fruit fell out of bounds');
            this.isDestroyed = true;
            this.object.destroy();
        }
        
        // You can add more boundary checks here:
        // - Maximum height limit
        // - Distance from center
        // - Time-based lifetime
    }
}
