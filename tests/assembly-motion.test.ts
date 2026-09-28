import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { assemblyPosition, switchFlightOffset, focusSwitchTransform } from "../src/features/keyboard/model/assembly-motion";

describe("keyboard experience transforms", () => {
  it("reads exact closed and exploded layer coordinates from the supplied JSON", () => {
    expect(assemblyPosition("plate", 0).toArray()).toEqual([0, 2.42, 0]);
    expect(assemblyPosition("plate", 1).toArray()).toEqual([0, 21.3, 0]);
    expect(assemblyPosition("topCaseK", 1).toArray()).toEqual([0, 22.5, 0]);
    expect(assemblyPosition("topCaseK_L", 1).toArray()).toEqual([-3, 0, 0]);
  });

  it("staggers switch flight but leaves the center J switch mounted for extraction", () => {
    expect(switchFlightOffset("KeyJ", 0.5, 1)).toBe(0);
    expect(switchFlightOffset("KeyA", 0, 0)).toBe(0);
    expect(switchFlightOffset("KeyA", 0, 0.2)).toBeGreaterThan(switchFlightOffset("KeyB", 1, 0.2));
    expect(switchFlightOffset("KeyA", 0, 1)).toBe(50);
    expect(switchFlightOffset("KeyB", 1, 1)).toBe(60);
  });

  it("moves the detached switch to a world-space target and removes the keyboard tilt", () => {
    const group = new THREE.Group();
    const start = new THREE.Vector3(0.472, 2.13, 1.19);
    focusSwitchTransform(group, start, 0);
    expect(group.position.toArray()).toEqual(start.toArray());
    expect(group.rotation.x).toBeCloseTo(5.4 * Math.PI / 180);
    focusSwitchTransform(group, start, 1);
    expect(group.position.toArray()).toEqual([0, 12.5, 0]);
    expect(group.rotation.x).toBe(0);
  });
});
