import { Component, type ErrorInfo, type ReactNode, useMemo } from "react";
import * as THREE from "three";
import type { KeyRegistry } from "../interaction/key-registry";
import type { AssemblyPlan } from "../model/keyboard-types";
import { useKeyboardAssets } from "../model/use-keyboard-assets";
import { KeycapMesh } from "./KeycapMesh";
import { SwitchInstances } from "./SwitchInstances";

type KeyboardModelProps = Readonly<{
  plan: AssemblyPlan;
  registry: KeyRegistry;
}>;

type ErrorBoundaryProps = Readonly<{ children: ReactNode }>;

class KeyboardModelErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: true } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Failed to load the Keychron K2 HE model.", error, info);
  }

  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

function keycapMesh(scene: THREE.Group, name: string): THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]> {
  const node = scene.getObjectByName(name);
  if (!(node instanceof THREE.Mesh)) throw new Error(`Missing keycap mesh: ${name}`);
  return node;
}

function KeyboardModelContent({ plan, registry }: KeyboardModelProps) {
  const assets = useKeyboardAssets();
  const keyboard = useMemo(() => assets.keyboardScene.clone(true), [assets.keyboardScene]);
  const keycapSources = useMemo(() => new Map(
    [...plan.keycapModels].map((name) => [name, keycapMesh(assets.keycapScene, name)]),
  ), [assets.keycapScene, plan.keycapModels]);

  return (
    <group>
      <primitive object={keyboard} position={assets.definition.keyboardOffset} />
      {plan.keys.map((keycap) => (
        <KeycapMesh
          key={keycap.modelKey}
          atlasTransform={assets.definition.keycapUVOffsetScale}
          bumpMap={assets.bumpMap}
          keyboardOffset={assets.definition.keyboardOffset}
          keycap={keycap}
          legendAtlas={assets.legendAtlas}
          registry={registry}
          source={keycapSources.get(keycap.capModel)!}
        />
      ))}
      <SwitchInstances
        keyboardOffset={assets.definition.keyboardOffset}
        orientation={assets.definition.switchOrientation}
        plan={plan}
        switchScene={assets.switchScene}
      />
    </group>
  );
}

export function KeyboardModel(props: KeyboardModelProps) {
  return (
    <KeyboardModelErrorBoundary>
      <KeyboardModelContent {...props} />
    </KeyboardModelErrorBoundary>
  );
}
