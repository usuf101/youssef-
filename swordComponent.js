// Component for Sword
import { Component, Property } from '@wonderlandengine/api';
import { vec3 } from 'gl-matrix';

/**
 * VR Sword Component - Detects slicing motion and triggers cuts
 * Attach this to your VR controller or sword object
 */
export class VRSword extends Component {
    static TypeName = 'vr-sword';
    
    static Properties = {
        // Minimum speed required to register a slice (units per second)
        minSliceSpeed: Property.float(2.0),
        
        // How many positions to track for the blade trail
        trailLength: Property.int(3),
        
        // Maximum distance to detect sliceable objects
        sliceRadius: Property.float(0.5),
        
        // Optional visual blade trail object
        bladeTrail: Property.object(),
        
        // Debug visualization
        showDebug: Property.bool(false)
    };

    init() {
        this.positions = [];
        this.lastPos = vec3.create();
        this.currentPos = vec3.create();
        this.velocity = vec3.create();
        this.sliceDir = vec3.create();
        this.slicePlaneNormal = vec3.create();
        this.slicePlanePoint = vec3.create();
        
        // Get initial position
        this.object.getPositionWorld(this.lastPos);
        
        // Track if we're currently in a slice motion
        this.isSlicing = false;
    }

    update(dt) {
        // Get current sword position
        this.object.getPositionWorld(this.currentPos);
        
        // Calculate velocity
        vec3.subtract(this.velocity, this.currentPos, this.lastPos);
        const speed = vec3.length(this.velocity) / dt;
        
        // Add to position history
        this.positions.push(vec3.clone(this.currentPos));
        if (this.positions.length > this.trailLength) {
            this.positions.shift();
        }
        
        // Check if moving fast enough to slice
        if (speed > this.minSliceSpeed && this.positions.length >= 2) {
            if (!this.isSlicing) {
                this.isSlicing = true;
            }
            this.performSliceCheck();
        } else {
            this.isSlicing = false;
        }
        
        // Update visual blade trail if exists
        if (this.bladeTrail && this.isSlicing) {
            this.updateBladeTrail();
        }
        
        // Store position for next frame
        vec3.copy(this.lastPos, this.currentPos);
    }

    performSliceCheck() {
        // Create slice plane from recent positions
        const start = this.positions[0];
        const end = this.positions[this.positions.length - 1];
        
        // Calculate slice direction
        vec3.subtract(this.sliceDir, end, start);
        vec3.normalize(this.sliceDir, this.sliceDir);
        
        // Create perpendicular normal for the slice plane
        // Use cross product with up vector
        const up = vec3.fromValues(0, 1, 0);
        vec3.cross(this.slicePlaneNormal, this.sliceDir, up);
        
        // If nearly vertical, use forward instead
        if (vec3.length(this.slicePlaneNormal) < 0.1) {
            const forward = vec3.fromValues(0, 0, 1);
            vec3.cross(this.slicePlaneNormal, this.sliceDir, forward);
        }
        
        vec3.normalize(this.slicePlaneNormal, this.slicePlaneNormal);
        
        // Plane point is the middle of the slice motion
        vec3.lerp(this.slicePlanePoint, start, end, 0.5);
        
        // Find all Sliceable objects in the scene
        const sliceables = this.findSliceableObjects();
        
        // Check each sliceable for intersection
        for (let sliceable of sliceables) {
            const objPos = vec3.create();
            sliceable.object.getPositionWorld(objPos);
            
            // Check if object is near the slice line
            if (this.isNearSliceLine(objPos, start, end)) {
                // Check if object intersects the slice plane
                const distToPlane = this.pointToPlaneDistance(objPos, this.slicePlanePoint, this.slicePlaneNormal);
                
                if (Math.abs(distToPlane) < this.sliceRadius) {
                    // Trigger the slice on the sliceable object
                    sliceable.onSliced(this.slicePlaneNormal, this.slicePlanePoint, this.sliceDir);
                }
            }
        }
    }

    findSliceableObjects() {
        // Find all objects with Sliceable component
        const allObjects = this.engine.scene.children;
        const sliceables = [];
        
        this.collectSliceables(allObjects, sliceables);
        
        return sliceables;
    }

    collectSliceables(objects, result) {
        for (let obj of objects) {
            const sliceable = obj.getComponent('sliceable');
            if (sliceable && !sliceable.isSliced) {
                result.push(sliceable);
            }
            // Recursively check children
            if (obj.children.length > 0) {
                this.collectSliceables(obj.children, result);
            }
        }
    }

    isNearSliceLine(point, lineStart, lineEnd) {
        // Calculate distance from point to line segment
        const lineVec = vec3.create();
        vec3.subtract(lineVec, lineEnd, lineStart);
        
        const pointVec = vec3.create();
        vec3.subtract(pointVec, point, lineStart);
        
        const lineLengthSq = vec3.dot(lineVec, lineVec);
        if (lineLengthSq === 0) return false;
        
        const t = Math.max(0, Math.min(1, vec3.dot(pointVec, lineVec) / lineLengthSq));
        
        const closest = vec3.create();
        vec3.scaleAndAdd(closest, lineStart, lineVec, t);
        
        const distance = vec3.distance(point, closest);
        return distance < this.sliceRadius;
    }

    pointToPlaneDistance(point, planePoint, planeNormal) {
        const toPoint = vec3.create();
        vec3.subtract(toPoint, point, planePoint);
        return vec3.dot(toPoint, planeNormal);
    }

    updateBladeTrail() {
        // Simple trail positioning
        if (this.positions.length >= 2) {
            const mid = vec3.create();
            vec3.lerp(mid, this.positions[0], this.positions[this.positions.length - 1], 0.5);
            this.bladeTrail.setPositionWorld(mid);
            
            // Optional: rotate trail to align with motion
            // You could calculate a quaternion here to orient the trail mesh
        }
    }
}
