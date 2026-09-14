"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  Mesh,
  ShaderMaterial,
  type Group,
  type MeshStandardMaterial,
} from "three";

import {
  MODELS,
  useNormalizedModel,
} from "@/features/game/components/scene/decor/GltfProp";
import { MUSEUM } from "@/features/game/components/scene/materials";
import { HOLOGRAM_DAIS } from "@/features/game/data/world";

const VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * worldPosition;
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);
    vHeight = worldPosition.y;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vHeight;
  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.4);
    float scan = 0.86 + 0.14 * sin(vHeight * 140.0 - uTime * 9.0);
    float band = 0.9 + 0.1 * sin(vHeight * 5.0 + uTime * 1.3);
    float flicker = 0.95 + 0.05 * sin(uTime * 31.0) * sin(uTime * 7.3);
    vec3 color = uColor * (0.18 + fresnel * 0.95) * scan * band * flicker;
    float alpha = (0.16 + fresnel * 0.6) * scan * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Paramètres d'un matériau d'hologramme, à uniforms neufs. */
function hologramShaderArgs() {
  return {
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(MUSEUM.hologram) },
      uOpacity: { value: 0 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  };
}

/**
 * Hologramme d'Einstein : estrade, anneau lumineux, cône de projection et le
 * buste rendu par un matériau à franges de Fresnel et lignes de balayage.
 * `active` allume la projection ; le buste reste invisible avant.
 *
 * Les matériaux sont tenus par des refs et mutés dans les effets et la boucle
 * de rendu uniquement : rien de mémoïsé n'est modifié après le rendu.
 */
export function Hologram({ active }: { active: boolean }) {
  const [x, z] = HOLOGRAM_DAIS.center;
  const bust = useNormalizedModel(MODELS.bustEinstein, 1.7);
  const rig = useRef<Group>(null);
  const ring = useRef<MeshStandardMaterial>(null);
  const bustMaterial = useRef<ShaderMaterial | null>(null);
  const coneMaterial = useRef<ShaderMaterial>(null);
  const coneArgs = useMemo(() => hologramShaderArgs(), []);

  // Le buste chargé reçoit un matériau d'hologramme partagé par ses meshes.
  useEffect(() => {
    const material = new ShaderMaterial(hologramShaderArgs());
    bustMaterial.current = material;
    bust.traverse((child) => {
      if (child instanceof Mesh) {
        child.material = material;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return () => {
      bustMaterial.current = null;
      material.dispose();
    };
  }, [bust]);

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const smoothing = 1 - Math.exp(-2 * delta);

    const material = bustMaterial.current;
    if (material) {
      material.uniforms.uTime.value = time;
      material.uniforms.uOpacity.value = MathUtils.lerp(
        material.uniforms.uOpacity.value,
        active ? 1 : 0,
        smoothing,
      );
    }
    const cone = coneMaterial.current;
    if (cone) {
      cone.uniforms.uTime.value = time;
      cone.uniforms.uOpacity.value = MathUtils.lerp(
        cone.uniforms.uOpacity.value,
        active ? 0.1 : 0,
        smoothing,
      );
    }
    if (rig.current) {
      rig.current.rotation.y = time * 0.25;
      rig.current.position.y = 0.55 + Math.sin(time * 0.9) * 0.05;
    }
    if (ring.current) {
      const breath = 0.5 + 0.5 * Math.sin(time * (active ? 3 : 1.2));
      ring.current.emissiveIntensity =
        (active ? 2.4 : 0.6) + breath * (active ? 1.6 : 0.5);
    }
  });

  return (
    <group position={[x, 0, z]}>
      {/* Estrade et marches */}
      <mesh
        position={[0, HOLOGRAM_DAIS.height / 2, 0]}
        receiveShadow
        castShadow
      >
        <cylinderGeometry
          args={[
            HOLOGRAM_DAIS.radius,
            HOLOGRAM_DAIS.radius + 0.15,
            HOLOGRAM_DAIS.height,
            48,
          ]}
        />
        <meshStandardMaterial
          color="#26201b"
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      <mesh
        position={[0, HOLOGRAM_DAIS.height + 0.005, 0]}
        rotation-x={-Math.PI / 2}
      >
        <ringGeometry
          args={[HOLOGRAM_DAIS.radius - 0.35, HOLOGRAM_DAIS.radius - 0.28, 64]}
        />
        <meshStandardMaterial
          color={MUSEUM.metal}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
      <mesh
        position={[0, HOLOGRAM_DAIS.height + 0.006, 0]}
        rotation-x={-Math.PI / 2}
      >
        <ringGeometry args={[0.7, 0.8, 64]} />
        <meshStandardMaterial
          ref={ring}
          color={MUSEUM.hologram}
          emissive={MUSEUM.hologram}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Projecteur central */}
      <mesh position={[0, HOLOGRAM_DAIS.height + 0.08, 0]}>
        <cylinderGeometry args={[0.32, 0.4, 0.16, 32]} />
        <meshStandardMaterial color="#1a1613" roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0, HOLOGRAM_DAIS.height + 0.17, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.02, 32]} />
        <meshStandardMaterial
          color={MUSEUM.hologram}
          emissive={MUSEUM.hologram}
          emissiveIntensity={active ? 3 : 0.4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, HOLOGRAM_DAIS.height + 1.2, 0]}>
        <coneGeometry args={[0.9, 2.2, 32, 1, true]} />
        <shaderMaterial ref={coneMaterial} args={[coneArgs]} />
      </mesh>

      {/* Buste projeté */}
      <group ref={rig} position={[0, 0.55, 0]}>
        <primitive object={bust} />
      </group>
    </group>
  );
}
