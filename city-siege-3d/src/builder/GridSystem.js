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

    // Buildable radius comes from the Town Hall ladder (see get maxCityRadius below).
    this.onSelectBuilding = null;
    this.dragBuilding = null;
    this.dragOrigin = null;
    this.onHarvest = null;
    this.onInventoryPlaced = null;
    this.onOutOfRoads = null;
    this.onOutsideCity = null;
    this.onRoadUpdated = null;
    this.onModeChange = null;

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

  /**
   * Buildable radius in tiles. Grows with the Town Hall from 11.5 to 14.8, just inside the
   * perimeter wall at 15 (82.5m), so every level opens a new ring of land - and never beyond
   * the wall, where a building would be outside the raid map.
   */
  get maxCityRadius() {
    return this.buildingManager ? this.buildingManager.buildRadius : 15;
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

    if (this.onModeChange) this.onModeChange(mode, param);
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
    // A press on ANY part of the HUD is the HUD's, never the map's. #ui-container is
    // pointer-events:none, so a target inside it is always an element that opted in to the
    // pointer. (A list of selectors missed the building inspector: a press on its text picked
    // up and moved the building hidden behind it, drew a road there, or panned the camera.)
    if (event.target && event.target.closest && event.target.closest('#ui-container')) {
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

    // Press on a structure = pick it up and drag it. Works on the city screen AND in the
    // design map, so any placed building can simply be dragged to a new spot.
    if (this.mode === 'home' || this.mode === 'design_select') {
      const hit = this.findBuildingFromRaycast(event);
      if (hit && this.isDraggableBuilding(hit)) {
        this.dragBuilding = hit;
        this.dragOrigin = { gx: hit.gx, gz: hit.gz };
      }
    }

    // In road drawing/erasing or inventory placement, execute action immediately
    if (this.mode === 'draw_road' || this.mode === 'erase_road' || this.mode === 'place_inventory' || this.mode === 'relocate') {
      this.handleTileAction(gx, gz, worldPoint, event);
    }
  }

  /**
   * Main gates are anchored to the perimeter wall (they ARE the breach points), so they stay put.
   * Everything else the player placed can be dragged.
   */
  isDraggableBuilding(b) {
    return !!b && !b.isMainGate && b.type !== 'main_gate' && !b.isUnderConstruction;
  }

  /** Pure scenery - never blocks a structure from being placed or dropped on that tile. */
  isDecoration(b) {
    return !!b && b.type === 'tree';
  }

  /** Side of the square a structure covers, in tiles (BuildingManager.footprintOf). */
  footprintOf(typeOrBuilding) {
    return this.buildingManager.footprintOf(typeOrBuilding);
  }

  /**
   * Would a `footprint`-sized structure centred on (gx, gz) overlap an existing one? The rule
   * lives in BuildingManager.isFootprintBlocked (a save repair places a Town Hall with it too);
   * the old fixed +/-1 test here kept every pair of blocks two tiles apart and left a gap a
   * buggy drove through.
   */
  isFootprintBlocked(footprint, gx, gz, ignore = null) {
    return this.buildingManager.isFootprintBlocked(footprint, gx, gz, ignore);
  }

  /** A tile is a legal drop target if it is inside the city and not on top of another structure. */
  isValidDropTile(building, gx, gz) {
    if (Math.hypot(gx, gz) > this.maxCityRadius) return false;
    return !this.isFootprintBlocked(this.footprintOf(building), gx, gz, building);
  }

  /**
   * The structure standing on (gx, gz), for taps the raycast missed: one whose footprint
   * covers the tile, else the nearest within a tile. (Taking the first one within +/-1
   * picked the wrong block out of a chained wall.) Decoration only if nothing else is there.
   */
  buildingAtTile(gx, gz) {
    let best = null;
    let bestScore = Infinity;
    for (const b of this.buildingManager.buildings) {
      const dx = Math.abs(b.gx - gx);
      const dz = Math.abs(b.gz - gz);
      if (dx > 1 || dz > 1) continue;
      const covers = Math.max(dx, dz) < this.footprintOf(b) / 2;
      const score = (covers ? 0 : 10) + (this.isDecoration(b) ? 5 : 0) + Math.hypot(dx, dz);
      if (score < bestScore) { bestScore = score; best = b; }
    }
    return best;
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

    // DRAGGING A BUILDING: the structure follows the cursor and previews where it will land.
    if (this.isPointerDown && this.dragBuilding && worldPoint) {
      const totalDist = Math.hypot(
        event.clientX - this.pointerStartPos.x,
        event.clientY - this.pointerStartPos.y
      );
      if (totalDist > 4) this.hasMovedPastThreshold = true;

      if (this.hasMovedPastThreshold) {
        const { gx, gz } = this.worldToGrid(worldPoint);
        const ok = this.isValidDropTile(this.dragBuilding, gx, gz);

        if (this.dragBuilding.mesh) {
          // Lift it slightly so it reads as "in hand", and tint the tile cursor by validity.
          this.dragBuilding.mesh.position.set(gx * this.tileSize, ok ? 0.6 : 0.3, gz * this.tileSize);
        }
        this.cursorMesh.visible = true;
        this.cursorMesh.position.set(gx * this.tileSize, 0.12, gz * this.tileSize);
        this.cursorMesh.material.color.setHex(ok ? 0x00e676 : 0xff1744);
        document.body.style.cursor = 'grabbing';
      }
      return; // never pan the camera while carrying a building
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

    // Release while carrying a building = drop it.
    if (this.dragBuilding) {
      const b = this.dragBuilding;
      this.dragBuilding = null;
      this.cursorMesh.visible = false;

      if (this.hasMovedPastThreshold) {
        const worldPoint = this.getWorldIntersection(event);
        const target = worldPoint ? this.worldToGrid(worldPoint) : null;
        if (target && this.isValidDropTile(b, target.gx, target.gz)) {
          this.buildingManager.moveBuilding(b, target.gx, target.gz);
          this.sound.playPlace();
        } else {
          // Illegal drop - put it back exactly where it came from.
          this.buildingManager.moveBuilding(b, this.dragOrigin.gx, this.dragOrigin.gz);
          this.sound.playCrash(0.3);
        }

        this.lastGridTile = null;
        this.hasMovedPastThreshold = false;
        return;
      }
      // Not dragged far enough - fall through so it counts as a normal tap.
    }

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
      const clickedBuilding = this.findBuildingFromRaycast(event) || this.buildingAtTile(gx, gz);

      if (!clickedBuilding) return;

      // If factory has harvestable resources (stored >= 12), harvest immediately!
      // (A Crypto Vault cannot be tapped - it only pays out when raided - so it inspects.)
      if (clickedBuilding.produceType && !clickedBuilding.raidOnly && (clickedBuilding.stored || 0) >= 12) {
        const harvest = this.buildingManager.collectBuilding(clickedBuilding);
        if (harvest) {
          this.sound.playCollectChime();
          if (this.onHarvest) {
            this.onHarvest({
              type: harvest.type,
              amount: harvest.amount,
              payout: harvest.payout,
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
      if ((this.mode === 'draw_road' || this.mode === 'erase_road') && this.onOutsideCity) this.onOutsideCity();
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

      // Road tiles are budgeted per Town Hall level just like every other type.
      const roadGate = this.buildingManager.canPlace('road');
      if (!roadGate.ok) {
        if (this.onRoadLimitReached) this.onRoadLimitReached(roadGate);
        this.sound.playCrash(0.3);
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

      // One authority for "may this exist": Town Hall unlock AND the per-type build limit.
      // Items bought before a limit was reached, seeded into inventory, or stowed and
      // re-placed all funnel through here, so the cap cannot be laundered.
      const defForType = this.buildingManager.catalog[type];
      const gate = this.buildingManager.canPlace(type);
      if (!gate.ok) {
        const label = defForType ? defForType.name : type;
        if (gate.reason === 'LOCKED') {
          alert(`${label} unlocks at Town Hall ${gate.requiredTH}. Upgrade your Town Hall first.`);
        } else if (gate.reason === 'AT_LIMIT') {
          alert(`${label}: you already have ${gate.have} of ${gate.limit}. ` +
            'Upgrade your Town Hall to raise the limit.');
        } else {
          alert(`${label} cannot be placed right now.`);
        }
        this.setMode('design_select');
        return;
      }

      // Check if the footprint overlaps an existing building (footprint-aware, so 1-tile
      // barriers can sit side by side). Trees are scenery and never block placement.
      if (this.isFootprintBlocked(this.footprintOf(type), gx, gz)) {
        this.sound.playCrash(0.3);
        return;
      }

      // Place building on map FIRST - addBuilding returns null for any type that has no
      // mesh factory, and consuming the inventory item before that check silently destroyed
      // the player's purchase (cash + iron + wood) with nothing placed on the map.
      // A stowed building comes back at the level it left at.
      const level = this.economy.peekStowedLevel ? this.economy.peekStowedLevel(type) : 1;
      const b = this.buildingManager.addBuilding(type, gx, gz, level);
      if (!b) {
        console.error(`[GridSystem] No mesh factory for building type "${type}" - placement aborted, inventory refunded.`);
        this.sound.playCrash(0.3);
        return;
      }

      // Only now is the placement real - consume 1 from player inventory. A building coming
      // back out of storage brings only what it took in: a producer's output was banked when
      // it was stowed, and a Crypto Vault's sealed cash travelled with it. (The starter seed is
      // for new purchases - re-seeding here paid it out again on every stow and place.)
      const back = this.economy.takeStowed ? this.economy.takeStowed(type) : null;
      if (back && back.fromStorage && b.produceType) {
        b.stored = Math.min(b.maxCapacity, back.sealed);
      }
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
    // Same rules as dragging: gates and buildings mid-upgrade stay put, and the drop tile must
    // be free. ('Pick Up & Move' used to skip both, stacking two buildings on one tile - which
    // a save then could not tell apart - and leaving an upgrade's hammer behind.)
    if (this.mode === 'relocate' && this.relocatingBuilding) {
      const b = this.relocatingBuilding;
      if (!this.isDraggableBuilding(b)) {
        this.sound.playCrash(0.3);
        this.setMode('design_select');
        return;
      }
      if (!this.isValidDropTile(b, gx, gz)) {
        this.sound.playCrash(0.3);   // stay in relocate mode so the player can pick another tile
        return;
      }
      const moved = this.buildingManager.moveBuilding(b, gx, gz);
      if (moved && moved.ok) this.sound.playPlace();
      else this.sound.playCrash(0.3);   // no longer on the map (a preset replaced it)
      this.setMode('design_select');
      return;
    }

    // 6. DESIGN MAP SELECT (Architect Inspection / Move / Stow)
    if (this.mode === 'design_select') {
      const clickedBuilding = this.findBuildingFromRaycast(event) || this.buildingAtTile(gx, gz);

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
