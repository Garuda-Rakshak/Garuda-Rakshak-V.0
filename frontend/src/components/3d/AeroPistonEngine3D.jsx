import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * High-Precision 3D Aero-Piston Engine Model
 * High-altitude dual-opposed turbocharged engine with realistic brushed metallic materials.
 */
export function AeroPistonEngine3D({ viewportMode, telemetry, isFocused }) {
  const engineGroupRef = useRef();
  const crankShaftRef = useRef();

  const cht1 = telemetry?.cht1 || 168;
  const cht2 = telemetry?.cht2 || 171;
  const egt1 = telemetry?.egt1 || 680;
  const egt2 = telemetry?.egt2 || 685;
  const vib = telemetry?.vibrationMean || 0.3;

  const isWireframe = viewportMode === 'xray';
  const isThermal = viewportMode === 'thermal-gradient';

  const getChtColor = (c) => (c > 195 ? '#EF4444' : c > 175 ? '#F97316' : '#E2E8F0');
  const getEgtColor = (e) => (e > 740 ? '#EF4444' : e > 680 ? '#F97316' : '#B45309');

  useFrame((state, delta) => {
    if (engineGroupRef.current && vib > 0.45) {
      const freq = state.clock.elapsedTime * 40;
      engineGroupRef.current.position.x = Math.sin(freq) * (vib * 0.012);
      engineGroupRef.current.position.y = Math.cos(freq * 1.2) * (vib * 0.012);
    } else if (engineGroupRef.current) {
      engineGroupRef.current.position.x = 0;
      engineGroupRef.current.position.y = 0;
    }

    if (crankShaftRef.current && telemetry?.rpm) {
      crankShaftRef.current.rotation.z += (telemetry.rpm / 60) * Math.PI * 2 * delta * 0.08;
    }
  });

  return (
    <group ref={engineGroupRef} position={[0, 0, 0]}>
      {/* ── 1. Main Crankcase (Brushed Titanium / Cast Alloy) ── */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 1.4, 1.5]} />
        <meshStandardMaterial
          color={isThermal ? '#1E293B' : '#64748B'}
          metalness={0.85}
          roughness={0.25}
          wireframe={isWireframe}
        />
      </mesh>

      {/* Front Crank Flange */}
      <mesh position={[0, 0.78, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.46, 0.28, 32]} />
        <meshStandardMaterial color="#475569" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Output Shaft */}
      <mesh ref={crankShaftRef} position={[0, 1.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.4, 24]} />
        <meshStandardMaterial color="#E2E8F0" metalness={0.95} roughness={0.1} />
      </mesh>

      {/* ── 2. Cylinder 1 (Left Opposed Block) ───────────────── */}
      <group position={[-1.05, 0.12, 0]}>
        {/* Cylinder Barrel */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 1.0, 32]} />
          <meshStandardMaterial
            color={isThermal ? getChtColor(cht1) : '#94A3B8'}
            emissive={isThermal ? getChtColor(cht1) : '#000000'}
            emissiveIntensity={isThermal ? 0.35 : 0}
            metalness={0.8}
            roughness={0.3}
            wireframe={isWireframe}
          />
        </mesh>

        {/* 9 Precision Cooling Fins */}
        {[-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4].map((offset, i) => (
          <mesh key={`c1-fin-${i}`} position={[offset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.02, 32]} />
            <meshStandardMaterial
              color={isThermal ? getChtColor(cht1) : '#CBD5E1'}
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
        ))}

        {/* Billet Cylinder Head Cap */}
        <mesh position={[-0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.14, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 3. Cylinder 2 (Right Opposed Block) ──────────────── */}
      <group position={[1.05, -0.12, 0]}>
        {/* Cylinder Barrel */}
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.36, 0.36, 1.0, 32]} />
          <meshStandardMaterial
            color={isThermal ? getChtColor(cht2) : '#94A3B8'}
            emissive={isThermal ? getChtColor(cht2) : '#000000'}
            emissiveIntensity={isThermal ? 0.35 : 0}
            metalness={0.8}
            roughness={0.3}
            wireframe={isWireframe}
          />
        </mesh>

        {/* 9 Precision Cooling Fins */}
        {[-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4].map((offset, i) => (
          <mesh key={`c2-fin-${i}`} position={[offset, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.48, 0.48, 0.02, 32]} />
            <meshStandardMaterial
              color={isThermal ? getChtColor(cht2) : '#CBD5E1'}
              metalness={0.85}
              roughness={0.2}
            />
          </mesh>
        ))}

        {/* Billet Cylinder Head Cap */}
        <mesh position={[0.56, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.14, 24]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 4. Polished Stainless Exhaust Headers & Turbo ────── */}
      <group position={[0, -0.5, -0.7]}>
        {/* Left Exhaust Pipe */}
        <mesh position={[-0.65, 0.15, 0.15]} rotation={[0.4, 0, 0.5]}>
          <cylinderGeometry args={[0.09, 0.09, 0.95, 24]} />
          <meshStandardMaterial
            color={isThermal ? getEgtColor(egt1) : '#C2410C'}
            emissive={isThermal ? getEgtColor(egt1) : '#7C2D12'}
            emissiveIntensity={0.4}
            metalness={0.9}
          />
        </mesh>

        {/* Right Exhaust Pipe */}
        <mesh position={[0.65, -0.15, 0.15]} rotation={[0.4, 0, -0.5]}>
          <cylinderGeometry args={[0.09, 0.09, 0.95, 24]} />
          <meshStandardMaterial
            color={isThermal ? getEgtColor(egt2) : '#C2410C'}
            emissive={isThermal ? getEgtColor(egt2) : '#7C2D12'}
            emissiveIntensity={0.4}
            metalness={0.9}
          />
        </mesh>

        {/* Turbocharger Turbine Housing */}
        <mesh position={[0, -0.28, -0.25]}>
          <torusGeometry args={[0.26, 0.12, 24, 32]} />
          <meshStandardMaterial color="#B45309" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* ── 5. Lubrication Sump Pan (Bottom) ─────────────────── */}
      <mesh position={[0, 0, -0.92]}>
        <boxGeometry args={[0.95, 1.15, 0.38]} />
        <meshStandardMaterial color="#1E293B" metalness={0.85} roughness={0.3} />
      </mesh>
    </group>
  );
}
