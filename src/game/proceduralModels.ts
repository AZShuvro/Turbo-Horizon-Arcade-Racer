import * as THREE from 'three';
import { DecalType } from '../types/game';

// Shared material cache to save memory and optimize draw calls on low-end laptops
const materialsCache = new Map<string, THREE.Material>();

function getOrCreateMaterial(
  key: string,
  createFn: () => THREE.Material
): THREE.Material {
  if (!materialsCache.has(key)) {
    materialsCache.set(key, createFn());
  }
  return materialsCache.get(key)!;
}

// Low-poly materials helper
export function createCarMaterial(colorHex: string, metalness = 0.6, roughness = 0.25): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorHex),
    metalness,
    roughness,
    flatShading: true,
  });
}

function applyCarDecals(
  root: THREE.Group,
  carId: string,
  decalType: DecalType,
  stripeColorHex: string
) {
  if (!decalType || decalType === 'none') return;

  const stripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(stripeColorHex),
    metalness: 0.35,
    roughness: 0.25,
    flatShading: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
  });

  if (decalType === 'dual_stripes') {
    // Twin classic GT racing stripes along hood and roof
    const hL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 1.45), stripeMat);
    hL.position.set(-0.25, 0.62, 1.0);
    const hR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 1.45), stripeMat);
    hR.position.set(0.25, 0.62, 1.0);

    const rL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 1.55), stripeMat);
    rL.position.set(-0.25, carId === 'viper' ? 1.13 : 1.02, -0.2);
    const rR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 1.55), stripeMat);
    rR.position.set(0.25, carId === 'viper' ? 1.13 : 1.02, -0.2);

    root.add(hL, hR, rL, rR);
  } else if (decalType === 'center_stripe') {
    // Single wide aerodynamic center band
    const hoodStripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 1.45), stripeMat);
    hoodStripe.position.set(0, 0.62, 1.0);

    const roofStripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.02, 1.55), stripeMat);
    roofStripe.position.set(0, carId === 'viper' ? 1.13 : 1.02, -0.2);

    root.add(hoodStripe, roofStripe);
  } else if (decalType === 'side_arrows') {
    // Lateral door speed chevrons
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 1.9), stripeMat);
    sideL.position.set(-0.86, 0.46, 0.0);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 1.9), stripeMat);
    sideR.position.set(0.86, 0.46, 0.0);

    const chevL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.35), stripeMat);
    chevL.position.set(-0.86, 0.46, 1.1);
    chevL.rotation.z = -0.3;
    const chevR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.35), stripeMat);
    chevR.position.set(0.86, 0.46, 1.1);
    chevR.rotation.z = 0.3;

    root.add(sideL, sideR, chevL, chevR);
  }
}

// Tire material
const tireMat = new THREE.MeshStandardMaterial({
  color: 0x18181b,
  roughness: 0.85,
  metalness: 0.1,
  flatShading: true,
});

// Rim material
const rimMat = new THREE.MeshStandardMaterial({
  color: 0xe4e4e7,
  roughness: 0.3,
  metalness: 0.8,
  flatShading: true,
});

// Glass material
const glassMat = new THREE.MeshStandardMaterial({
  color: 0x09090b,
  roughness: 0.1,
  metalness: 0.9,
  flatShading: true,
});

// Headlight emissive
const headlightMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  emissive: 0xfffaed,
  emissiveIntensity: 1.5,
  roughness: 0.2,
});

// Taillight emissive
const taillightMat = new THREE.MeshStandardMaterial({
  color: 0xff1e1e,
  emissive: 0xef4444,
  emissiveIntensity: 1.6,
  roughness: 0.2,
});

// Chrome exhaust
const chromeMat = new THREE.MeshStandardMaterial({
  color: 0xd4d4d8,
  metalness: 0.95,
  roughness: 0.1,
});

// Wheel assembly helper: creates wheel + rim as a composite child
function createWheel(radius = 0.36, width = 0.26): THREE.Group {
  const wheelGroup = new THREE.Group();
  
  // Tire cylinder
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 12);
  tireGeo.rotateZ(Math.PI / 2);
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.castShadow = true;
  wheelGroup.add(tire);

  // Wheel rim hub
  const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width + 0.02, 8);
  rimGeo.rotateZ(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, rimMat);
  wheelGroup.add(rim);

  return wheelGroup;
}

/**
 * Creates 3–12 part procedural player car models
 */
