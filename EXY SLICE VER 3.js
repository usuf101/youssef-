// Import required Wonderland Engine components
import { Component, Object3D, PhysXComponent, MeshComponent, Material, Mesh, MeshAttribute } from '@wonderlandengine/api';

interface SliceVertex {
    position: number[];
    normal?: number[];
    texCoord?: number[];
}

interface ContourPoint {
    position: number[];
    edgeVerts: [number, number]; // Original edge vertices for ordering
}

class Slicer extends Component {
    materialAfterSlice;
    sliceMask;
    isTouched = false;
    slicePlaneNormal = [0, 1, 0]; // Default slice plane normal (horizontal cut)
    slicePlanePoint = [0, 0, 0];  // Point on the slice plane

    update(dt) {
        if (this.isTouched) {
            this.isTouched = false;

            let objectsToBeSliced = this.checkForSlicableObjects();

            objectsToBeSliced.forEach(objectToBeSliced => {
                const meshComp = objectToBeSliced.getComponent(MeshComponent);
                if (!meshComp || !meshComp.mesh) return;

                const sliceResult = this.sliceMesh(objectToBeSliced, meshComp.mesh, meshComp.material);
                
                if (sliceResult) {
                    const { upperHull, lowerHull } = sliceResult;
                    
                    this.makeItPhysical(upperHull);
                    this.makeItPhysical(lowerHull);
                    
                    objectToBeSliced.destroy();
                }
            });
        }
    }

    checkForSlicableObjects(): Object3D[] {
        let slicedObjects: Object3D[] = [];
        // Implement raycasting or trigger zone logic here
        return slicedObjects;
    }

    /**
     * Slice a mesh along a plane and create two separate objects
     */
    sliceMesh(originalObj: Object3D, originalMesh: Mesh, material: Material | null): { upperHull: Object3D, lowerHull: Object3D } | null {
        const positions = originalMesh.attribute(MeshAttribute.Position);
        const normals = originalMesh.attribute(MeshAttribute.Normal);
        const texCoords = originalMesh.attribute(MeshAttribute.TextureCoordinate);
        const indices = originalMesh.indexData;
        
        if (!positions || !indices) return null;

        const worldPos = originalObj.getPositionWorld();
        
        // Arrays for upper and lower hulls
        const upperVertices: SliceVertex[] = [];
        const lowerVertices: SliceVertex[] = [];
        const upperIndices: number[] = [];
        const lowerIndices: number[] = [];
        
        // Track intersection points for cap generation
        const upperContour: ContourPoint[] = [];
        const lowerContour: ContourPoint[] = [];

        // Process each triangle
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i];
            const i1 = indices[i + 1];
            const i2 = indices[i + 2];

            // Get vertex data
            const v0 = this.getVertexData(i0, positions, normals, texCoords);
            const v1 = this.getVertexData(i1, positions, normals, texCoords);
            const v2 = this.getVertexData(i2, positions, normals, texCoords);

            // Determine which side of the plane each vertex is on
            const d0 = this.getSideOfPlane(v0.position, worldPos);
            const d1 = this.getSideOfPlane(v1.position, worldPos);
            const d2 = this.getSideOfPlane(v2.position, worldPos);

            const side0 = Math.sign(d0);
            const side1 = Math.sign(d1);
            const side2 = Math.sign(d2);

            // Count vertices on each side
            const sidesSum = side0 + side1 + side2;

