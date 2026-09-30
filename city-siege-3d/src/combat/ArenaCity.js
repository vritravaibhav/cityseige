import { RoadNetwork } from '../builder/RoadNetwork.js';
import { BuildingManager } from '../builder/BuildingManager.js';
import { restoreCity } from '../builder/CityPersistence.js';
import { fromCloudLayout, auditLayout } from '../shared/cityRules.js';

/**
 * ArenaCity - the opponent's locked city for a PvP battle raid (ONLINE_SPEC section 8).
 *
 * It is a SECOND BuildingManager + RoadNetwork beside the player's own, never a swap of the home
 * city. Swapping (restoreCity(opponent) on the home manager, raid, restoreCity(own) back) runs
 * through every autosave hook main.js installs: the clearAll -> onBuildersChanged flush, every
 * addBuilding -> onCityChanged, the raid payout -> economy.onUpdate flush and a tab hidden
 * mid-raid would each write the OPPONENT's city over the player's save (and push it to the
 * cloud). This manager has no hooks at all (onBuildersChanged / onCityChanged / roads.onChange
 * stay null), no economy (so restoreCity's legacy-job refund and every collect path have no
 * bank to pay into) and is flagged isForeignCity, which saveCity refuses outright.
 *
 * The home city is only HIDDEN while the arena is up (its groups invisible, collectibles off so
 * no build job completes mid-raid) and keeps autosaving exactly as it is - untouched.
 */
export class ArenaCity {
  /**
   * `scene` is the THREE.Scene, `homeBuildings` the player's BuildingManager (its roadNetwork is
   * the home road network) and `vehicle` the VehicleController whose road surface follows the city.
   */
  constructor({ scene, assetFactory, homeBuildings, vehicle }) {
    this.scene = scene;
    this.assetFactory = assetFactory;
    this.home = homeBuildings;
    this.homeRoads = homeBuildings ? homeBuildings.roadNetwork : null;
    this.vehicle = vehicle || null;

    // Built on the first battle raid, then reused: a practice-only session never pays for it.
    this.roads = null;
    this.buildings = null;
    this.active = false;
    this.lastAudit = null;
  }

  _ensureBuilt() {
    if (this.buildings) return;
    this.roads = new RoadNetwork(this.scene, this.assetFactory);
    this.roads.roadGroup.name = 'arena_road_network';
    // null economy: no refund, collect, stow or gem path of BuildingManager can reach a bank.
    this.buildings = new BuildingManager(this.scene, this.assetFactory, this.roads, null);
    this.buildings.buildingGroup.name = 'arena_city_buildings';
    this.buildings.isForeignCity = true;
    this.buildings.buildingGroup.visible = false;
    this.roads.roadGroup.visible = false;
  }

  /**
   * Check a battle snapshot without touching the world. Accepts a snapshot
   * ({layout, townHall, name, rev, lockedAt}), a fixture ({townHall, layout, holdings}) or a bare
   * cloud layout. Returns { ok, blob, errors, warnings } - `blob` is the local city blob to
   * restore, with its build jobs stripped: an opponent's job that finished "offline" would fire
   * completion toasts, and a legacy one would be refunded into whoever restores it.
   */
  static prepare(snapshot) {
    const layout = snapshot && snapshot.layout ? snapshot.layout : snapshot;
    if (!layout || typeof layout !== 'object' || !Array.isArray(layout.buildings)) {
      return { ok: false, reason: 'BAD_LAYOUT', errors: ['The snapshot has no city layout.'], warnings: [] };
    }
    const blob = { ...fromCloudLayout(layout), tasks: [] };
    // Obviously broken (no Town Hall, a missing gate, junk ids, oversize) is refused: restoreCity
    // would quietly "repair" it with ensureCityCore and the raider would fight a city nobody built.
    // Warnings (overlaps, over a limit) are raided as they are - that is what the defender locked.
    const audit = auditLayout(blob);
    if (audit.errors.length) return { ok: false, reason: 'BAD_LAYOUT', errors: audit.errors, warnings: audit.warnings, blob };
    return { ok: true, blob, errors: [], warnings: audit.warnings };
  }

  /**
   * Load the snapshot into the arena and swap what the player sees and drives on. Returns
   * { ok, townHall, report, warnings } or { ok:false, reason, errors } (nothing changed then).
   */
  enter(snapshot) {
    const prep = ArenaCity.prepare(snapshot);
    this.lastAudit = { errors: prep.errors, warnings: prep.warnings };
    if (!prep.ok) return prep;

    this._ensureBuilt();
    // A second enter without a leave (tooling) must not stack two cities in the arena.
    if (this.buildings.buildings.length || this.roads.roads.size) this.buildings.clearAll();

    // Production is credited up to now from the snapshot's savedAt, like the defender's own load.
    const report = restoreCity(this.buildings, prep.blob, Date.now());
    // Arena buildings never show a collect bubble or a hammer.
    this.buildings.setCollectiblesVisible(false);

    if (this.home) {
      this.home.buildingGroup.visible = false;          // bubbles and hammers are children of it
      this.home.setCollectiblesVisible(false);          // and no home job completes mid-raid
    }
    if (this.homeRoads) this.homeRoads.roadGroup.visible = false;
    this.buildings.buildingGroup.visible = true;
    this.roads.roadGroup.visible = true;
    // The buggy's off-road penalty reads the city it is driving through.
    if (this.vehicle) this.vehicle.setRoadNetwork(this.roads);

    this.active = true;
    return { ok: true, townHall: this.buildings.getTownHallLevel(), report, warnings: prep.warnings };
  }

  /**
   * Tear the arena down and give the player their city back. Call AFTER the raid's own cleanup
   * (AttackManager.returnToBuilder's clearRubble): rubble and craters are parented to the arena's
   * buildingGroup, and clearAll only frees building meshes, bubbles and hammers.
   */
  leave() {
    if (this.buildings) {
      this.buildings.clearAll();
      this.buildings.buildingGroup.visible = false;
      this.roads.roadGroup.visible = false;
    }
    if (this.home) {
      this.home.buildingGroup.visible = true;
      this.home.setCollectiblesVisible(true);
    }
    if (this.homeRoads) this.homeRoads.roadGroup.visible = true;
    if (this.vehicle) this.vehicle.setRoadNetwork(this.homeRoads);
    this.active = false;
  }

  /**
   * Per-frame mesh animation (spinning blades, precinct beacons, radar dishes). main.js only
   * updates the home manager; the arena's full update() is NOT run - it would advance production,
   * grow collect bubbles and tick build jobs, none of which a raided snapshot has any use for.
   */
  update(delta, elapsed) {
    if (!this.active || !this.buildings) return;
    for (const b of this.buildings.buildings) {
      const a = b.mesh && b.mesh.userData && b.mesh.userData.animator;
      if (a) a(delta, elapsed);
    }
  }
}