export function createPlayerCar(
  carId: string,
  primaryColorHex: string,
  accentColorHex: string,
  decalType: DecalType = 'none',
  stripeColorHex: string = '#ffffff'
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'player-car';

  const bodyMat = createCarMaterial(primaryColorHex, 0.7, 0.2);
  const accentMat = createCarMaterial(accentColorHex, 0.5, 0.3);

  // Wheels container for rotation animation
  const wheels: THREE.Group[] = [];

  if (carId === 'viper') {
    // Muscle car: Wide, aggressive, dual hood scoops, drag wing
    // 1. Lower chassis
    const chassisGeo = new THREE.BoxGeometry(1.8, 0.42, 4.2);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.45;
    chassis.castShadow = true;
    root.add(chassis);

    // 2. Cabin
    const cabinGeo = new THREE.BoxGeometry(1.5, 0.48, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.85, -0.2);
    cabin.castShadow = true;
    root.add(cabin);

    // 3. Cabin roof strip
    const roofGeo = new THREE.BoxGeometry(1.4, 0.08, 1.8);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 1.11, -0.2);
    root.add(roof);

    // 4. Hood intake scoop
    const scoopGeo = new THREE.BoxGeometry(0.7, 0.14, 1.1);
    const scoop = new THREE.Mesh(scoopGeo, accentMat);
    scoop.position.set(0, 0.7, 1.0);
    root.add(scoop);

    // 5. Rear spoiler
    const wingGeo = new THREE.BoxGeometry(1.8, 0.06, 0.45);
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, 1.0, -1.9);
    const postGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    const postL = new THREE.Mesh(postGeo, accentMat);
    postL.position.set(-0.6, 0.8, -1.9);
    const postR = new THREE.Mesh(postGeo, accentMat);
    postR.position.set(0.6, 0.8, -1.9);
    root.add(wing, postL, postR);

    // 6. Front splitter bumper
    const bumperGeo = new THREE.BoxGeometry(1.9, 0.12, 0.4);
    const bumper = new THREE.Mesh(bumperGeo, accentMat);
    bumper.position.set(0, 0.28, 2.1);
    root.add(bumper);

    // 7. Headlights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.1);
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.65, 0.48, 2.11);
    const hlR = new THREE.Mesh(hlGeo, headlightMat);
    hlR.position.set(0.65, 0.48, 2.11);
    root.add(hlL, hlR);

    // 8. Taillights
    const tlGeo = new THREE.BoxGeometry(0.4, 0.1, 0.1);
    const tlL = new THREE.Mesh(tlGeo, taillightMat);
    tlL.position.set(-0.65, 0.48, -2.11);
    const tlR = new THREE.Mesh(tlGeo, taillightMat);
    tlR.position.set(0.65, 0.48, -2.11);
    root.add(tlL, tlR);

    // 9. Dual exhaust
    const exhGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 8);
    exhGeo.rotateX(Math.PI / 2);
    const exhL = new THREE.Mesh(exhGeo, chromeMat);
    exhL.position.set(-0.5, 0.3, -2.15);
    const exhR = new THREE.Mesh(exhGeo, chromeMat);
    exhR.position.set(0.5, 0.3, -2.15);
    root.add(exhL, exhR);

    // Wheels (4)
    const wFL = createWheel(0.38, 0.28);
    wFL.position.set(-0.95, 0.38, 1.25);
    const wFR = createWheel(0.38, 0.28);
    wFR.position.set(0.95, 0.38, 1.25);
    const wRL = createWheel(0.42, 0.32);
    wRL.position.set(-0.96, 0.42, -1.25);
    const wRR = createWheel(0.42, 0.32);
    wRR.position.set(0.96, 0.42, -1.25);

    root.add(wFL, wFR, wRL, wRR);
    wheels.push(wFL, wFR, wRL, wRR);

  } else if (carId === 'cyber') {
    // Cyber Brawler: Angular cyberpunk pickup/tank
    const wedgeGeo = new THREE.BoxGeometry(1.9, 0.5, 4.3);
    const body = new THREE.Mesh(wedgeGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    root.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.6, 0.6, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, 0.1);
    root.add(cabin);

    // Angular roof bar
    const barGeo = new THREE.BoxGeometry(1.65, 0.1, 0.15);
    const lightBar = new THREE.Mesh(barGeo, headlightMat);
    lightBar.position.set(0, 1.38, 0.4);
    root.add(lightBar);

    // Cyber LED light strip across front
    const stripGeo = new THREE.BoxGeometry(1.85, 0.08, 0.1);
    const frontStrip = new THREE.Mesh(stripGeo, headlightMat);
    frontStrip.position.set(0, 0.62, 2.16);
    const rearStrip = new THREE.Mesh(stripGeo, taillightMat);
    rearStrip.position.set(0, 0.62, -2.16);
    root.add(frontStrip, rearStrip);

    // Oversized off-road wheels
    const wFL = createWheel(0.45, 0.32);
    wFL.position.set(-1.05, 0.45, 1.3);
    const wFR = createWheel(0.45, 0.32);
    wFR.position.set(1.05, 0.45, 1.3);
    const wRL = createWheel(0.45, 0.32);
    wRL.position.set(-1.05, 0.45, -1.3);
    const wRR = createWheel(0.45, 0.32);
    wRR.position.set(1.05, 0.45, -1.3);

    root.add(wFL, wFR, wRL, wRR);
    wheels.push(wFL, wFR, wRL, wRR);

  } else if (carId === 'formula') {
    // Formula Sprint: Super lightweight aerodynamic racer
    const noseGeo = new THREE.BoxGeometry(0.8, 0.32, 4.4);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.y = 0.35;
    nose.castShadow = true;
    root.add(nose);

    // Cockpit & Helmet
    const cockpitGeo = new THREE.BoxGeometry(0.7, 0.35, 1.4);
    const cockpit = new THREE.Mesh(cockpitGeo, glassMat);
    cockpit.position.set(0, 0.55, -0.3);
    root.add(cockpit);

    const helmetGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const helmet = new THREE.Mesh(helmetGeo, accentMat);
    helmet.position.set(0, 0.72, -0.2);
    root.add(helmet);

    // Front Wing
    const fWingGeo = new THREE.BoxGeometry(2.1, 0.06, 0.5);
    const fWing = new THREE.Mesh(fWingGeo, accentMat);
    fWing.position.set(0, 0.22, 2.1);
    root.add(fWing);

    // High Rear Wing
    const rWingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.6);
    const rWing = new THREE.Mesh(rWingGeo, accentMat);
    rWing.position.set(0, 0.95, -2.0);
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), accentMat);
    pL.position.set(-0.5, 0.7, -2.0);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), accentMat);
    pR.position.set(0.5, 0.7, -2.0);
    root.add(rWing, pL, pR);

    // Exhaust
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8), chromeMat);
    exh.rotateX(Math.PI / 2);
    exh.position.set(0, 0.45, -2.15);
    root.add(exh);

    // Open wheels
    const wFL = createWheel(0.38, 0.3);
    wFL.position.set(-1.05, 0.38, 1.4);
    const wFR = createWheel(0.38, 0.3);
    wFR.position.set(1.05, 0.38, 1.4);
    const wRL = createWheel(0.44, 0.36);
    wRL.position.set(-1.1, 0.44, -1.3);
    const wRR = createWheel(0.44, 0.36);
    wRR.position.set(1.1, 0.44, -1.3);

    root.add(wFL, wFR, wRL, wRR);
    wheels.push(wFL, wFR, wRL, wRR);

  } else {
    // Default: Apex Cruiser (Sleek aerodynamic GT Coupe)
    // 1. Lower chassis
    const chassisGeo = new THREE.BoxGeometry(1.7, 0.4, 4.0);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = 0.42;
    chassis.castShadow = true;
    root.add(chassis);

    // 2. Tapered cabin
    const cabinGeo = new THREE.BoxGeometry(1.35, 0.42, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.78, -0.2);
    cabin.castShadow = true;
    root.add(cabin);

    // 3. Curved roof
    const roofGeo = new THREE.BoxGeometry(1.25, 0.06, 1.5);
    const roof = new THREE.Mesh(roofGeo, bodyMat);
    roof.position.set(0, 1.0, -0.2);
    root.add(roof);

    // 4. Aerodynamic hood curve
    const hoodGeo = new THREE.BoxGeometry(1.5, 0.1, 1.4);
    const hood = new THREE.Mesh(hoodGeo, bodyMat);
    hood.position.set(0, 0.55, 1.0);
    root.add(hood);

    // 5. Rear wing
    const wingGeo = new THREE.BoxGeometry(1.6, 0.05, 0.35);
    const wing = new THREE.Mesh(wingGeo, accentMat);
    wing.position.set(0, 0.85, -1.8);
    const pL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), accentMat);
    pL.position.set(-0.55, 0.72, -1.8);
    const pR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), accentMat);
    pR.position.set(0.55, 0.72, -1.8);
    root.add(wing, pL, pR);

    // 6. Headlights
    const hlGeo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.6, 0.45, 2.01);
    const hlR = new THREE.Mesh(hlGeo, headlightMat);
    hlR.position.set(0.6, 0.45, 2.01);
    root.add(hlL, hlR);

    // 7. Taillights
    const tlGeo = new THREE.BoxGeometry(0.35, 0.08, 0.1);
    const tlL = new THREE.Mesh(tlGeo, taillightMat);
    tlL.position.set(-0.58, 0.45, -2.01);
    const tlR = new THREE.Mesh(tlGeo, taillightMat);
    tlR.position.set(0.58, 0.45, -2.01);
    root.add(tlL, tlR);

    // 8. Dual chrome exhaust
    const exhGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
    exhGeo.rotateX(Math.PI / 2);
    const exhL = new THREE.Mesh(exhGeo, chromeMat);
    exhL.position.set(-0.4, 0.26, -2.05);
    const exhR = new THREE.Mesh(exhGeo, chromeMat);
    exhR.position.set(0.4, 0.26, -2.05);
    root.add(exhL, exhR);

    // Wheels
    const wFL = createWheel(0.36, 0.25);
    wFL.position.set(-0.88, 0.36, 1.2);
    const wFR = createWheel(0.36, 0.25);
    wFR.position.set(0.88, 0.36, 1.2);
    const wRL = createWheel(0.38, 0.28);
    wRL.position.set(-0.88, 0.38, -1.2);
    const wRR = createWheel(0.38, 0.28);
    wRR.position.set(0.88, 0.38, -1.2);

    root.add(wFL, wFR, wRL, wRR);
    wheels.push(wFL, wFR, wRL, wRR);
  }

  // Soft contact shadow plane beneath the car
  const shadowGeo = new THREE.PlaneGeometry(2.4, 4.6);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  // Apply custom racing decals & stripes
  applyCarDecals(root, carId, decalType, stripeColorHex);

  // --- INTERACTIVE VEHICLE CONTROLS & OPENABLES ---
  // 1. Interactive Doors (Hinged low-poly door panels)
  const doorMat = createCarMaterial(primaryColorHex, 0.7, 0.2);
  const doorL = new THREE.Group();
  doorL.position.set(-0.86, 0.5, 0.45); // Left front hinge pivot
  const doorPanelL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.1), doorMat);
  doorPanelL.position.set(0, 0, -0.55); // offset relative to hinge
  const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), chromeMat);
  handleL.position.set(-0.02, 0.05, -0.9);
  doorL.add(doorPanelL, handleL);
  root.add(doorL);

  const doorR = new THREE.Group();
  doorR.position.set(0.86, 0.5, 0.45); // Right front hinge pivot
  const doorPanelR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 1.1), doorMat);
  doorPanelR.position.set(0, 0, -0.55);
  const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.14), chromeMat);
  handleR.position.set(0.02, 0.05, -0.9);
  doorR.add(doorPanelR, handleR);
  root.add(doorR);

  // 2. Interactive Rear Trunk Lid (Hinged at top/front of trunk)
  const trunk = new THREE.Group();
  trunk.position.set(0, 0.68, -1.05); // Trunk hinge pivot
  const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.95), doorMat);
  trunkLid.position.set(0, 0, -0.48);
  trunk.add(trunkLid);
  root.add(trunk);

  // 3. Interactive Amber Turn / Hazard Indicators
  const indicatorMatOff = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.5,
  });
  const indFL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), indicatorMatOff.clone());
  indFL.position.set(-0.84, 0.46, 1.95);
  const indFR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), indicatorMatOff.clone());
  indFR.position.set(0.84, 0.46, 1.95);
  const indRL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), indicatorMatOff.clone());
  indRL.position.set(-0.84, 0.46, -1.95);
  const indRR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.08), indicatorMatOff.clone());
  indRR.position.set(0.84, 0.46, -1.95);
  root.add(indFL, indFR, indRL, indRR);

  // 4. Interactive Forward Headlights & Road Spotlights
  const spotL = new THREE.SpotLight(0xfff7ed, 4.5, 45, Math.PI / 6, 0.35, 1.2);
  spotL.position.set(-0.6, 0.5, 2.0);
  const targetL = new THREE.Object3D();
  targetL.position.set(-0.6, 0.1, 24);
  root.add(spotL, targetL);
  spotL.target = targetL;

  const spotR = new THREE.SpotLight(0xfff7ed, 4.5, 45, Math.PI / 6, 0.35, 1.2);
  spotR.position.set(0.6, 0.5, 2.0);
  const targetR = new THREE.Object3D();
  targetR.position.set(0.6, 0.1, 24);
  root.add(spotR, targetR);
  spotR.target = targetR;

  // Emissive front headlight lenses
  const hlLensMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfff7ed,
    emissiveIntensity: 2.2,
    roughness: 0.1,
  });
  const hlLensL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), hlLensMat);
  hlLensL.position.set(-0.6, 0.45, 2.04);
  const hlLensR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.06), hlLensMat);
  hlLensR.position.set(0.6, 0.45, 2.04);
  root.add(hlLensL, hlLensR);

  // Attach all references to userData for controller manipulation
  (root as any).userData = {
    wheels,
    carId,
    decalType,
    stripeColorHex,
    doorL,
    doorR,
    trunk,
    headlights: [hlLensL, hlLensR],
    spotLights: [spotL, spotR],
    indicators: {
      fl: indFL,
      fr: indFR,
      rl: indRL,
      rr: indRR,
    },
  };

  return root;
}

