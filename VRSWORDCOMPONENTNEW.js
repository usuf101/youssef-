// VR Sword Component with Fixed Hit Detection for Fruit Ninja
import { Component, Property } from '@wonderlandengine/api';
import { vec3 } from 'gl-matrix';

export class VRSword extends Component {
    static TypeName = 'vr-sword';

    static Properties = {
        // Detection radius for hitting fruits (increased for better detection)
        hitRadius: Property.float(0.5),

        // Minimum speed required to register a hit (lowered for easier hits)
        minHitSpeed: Property.float(0.1),

        // Debug visualization
        showDebug: Property.bool(false),

        // Hand tracking mode: 'none', 'left', or 'right'
        handTracking: Property.enum(['none', 'left', 'right'], 'none'),

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
        this.cacheRefreshInterval = 0.1;

        // Pickup state
        this.isGrabbed = false;
        this.grabbingHand = null;

        // Try to attach to VR hand if specified
        this.handObject = null;
        if (this.handTracking !== 'none') {
            this.attachToHand();
        }
    }

    start() {
        // Update cache after scene is fully loaded
        this.updateFruitCache();

        // Add pickup functionality
        const target = this.object.getComponent('cursor-target');
        if (target) {
            target.addHoverFunction(this.onHover.bind(this));
            target.addUnHoverFunction(this.onUnHover.bind(this));
            target.addDownFunction(this.onGrab.bind(this));
            target.addUpFunction(this.onRelease.bind(this));

            if (this.showDebug) {
                console.log('Sword pickup functionality enabled');
            }
        } else {
            console.warn('No cursor-target component found. Add one to enable VR pickup!');
        }
    }

    /**
     * Called when VR controller hovers over the sword
     */
    onHover(_, cursor) {
        // Visual feedback when controller is near
        if (this.showDebug) {
            console.log('Sword hovering');
        }
    }

    /**
     * Called when VR controller stops hovering
     */
    onUnHover(_, cursor) {
        if (this.showDebug) {
            console.log('Sword unhover');
        }
    }

    /**
     * Called when trigger is pressed while hovering (grab action)
     */
    onGrab(_, cursor) {
        this.isGrabbed = true;
        this.grabbingHand = cursor.object; // The controller object

        // Parent sword to the controller
        this.object.parent = this.grabbingHand;

        // Reset local position/rotation for comfortable grip
        this.object.resetPositionRotation();

        if (this.showDebug) {
            console.log('Sword grabbed!');
        }
    }

    /**
     * Called when trigger is released (drop action)
     */
    onRelease(_, cursor) {
        this.isGrabbed = false;
        this.grabbingHand = null;

        if (this.showDebug) {
            console.log('Sword released');
        }

        // Optional: You could add physics here to make the sword fall
        // or keep it floating in place
    }

    /**
     * Attach sword to VR controller hand (auto-attach on start)
     */
    attachToHand() {
        // Find the hand object in the scene
        const handName = this.handTracking === 'left' ? 'LeftHand' : 'RightHand';
        const hand = this.engine.scene.findByName(handName)[0];

        if (hand) {
            this.handObject = hand;
            // Parent the sword to the hand
            this.object.parent = hand;
            this.isGrabbed = true;
            this.grabbingHand = hand;

            if (this.showDebug) {
                console.log(`Sword auto-attached to ${handName}`);
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

        // Only check for hits when sword is grabbed
        if (this.isGrabbed) {
            const shouldCheck = this.alwaysCheckHits || speed > this.minHitSpeed;
            if (shouldCheck) {
                this.checkForHits();
            }
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

            // Calculate distance to current position
            const distance = vec3.distance(this.currentPos, tempPos);

            // IMPORTANT FIX: Also check distance to last position
            // This catches fast movements that would otherwise pass through
            const lastDistance = vec3.distance(this.lastPos, tempPos);
            
            // Use the minimum distance (closest the sword got to the fruit)
            const minDistance = Math.min(distance, lastDistance);

            // Debug output when near fruits
            if (this.showDebug && minDistance < this.hitRadius * 2) {
                console.log(`Near fruit! Distance: ${minDistance.toFixed(3)}, Radius: ${this.hitRadius}`);
            }

            // Check if within hit radius
            if (minDistance <= this.hitRadius) {
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
