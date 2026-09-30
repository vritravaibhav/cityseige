# 🏰 City Siege 3D — Master Architecture & Game Progression Guide

Welcome to **City Siege 3D**, an action-strategy hybrid combining city-building defense with real-time vehicular combat. Players design and fortify custom metropolitan bases, manage resources, research high-tier technologies in specialized tuning and munitions laboratories, allocate builders to construct and upgrade structures, and pilot armed vehicles to attack rival cities.

---

## 📑 Table of Contents
1. [Research Labs: Vehicle Tuning & Explosive Munitions](#1-research-labs-vehicle-tuning--explosive-munitions)
2. ["Hire a Labour" System: Concurrency, Timers & Town Hall Unlocks](#2-hire-a-labour-system-concurrency-timers--town-hall-unlocks)
3. [Master Town Hall Progression Matrix (TH 1 to TH 12)](#3-master-town-hall-progression-matrix-th-1-to-th-12)
4. [Building Capacities & Unlocks per Town Hall Level](#4-building-capacities--unlocks-per-town-hall-level)
5. [Maximum Building Upgrade Level Caps](#5-maximum-building-upgrade-level-caps)
6. [Visual Evolution Across Architectural Tiers](#6-visual-evolution-across-architectural-tiers)
7. [Persistent Data Files & References](#7-persistent-data-files--references)
8. [Online Play: Accounts, Battles & the AI Designer](#8-online-play-accounts-battles--the-ai-designer)

---

## 1. Research Labs: Vehicle Tuning & Explosive Munitions

In addition to defensive and civil structures, players unlock two dedicated research and performance facilities to upgrade their combat vehicles and explosive firepower:

### 🏎️ Vehicle Tuning Lab (Unlocked at Town Hall 2)
> *High-octane automotive engineering garage dedicated to pushing engine torque, chassis survivability, nitro capacity, and hydraulic jumps.*

* **Footprint**: $2 \times 2$ tiles
* **Unlocked At**: **Town Hall 2**
* **Upgrade Level Cap**: Scales up to **Level 11** at Town Hall 12
* **Research Tracks**:
  1. **Top Speed & Turbo Injection**: Increases top velocity on straightaways (+12% per level). Outpaces baseline police pursuit cruisers.
  2. **Torque & Powertrain Acceleration**: Improves 0–60 km/h sprint and hill-climbing power (+15% acceleration per level).
  3. **Nitrous Oxide Reserves**: Extends nitro burn time (+18% per level) and amplifies top-speed burst boost (+10% per level).
  4. **Chassis Armor & Roll Cage**: Increases vehicle max health points (+150 HP per level) and adds impact absorption against defensive bullets.
  5. **Hydraulic Jump Suspension**: Increases Big Jump height and forward clearance impulse (+14% per level) to vault cleanly over roadblock barricades.
  6. **Performance Treads & Drift Control**: Improves tire grip and cornering stability (+12% per level), preventing vehicle fishtailing and spinouts.

---

### 💣 Weapons & Munitions Lab (Unlocked at Town Hall 3)
> *Explosive ordinance foundry where bombs, rocket warheads, secondary shrapnel, and EMP disruptors are synthesized and magnified.*

* **Footprint**: $2 \times 2$ tiles
* **Unlocked At**: **Town Hall 3**
* **Upgrade Level Cap**: Scales up to **Level 10** at Town Hall 12
* **Research Tracks**:
  1. **Explosive Shockwave Radius (Bomb Blast)**: Expands the detonation diameter of vehicle-dropped bombs (+18% AOE radius per level).
  2. **High-Explosive Payload Damage**: Multiplies explosive demolition damage against structures and armored vehicles (+25% damage per level).
  3. **Secondary Shrapnel Fragmentation**: Launches high-velocity shrapnel pellets upon bomb detonation (+4 fragments per level) to ignite surrounding hazards.
  4. **Rocket Guidance & Warhead Velocity**: Accelerates missile projectile speed and sharpens homing lock-on (+20% velocity, +15% range per level).
  5. **EMP Pulse Disruption**: Broadens electromagnetic shockwave radius and prolongs vehicle/turret shutdown duration (+0.6s freeze per level).
  6. **Automated Ammo Feeder**: Accelerates ordinance reload rate (-12% cooldown between heavy bomb/rocket drops per level).

---

## 2. "Hire a Labour" System: Concurrency, Timers & Town Hall Unlocks

The **"Hire a Labour"** system governs all construction and structural upgrades in the city:

### ⚙️ Core Labour Mechanics
1. **Concurrency Rule**: Exactly **1 Labour** is required for every active construction or upgrade job.
2. **Busy State**: If all hired labours are currently active on construction tasks, no new buildings can be placed or upgraded until a labour completes their task (or is finished instantly).
3. **HUD Indicator**: The top HUD displays real-time labour availability: `👷 Labours: X / Y Free` (with animated active 3D hammer indicators over buildings under construction).

### 👷 "Hire a Labour" Unlock Roadmap Across Town Halls

| Labour Slot | Title | Unlock Town Hall | Hiring Cost | Role & Description |
| :---: | :--- | :---: | :--- | :--- |
| **Labour 1** | Apprentice Labour | **TH 1** | **Free** (Starter) | Foundation worker who assists in carving out the pioneer settlement. |
| **Labour 2** | Journeyman Labour | **TH 1** | **Free** (Starter) | Second baseline labour included in Town Hall 1 default city layout. |
| **Labour 3** | Master Carpenter | **TH 2** | 💰500 &nbsp; ⚙️250 &nbsp; 🪵300 | Hire 3rd Labour at Town Hall 2 for sniper towers and vehicle lab expansion. |
| **Labour 4** | Architect Engineer | **TH 4** | 💰1,000 &nbsp; ⚙️500 &nbsp; 🪵600 | Hire 4th Labour at Town Hall 4 for industrial electrification and refineries. |
| **Labour 5** | Industrial Foreman | **TH 6** | 💰2,500 &nbsp; ⚙️1,200 &nbsp; 🪵1,500 | Hire 5th Labour at Town Hall 6 for laser obelisks and urban skyscraper development. |
| **Labour 6** | Cybernetic Constructor | **TH 9** | 💰6,000 &nbsp; ⚙️3,000 &nbsp; 🪵4,000 | Hire 6th Labour at Town Hall 9. Automated robotic worker with nanite assembly. |
| **Labour 7** | Quantum Nano-Assembler | **TH 12** | 💰15,000 &nbsp; ⚙️8,000 &nbsp; 🪵10,000| Hire 7th Labour at Town Hall 12. Transcendent quantum particle constructor. |

### ⏱️ Construction & Upgrade Timers

| Building Type | Lvl 1 Build Time | Lvl 2 Upgrade | Lvl 3 Upgrade | Lvl 4 Upgrade | Lvl 5 Upgrade | Lvl 6 Upgrade | Lvl 7..12 Cap |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Town Hall** | Instant | 30s | 1m | 2m | 4m | 8m | Up to 8h (TH 12) |
| **Vehicle Tuning Lab** | 15s | 30s | 1m | 2m | 4m | 8m | Up to 4h (TH 12) |
| **Weapons & Munitions Lab** | 20s | 40s | 1m 20s | 2m 40s | 5m 20s | 10m 40s | Up to 2h 40m |
| **Police Station** | 15s | 30s | 1m | 2m | 4m | 8m | Up to 8h |
| **Petrol Pump** | 10s | 20s | 40s | 1m 20s | 2m 40s | 5m 20s | Up to 5h 20m |
| **Fortified Main Gate** | 20s | 40s | 1m 20s | 2m 40s | 5m 20s | 10m 40s | Up to 10h 40m |
| **Roadblock Barrier** | 5s | 10s | 20s | 40s | 1m 20s | 2m 40s | Up to 2h 40m |
| **Economic Factories (Wood/Iron)** | 10s | 20s | 40s | 1m 20s | 2m 40s | 5m 20s | Up to 5h 20m |
| **Cash Mint** | 15s | 30s | 1m | 2m | 4m | 8m | Up to 8h |
| **Sniper Tower** | 15s | 30s | 1m | 2m | 4m | 8m | Up to 4h |
| **Tesla Coil** | 25s | 50s | 1m 40s | 3m 20s | 6m 40s | 13m 20s | Up to 1h 46m |
| **Laser Obelisk** | 30s | 1m | 2m | 4m | 8m | 16m | Up to 32m |
| **Doomsday Turret** | 2m | 4m | — | — | — | — | — |
| **Quantum Citadel** | 5m | — | — | — | — | — | — |

---

## 3. Master Town Hall Progression Matrix (TH 1 to TH 12)

| TH Lvl | Theme & Era | New Unlocks | Max Lvl Cap | Key Defenses & Pursuit Units | Max Road Tiles | Max Builders |
| :---: | :--- | :--- | :---: | :--- | :---: | :---: |
| **TH 1** | **Frontier Settlement** | `police_station`, `petrol_pump`, `main_gate`, `roadblock`, `spike_trap`, `lumber_mill`, `iron_foundry`, `builder_hut` | **Lvl 1** | **2 Police Stations, 2 Petrol Pumps, 6 Roadblocks, 3 Attacking Gates** | 45 | **2** |
| **TH 2** | **Rural County Seat** | 🏎️ `vehicle_lab`, 🏹 `sniper_tower`, 🪵 `spring_trap`, 🏦 `cash_mint`, 🔨 `builder_hut` (3rd) | **Lvl 2** | +Vehicle Tuning Lab, +2 Sniper Towers, +3 Spring Traps | 65 | **3** |
| **TH 3** | **Developing Township** | 💣 `weapons_lab`, 🛡️ `swat_armory`, 💣 `landmine`, ☀️ `solar_array` | **Lvl 3** | +Weapons Lab, +1 SWAT Armory (Armored Cruisers), +4 Landmines | 85 | **3** |
| **TH 4** | **Industrial Borough** | ⚡ `tesla_coil`, 🛢️ `oil_refinery`, 🔨 `builder_hut` (4th) | **Lvl 4** | +2 Tesla Coils (Arc shock), +2 Roadblocks | 110 | **4** |
| **TH 5** | **Modern Municipality** | 🚀 `missile_silo`, 🔬 `tech_lab`, ❄️ `freeze_trap` | **Lvl 5** | +1 Guided Missile Silo, +3 Freeze Traps | 140 | **4** |
| **TH 6** | **High-Tech City** | 🔴 `laser_obelisk`, 🔨 `builder_hut` (5th) | **Lvl 6** | +2 Focused Laser Obelisks | 170 | **5** |
| **TH 7** | **Cyber Metropolis** | 🛸 `drone_hangar`, ⚛️ `fusion_reactor` | **Lvl 7** | +1 Aerial Drone Hangar (Airstrikes), +1 Fusion Core | 200 | **5** |
| **TH 8** | **Fortified Megalopolis**| 💥 `plasma_mortar`, 🌀 `vortex_trap` | **Lvl 8** | +1 Heavy Plasma Mortar, +2 Vortex Traps | 240 | **5** |
| **TH 9** | **Cyberpunk Sprawl** | ⚡ `emp_disrupter`, 🪙 `crypto_vault`, 🔨 `builder_hut` (6th) | **Lvl 9** | +1 EMP Disrupter, +1 Automated Crypto Vault | 280 | **6** |
| **TH 10** | **Orbital Bastion** | 🛰️ `orbital_relay` | **Lvl 10** | +1 Orbital Kinetic Strike Relay | 320 | **6** |
| **TH 11** | **Apex Titan Fortress** | ☢️ `doomsday_turret`, 🌌 `antimatter_collider` | **Lvl 11** | +1 Quad Doomsday Cannon, +1 Antimatter Collider | 360 | **6** |
| **TH 12** | **Quantum Metropolis** | 🔮 `quantum_citadel`, 🔨 `builder_hut` (7th) | **Lvl 12** | +1 City-Wide Quantum Shield Matrix | 420 | **7** |

---

## 4. Building Capacities & Unlocks per Town Hall Level

### 🌲 Town Hall 1 — Frontier Settlement
* **Builders**: **2** (Starter)
* **Police Stations**: **2** (Dispatches 2 standard pursuit cruisers)
* **Petrol Pumps**: **2** (Produces Cash; volatile explosive hazard during attacks)
* **Building Obstacles (Roadblocks)**: **6** (Wood/stone street barricades)
* **Attacking Buildings (Fortified Gates)**: **3** (Equipped with twin automated defense turrets)
* **Economy & Civil**: 2 Lumber Mills, 2 Iron Foundries, 2 Builder Huts, 2 Spike Traps, 16 Trees, 45 Road Tiles.
* *Building Level Cap*: **1**

### 🏡 Town Hall 2 — Rural County Seat
* **New Unlocks**: 🏎️ `vehicle_lab`, 🏹 `sniper_tower`, 🪵 `spring_trap`, 🏦 `cash_mint`, 🔨 `builder_hut`
* **Capacities**: 1 Town Hall, **1 Vehicle Tuning Lab**, **3 Builder Huts (3 Builders)**, 2 Police Stations, 3 Petrol Pumps, **8 Roadblocks**, **3 Attacking Gates**, **2 Sniper Towers**, **3 Spring Traps**, 4 Spike Traps, 3 Lumber Mills, 2 Iron Foundries, 1 Cash Mint, 20 Trees, 65 Road Tiles.
* *Building Level Cap*: **2**

### 🏛️ Town Hall 3 — Developing Township
* **New Unlocks**: 💣 `weapons_lab`, 🛡️ `swat_armory`, 💣 `landmine`, ☀️ `solar_array`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, **1 Weapons & Munitions Lab**, 3 Builder Huts, 3 Police Stations, **1 SWAT Armory** (heavy armored cruisers), 4 Petrol Pumps, **10 Roadblocks**, **4 Attacking Gates**, 3 Sniper Towers, 2 Solar Arrays, **4 Landmines**, 4 Spring Traps, 4 Spike Traps, 3 Lumber Mills, 3 Iron Foundries, 2 Cash Mints, 24 Trees, 85 Road Tiles.
* *Building Level Cap*: **3**

### 🏭 Town Hall 4 — Industrial Borough
* **New Unlocks**: ⚡ `tesla_coil`, 🛢️ `oil_refinery`, 🔨 `builder_hut`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, **4 Builder Huts (4 Builders)**, 3 Police Stations, 2 SWAT Armories, 4 Petrol Pumps, **12 Roadblocks**, **4 Attacking Gates**, **2 Tesla Coils**, 4 Sniper Towers, **1 Oil Refinery**, 2 Solar Arrays, 6 Landmines, 4 Spring Traps, 4 Spike Traps, 4 Lumber Mills, 4 Iron Foundries, 3 Cash Mints, 28 Trees, 110 Road Tiles.
* *Building Level Cap*: **4**

### 🏙️ Town Hall 5 — Modern Municipality
* **New Unlocks**: 🚀 `missile_silo`, 🔬 `tech_lab`, ❄️ `freeze_trap`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, 4 Builder Huts, 4 Police Stations, 2 SWAT Armories, 5 Petrol Pumps, **15 Roadblocks**, **4 Attacking Gates**, **1 Guided Missile Silo**, 1 Tech Lab, **3 Freeze Traps**, 2 Tesla Coils, 5 Sniper Towers, 2 Oil Refineries, 3 Solar Arrays, 8 Landmines, 5 Spring Traps, 5 Spike Traps, 4 Lumber Mills, 4 Iron Foundries, 3 Cash Mints, 32 Trees, 140 Road Tiles.
* *Building Level Cap*: **5**

### 🌆 Town Hall 6 — High-Tech City
* **New Unlocks**: 🔴 `laser_obelisk`, 🔨 `builder_hut`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, **5 Builder Huts (5 Builders)**, 4 Police Stations, 3 SWAT Armories, 5 Petrol Pumps, **18 Roadblocks**, **5 Attacking Gates**, **2 Laser Obelisks**, 2 Missile Silos, 1 Tech Lab, 3 Tesla Coils, 6 Sniper Towers, 2 Oil Refineries, 3 Solar Arrays, 4 Freeze Traps, 10 Landmines, 5 Spring Traps, 5 Spike Traps, 5 Lumber Mills, 5 Iron Foundries, 4 Cash Mints, 36 Trees, 170 Road Tiles.
* *Building Level Cap*: **6**

### 🌐 Town Hall 7 — Cybernetic Metropolis
* **New Unlocks**: 🛸 `drone_hangar`, ⚛️ `fusion_reactor`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, 5 Builder Huts, 5 Police Stations, 3 SWAT Armories, 6 Petrol Pumps, **20 Roadblocks**, **5 Attacking Gates**, **1 Drone Hangar**, **1 Fusion Reactor**, 2 Laser Obelisks, 2 Missile Silos, 1 Tech Lab, 3 Tesla Coils, 6 Sniper Towers, 3 Oil Refineries, 4 Solar Arrays, 5 Freeze Traps, 12 Landmines, 6 Spring Traps, 6 Spike Traps, 5 Lumber Mills, 5 Iron Foundries, 4 Cash Mints, 40 Trees, 200 Road Tiles.
* *Building Level Cap*: **7**

### 🌋 Town Hall 8 — Fortified Megalopolis
* **New Unlocks**: 💥 `plasma_mortar`, 🌀 `vortex_trap`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, 5 Builder Huts, 5 Police Stations, 4 SWAT Armories, 6 Petrol Pumps, **24 Roadblocks**, **6 Attacking Gates**, **1 Plasma Mortar**, **2 Vortex Traps**, 2 Drone Hangars, 1 Fusion Reactor, 3 Laser Obelisks, 3 Missile Silos, 2 Tech Labs, 4 Tesla Coils, 7 Sniper Towers, 3 Oil Refineries, 4 Solar Arrays, 6 Freeze Traps, 14 Landmines, 6 Spring Traps, 6 Spike Traps, 6 Lumber Mills, 6 Iron Foundries, 5 Cash Mints, 45 Trees, 240 Road Tiles.
* *Building Level Cap*: **8**

### 🌆 Town Hall 9 — Cyberpunk Sprawl
* **New Unlocks**: ⚡ `emp_disrupter`, 🪙 `crypto_vault`, 🔨 `builder_hut`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, **6 Builder Huts (6 Builders)**, 6 Police Stations, 4 SWAT Armories, 7 Petrol Pumps, **28 Roadblocks**, **6 Attacking Gates**, **1 EMP Disrupter**, **1 Crypto Vault**, 2 Plasma Mortars, 3 Vortex Traps, 2 Drone Hangars, 2 Fusion Reactors, 3 Laser Obelisks, 3 Missile Silos, 2 Tech Labs, 4 Tesla Coils, 7 Sniper Towers, 3 Oil Refineries, 4 Solar Arrays, 6 Freeze Traps, 16 Landmines, 7 Spring Traps, 7 Spike Traps, 6 Lumber Mills, 6 Iron Foundries, 5 Cash Mints, 50 Trees, 280 Road Tiles.
* *Building Level Cap*: **9**

### 🛰️ Town Hall 10 — Orbital Bastion
* **New Unlocks**: 🛰️ `orbital_relay`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, 6 Builder Huts, 6 Police Stations, 5 SWAT Armories, 7 Petrol Pumps, **32 Roadblocks**, **6 Attacking Gates**, **1 Orbital Strike Relay**, 2 EMP Disrupters, 2 Crypto Vaults, 2 Plasma Mortars, 4 Vortex Traps, 3 Drone Hangars, 2 Fusion Reactors, 4 Laser Obelisks, 4 Missile Silos, 2 Tech Labs, 5 Tesla Coils, 8 Sniper Towers, 4 Oil Refineries, 5 Solar Arrays, 7 Freeze Traps, 18 Landmines, 7 Spring Traps, 7 Spike Traps, 7 Lumber Mills, 7 Iron Foundries, 6 Cash Mints, 55 Trees, 320 Road Tiles.
* *Building Level Cap*: **10**

### ☣️ Town Hall 11 — Apex Titan Fortress
* **New Unlocks**: ☢️ `doomsday_turret`, 🌌 `antimatter_collider`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, 6 Builder Huts, 7 Police Stations, 5 SWAT Armories, 8 Petrol Pumps, **36 Roadblocks**, **7 Attacking Gates**, **1 Doomsday Turret**, **1 Antimatter Collider**, 2 Orbital Relays, 2 EMP Disrupters, 2 Crypto Vaults, 3 Plasma Mortars, 5 Vortex Traps, 3 Drone Hangars, 3 Fusion Reactors, 4 Laser Obelisks, 4 Missile Silos, 3 Tech Labs, 5 Tesla Coils, 8 Sniper Towers, 4 Oil Refineries, 5 Solar Arrays, 8 Freeze Traps, 20 Landmines, 8 Spring Traps, 8 Spike Traps, 7 Lumber Mills, 7 Iron Foundries, 6 Cash Mints, 60 Trees, 360 Road Tiles.
* *Building Level Cap*: **11**

### 🔮 Town Hall 12 — Transcendent Quantum Metropolis
* **New Unlocks**: 🔮 `quantum_citadel`, 🔨 `builder_hut`
* **Capacities**: 1 Town Hall, 1 Vehicle Lab, 1 Weapons Lab, **7 Builder Huts (7 Builders)**, 8 Police Stations, 6 SWAT Armories, 8 Petrol Pumps, **40 Roadblocks**, **8 Attacking Gates**, **1 Quantum Citadel**, **2 Doomsday Turrets**, **2 Antimatter Colliders**, 2 Orbital Relays, 3 EMP Disrupters, 3 Crypto Vaults, 3 Plasma Mortars, 6 Vortex Traps, 4 Drone Hangars, 3 Fusion Reactors, 5 Laser Obelisks, 5 Missile Silos, 3 Tech Labs, 6 Tesla Coils, 10 Sniper Towers, 5 Oil Refineries, 6 Solar Arrays, 8 Freeze Traps, 24 Landmines, 8 Spring Traps, 8 Spike Traps, 8 Lumber Mills, 8 Iron Foundries, 7 Cash Mints, 70 Trees, 420 Road Tiles.
* *Building Level Cap*: **12**

---

## 5. Maximum Building Upgrade Level Caps

| Building Type | TH 1 | TH 2 | TH 3 | TH 4 | TH 5 | TH 6 | TH 7 | TH 8 | TH 9 | TH 10 | TH 11 | TH 12 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Town Hall** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Main Gate (Attacking)** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Police Station** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Petrol Pump** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Roadblock (Obstacle)** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **🏎️ Vehicle Tuning Lab** | — | **1** | **2** | **3** | **4** | **5** | **6** | **7** | **8** | **9** | **10** | **11** |
| **💣 Weapons & Munitions Lab** | — | — | **1** | **2** | **3** | **4** | **5** | **6** | **7** | **8** | **9** | **10** |
| **🔨 Builder's Hut** | 1 | 2 | 2 | 3 | 3 | 4 | 4 | 4 | 5 | 5 | 5 | 6 |
| **Lumber Mill** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Iron Foundry** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Spike Trap** | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
| **Sniper Tower** | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| **Cash Mint** | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 |
| **SWAT Armory** | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| **Landmine** | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| **Tesla Coil** | — | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| **Oil Refinery** | — | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
| **Missile Silo** | — | — | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| **Laser Obelisk** | — | — | — | — | — | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| **Drone Hangar** | — | — | — | — | — | — | 1 | 2 | 3 | 4 | 5 | 6 |
| **Plasma Mortar** | — | — | — | — | — | — | — | 1 | 2 | 3 | 4 | 5 |
| **EMP Disrupter** | — | — | — | — | — | — | — | — | 1 | 2 | 3 | 4 |
| **Orbital Relay** | — | — | — | — | — | — | — | — | — | 1 | 2 | 3 |
| **Doomsday Turret** | — | — | — | — | — | — | — | — | — | — | 1 | 2 |
| **Quantum Citadel** | — | — | — | — | — | — | — | — | — | — | — | 1 |

---

## 6. Visual Evolution Across Architectural Tiers

* **🔨 Builder's Hut**: Log cabin with wooden sawbench (Tier 1) ➔ Brick workshop with anvil & slate roof (Tier 2) ➔ Industrial steel depot with hoist crane (Tier 3) ➔ Prefabricated engineering office with holographic blueprints (Tier 4) ➔ Cyber robotic automation bay (Tier 5) ➔ Adamantium particle synthesis station (Tier 6) ➔ Quantum nano-assembler hive (Tier 7).
* **🏎️ Vehicle Tuning Lab**: Brick garage with hydraulic car lift (Tier 1) ➔ Dyno computer test lab (Tier 2) ➔ Wind tunnel aero lab (Tier 3) ➔ Cyber robotic motorworks (Tier 4) ➔ Suborbital rocket bay (Tier 5) ➔ Levitation quantum hanger (Tier 6).
* **💣 Weapons & Munitions Lab**: Ballistic concrete bunker (Tier 1) ➔ Chemical shell foundry (Tier 2) ➔ Radar telemetry rocket silo (Tier 3) ➔ Plasma ion chamber (Tier 4) ➔ Antimatter particle accelerator (Tier 5).
* **🏛️ Town Hall**: Rustic log cabin (Tier 1) ➔ Red-brick courthouse (Tier 2) ➔ Art-deco limestone hall (Tier 3) ➔ Glass-curtain skyscraper base (Tier 4) ➔ Cyberpunk neon arcology (Tier 5) ➔ Adamantium titan fortress (Tier 6) ➔ Transcendent floating Quantum Spire (Tier 7).
* **⛩️ Fortified Main Gate**: Timber palisade & ballistas (Tier 1) ➔ Stone arch & cannons (Tier 2) ➔ Steel bunker & gatlings (Tier 3) ➔ Composite & quad-plasma (Tier 4) ➔ Railgun missile fortress (Tier 5) ➔ Rotary hyper-cannons (Tier 6) ➔ Quantum disintegrator gate (Tier 7).
* **🚓 Police Station**: Sheriff outpost & cruisers (Tier 1) ➔ Brick precinct & interceptors (Tier 2) ➔ Concrete sally port (Tier 3) ➔ Metro headquarters (Tier 4) ➔ Cyber hover precinct (Tier 5) ➔ Heavy SWAT bastion (Tier 6) ➔ Quantum Enforcement Spire (Tier 7).
* **⛽ Petrol Pump & Energy**: Vintage hand-crank pumps (Tier 1) ➔ Canopy service station (Tier 2) ➔ Highway quad pump facility (Tier 3) ➔ Chrome octane refinery (Tier 4) ➔ Cyber fuel conduit hub (Tier 5) ➔ Plasma electromagnetic station (Tier 6) ➔ Antimatter zero-point matrix (Tier 7).
* **🚧 Roadblocks & Traps**: Timber sawhorse barricades (Tier 1) ➔ Granite stone blocks (Tier 2) ➔ Cast concrete Jersey barriers (Tier 3) ➔ Steel dragon's teeth (Tier 4) ➔ Retractable hydraulic steel ramps (Tier 5) ➔ Magnetized adamantium (Tier 6) ➔ Kinetic repulsion force-walls (Tier 7).

---

## 7. Persistent Data Files & References

* **Master Progression & Builder JSON**: [`src/data/town_hall_progression.json`](./src/data/town_hall_progression.json) (and root `./town_hall_progression.json`)
* **Brain Artifact Progression Guide**: `C:\Users\divai\.gemini\antigravity\brain\f3a9c818-8af7-4a28-a847-6e558dcd5d68\town_hall_progression_guide.md`
* **Game Entrypoint**: [`index.html`](./index.html) & [`src/main.js`](./src/main.js)

---

## 8. Online Play: Accounts, Battles & the AI Designer

Online play is an optional layer on top of the offline game: **accounts** (Firebase Authentication, email + password or Google), a **cloud save** of each player's city, bank and garage (Cloud Firestore), **PvP battles** between two players, and an **AI designer** that edits your city through an MCP server. A build without Firebase settings plays fully offline, exactly as before, and never loads the Firebase SDK. The full guides live in `city-siege-3d/docs/`.

### How to run it

| You want | Do this (from `city-siege-3d/`) |
| :--- | :--- |
| Offline play, as always | `npm install && npm run dev` (no `.env.local`) |
| Online play locally, no real project | `npm run emulators` in one terminal (needs the Firebase CLI and Java), `npm run dev:emu` in another, open `http://localhost:3101` |
| Online play for real | Create a Firebase project, deploy `firestore.rules` + indexes, put the web config in `.env.local`: step by step in [`docs/ONLINE.md`](docs/ONLINE.md#setup-from-zero-a-real-firebase-project) |
| The AI designer | Generate a token in the game (ACCOUNT → AI Designer (MCP)) and connect Claude: [`docs/MCP.md`](docs/MCP.md) |
| ChatGPT | Add City Siege as a ChatGPT connector and approve it on the game's CONNECT screen (OAuth, no token): [`docs/CHATGPT.md`](docs/CHATGPT.md) |

### Battles in one paragraph

Challenge a rival from **🏆 BATTLES**, either **Instant** (after a 0/2/5/10-minute design window; both pressing READY starts it early) or **Scheduled** (a time 10 minutes to 7 days ahead, e.g. tonight 21:00, optionally with the night theme). Until the start time both players design their cities, by hand or with the AI. At the start both cities **lock**, and each player gets **one raid** (10-minute clock) on the other's locked copy, played in a separate arena so your own city is never touched. More stars wins, then higher destruction %, then the faster raid. Winner +30 trophies, loser −20 (floored at 0), draw +5 each; a battle nobody raided is void (no trophies, no record change). The raid pays the usual minted loot and gems; nobody's bank is debited. Full rules: [`docs/BATTLES.md`](docs/BATTLES.md).

### The AI designer (MCP)

A personal, revocable token lets Claude Code, Claude Desktop or any MCP client **design** your city: place buildings from your inventory, move or stow them, clear trees, draw and erase roads. It cannot attack, buy, upgrade, collect or touch the bank. Every edit is validated by the same rules as the game's Design screen, saved as one Firestore transaction, shown live in your open game, and can be undone until the game saves a change of its own. The server lives in `mcp-server/` (stdio for local use, Streamable HTTP for hosting; Dockerfile included).

### Online docs & tests

* **Setup, architecture, data model, sync, security**: [`docs/ONLINE.md`](docs/ONLINE.md)
* **Battle rules for players**: [`docs/BATTLES.md`](docs/BATTLES.md)
* **AI designer, tools reference, hosting**: [`docs/MCP.md`](docs/MCP.md) and [`mcp-server/README.md`](mcp-server/README.md)
* **Engineering contract and deviations log**: [`docs/ONLINE_SPEC.md`](docs/ONLINE_SPEC.md)
* **Tests**: `npm run test:shared` and `npm run test:sync` (no emulator), `npm run test:rules` and `npm run test:mcp` (Firestore emulator running), or `npm run test:online` (starts its own emulators). In Chrome (`PW_CORE` = a playwright-core install, `GAME_URL` = the game): `npm run test:parity` (offline build), `npm run test:e2e` (emulators + an emulator-mode build, `FIREBASE_PROJECT_ID` = its project); `npm run fixtures` regenerates the test cities. The table with every command is in [`docs/ONLINE.md`](docs/ONLINE.md#testing). The existing `node tools/verify-progression.mjs`, `node tools/verify-meshes.mjs` and `tools/e2e/smoke.mjs` (offline build) still apply.