/**
 * Creates traffic vehicles (sedan, suv, sports, truck, cop)
 */
export function createTrafficVehicle(type: 'sedan' | 'suv' | 'sports' | 'semi' | 'cop', colorHex: string): THREE.Group {
  const root = new THREE.Group();
  root.name = `traffic-${type}`;

  const bodyMat = createCarMaterial(colorHex, 0.4, 0.4);

  if (type === 'semi') {
    // Big Cargo Rig Truck
    // Cab
    const cabGeo = new THREE.BoxGeometry(2.3, 2.2, 2.4);
    const cab = new THREE.Mesh(cabGeo, bodyMat);
    cab.position.set(0, 1.4, 2.2);
    cab.castShadow = true;
    root.add(cab);

    // Windshield
    const wsGeo = new THREE.BoxGeometry(2.0, 0.8, 0.1);
    const ws = new THREE.Mesh(wsGeo, glassMat);
    ws.position.set(0, 1.8, 3.42);
    root.add(ws);

    // Giant Trailer Box
    const trailerMat = getOrCreateMaterial('trailer-mat', () =>
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6, metalness: 0.2, flatShading: true })
    );
    const trailerGeo = new THREE.BoxGeometry(2.4, 2.6, 6.2);
    const trailer = new THREE.Mesh(trailerGeo, trailerMat);
    trailer.position.set(0, 1.6, -2.1);
    trailer.castShadow = true;
    root.add(trailer);

    // Big wheels
    for (let i = 0; i < 3; i++) {
      const zOffset = i === 0 ? 2.4 : -1.8 - (i - 1) * 1.5;
      const wL = createWheel(0.48, 0.32);
      wL.position.set(-1.25, 0.48, zOffset);
      const wR = createWheel(0.48, 0.32);
      wR.position.set(1.25, 0.48, zOffset);
      root.add(wL, wR);
    }

  } else if (type === 'cop') {
    // Police Cruiser (Black & White with flashing rooftop lightbar)
    const baseMat = getOrCreateMaterial('cop-black', () =>
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.5, flatShading: true })
    );
    const whiteMat = getOrCreateMaterial('cop-white', () =>
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.3, flatShading: true })
    );

    const lowerGeo = new THREE.BoxGeometry(1.8, 0.45, 4.2);
    const lower = new THREE.Mesh(lowerGeo, baseMat);
    lower.position.y = 0.45;
    lower.castShadow = true;
    root.add(lower);

    // White door panel
    const doorGeo = new THREE.BoxGeometry(1.82, 0.35, 1.8);
    const doors = new THREE.Mesh(doorGeo, whiteMat);
    doors.position.set(0, 0.45, 0);
    root.add(doors);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.4, 0.45, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.85, -0.1);
    root.add(cabin);

    // Roof lightbar (Red & Blue)
    const redLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 2.5 })
    );
    redLight.position.set(-0.35, 1.15, -0.1);
    const blueLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.12, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x0066ff, emissive: 0x0066ff, emissiveIntensity: 2.5 })
    );
    blueLight.position.set(0.35, 1.15, -0.1);
    root.add(redLight, blueLight);
    (root as any).userData = { redLight, blueLight, isCop: true };

    // Headlights & Taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), headlightMat);
    hlL.position.set(-0.65, 0.45, 2.11);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), headlightMat);
    hlR.position.set(0.65, 0.45, 2.11);
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), taillightMat);
    tlL.position.set(-0.65, 0.45, -2.11);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), taillightMat);
    tlR.position.set(0.65, 0.45, -2.11);
    root.add(hlL, hlR, tlL, tlR);

    // Wheels
    const wFL = createWheel(0.36, 0.25);
    wFL.position.set(-0.92, 0.36, 1.25);
    const wFR = createWheel(0.36, 0.25);
    wFR.position.set(0.92, 0.36, 1.25);
    const wRL = createWheel(0.36, 0.25);
    wRL.position.set(-0.92, 0.36, -1.25);
    const wRR = createWheel(0.36, 0.25);
    wRR.position.set(0.92, 0.36, -1.25);
    root.add(wFL, wFR, wRL, wRR);

  } else if (type === 'suv') {
    // Tall SUV
    const lowerGeo = new THREE.BoxGeometry(1.85, 0.6, 4.3);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.6;
    lower.castShadow = true;
    root.add(lower);

    const cabinGeo = new THREE.BoxGeometry(1.5, 0.65, 2.6);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.15, -0.3);
    root.add(cabin);

    // Roof rack
    const rackGeo = new THREE.BoxGeometry(1.3, 0.08, 2.0);
    const rack = new THREE.Mesh(rackGeo, chromeMat);
    rack.position.set(0, 1.52, -0.3);
    root.add(rack);

    // Wheels
    const wFL = createWheel(0.42, 0.28);
    wFL.position.set(-0.98, 0.42, 1.3);
    const wFR = createWheel(0.42, 0.28);
    wFR.position.set(0.98, 0.42, 1.3);
    const wRL = createWheel(0.42, 0.28);
    wRL.position.set(-0.98, 0.42, -1.3);
    const wRR = createWheel(0.42, 0.28);
    wRR.position.set(0.98, 0.42, -1.3);
    root.add(wFL, wFR, wRL, wRR);

  } else {
    // Standard Sedan / Sports
    const lowerGeo = new THREE.BoxGeometry(1.7, 0.42, 3.9);
    const lower = new THREE.Mesh(lowerGeo, bodyMat);
    lower.position.y = 0.42;
    lower.castShadow = true;
    root.add(lower);

    const cabinGeo = new THREE.BoxGeometry(1.35, 0.45, 1.9);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 0.8, -0.15);
    root.add(cabin);

    // Lights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), headlightMat);
    hlL.position.set(-0.6, 0.42, 1.96);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.1), headlightMat);
    hlR.position.set(0.6, 0.42, 1.96);
    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), taillightMat);
    tlL.position.set(-0.6, 0.42, -1.96);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.1), taillightMat);
    tlR.position.set(0.6, 0.42, -1.96);
    root.add(hlL, hlR, tlL, tlR);

    // Wheels
    const wFL = createWheel(0.36, 0.24);
    wFL.position.set(-0.88, 0.36, 1.2);
    const wFR = createWheel(0.36, 0.24);
    wFR.position.set(0.88, 0.36, 1.2);
    const wRL = createWheel(0.36, 0.24);
    wRL.position.set(-0.88, 0.36, -1.2);
    const wRR = createWheel(0.36, 0.24);
    wRR.position.set(0.88, 0.36, -1.2);
    root.add(wFL, wFR, wRL, wRR);
  }

  // Soft shadow
  const shadowGeo = new THREE.PlaneGeometry(2.2, 4.4);
  const shadowPlane = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  root.add(shadowPlane);

  return root;
}

