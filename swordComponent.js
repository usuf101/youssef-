// Final VR Sword Component for Fruit Ninja with VR Hand Support
import { Component, Property } from '@wonderlandengine/api';
import { vec3 } from 'gl-matrix';

export class VRSword extends Component {
    static TypeName = 'vr-sword';
    
    static Properties = {
        // Detection radius for hitting fruits
        hitRadius: Property.float(0.2),
        
        // Minimum speed required to register a hit (set to 0 to disable)
        minHitSpeed: Property.float(0.3),
        
        // Debug visualization
        showDebug: Property.bool(false),
        
        // Hand tracking mode: 'none', 'left', or 'right'
        handTracking: Property.enum(['none', 'left', 'right'], 'right'),
        
        // Check for hits even when not moving fast (useful for testing)
        alwaysCheckHits: Property.bool(false)
    };

    init() {
        this.lastPos = vec3.create();
        this.currentPos = vec3.create();
        this.velocity = vec3.create();
        
        // Cache to avoid searching every frame
        this.sliceableFruits = [];
        
        // Get initial position
        this.object.getPositionWorld(this.lastPos);
        
        // Refresh fruit cache periodically
        this.cacheRefreshTimer = 0;
        this.cacheRefreshInterval = 0.1; // Reduced to 0.1 seconds for better responsiveness
        
        // Try to attach to VR hand if specified
        this.handObject = null;
        if (this.handTracking !== 'none') {
            this.attachToHand();
        }
    }

    start() {
        // Update cache after scene is fully loaded
        this.updateFruitCache();
    }

    /**
     * Attach sword to VR controller hand
     */
    attachToHand() {
        // Find the hand object in the scene
        const handName = this.handTracking === 'left' ? 'LeftHand' : 'RightHand';
        const hand = this.engine.scene.findByName(handName)[0];
        
        if (hand) {
            this.handObject = hand;
            // Parent the sword to the hand
            this.object.parent = hand;
            if (this.showDebug) {
                console.log(`Sword attached to ${handName}`);
            }
        } else {
            console.warn(`Could not find ${handName} in scene. Make sure VR hands are set up.`);
        }
    }

    update(dt) {
        // Get current sword position
        this.object.getPositionWorld(this.currentPos);
        
        // Calculate velocity
        vec3.subtract(this.velocity, this.currentPos, this.lastPos);
        const speed = vec3.length(this.velocity) / dt;
        
        // Periodically refresh the fruit cache
        this.cacheRefreshTimer += dt;
        if (this.cacheRefreshTimer >= this.cacheRefreshInterval) {
            this.updateFruitCache();
            this.cacheRefreshTimer = 0;
        }
        
        // Check for hits
        const shouldCheck = this.alwaysCheckHits || speed > this.minHitSpeed;
        if (shouldCheck) {
            this.checkForHits();
        }
        
        // Debug speed display
        if (this.showDebug && speed > 0.1) {
            console.log(`Sword speed: ${speed.toFixed(2)}`);
        }
        
        // Store position for next frame
        vec3.copy(this.lastPos, this.currentPos);
    }

    updateFruitCache() {
        // Clear old cache
        this.sliceableFruits = [];
        
        // Find all active fruits
        this.collectActiveFruits(this.engine.scene.children);
        
        if (this.showDebug) {
            console.log(`Found ${this.sliceableFruits.length} fruits`);
        }
    }

    collectActiveFruits(objects) {
        for (let obj of objects) {
            // Check if object is active and has the sliceable-fruit component
            if (obj.active) {
                const sliceable = obj.getComponent('sliceable-fruit');
                if (sliceable && !sliceable.isDestroyed) {
                    this.sliceableFruits.push({
                        object: obj,
                        component: sliceable
                    });
                }
                
                // Recursively check children
                if (obj.children && obj.children.length > 0) {
                    this.collectActiveFruits(obj.children);
                }
            }
        }
    }

    checkForHits() {
        const tempPos = vec3.create();
        
        // Check each fruit in cache
        for (let i = this.sliceableFruits.length - 1; i >= 0; i--) {
            const fruit = this.sliceableFruits[i];
            
            // Skip if already destroyed or inactive
            if (!fruit.object || !fruit.object.active || fruit.component.isDestroyed) {
                // Remove from cache
                this.sliceableFruits.splice(i, 1);
                continue;
            }
            
            // Get fruit position
            fruit.object.getPositionWorld(tempPos);
            
            // Calculate distance
            const distance = vec3.distance(this.currentPos, tempPos);
            
            // Check if within hit radius
            if (distance <= this.hitRadius) {
                // Trigger hit
                this.hitFruit(fruit);
                
                // Remove from cache
                this.sliceableFruits.splice(i, 1);
            }
        }
    }

    hitFruit(fruit) {
        // Mark as destroyed
        fruit.component.isDestroyed = true;
        
        // Call the fruit's onHit method if it exists
        if (typeof fruit.component.onHit === 'function') {
            fruit.component.onHit(this.currentPos, this.velocity);
        } else {
            // Simple destruction fallback
            fruit.object.destroy();
        }
        
        if (this.showDebug) {
            console.log('Fruit hit!');
        }
    }
}
