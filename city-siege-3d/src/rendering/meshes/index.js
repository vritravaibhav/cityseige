/**
 * Mesh registry for building types authored outside the monolithic AssetFactory.
 * BuildingManager.createMeshFor consults this first and falls back to the
 * AssetFactory's own create* methods for the original building set.
 *
 * Each factory is (assetFactory, level 1..6) => THREE.Group and uses only the
 * AssetFactory's shared material palette. Run `node tools/verify-meshes.mjs` after
 * editing any of them.
 */
import { createAntimatterCollider } from './antimatter_collider.js';
import { createCryptoVault } from './crypto_vault.js';
import { createDoomsdayTurret } from './doomsday_turret.js';
import { createDroneHangar } from './drone_hangar.js';
import { createEmpDisrupter } from './emp_disrupter.js';
import { createFreezeTrap } from './freeze_trap.js';
import { createFusionReactor } from './fusion_reactor.js';
import { createLandmine } from './landmine.js';
import { createMissileSilo } from './missile_silo.js';
import { createOilRefinery } from './oil_refinery.js';
import { createOrbitalRelay } from './orbital_relay.js';
import { createPlasmaMortar } from './plasma_mortar.js';
import { createQuantumCitadel } from './quantum_citadel.js';
import { createSolarArray } from './solar_array.js';
import { createSpringTrap } from './spring_trap.js';
import { createSwatArmory } from './swat_armory.js';
import { createTechLab } from './tech_lab.js';
import { createVortexTrap } from './vortex_trap.js';

export const MESH_FACTORIES = {
  antimatter_collider: createAntimatterCollider,
  crypto_vault: createCryptoVault,
  doomsday_turret: createDoomsdayTurret,
  drone_hangar: createDroneHangar,
  emp_disrupter: createEmpDisrupter,
  freeze_trap: createFreezeTrap,
  fusion_reactor: createFusionReactor,
  landmine: createLandmine,
  missile_silo: createMissileSilo,
  oil_refinery: createOilRefinery,
  orbital_relay: createOrbitalRelay,
  plasma_mortar: createPlasmaMortar,
  quantum_citadel: createQuantumCitadel,
  solar_array: createSolarArray,
  spring_trap: createSpringTrap,
  swat_armory: createSwatArmory,
  tech_lab: createTechLab,
  vortex_trap: createVortexTrap
};