/**
 * Creates low-poly roadside props (palm trees, cacti, arches, ramps, coins, nitro cells)
 */
export function createPalmTree(): THREE.Group {
  const tree = new THREE.Group();
  
  // Trunk: curved stacked cylinders
  const trunkMat = getOrCreateMaterial('trunk-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9, flatShading: true })
  );
  const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 4.5, 6);
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 2.25;
  trunk.rotation.z = 0.08;
  trunk.castShadow = true;
  tree.add(trunk);

  // Palm fronds (5 angled leaves)
  const leafMat = getOrCreateMaterial('leaf-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true })
  );
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const leafGeo = new THREE.ConeGeometry(0.8, 2.6, 4);
    leafGeo.rotateX(Math.PI / 2.6);
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.position.set(Math.sin(angle) * 0.4, 4.4, Math.cos(angle) * 0.4);
    leaf.rotation.y = angle;
    leaf.castShadow = true;
    tree.add(leaf);
  }

  return tree;
}

export function createGoldCoin(): THREE.Group {
  const root = new THREE.Group();
  const coinGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.16, 12);
  coinGeo.rotateZ(Math.PI / 2);
  const coinMat = getOrCreateMaterial('gold-coin-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0xca8a04,
      emissiveIntensity: 0.4,
      flatShading: true,
    })
  );
  const coin = new THREE.Mesh(coinGeo, coinMat);
  coin.castShadow = true;
  root.add(coin);

  // Inner star detail
  const starGeo = new THREE.BoxGeometry(0.55, 0.55, 0.2);
  const starMat = getOrCreateMaterial('coin-star-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.9, roughness: 0.1 })
  );
  const star = new THREE.Mesh(starGeo, starMat);
  star.rotation.z = Math.PI / 4;
  root.add(star);

  root.position.y = 1.0;
  return root;
}

