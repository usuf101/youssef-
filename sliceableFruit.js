//component for sliceable fruit
import { Component, Property } from '@wonderlandengine/api';
import { vec3, quat, mat4 } from 'gl-matrix';

/**
 * Sliceable Fruit Component - Makes objects sliceable by the VRSword
 * Attach this to any object you want to be sliceable
 */
export class SliceableFruit extends Component {
    static TypeName = 'sliceable-fruit';
    
    static Properties = {
        // Material to apply to the sliced surface
        sliceMaterial: Property.material(),
        
        // Force applied to sliced pieces
        sliceForce: Property.float(5.0),
        
        // Torque applied to sliced pieces
        sliceTorque: Property.float(2.0),
        
        // How long before the sliced pieces are removed (0 = never)
        autoRemoveDelay: Property.float(5.0),
        
        // Whether the fruit can be sliced multiple times
        multiSlice: Property.bool(false)
    };

    init() {
        // Track if this fruit has been sliced
        this.isSliced = false;
        
        // Reference to the physics component
        this.physics = null;
        
        // Get physics component if it exists
        this.physics = this.object.getComponent('physics')
            || this.object.getComponent('physx')
            || this.object.getComponent('ammo');
    }

    update(dt) {
        // Update logic can go here if needed
    }

    /**
     * Called when the fruit is sliced by the sword
     * @param {vec3} planePoint - A point on the slice plane
     * @param {vec3} planeNormal - The normal of the slice plane
     */
    onSliced(planePoint, planeNormal) {
        if (this.isSliced && !this.multiSlice) return;
        
        // Mark as sliced
        this.isSliced = true;
        
        // Create two halves
        this.createSlicedPieces(planePoint, planeNormal);
        
        // Disable or remove the original object
        this.object.setActive(false);
        
        // Schedule removal if needed
        if (this.autoRemoveDelay > 0) {
            setTimeout(() => {
                this.object.destroy();
            }, this.autoRemoveDelay * 1000);
        }
    }
    
    /**
     * Creates two sliced pieces of the fruit
     */
    createSlicedPieces(planePoint, planeNormal) {
        // Create two new objects for the sliced pieces
        const piece1 = this.engine.scene.addObject(this.object.parent);
        const piece2 = this.engine.scene.addObject(this.object.parent);
        
        // Copy the original object's transform
        piece1.transformLocal.copy(this.object.transformWorld);
        piece2.transformLocal.copy(this.object.transformWorld);
        
        // Create mesh components for each piece
        // Note: This is a simplified version - you'll need to implement actual mesh slicing
        // or use pre-made sliced meshes in a real implementation
        
        // Apply slice material if provided
        if (this.sliceMaterial) {
            // This would be where you'd apply the material to the sliced surface
            // The exact implementation depends on your 3D engine's material system
        }
        
        // Add physics to the pieces if physics is enabled
        if (this.physics) {
            this.addPhysicsToPiece(piece1, planeNormal, 1);
            this.addPhysicsToPiece(piece2, planeNormal, -1);
        }
        
        // Auto-remove the pieces after delay
        if (this.autoRemoveDelay > 0) {
            setTimeout(() => {
                piece1.destroy();
                piece2.destroy();
            }, this.autoRemoveDelay * 1000);
        }
    }
    
    /**
     * Adds physics to a sliced piece
     */
    addPhysicsToPiece(piece, planeNormal, direction) {
        // This is a simplified version - in a real implementation, you would:
        // 1. Create a physics shape that matches the sliced mesh
        // 2. Apply forces based on the slice direction
        
        // Example force application (pseudo-code)
        const force = vec3.create();
        vec3.scale(force, planeNormal, this.sliceForce * direction);
        
        // Apply the force to the piece
        // The exact implementation depends on your physics engine
        if (piece.physics) {
            piece.physics.applyImpulse(force);
            
            // Add some random torque
            const torque = vec3.fromValues(
                (Math.random() - 0.5) * this.sliceTorque,
                (Math.random() - 0.5) * this.sliceTorque,
                (Math.random() - 0.5) * this.sliceTorque
            );
            piece.physics.applyTorqueImpulse(torque);
        }
    }
}