            if (sidesSum === 3) {
                // All vertices on upper side
                this.addTriangle(upperVertices, upperIndices, v0, v1, v2);
            } else if (sidesSum === -3) {
                // All vertices on lower side
                this.addTriangle(lowerVertices, lowerIndices, v0, v1, v2);
            } else if (sidesSum === 0 && (side0 === 0 || side1 === 0 || side2 === 0)) {
                // Triangle on the plane - add to both (optional) or upper only
                this.addTriangle(upperVertices, upperIndices, v0, v1, v2);
            } else {
                // Triangle crosses the plane - needs splitting
                this.splitTriangle(
                    v0, v1, v2, d0, d1, d2,
                    upperVertices, lowerVertices,
                    upperIndices, lowerIndices,
                    upperContour, lowerContour,
                    i0, i1, i2
                );
            }
        }

        // Validate we have geometry
        if (upperVertices.length === 0 || lowerVertices.length === 0) {
            console.warn("Slice resulted in empty mesh - slice plane may not intersect object");
            return null;
        }

        // Generate caps for both hulls
        this.generateCap(upperVertices, upperIndices, upperContour, true);
        this.generateCap(lowerVertices, lowerIndices, lowerContour, false);

        // Create mesh objects
        const upperHull = this.createMeshObject(upperVertices, upperIndices, material, originalObj);
        const lowerHull = this.createMeshObject(lowerVertices, lowerIndices, material, originalObj);

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
     * Get vertex data from mesh attributes
     */
    getVertexData(index: number, positions: any, normals: any, texCoords: any): SliceVertex {
        const pos = positions.get(index);
        const vertex: SliceVertex = {
            position: [pos[0], pos[1], pos[2]]
        };

        if (normals) {
            const norm = normals.get(index);
            vertex.normal = [norm[0], norm[1], norm[2]];
        }

        if (texCoords) {
            const uv = texCoords.get(index);
            vertex.texCoord = [uv[0], uv[1]];
        }

        return vertex;
    }

    /**
     * Determine signed distance from vertex to slice plane
     */
    getSideOfPlane(vertex: number[], planePoint: Float32Array): number {
        const [nx, ny, nz] = this.slicePlaneNormal;
        const dx = vertex[0] - planePoint[0];
        const dy = vertex[1] - planePoint[1];
        const dz = vertex[2] - planePoint[2];
        return nx * dx + ny * dy + nz * dz;
    }

    /**
     * Add a complete triangle to a hull
     */
    addTriangle(vertices: SliceVertex[], indices: number[], v0: SliceVertex, v1: SliceVertex, v2: SliceVertex): void {
        const baseIndex = vertices.length;
        vertices.push(v0, v1, v2);
        indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }

    /**
     * Split a triangle that crosses the slice plane
     */
    splitTriangle(
        v0: SliceVertex, v1: SliceVertex, v2: SliceVertex,
        d0: number, d1: number, d2: number,
        upperVerts: SliceVertex[], lowerVerts: SliceVertex[],
        upperIndices: number[], lowerIndices: number[],
        upperContour: ContourPoint[], lowerContour: ContourPoint[],
        i0: number, i1: number, i2: number
    ): void {
        // Sort vertices by distance to plane
        const verts = [
            { v: v0, d: d0, i: i0 },
            { v: v1, d: d1, i: i1 },
            { v: v2, d: d2, i: i2 }
        ].sort((a, b) => a.d - b.d);

        const [vMin, vMid, vMax] = verts;

        // Check configuration: 2-1 split or 1-2 split
        if (Math.sign(vMin.d) === Math.sign(vMid.d)) {
            // Two vertices on one side, one on the other (2-1 split)
            const [v2Same, v1Diff] = [vMid, vMax];
            
            // Find intersection points
            const t1 = Math.abs(vMin.d) / (Math.abs(vMin.d) + Math.abs(v1Diff.d));
            const t2 = Math.abs(v2Same.d) / (Math.abs(v2Same.d) + Math.abs(v1Diff.d));
            
            const vInt1 = this.interpolateVertex(vMin.v, v1Diff.v, t1);
            const vInt2 = this.interpolateVertex(v2Same.v, v1Diff.v, t2);

            // Add to contours
            const contourPt1 = { position: vInt1.position, edgeVerts: [vMin.i, v1Diff.i] as [number, number] };
            const contourPt2 = { position: vInt2.position, edgeVerts: [v2Same.i, v1Diff.i] as [number, number] };

            if (vMin.d < 0) {
                // Two on lower, one on upper
                this.addTriangle(lowerVerts, lowerIndices, vMin.v, v2Same.v, vInt1);
                this.addTriangle(lowerVerts, lowerIndices, v2Same.v, vInt2, vInt1);
                this.addTriangle(upperVerts, upperIndices, vInt1, vInt2, v1Diff.v);
                
                lowerContour.push(contourPt1, contourPt2);
                upperContour.push(contourPt1, contourPt2);
            } else {
                // Two on upper, one on lower
                this.addTriangle(upperVerts, upperIndices, vMin.v, v2Same.v, vInt1);
                this.addTriangle(upperVerts, upperIndices, v2Same.v, vInt2, vInt1);
                this.addTriangle(lowerVerts, lowerIndices, vInt1, vInt2, v1Diff.v);
                
                upperContour.push(contourPt1, contourPt2);
                lowerContour.push(contourPt1, contourPt2);
            }
        } else {
            // One vertex on one side, two on the other (1-2 split)
            const [v1Same, v2Diff] = [vMin, vMid];
            
            const t1 = Math.abs(v1Same.d) / (Math.abs(v1Same.d) + Math.abs(v2Diff.d));
            const t2 = Math.abs(v1Same.d) / (Math.abs(v1Same.d) + Math.abs(vMax.d));
            
            const vInt1 = this.interpolateVertex(v1Same.v, v2Diff.v, t1);
            const vInt2 = this.interpolateVertex(v1Same.v, vMax.v, t2);

            const contourPt1 = { position: vInt1.position, edgeVerts: [v1Same.i, v2Diff.i] as [number, number] };
            const contourPt2 = { position: vInt2.position, edgeVerts: [v1Same.i, vMax.i] as [number, number] };

            if (v1Same.d < 0) {
                // One on lower, two on upper
                this.addTriangle(lowerVerts, lowerIndices, v1Same.v, vInt1, vInt2);
                this.addTriangle(upperVerts, upperIndices, vInt1, v2Diff.v, vMax.v);
                this.addTriangle(upperVerts, upperIndices, vInt1, vMax.v, vInt2);
                
                lowerContour.push(contourPt1, contourPt2);
                upperContour.push(contourPt1, contourPt2);
            } else {
                // One on upper, two on lower
                this.addTriangle(upperVerts, upperIndices, v1Same.v, vInt1, vInt2);
                this.addTriangle(lowerVerts, lowerIndices, vInt1, v2Diff.v, vMax.v);
                this.addTriangle(lowerVerts, lowerIndices, vInt1, vMax.v, vInt2);
                
                upperContour.push(contourPt1, contourPt2);
                lowerContour.push(contourPt1, contourPt2);
            }
        }
    }

    /**
     * Linearly interpolate between two vertices
     */
    interpolateVertex(v1: SliceVertex, v2: SliceVertex, t: number): SliceVertex {
        const result: SliceVertex = {
            position: [
                v1.position[0] + (v2.position[0] - v1.position[0]) * t,
                v1.position[1] + (v2.position[1] - v1.position[1]) * t,
                v1.position[2] + (v2.position[2] - v1.position[2]) * t
            ]
        };

        if (v1.normal && v2.normal) {
            result.normal = [
                v1.normal[0] + (v2.normal[0] - v1.normal[0]) * t,
                v1.normal[1] + (v2.normal[1] - v1.normal[1]) * t,
                v1.normal[2] + (v2.normal[2] - v1.normal[2]) * t
            ];
            // Normalize
            const len = Math.sqrt(result.normal[0]**2 + result.normal[1]**2 + result.normal[2]**2);
            if (len > 0) {
                result.normal = result.normal.map(n => n / len);
            }
        }

        if (v1.texCoord && v2.texCoord) {
            result.texCoord = [
                v1.texCoord[0] + (v2.texCoord[0] - v1.texCoord[0]) * t,
                v1.texCoord[1] + (v2.texCoord[1] - v1.texCoord[1]) * t
            ];
        }

        return result;
    }

    /**
     * Generate triangulated cap for the slice cross-section
     */
    generateCap(vertices: SliceVertex[], indices: number[], contour: ContourPoint[], isUpper: boolean): void {
        if (contour.length < 3) return;

        // Remove duplicate points
        const uniqueContour: ContourPoint[] = [];
        const epsilon = 0.0001;
        
        for (const pt of contour) {
            const isDuplicate = uniqueContour.some(existing => {
                const dx = existing.position[0] - pt.position[0];
                const dy = existing.position[1] - pt.position[1];
                const dz = existing.position[2] - pt.position[2];
                return dx*dx + dy*dy + dz*dz < epsilon*epsilon;
            });
            if (!isDuplicate) {
                uniqueContour.push(pt);
            }
        }

        if (uniqueContour.length < 3) return;

        // Calculate centroid
        const centroid = [0, 0, 0];
        for (const pt of uniqueContour) {
            centroid[0] += pt.position[0];
            centroid[1] += pt.position[1];
            centroid[2] += pt.position[2];
        }
        centroid[0] /= uniqueContour.length;
        centroid[1] /= uniqueContour.length;
        centroid[2] /= uniqueContour.length;

        // Create cap normal (opposite direction for lower hull)
        const [nx, ny, nz] = this.slicePlaneNormal;
        const capNormal = isUpper ? [nx, ny, nz] : [-nx, -ny, -nz];

        // Add centroid vertex
        const baseIndex = vertices.length;
        vertices.push({
            position: centroid,
            normal: capNormal,
            texCoord: [0.5, 0.5]
        });

        // Add contour vertices and create triangles
        const contourStartIndex = vertices.length;
        for (let i = 0; i < uniqueContour.length; i++) {
            vertices.push({
                position: uniqueContour[i].position,
                normal: capNormal,
                texCoord: [0.5, 0.5] // Simplified UV mapping
            });
        }

        // Create fan triangulation from centroid
        for (let i = 0; i < uniqueContour.length; i++) {
            const next = (i + 1) % uniqueContour.length;
            if (isUpper) {
                indices.push(baseIndex, contourStartIndex + i, contourStartIndex + next);
            } else {
                indices.push(baseIndex, contourStartIndex + next, contourStartIndex + i);
            }
        }
    }

    /**
     * Create a new mesh object from vertex data
     */
    createMeshObject(
        vertices: SliceVertex[],
        indices: number[],
        material: Material | null,
        originalObj: Object3D
    ): Object3D {
        const newObj = this.engine.scene.addObject(originalObj.parent);
        newObj.setTransformLocal(originalObj.getTransformLocal());
        
        // Use Uint32Array for larger meshes
        const indexArray = vertices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
        
        const mesh = this.engine.meshes.create({
            vertexCount: vertices.length,
            indexData: indexArray
        });
        
        // Set positions
        const posAttr = mesh.attribute(MeshAttribute.Position);
        if (posAttr) {
            for (let i = 0; i < vertices.length; i++) {
                posAttr.set(i, vertices[i].position);
            }
        }
        
        // Set normals
        const normAttr = mesh.attribute(MeshAttribute.Normal);
        if (normAttr) {
            for (let i = 0; i < vertices.length; i++) {
                if (vertices[i].normal) {
                    normAttr.set(i, vertices[i].normal);
                } else {
                    // Default normal if missing
                    normAttr.set(i, [0, 1, 0]);
                }
            }
        }
        
        // Set texture coordinates
        const uvAttr = mesh.attribute(MeshAttribute.TextureCoordinate);
        if (uvAttr) {
            for (let i = 0; i < vertices.length; i++) {
                if (vertices[i].texCoord) {
                    uvAttr.set(i, vertices[i].texCoord);
                } else {
                    uvAttr.set(i, [0, 0]);
                }
            }
        }
        
        mesh.update();
        
        const meshComp = newObj.addComponent(MeshComponent);
        if (meshComp) {
            meshComp.mesh = mesh;
            meshComp.material = material;
        }
        
        return newObj;
    }

    makeItPhysical(obj: Object3D): void {
        const physx = obj.addComponent(PhysXComponent);
        
        if (physx) {
            // Estimate mass based on mesh bounds
            const meshComp = obj.getComponent(MeshComponent);
            if (meshComp && meshComp.mesh) {
                // Simple volume estimation
                const scale = obj.getScalingWorld(new Float32Array(3));
                const volume = scale[0] * scale[1] * scale[2];
                const density = 1000; // kg/m³ (water density as default)
                physx.mass = volume * density * 0.5; // Half for sliced piece
            } else {
                physx.mass = 1.0; // Default mass
            }
            
            physx.kinematic = false;
            
            // Optional: Add some damping for more realistic physics
            // physx.linearDamping = 0.1;
            // physx.angularDamping = 0.1;
        }
    }
}

export default Slicer;
