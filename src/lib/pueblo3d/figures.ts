// Original low-poly people, built from boxes and spheres. Used for walking
// pedestrians, the visitor's avatar and other members.
import * as THREE from "three";
import type { AvatarLook } from "./decor";

type Track = <T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(x: T) => T;

export type Figure = {
  group: THREE.Group;
  /** phase in radians, amount 0 (standing) to 1 (full stride). */
  setWalk: (phase: number, amount: number) => void;
};

export function createFigureKit(track: Track) {
  const g = {
    leg: track(new THREE.BoxGeometry(0.45, 1.2, 0.5)),
    torso: track(new THREE.BoxGeometry(1.1, 1.3, 0.6)),
    arm: track(new THREE.BoxGeometry(0.34, 1.05, 0.4)),
    head: track(new THREE.SphereGeometry(0.5, 12, 10)),
    hairCap: track(new THREE.SphereGeometry(0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    hairLong: track(new THREE.BoxGeometry(0.95, 1, 0.25)),
    bun: track(new THREE.SphereGeometry(0.22, 8, 6)),
    brim: track(new THREE.BoxGeometry(0.7, 0.08, 0.45)),
    eye: track(new THREE.BoxGeometry(0.1, 0.12, 0.05)),
  };
  const mats = new Map<number, THREE.MeshStandardMaterial>();
  const mat = (color: number) => {
    let m = mats.get(color);
    if (!m) {
      m = track(new THREE.MeshStandardMaterial({ color }));
      mats.set(color, m);
    }
    return m;
  };
  const eyeMat = track(new THREE.MeshBasicMaterial({ color: 0x1b1b1b }));

  function mesh(geo: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, shadow = false) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.castShadow = shadow;
    return m;
  }

  function build(look: AvatarLook): Figure {
    const group = new THREE.Group();
    // Legs and arms hang from a pivot at the hip / shoulder so they can swing.
    const mkLimb = (geo: THREE.BufferGeometry, color: number, x: number, pivotY: number, len: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, pivotY, 0);
      pivot.add(mesh(geo, mat(color), 0, -len / 2, 0));
      group.add(pivot);
      return pivot;
    };
    const legL = mkLimb(g.leg, look.pants, -0.28, 1.2, 1.2);
    const legR = mkLimb(g.leg, look.pants, 0.28, 1.2, 1.2);
    const armL = mkLimb(g.arm, look.shirt, -0.72, 2.45, 1.05);
    const armR = mkLimb(g.arm, look.shirt, 0.72, 2.45, 1.05);
    group.add(mesh(g.torso, mat(look.shirt), 0, 1.85, 0, true));
    group.add(mesh(g.head, mat(look.skin), 0, 3.0, 0, true));
    group.add(mesh(g.eye, eyeMat, -0.17, 3.05, 0.47), mesh(g.eye, eyeMat, 0.17, 3.05, 0.47));

    if (look.hairStyle === "cap") {
      group.add(mesh(g.hairCap, mat(look.shirt), 0, 3.02, 0));
      group.add(mesh(g.brim, mat(look.shirt), 0, 3.28, 0.5));
    } else {
      group.add(mesh(g.hairCap, mat(look.hair), 0, 3.02, 0));
      if (look.hairStyle === "long") group.add(mesh(g.hairLong, mat(look.hair), 0, 2.7, -0.3));
      if (look.hairStyle === "bun") group.add(mesh(g.bun, mat(look.hair), 0, 3.62, -0.1));
    }

    return {
      group,
      setWalk(phase, amount) {
        const s = Math.sin(phase) * 0.7 * amount;
        legL.rotation.x = s;
        legR.rotation.x = -s;
        armL.rotation.x = -s * 0.8;
        armR.rotation.x = s * 0.8;
      },
    };
  }

  return { build };
}
