// Import required Wonderland Engine components
import { Component, Object3D, PhysXComponent, MeshComponent, Material, Mesh, MeshAttribute } from '@wonderlandengine/api';
import * as THREE from 'three'; // Wonderland Engine uses THREE.js

class Slicer extends Component {
    materialAfterSlice;
    sliceMask;
    isTouched = false;
    slicePlaneNormal = [0, 1, 0]; // Default slice plane normal (horizontal cut)
    slicePlanePoint = [0, 0, 0];  // Point on the slice plane

    update(dt) {
        // Runs if the object is touched by a slicable object
        if (this.isTouched) {
            this.isTouched = false;

            // Use raycasting or trigger zone to check for slicable objects
            let objectsToBeSliced = this.checkForSlicableObjects();

            objectsToBeSliced.forEach(objectToBeSliced => {
                // Get the mesh component from the object
                const meshComp = objectToBeSliced.getComponent(MeshComponent);
                if (!meshComp || !meshComp.mesh) return;

                // Perform the actual slice
                const sliceResult = this.sliceMesh(objectToBeSliced, meshComp.mesh, meshComp.material);
                
                if (sliceResult) {
                    const { upperHull, lowerHull } = sliceResult;
                    
                    // Apply physics to both pieces
                    this.makeItPhysical(upperHull);
                    this.makeItPhysical(lowerHull);
                    
                    // Remove the original object
                    objectToBeSliced.destroy();
                }
            });
        }
    }

    // A placeholder for detecting objects to slice. Implement raycast or trigger zone here.
    checkForSlicableObjects(): Object3D[] {
        let slicedObjects: Object3D[] = []; // Collect objects to be sliced
        // You could implement raycasting or trigger zone logic here
        return slicedObjects;
    }

    /**
     * Slice a mesh along a plane and create two separate objects
     */
    sliceMesh(originalObj: Object3D, originalMesh: Mesh, material: Material | null): { upperHull: Object3D, lowerHull: Object3D } | null {
        // Get mesh attributes
        const positions = originalMesh.attribute(MeshAttribute.Position);
        const normals = originalMesh.attribute(MeshAttribute.Normal);
        const texCoords = originalMesh.attribute(MeshAttribute.TextureCoordinate);
        const indices = originalMesh.indexData;
        
        if (!positions || !indices) return null;

        // Get world transform for the slice plane
        const worldPos = originalObj.getPositionWorld();
        
        // Separate vertices into upper and lower hulls
        const upperVertices: number[] = [];
        const lowerVertices: number[] = [];
        const upperNormals: number[] = [];
        const lowerNormals: number[] = [];
        const upperTexCoords: number[] = [];
        const lowerTexCoords: number[] = [];
        const upperIndices: number[] = [];
        const lowerIndices: number[] = [];
        
        const vertexMap = new Map<number, { upper: number, lower: number }>();
        let upperVertexCount = 0;
        let lowerVertexCount = 0;

        // Process each triangle
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            // Get vertex positions
            const v0 = positions.get(i0);
            const v1 = positions.get(i1);
            const v2 = positions.get(i2);

            // Determine which side of the plane each vertex is on
            const side0 = this.getSideOfPlane(v0, worldPos);
            const side1 = this.getSideOfPlane(v1, worldPos);
            const side2 = this.getSideOfPlane(v2, worldPos);

            // If all vertices on same side, add triangle to that hull
            if (side0 >= 0 && side1 >= 0 && side2 >= 0) {
                // Upper hull
                this.addVertex(i0, positions, normals, texCoords, upperVertices, upperNormals, upperTexCoords, vertexMap, 'upper', upperVertexCount);
                this.addVertex(i1, positions, normals, texCoords, upperVertices, upperNormals, upperTexCoords, vertexMap, 'upper', upperVertexCount);
                this.addVertex(i2, positions, normals, texCoords, upperVertices, upperNormals, upperTexCoords, vertexMap, 'upper', upperVertexCount);
                
                const idx0 = vertexMap.get(i0)!.upper;
                const idx1 = vertexMap.get(i1)!.upper;
                const idx2 = vertexMap.get(i2)!.upper;
                upperIndices.push(idx0, idx1, idx2);
                upperVertexCount = Math.max(upperVertexCount, idx0 + 1, idx1 + 1, idx2 + 1);
            } else if (side0 <= 0 && side1 <= 0 && side2 <= 0) {
                // Lower hull
                this.addVertex(i0, positions, normals, texCoords, lowerVertices, lowerNormals, lowerTexCoords, vertexMap, 'lower', lowerVertexCount);
                this.addVertex(i1, positions, normals, texCoords, lowerVertices, lowerNormals, lowerTexCoords, vertexMap, 'lower', lowerVertexCount);
                this.addVertex(i2, positions, normals, texCoords, lowerVertices, lowerNormals, lowerTexCoords, vertexMap, 'lower', lowerVertexCount);
                
                const idx0 = vertexMap.get(i0)!.lower;
                const idx1 = vertexMap.get(i1)!.lower;
                const idx2 = vertexMap.get(i2)!.lower;
                lowerIndices.push(idx0, idx1, idx2);
                lowerVertexCount = Math.max(lowerVertexCount, idx0 + 1, idx1 + 1, idx2 + 1);
            }
            // TODO: Handle triangles that cross the plane (would need to split them)
        }