export function createNitroCanister(): THREE.Group {
  const root = new THREE.Group();
  // Cyan glowing battery fuel cell
  const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.1, 10);
  const bodyMat = getOrCreateMaterial('nitro-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.2,
      flatShading: true,
    })
  );
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  root.add(body);

  // Caps
  const capMat = getOrCreateMaterial('nitro-cap-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8 })
  );
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8), capMat);
  topCap.position.y = 0.65;
  root.add(topCap);

  // Pulsing glow ring
  const ringGeo = new THREE.TorusGeometry(0.42, 0.05, 8, 16);
  const ringMat = getOrCreateMaterial('nitro-ring-mat', () =>
    new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
  );
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  root.add(ring);

  root.position.y = 1.1;
  return root;
}

export function createJumpRamp(): THREE.Group {
  const root = new THREE.Group();
  // Wedge ramp with neon chevron arrows
  const rampMat = getOrCreateMaterial('ramp-base-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3, flatShading: true })
  );
  const wedgeGeo = new THREE.BoxGeometry(3.6, 0.8, 3.2);
  wedgeGeo.rotateX(-0.25);
  const ramp = new THREE.Mesh(wedgeGeo, rampMat);
  ramp.position.set(0, 0.35, 0);
  ramp.castShadow = true;
  root.add(ramp);

  // Glowing neon yellow chevrons
  const arrowMat = getOrCreateMaterial('ramp-arrow-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xeab308,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    })
  );
  const arrow1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.4), arrowMat);
  arrow1.position.set(0, 0.45, -0.4);
  arrow1.rotation.x = -0.25;
  const arrow2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 0.4), arrowMat);
  arrow2.position.set(0, 0.65, 0.6);
  arrow2.rotation.x = -0.25;
  root.add(arrow1, arrow2);

  return root;
}

