import * as THREE from 'three';

/**
 * RoadNetwork - Manages road tile geometry, path rendering,
 * thick asphalt lanes, diagonal connections, and vehicle road-containment queries.
 */
export class RoadNetwork {
  constructor(scene, assetFactory) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.roads = new Map(); // key "x,z" -> { gx, gz, mesh }
    this.roadGroup = new THREE.Group();
    this.roadGroup.name = 'city_road_network';
    this.scene.add(this.roadGroup);

    this.tileSize = 5.5; // Thicker, wider road lanes
  }

  getKey(gx, gz) {
    return `${gx},${gz}`;
  }

  hasRoad(gx, gz) {
    return this.roads.has(this.getKey(gx, gz));
  }

  addRoad(gx, gz) {
    const key = this.getKey(gx, gz);
    if (this.roads.has(key)) return false;

    this.roads.set(key, { gx, gz, mesh: null });
    this.refreshTileAndNeighbors(gx, gz);
    return true;
  }

  removeRoad(gx, gz) {
    const key = this.getKey(gx, gz);
    if (!this.roads.has(key)) return false;

    const data = this.roads.get(key);
    if (data.mesh) {
      this.roadGroup.remove(data.mesh);
    }
    this.roads.delete(key);

    this._refreshNeighbors(gx, gz);
    return true;
  }

  _refreshNeighbors(gx, gz) {
    const neighbors = [
      [gx, gz - 1], [gx, gz + 1], [gx + 1, gz], [gx - 1, gz],
      [gx + 1, gz - 1], [gx - 1, gz - 1], [gx + 1, gz + 1], [gx - 1, gz + 1]
    ];
    neighbors.forEach(([nx, nz]) => {
      if (this.hasRoad(nx, nz)) {
        this.updateTileMesh(nx, nz);
      }
    });
  }

  refreshTileAndNeighbors(gx, gz) {
    this.updateTileMesh(gx, gz);
    this._refreshNeighbors(gx, gz);
  }

  updateTileMesh(gx, gz) {
    const key = this.getKey(gx, gz);
    const data = this.roads.get(key);
    if (!data) return;

    if (data.mesh) {
      this.roadGroup.remove(data.mesh);
      data.mesh = null;
    }

    const n = this.hasRoad(gx, gz - 1);
    const s = this.hasRoad(gx, gz + 1);
    const e = this.hasRoad(gx + 1, gz);
    const w = this.hasRoad(gx - 1, gz);

    const ne = this.hasRoad(gx + 1, gz - 1);
    const nw = this.hasRoad(gx - 1, gz - 1);
    const se = this.hasRoad(gx + 1, gz + 1);
    const sw = this.hasRoad(gx - 1, gz + 1);

    const worldX = gx * this.tileSize;
    const worldZ = gz * this.tileSize;

    const mesh = this._createRoadSegment(n, s, e, w, ne, nw, se, sw);
    mesh.position.set(worldX, 0.04, worldZ);
    this.roadGroup.add(mesh);
    data.mesh = mesh;
  }

  _createRoadSegment(n, s, e, w, ne, nw, se, sw) {
    const group = new THREE.Group();
    const size = this.tileSize;
    const half = size / 2;

    // Base Asphalt Square
    const baseGeo = new THREE.PlaneGeometry(size, size);
    const base = new THREE.Mesh(baseGeo, this.assetFactory.materials.asphalt);
    base.rotation.x = -Math.PI / 2;
    base.receiveShadow = true;
    group.add(base);

    // Concrete Sidewalk Curbs along outer edges
    const curbMat = this.assetFactory.materials.sidewalk;
    const curbHeight = 0.12;
    const curbThick = 0.45;

    if (!n) {
      const curbN = new THREE.Mesh(new THREE.BoxGeometry(size, curbHeight, curbThick), curbMat);
      curbN.position.set(0, curbHeight / 2, -half + curbThick / 2);
      group.add(curbN);
    }
    if (!s) {
      const curbS = new THREE.Mesh(new THREE.BoxGeometry(size, curbHeight, curbThick), curbMat);
      curbS.position.set(0, curbHeight / 2, half - curbThick / 2);
      group.add(curbS);
    }
    if (!w) {
      const curbW = new THREE.Mesh(new THREE.BoxGeometry(curbThick, curbHeight, size), curbMat);
      curbW.position.set(-half + curbThick / 2, curbHeight / 2, 0);
      group.add(curbW);
    }
    if (!e) {
      const curbE = new THREE.Mesh(new THREE.BoxGeometry(curbThick, curbHeight, size), curbMat);
      curbE.position.set(half - curbThick / 2, curbHeight / 2, 0);
      group.add(curbE);
    }

    // Diagonal Corner Connectors
    const diagGeo = new THREE.PlaneGeometry(curbThick * 2, curbThick * 2);
    if (!n && !e && ne) {
      const corner = new THREE.Mesh(diagGeo, this.assetFactory.materials.asphalt);
      corner.rotation.x = -Math.PI / 2;
      corner.position.set(half, 0.01, -half);
      group.add(corner);
    }
    if (!n && !w && nw) {
      const corner = new THREE.Mesh(diagGeo, this.assetFactory.materials.asphalt);
      corner.rotation.x = -Math.PI / 2;
      corner.position.set(-half, 0.01, -half);
      group.add(corner);
    }
    if (!s && !e && se) {
      const corner = new THREE.Mesh(diagGeo, this.assetFactory.materials.asphalt);
      corner.rotation.x = -Math.PI / 2;
      corner.position.set(half, 0.01, half);
      group.add(corner);
    }
    if (!s && !w && sw) {
      const corner = new THREE.Mesh(diagGeo, this.assetFactory.materials.asphalt);
      corner.rotation.x = -Math.PI / 2;
      corner.position.set(-half, 0.01, half);
      group.add(corner);
    }

    // Yellow / White Lane Markings
    const lineMat = this.assetFactory.materials.roadLine;
    const lineGeoH = new THREE.PlaneGeometry(3.0, 0.28);
    const lineGeoV = new THREE.PlaneGeometry(0.28, 3.0);

    const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

    if (count === 0 || count === 1) {
      const dash = new THREE.Mesh(n || s ? lineGeoV : lineGeoH, lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.y = 0.01;
      group.add(dash);
    } else if (count === 2) {
      if (n && s) {
        const line = new THREE.Mesh(lineGeoV, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.y = 0.01;
        group.add(line);
      } else if (e && w) {
        const line = new THREE.Mesh(lineGeoH, lineMat);
        line.rotation.x = -Math.PI / 2;
        line.position.y = 0.01;
        group.add(line);
      } else {
        // Corner turn: centered circular guide
        const dot = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), lineMat);
        dot.rotation.x = -Math.PI / 2;
        dot.position.y = 0.01;
        group.add(dot);
      }
    } else {
      // Intersection
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.6, 12), lineMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.y = 0.01;
      group.add(dot);
    }

    return group;
  }

  /**
   * Checks if world coordinates are on or near a road tile.
   * Returns { onRoad: boolean, distance: number, nearestPos: Vector2 }
   */
  getRoadContainment(worldX, worldZ) {
    const gx = Math.round(worldX / this.tileSize);
    const gz = Math.round(worldZ / this.tileSize);

    // Check 3x3 surrounding tiles
    let closestDistSq = Infinity;
    let nearestRoadWorld = null;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (this.hasRoad(gx + dx, gz + dz)) {
          const rX = (gx + dx) * this.tileSize;
          const rZ = (gz + dz) * this.tileSize;
          const dSq = (worldX - rX) ** 2 + (worldZ - rZ) ** 2;
          if (dSq < closestDistSq) {
            closestDistSq = dSq;
            nearestRoadWorld = { x: rX, z: rZ };
          }
        }
      }
    }

    const maxRoadRadius = this.tileSize * 0.58; // Road boundary limit
    const dist = Math.sqrt(closestDistSq);

    return {
      onRoad: dist <= maxRoadRadius,
      distance: dist,
      maxRadius: maxRoadRadius,
      nearestRoad: nearestRoadWorld
    };
  }

  clear() {
    const count = this.roads.size;
    this.roads.forEach(data => {
      if (data.mesh) {
        this.roadGroup.remove(data.mesh);
      }
    });
    this.roads.clear();
    return count;
  }
}