        // Create new mesh objects
        const upperHull = this.createMeshObject(upperVertices, upperNormals, upperTexCoords, upperIndices, material, originalObj);
        const lowerHull = this.createMeshObject(lowerVertices, lowerNormals, lowerTexCoords, lowerIndices, material, originalObj);

        // Offset positions slightly
        const upperPos = upperHull.getPositionWorld();
        upperPos[1] += 0.1;
        upperHull.setPositionWorld(upperPos);

        const lowerPos = lowerHull.getPositionWorld();
        lowerPos[1] -= 0.1;
        lowerHull.setPositionWorld(lowerPos);

        return { upperHull, lowerHull };
    }

    /**
     * Determine which side of the slice plane a vertex is on
     */
    getSideOfPlane(vertex: Float32Array, planePoint: Float32Array): number {
        const [nx, ny, nz] = this.slicePlaneNormal;
        const dx = vertex[0] - planePoint[0];
        const dy = vertex[1] - planePoint[1];
        const dz = vertex[2] - planePoint[2];
        return nx * dx + ny * dy + nz * dz;
    }

    /**
     * Add a vertex to the appropriate hull
     */
    addVertex(
        index: number,
        positions: any,
        normals: any,
        texCoords: any,
        vertices: number[],
        normalsArray: number[],
        texCoordsArray: number[],
        vertexMap: Map<number, { upper: number, lower: number }>,
        side: 'upper' | 'lower',
        currentCount: number
    ): void {
        if (!vertexMap.has(index)) {
            vertexMap.set(index, { upper: -1, lower: -1 });
        }
        
        const mapping = vertexMap.get(index)!;
        if (mapping[side] === -1) {
            mapping[side] = currentCount;
            
            const pos = positions.get(index);
            vertices.push(pos[0], pos[1], pos[2]);
            
            if (normals) {
                const norm = normals.get(index);
                normalsArray.push(norm[0], norm[1], norm[2]);
            }
            
            if (texCoords) {
                const uv = texCoords.get(index);
                texCoordsArray.push(uv[0], uv[1]);
            }
        }
    }

    /**
     * Create a new mesh object from vertex data
     */
    createMeshObject(
        vertices: number[],
        normals: number[],
        texCoords: number[],
        indices: number[],
        material: Material | null,
        originalObj: Object3D
    ): Object3D {
        // Create new object in the scene
        const newObj = this.engine.scene.addObject(originalObj.parent);
        
        // Copy transform from original
        newObj.setTransformLocal(originalObj.getTransformLocal());
        
        // Create mesh with vertex data
        const mesh = this.engine.meshes.create({
            vertexCount: vertices.length / 3,
            indexData: new Uint16Array(indices)
        });
        
        // Set position attribute
        const posAttr = mesh.attribute(MeshAttribute.Position);
        if (posAttr) {
            for (let i = 0; i < vertices.length / 3; i++) {
                posAttr.set(i, [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]]);
            }
        }
        
        // Set normal attribute
        if (normals.length > 0) {
            const normAttr = mesh.attribute(MeshAttribute.Normal);
            if (normAttr) {
                for (let i = 0; i < normals.length / 3; i++) {
                    normAttr.set(i, [normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]]);
                }
            }
        }
        
        // Set texture coordinate attribute
        if (texCoords.length > 0) {
            const uvAttr = mesh.attribute(MeshAttribute.TextureCoordinate);
            if (uvAttr) {
                for (let i = 0; i < texCoords.length / 2; i++) {
                    uvAttr.set(i, [texCoords[i * 2], texCoords[i * 2 + 1]]);
                }
            }
        }
        
        // Update mesh to upload to GPU
        mesh.update();
        
        // Add mesh component
        const meshComp = newObj.addComponent(MeshComponent);
        if (meshComp) {
            meshComp.mesh = mesh;
            meshComp.material = material;
        }
        
        return newObj;
    }

    makeItPhysical(obj: Object3D): void {
        // Make object physical (add PhysX component for physics simulation)
        
        // Add PhysX component which handles both collision and rigid body physics
        const physx = obj.addComponent(PhysXComponent);
        
        if (physx) {
            // You might want to calculate the mass or apply specific physics settings
            const scale = obj.getScalingWorld(new Float32Array(3));
            let volume = scale[0] * scale[1] * scale[2];  // Example volume calculation
            let density = 1141; // Example density value

            // Set mass based on volume and density (you can adjust this logic based on the size)
            physx.mass = volume * density;
            
            // Enable kinematic mode (false = dynamic rigidbody)
            physx.kinematic = false;
            
            // Optionally, apply other physics settings like friction, restitution, etc.
            // physx.staticFriction = 0.5;
            // physx.dynamicFriction = 0.5;
            // physx.bounciness = 0.3;
        }
    }
}

export default Slicer;