export function createCheckpointArchway(): THREE.Group {
  const root = new THREE.Group();

  const archMat = getOrCreateMaterial('arch-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.8, flatShading: true })
  );
  const neonMat = getOrCreateMaterial('arch-neon-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    })
  );

  // Left & Right pillars
  const pillarGeo = new THREE.BoxGeometry(0.8, 6.0, 0.8);
  const pL = new THREE.Mesh(pillarGeo, archMat);
  pL.position.set(-6.5, 3.0, 0);
  const pR = new THREE.Mesh(pillarGeo, archMat);
  pR.position.set(6.5, 3.0, 0);

  // Cross girder
  const girderGeo = new THREE.BoxGeometry(14.0, 1.2, 0.8);
  const girder = new THREE.Mesh(girderGeo, archMat);
  girder.position.set(0, 6.0, 0);

  // Glowing CHECKPOINT banner
  const bannerGeo = new THREE.BoxGeometry(11.0, 0.6, 0.1);
  const banner = new THREE.Mesh(bannerGeo, neonMat);
  banner.position.set(0, 6.0, 0.45);

  root.add(pL, pR, girder, banner);
  return root;
}

/**
 * Low-poly Cyber Arch Gate for Track 2 (Neon Megacity)
 * Simple geometric boxes with high-contrast glowing neon trim - lightning fast on low-end laptops.
 */
