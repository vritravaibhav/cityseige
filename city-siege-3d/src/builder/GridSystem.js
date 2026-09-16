import * as THREE from 'three';

/**
 * GridSystem - Handles raycasting, tile picking, road drawing drag interactions,
 * manual tap-to-collect harvesting, and inventory-based building placement.
 */
export class GridSystem {
  constructor(scene, camera, roadNetwork, buildingManager, economyManager, soundManager, sceneManager = null) {
    this.scene = scene;
    this.camera = camera;
    this.roadNetwork = roadNetwork;
    this.buildingManager = buildingManager;
    this.economy = economyManager;
    this.sound = soundManager;
    this.sceneManager = sceneManager;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Modes: 'home' | 'design_select' | 'draw_road' | 'erase_road' | 'place_inventory' | 'relocate'
    this.mode = 'home';
    this.selectedBuildingType = null;
    this.relocatingBuilding = null;
    this.isPointerDown = false;
    this.lastGridTile = null;

    // Map Drag-Panning State
    this.pointerStartPos = { x: 0, y: 0 };
    this.pointerCurrentPos = { x: 0, y: 0 };
    this.hasMovedPastThreshold = false;

    this.maxCityRadius = 15; // Grid radius in tiles (~82.5m, within fortified walls)
    this.onSelectBuilding = null;
    this.onHarvest = null;
    this.onInventoryPlaced = null;
    this.onOutOfRoads = null;
    this.onRoadUpdated = null;

    // Hover Cursor Indicator
    const ts = this.tileSize;
    this.cursorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(ts * 0.95, 0.2, ts * 0.95),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 })
    );
    this.cursorMesh.position.y = 0.1;
    this.cursorMesh.visible = false;
    this.scene.add(this.cursorMesh);

    this._initEvents();
  }

  get tileSize() {
    return this.roadNetwork ? this.roadNetwork.tileSize : 5.5;
  }

  _initEvents() {
    window.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
  }

  setMode(mode, param = null) {
    this.mode = mode;
    this.selectedBuildingType = null;
    this.relocatingBuilding = null;

    if (mode === 'home' || mode === 'design_select') {
      document.body.style.cursor = 'grab';
    } else if (mode === 'draw_road' || mode === 'erase_road') {
      document.body.style.cursor = 'crosshair';
    } else {
      document.body.style.cursor = 'default';
    }

    // Only show grid cursor in editing/placement modes
    this.cursorMesh.visible = (mode === 'draw_road' || mode === 'erase_road' || mode === 'place_inventory' || mode === 'relocate');

    if (mode === 'draw_road') {
      this.cursorMesh.material.color.setHex(0xffeb3b);
      this.cursorMesh.scale.set(1, 1, 1);
    } else if (mode === 'erase_road') {
      this.cursorMesh.material.color.setHex(0xf44336);
      this.cursorMesh.scale.set(1, 1, 1);
    } else if (mode === 'place_inventory' && param) {
      this.selectedBuildingType = param;
      const def = this.buildingManager.catalog[param];
      const scale = def ? (def.footprint || 1) : 1;
      this.cursorMesh.scale.set(scale, 1, scale);
      this.cursorMesh.material.color.setHex(0x00e676);
    } else if (mode === 'relocate' && param) {
      this.relocatingBuilding = param;
      const def = this.buildingManager.catalog[param.type];
      const scale = def ? (def.footprint || 1) : 1;
      this.cursorMesh.scale.set(scale, 1, scale);
      this.cursorMesh.material.color.setHex(0x00e5ff);
    }
  }

  getWorldIntersection(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const target = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.plane, target);
    return hit ? target : null;
  }

  worldToGrid(worldPoint) {
    const gx = Math.round(worldPoint.x / this.tileSize);
    const gz = Math.round(worldPoint.z / this.tileSize);
    return { gx, gz };
  }

  findBuildingFromRaycast(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const candidates = [];
    this.buildingManager.buildings.forEach(b => {
      if (b.mesh) candidates.push(b.mesh);
      if (b.bubbleMesh) candidates.push(b.bubbleMesh);
    });

    const hits = this.raycaster.intersectObjects(candidates, true);
    if (hits.length > 0) {
      for (const hit of hits) {
        let cur = hit.object;
        while (cur && cur !== this.scene) {
          if (cur.userData && cur.userData.parentBuilding) {
            return cur.userData.parentBuilding;
          }
          const match = this.buildingManager.buildings.find(b => b.mesh === cur || b.bubbleMesh === cur);
          if (match) return match;
          cur = cur.parent;
        }
      }
    }
    return null;
  }

  onPointerDown(event) {
    if (event.button !== 0) return; // Left click only
    // Ignore clicks if interacting with UI overlay elements
    if (event.target.closest('#ui-container button, #ui-container .modal-backdrop, #ui-container .build-drawer, #ui-container .design-bottom-drawer, #ui-container .shop-screen, #ui-container .blueprint-card')) {
      return;
    }

    this.isPointerDown = true;
    this.pointerStartPos = { x: event.clientX, y: event.clientY };
    this.pointerCurrentPos = { x: event.clientX, y: event.clientY };
    this.hasMovedPastThreshold = false;

    const worldPoint = this.getWorldIntersection(event);
    if (!worldPoint) return;

    const { gx, gz } = this.worldToGrid(worldPoint);
    this.lastGridTile = { gx, gz };

    // In road drawing/erasing or inventory placement, execute action immediately
    if (this.mode === 'draw_road' || this.mode === 'erase_road' || this.mode === 'place_inventory' || this.mode === 'relocate') {
      this.handleTileAction(gx, gz, worldPoint, event);
    }
  }

  onPointerMove(event) {
    const worldPoint = this.getWorldIntersection(event);

    if (worldPoint) {
      const { gx, gz } = this.worldToGrid(worldPoint);
      const isOutside = Math.hypot(gx, gz) > this.maxCityRadius;

      // Update Cursor Position & visual warning if outside city limits
      if (this.cursorMesh.visible) {
        this.cursorMesh.position.set(gx * this.tileSize, 0.12, gz * this.tileSize);
        if (isOutside) {
          this.cursorMesh.material.color.setHex(0xff1744); // Red warning outside city
        } else if (this.mode === 'draw_road') {
          const hasRoads = this.economy.getInventoryCount('road') > 0;
          this.cursorMesh.material.color.setHex(hasRoads ? 0xffeb3b : 0xff5252);
        } else if (this.mode === 'erase_road') {
          this.cursorMesh.material.color.setHex(0xf44336);
        } else if (this.mode === 'place_inventory') {
          this.cursorMesh.material.color.setHex(0x00e676);
        }
      }

      // Drag-drawing roads!
      if (this.isPointerDown && (this.mode === 'draw_road' || this.mode === 'erase_road')) {
        if (!this.lastGridTile || this.lastGridTile.gx !== gx || this.lastGridTile.gz !== gz) {
          this.lastGridTile = { gx, gz };
          this.handleTileAction(gx, gz, worldPoint, event);
        }
      }
    }

    // DRAGGING MAP: In Home Screen mode or Design Select mode, drag pans the camera!
    if (this.isPointerDown && (this.mode === 'home' || this.mode === 'design_select')) {
      const dx = event.clientX - this.pointerCurrentPos.x;
      const dy = event.clientY - this.pointerCurrentPos.y;
      this.pointerCurrentPos = { x: event.clientX, y: event.clientY };

      const totalDist = Math.hypot(
        event.clientX - this.pointerStartPos.x,
        event.clientY - this.pointerStartPos.y
      );

      if (totalDist > 4) {
        this.hasMovedPastThreshold = true;
      }

      if (this.hasMovedPastThreshold && this.sceneManager) {
        this.sceneManager.panBy(dx, dy);
        document.body.style.cursor = 'grabbing';
      }
    }
  }

  onPointerUp(event) {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    document.body.style.cursor = '';

    // If in home or design_select mode and user DID NOT drag past threshold, it was a click/tap!
    if ((this.mode === 'home' || this.mode === 'design_select') && !this.hasMovedPastThreshold) {
      const worldPoint = this.getWorldIntersection(event);
      if (worldPoint) {
        const { gx, gz } = this.worldToGrid(worldPoint);
        this.handleTileAction(gx, gz, worldPoint, event);
      }
    }

    this.lastGridTile = null;
    this.hasMovedPastThreshold = false;
  }

  handleTileAction(gx, gz, worldPoint, event) {
    // Check city territory boundary! Cannot build outside the city perimeter
    const isOutside = Math.hypot(gx, gz) > this.maxCityRadius;

    // 1. HOME SCREEN MODE: Manual Tap-to-Collect or Inspect
    if (this.mode === 'home') {
      const clickedBuilding = this.findBuildingFromRaycast(event) || this.buildingManager.buildings.find(b => {
        return Math.abs(b.gx - gx) <= 1 && Math.abs(b.gz - gz) <= 1;
      });

      if (!clickedBuilding) return;

      // If factory has harvestable resources (stored >= 12), harvest immediately!
      if (clickedBuilding.produceType && (clickedBuilding.stored || 0) >= 12) {
        const harvest = this.buildingManager.collectBuilding(clickedBuilding);
        if (harvest) {
          this.sound.playCollectChime();
          if (this.onHarvest) {
            this.onHarvest({
              type: harvest.type,
              amount: harvest.amount,
              clientX: event.clientX,
              clientY: event.clientY,
              worldPos: clickedBuilding.mesh.position
            });
          }
        }
      } else {
        // Inspect building details/tier
        this.selectedBuilding = clickedBuilding;
        if (this.onSelectBuilding) {
          this.onSelectBuilding(this.selectedBuilding);
        }
        this.sound.playClick();
      }
      return;
    }

    // Editing modes require being strictly inside the city boundary!
    if (isOutside) {
      return;
    }

    // 2. ROAD DRAWING (DRAG)
    if (this.mode === 'draw_road') {
      if (this.roadNetwork.hasRoad(gx, gz)) return;

      const roadCount = this.economy.getInventoryCount('road');
      if (roadCount <= 0) {
        if (this.onOutOfRoads) {
          this.onOutOfRoads();
        }
        return;
      }

      const added = this.roadNetwork.addRoad(gx, gz);
      if (added) {
        this.economy.consumeFromInventory('road');
        this.sound.playPlace();
        if (this.onRoadUpdated) this.onRoadUpdated();
      }
      return;
    }

    // 3. ROAD ERASING (DRAG)
    if (this.mode === 'erase_road') {
      const removed = this.roadNetwork.removeRoad(gx, gz);
      if (removed) {
        this.economy.addToInventory('road', 1);
        this.sound.playClick();
        if (this.onRoadUpdated) this.onRoadUpdated();
      }
      return;
    }

    // 4. PLACE ITEM FROM INVENTORY
    if (this.mode === 'place_inventory' && this.selectedBuildingType) {
      const type = this.selectedBuildingType;
      const count = this.economy.getInventoryCount(type);
      if (count <= 0) {
        alert('You have no more of this item in your inventory! Visit the Shop to purchase more.');
        this.setMode('design_select');
        return;
      }

      // Check if tile is occupied by an existing building
      const occupied = this.buildingManager.buildings.some(b => {
        return Math.abs(b.gx - gx) <= 1 && Math.abs(b.gz - gz) <= 1;
      });
      if (occupied) {
        this.sound.playCrash(0.3);
        return;
      }

      // Place building on map FIRST - addBuilding returns null for any type that has no
      // mesh factory, and consuming the inventory item before that check silently destroyed
      // the player's purchase (cash + iron + wood) with nothing placed on the map.
      const b = this.buildingManager.addBuilding(type, gx, gz, 1);
      if (!b) {
        console.error(`[GridSystem] No mesh factory for building type "${type}" - placement aborted, inventory refunded.`);
        this.sound.playCrash(0.3);
        return;
      }

      // Only now is the placement real - consume 1 from player inventory
      this.economy.consumeFromInventory(type);

      {
        this.sound.playPlace();
        if (this.onInventoryPlaced) {
          this.onInventoryPlaced(type);
        }

        // If no more in inventory, return to design_select
        if (this.economy.getInventoryCount(type) <= 0) {
          this.setMode('design_select');
        }
      }
      return;
    }

    // 5. RELOCATE BUILDING
    if (this.mode === 'relocate' && this.relocatingBuilding) {
      this.buildingManager.moveBuilding(this.relocatingBuilding, gx, gz);
      if (this.relocatingBuilding.bubbleMesh) {
        this.relocatingBuilding.bubbleMesh.position.set(gx * this.tileSize, 5.0, gz * this.tileSize);
      }
      this.sound.playPlace();
      this.setMode('design_select');
      return;
    }

    // 6. DESIGN MAP SELECT (Architect Inspection / Move / Stow)
    if (this.mode === 'design_select') {
      const clickedBuilding = this.findBuildingFromRaycast(event) || this.buildingManager.buildings.find(b => {
        return Math.abs(b.gx - gx) <= 1 && Math.abs(b.gz - gz) <= 1;
      });

      this.selectedBuilding = clickedBuilding || null;
      if (this.onSelectBuilding) {
        this.onSelectBuilding(this.selectedBuilding);
      }
      if (clickedBuilding) {
        this.sound.playClick();
      }
    }
  }

  updateCamera(newCamera) {
    this.camera = newCamera;
  }
}
