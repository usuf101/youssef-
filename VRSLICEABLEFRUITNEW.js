// Fixed Sliceable Fruit Component - Matches VR Sword Detection
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
        effectLifetime: Property.float(2.0),
        
        // Debug mode
        showDebug: Property.bool(false)
    };

    init() {
        // Track if this fruit has been destroyed
        this.isDestroyed = false;
        
        // Store initial position for effect spawning
        this.hitPosition = vec3.create();
        
        if (this.showDebug) {
            console.log('SliceableFruit initialized on:', this.object.name);
        }
    }

    start() {
        if (this.showDebug) {
            const pos = vec3.create();
            this.object.getPositionWorld(pos);
            console.log(`Fruit "${this.object.name}" ready at position:`, pos);
        }
    }

    update(dt) {
        // Optional: Add automatic boundary checking
        // Uncomment the line below to enable
        // this.checkBounds();
    }

    /**
     * Called when the fruit is hit by the sword
     * @param {vec3} hitPosition - Position where the sword hit
     * @param {vec3} hitVelocity - Velocity of the sword at hit
     */
    onHit(hitPosition, hitVelocity) {
        if (this.isDestroyed) {
            if (this.showDebug) {
                console.log('Fruit already destroyed, ignoring hit');
            }
            return;
        }
        
        if (this.showDebug) {
            console.log(`Fruit "${this.object.name}" was hit!`);
        }
        
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
        
        // Destroy the fruit object
        if (this.showDebug) {
            console.log('Destroying fruit object...');
        }
        this.object.destroy();
    }

    /**
     * Add score (integrate with your game manager)
     */
    addScore(points) {
        console.log(`🍎 Fruit sliced! +${points} points`);
        
        // Integration options for game manager:
        
        // Option 1: Using global reference
        if (window.gameManager) {
            window.gameManager.addScore(points);
        }
        
        // Option 2: Finding game manager in scene
        const gameManagerObj = this.engine.scene.findByName('GameManager')[0];
        if (gameManagerObj) {
            const gmComponent = gameManagerObj.getComponent('game-manager');
            if (gmComponent && typeof gmComponent.addScore === 'function') {
                gmComponent.addScore(points);
            }
        }
        
        // Option 3: Emit custom event
        // this.engine.onEvent('fruit-sliced', { points: points, type: this.fruitType });
    }

    /**
     * Play a sound effect when hit
     */
    playSoundEffect() {
        if (!this.hitSoundName) return;
        
        // Wonderland Engine audio implementation examples:
        
        // Option 1: Using Howler audio source component
        const audioSource = this.object.getComponent('howler-audio-source');
        if (audioSource && typeof audioSource.play === 'function') {
            audioSource.play();
            if (this.showDebug) {
                console.log('Playing audio from howler-audio-source');
            }
            return;
        }
        
        // Option 2: Using global audio manager
        if (this.engine.audio && typeof this.engine.audio.play === 'function') {
            this.engine.audio.play(this.hitSoundName);
            if (this.showDebug) {
                console.log(`Playing sound via engine.audio: ${this.hitSoundName}`);
            }
            return;
        }
        
        // Option 3: Finding audio manager in scene
        const audioManagerObj = this.engine.scene.findByName('AudioManager')[0];
        if (audioManagerObj) {
            const am = audioManagerObj.getComponent('audio-manager');
            if (am && typeof am.playSound === 'function') {
                am.playSound(this.hitSoundName);
                if (this.showDebug) {
                    console.log(`Playing sound via AudioManager: ${this.hitSoundName}`);
                }
                return;
            }
        }
        
        if (this.showDebug) {
            console.log(`Could not play sound: ${this.hitSoundName} (no audio system found)`);
        }
    }

    /**
     * Spawn particle effects at hit position
     */
    spawnParticles(position) {
        if (!this.hitEffectPrefab) {
            if (this.showDebug) {
                console.log('No hit effect prefab assigned');
            }
            return;
        }
        
        try {
            // Clone the effect prefab
            const effect = this.engine.scene.addObject(this.object.parent);
            
            // Position the effect at hit location
            effect.setPositionWorld(position);
            
            if (this.showDebug) {
                console.log('Spawned hit effect at position:', position);
            }
            
            // Copy components from prefab if needed
            // Note: Manual particle system setup may be required
            
            // Auto-remove effect after delay
            if (this.effectLifetime > 0) {
                setTimeout(() => {
                    if (effect && !effect.markedDestroyed) {
                        effect.destroy();
                        if (this.showDebug) {
                            console.log('Hit effect destroyed after lifetime');
                        }
                    }
                }, this.effectLifetime * 1000);
            }
        } catch (error) {
            console.error('Error spawning particle effect:', error);
        }
    }

    /**
     * Optional: Check if fruit is out of bounds
     * Call this from update() if you want automatic cleanup
     */
    checkBounds() {
        const pos = vec3.create();
        this.object.getPositionWorld(pos);
        
        // Example: Destroy if falls below y = -5
        if (pos[1] < -5.0) {
            if (this.showDebug) {
                console.log(`Fruit "${this.object.name}" fell out of bounds`);
            }
            this.isDestroyed = true;
            this.object.destroy();
        }
        
        // Additional boundary checks:
        // - Maximum height limit
        // - Distance from center (radius check)
        // - Time-based lifetime
        
        // Example: Destroy if too far from origin (radius > 10)
        const distance = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
        if (distance > 10.0) {
            if (this.showDebug) {
                console.log(`Fruit "${this.object.name}" too far from origin`);
            }
            this.isDestroyed = true;
            this.object.destroy();
        }
    }
}