export function createCyberGate(): THREE.Group {
  const root = new THREE.Group();

  const darkMat = getOrCreateMaterial('cyber-pillar-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.3, metalness: 0.8, flatShading: true })
  );
  const cyanMat = getOrCreateMaterial('cyber-neon-cyan', () =>
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 2.2 })
  );
  const pinkMat = getOrCreateMaterial('cyber-neon-pink', () =>
    new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 2.2 })
  );

  // Angular pillars
  const colL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.0, 0.8), darkMat);
  colL.position.set(-7.5, 4.0, 0);
  const colR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 8.0, 0.8), darkMat);
  colR.position.set(7.5, 4.0, 0);

  // Overhead beam
  const beam = new THREE.Mesh(new THREE.BoxGeometry(16.0, 1.0, 0.8), darkMat);
  beam.position.set(0, 7.8, 0);

  // Neon trim bars
  const trimCyan = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.15, 0.9), cyanMat);
  trimCyan.position.set(0, 8.2, 0);
  const trimPink = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.15, 0.9), pinkMat);
  trimPink.position.set(0, 7.4, 0);

  root.add(colL, colR, beam, trimCyan, trimPink);
  return root;
}

/**
 * Low-poly Terracotta Rock Pillar for Track 3 (Canyon Ridge)
 * Simple geometric faceted cylinder/cone stacks with warm desert stone tones.
 */
export function createCanyonPillar(): THREE.Group {
  const root = new THREE.Group();

  const rockMat = getOrCreateMaterial('canyon-rock-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9, flatShading: true })
  );

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.4, 6.0, 5), rockMat);
  base.position.y = 3.0;
  base.castShadow = true;

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 5.0, 5), rockMat);
  top.position.y = 7.5;
  top.rotation.y = 0.6;
  top.castShadow = true;

  root.add(base, top);
  return root;
}

/**
 * Low-poly Saguaro Cactus for Track 3 (Canyon Ridge)
 */
export function createCactus(): THREE.Group {
  const root = new THREE.Group();

  const cactusMat = getOrCreateMaterial('cactus-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true })
  );

  // Main stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 3.8, 6), cactusMat);
  stem.position.y = 1.9;
  stem.castShadow = true;

  // Left arm
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 5), cactusMat);
  armL.position.set(-0.55, 2.4, 0);
  const connL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 5), cactusMat);
  connL.rotateZ(Math.PI / 2);
  connL.position.set(-0.35, 1.8, 0);

  // Right arm
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.2, 5), cactusMat);
  armR.position.set(0.55, 2.8, 0);
  const connR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.7, 5), cactusMat);
  connR.rotateZ(Math.PI / 2);
  connR.position.set(0.35, 2.2, 0);

  root.add(stem, armL, connL, armR, connR);
  return root;
}

/**
 * 3D Horseshoe Magnet Power-up (red arch with metallic chrome poles)
 */
export function createMagnetPickup(): THREE.Group {
  const root = new THREE.Group();

  const redMat = getOrCreateMaterial('magnet-red-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xdc2626,
      emissiveIntensity: 0.8,
      metalness: 0.6,
      roughness: 0.25,
      flatShading: true,
    })
  );

  const silverMat = getOrCreateMaterial('magnet-silver-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.9,
      roughness: 0.15,
      flatShading: true,
    })
  );

  // Curved horseshoe arch
  const archGeo = new THREE.TorusGeometry(0.55, 0.16, 8, 16, Math.PI);
  const arch = new THREE.Mesh(archGeo, redMat);
  arch.rotation.z = Math.PI;
  arch.position.y = 0.55;
  root.add(arch);

  // Left prong
  const prongL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), redMat);
  prongL.position.set(-0.55, 0.32, 0);
  const tipL = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.22, 0.33), silverMat);
  tipL.position.set(-0.55, 0.05, 0);

  // Right prong
  const prongR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.32), redMat);
  prongR.position.set(0.55, 0.32, 0);
  const tipR = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.22, 0.33), silverMat);
  tipR.position.set(0.55, 0.05, 0);

  // Floating magnetic aura ring
  const auraGeo = new THREE.TorusGeometry(0.85, 0.04, 6, 16);
  const auraMat = getOrCreateMaterial('magnet-aura-mat', () =>
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
  );
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.4;
  root.add(prongL, tipL, prongR, tipR, aura);

  root.position.y = 1.1;
  return root;
}

/**
 * 3D Shield Power-up (glowing energy crest orb)
 */
export function createShieldPickup(): THREE.Group {
  const root = new THREE.Group();

  const shieldMat = getOrCreateMaterial('shield-pickup-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x2563eb,
      emissiveIntensity: 1.6,
      metalness: 0.8,
      roughness: 0.2,
      flatShading: true,
    })
  );

  // Hexagonal shield crest
  const crestGeo = new THREE.CylinderGeometry(0.55, 0.45, 0.15, 6);
  crestGeo.rotateX(Math.PI / 2);
  const crest = new THREE.Mesh(crestGeo, shieldMat);
  root.add(crest);

  // Golden cross star in center
  const starGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
  const starMat = getOrCreateMaterial('shield-star-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xeab308, emissiveIntensity: 1.5 })
  );
  const star1 = new THREE.Mesh(starGeo, starMat);
  const star2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.2), starMat);
  root.add(star1, star2);

  // Orbital energy ring
  const orbRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.04, 6, 16),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  );
  orbRing.rotation.x = Math.PI / 4;
  root.add(orbRing);

  root.position.y = 1.1;
  return root;
}

/**
 * Translucent pulsing energy bubble sphere that fits over player car
 */
export function createShieldBubble(): THREE.Mesh {
  const bubbleGeo = new THREE.SphereGeometry(2.35, 16, 12);
  const bubbleMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    wireframe: true,
  });
  const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
  bubble.position.y = 0.6;
  return bubble;
}

/**
 * Low-poly Glossy Dark Oil Slick Puddle
 */
export function createOilSlick(): THREE.Group {
  const root = new THREE.Group();

  const oilMat = getOrCreateMaterial('oil-mat', () =>
    new THREE.MeshStandardMaterial({
      color: 0x09090b,
      metalness: 0.95,
      roughness: 0.05,
      flatShading: true,
    })
  );

  // Iridescent dark puddle
  const puddleGeo = new THREE.CylinderGeometry(1.6, 1.8, 0.04, 8);
  const puddle = new THREE.Mesh(puddleGeo, oilMat);
  puddle.position.y = 0.03;
  puddle.scale.set(1.2, 1, 1.6); // elongated puddle
  root.add(puddle);

  // Subtle rainbow sheen edge
  const sheenGeo = new THREE.RingGeometry(1.4, 1.75, 8);
  const sheenMat = getOrCreateMaterial('oil-sheen-mat', () =>
    new THREE.MeshBasicMaterial({
      color: 0x9333ea,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    })
  );
  const sheen = new THREE.Mesh(sheenGeo, sheenMat);
  sheen.rotation.x = -Math.PI / 2;
  sheen.position.y = 0.04;
  root.add(sheen);

  return root;
}

/**
 * 3D Road Construction Barricade with diagonal hazard stripes
 */
export function createRoadBarricade(): THREE.Group {
  const root = new THREE.Group();

  const barMat = getOrCreateMaterial('barricade-wood', () =>
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5, flatShading: true })
  );
  const stripeMat = getOrCreateMaterial('barricade-orange', () =>
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, flatShading: true })
  );
  const legMat = getOrCreateMaterial('barricade-legs', () =>
    new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.7, roughness: 0.4 })
  );

  // A-frame legs
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.6), legMat);
  legL.position.set(-1.4, 0.55, 0);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.6), legMat);
  legR.position.set(1.4, 0.55, 0);

  // Horizontal striped board
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.35, 0.08), barMat);
  board.position.set(0, 0.8, 0);
  board.castShadow = true;

  // Diagonal orange hazard stripes across board
  const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.09), stripeMat);
  s1.position.set(-0.9, 0.8, 0);
  const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.09), stripeMat);
  s2.position.set(0, 0.8, 0);
  const s3 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.09), stripeMat);
  s3.position.set(0.9, 0.8, 0);

  // Flashing amber construction beacon on top
  const lightGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
  const lightMat = getOrCreateMaterial('barricade-light-mat', () =>
    new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 2.0 })
  );
  const beacon = new THREE.Mesh(lightGeo, lightMat);
  beacon.position.set(0, 1.1, 0);

  root.add(legL, legR, board, s1, s2, s3, beacon);
  return root;
}

/**
 * 3D Orange Traffic Cone
 */
export function createTrafficCone(): THREE.Group {
  const root = new THREE.Group();

  const orangeMat = getOrCreateMaterial('cone-orange', () =>
    new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, flatShading: true })
  );
  const whiteMat = getOrCreateMaterial('cone-white', () =>
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, flatShading: true })
  );

  // Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.7), orangeMat);
  base.position.y = 0.03;

  // Cone cone
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.85, 8), orangeMat);
  cone.position.y = 0.45;
  cone.castShadow = true;

  // White reflective band
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.22, 8), whiteMat);
  band.position.y = 0.42;

  root.add(base, cone, band);
  return root;
}


