import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * High-Fidelity 3D Model of India's Premier MALE UAV:
 * DRDO TAPAS-BH-201 (Tactical Airborne Platform for Aerial Surveillance / Rustom-II)
 * 
 * Synchronized with live aero-piston continuous telemetry:
 * - Propeller speed dynamically driven by telemetry.rpm
 * - Airframe micro-vibration oscillation driven by telemetry.vibrationMean
 * - Thermal nacelle color maps driven by telemetry.cht & oilTemperatureC
 */
export function MALEUAVAirframe({ viewportMode, telemetry, isSelected }) {
  const mainGroupRef = useRef();
  const leftPropRef = useRef();
  const rightPropRef = useRef();
  const turretRef = useRef();
  const arrowRef = useRef();

  // Animate twin propellers, EO/IR turret scanning, and dynamic vibration shake
  useFrame((state, delta) => {
    const rpm = telemetry?.rpm || 5210;
    const vib = telemetry?.vibrationMean || 2.05;
    const propSpeed = (rpm / 60) * Math.PI * 2 * delta * 0.18;
    
    if (leftPropRef.current) leftPropRef.current.rotation.z += propSpeed;
    if (rightPropRef.current) rightPropRef.current.rotation.z -= propSpeed;

    if (turretRef.current) {
      turretRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.6;
    }
    if (arrowRef.current) {
      arrowRef.current.position.y = 2.6 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      arrowRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }

    // Dynamic mechanical vibration shake when vibration exceeds nominal
    if (mainGroupRef.current) {
      if (vib > 3.0) {
        const shakeIntensity = Math.min(0.04, (vib / 7.5) * 0.035);
        mainGroupRef.current.position.x = (Math.random() - 0.5) * shakeIntensity;
        mainGroupRef.current.position.y = (Math.random() - 0.5) * shakeIntensity * 0.8;
      } else {
        mainGroupRef.current.position.x = 0;
        mainGroupRef.current.position.y = 0;
      }
    }
  });

  const isWireframe = viewportMode === 'xray';
  const isThermal = viewportMode === 'thermal-gradient';
  const isOverheating = (telemetry?.cht || 220) > 240;

  // TAPAS-BH-201 Matte Arctic Military Gray finish
  const airframeColor = isThermal ? (isOverheating ? '#EF4444' : '#F43F5E') : '#E2E8F0';
  const radomeColor = isThermal ? '#FB923C' : '#CBD5E1';
  const nacelleColor = isThermal || isOverheating ? '#EF4444' : '#94A3B8';
  const tireColor = '#1E293B';
  const strutColor = '#64748B';

  return (
    <group ref={mainGroupRef} position={[0, 0, 0]}>
      {/* ── 1. Floating 3D Tactical Navigation Marker ───────── */}
      <group ref={arrowRef} position={[0, 2.6, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <coneGeometry args={[0.45, 0.85, 3]} />
          <meshStandardMaterial
            color="#FFFFFF"
            roughness={0.2}
            metalness={0.8}
            emissive="#FFFFFF"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      {/* ── 2. TAPAS-BH-201 Main Fuselage ────────────────────── */}
      <group position={[0, 0, 0]}>
        {/* Main Sleek Slender Fuselage */}
        <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.34, 0.44, 4.6, 32]} />
          <meshStandardMaterial
            color={airframeColor}
            metalness={0.65}
            roughness={0.28}
            wireframe={isWireframe}
          />
        </mesh>

        {/* Aerodynamic Nose Radome */}
        <mesh position={[0, 0.25, 2.45]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <sphereGeometry args={[0.34, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#F1F5F9"
            metalness={0.7}
            roughness={0.2}
            wireframe={isWireframe}
          />
        </mesh>

        {/* SATCOM Bulbous Dorsal Hump */}
        <mesh position={[0, 0.58, 0.9]} scale={[0.55, 0.42, 1.8]} castShadow>
          <sphereGeometry args={[0.5, 32, 16]} />
          <meshStandardMaterial color={radomeColor} metalness={0.6} roughness={0.3} />
        </mesh>

        {/* ── Illuminated Green Battery & Avionics Cutaway Window ── */}
        <group position={[0, 0.52, 0.3]}>
          {/* Smoked Translucent Inspection Glass Hatch */}
          <mesh position={[0, 0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.42, 0.95, 0.08]} />
            <meshStandardMaterial
              color="#022C19"
              transparent
              opacity={0.65}
              roughness={0.1}
              metalness={0.9}
            />
          </mesh>

          {/* Glowing Green Battery Pack Module & Circuit Core */}
          <group position={[0, 0.02, 0]}>
            <mesh>
              <boxGeometry args={[0.36, 0.12, 0.85]} />
              <meshStandardMaterial
                color="#064E3B"
                emissive="#059669"
                emissiveIntensity={0.6}
              />
            </mesh>

            {/* Arrays of Glowing Cylindrical Green Cells */}
            {[-0.12, 0, 0.12].map((xOffset, colIdx) => (
              <group key={`cell-col-${colIdx}`} position={[xOffset, 0.08, 0]}>
                {[-0.32, -0.16, 0, 0.16, 0.32].map((zOffset, rowIdx) => (
                  <mesh key={`cell-${colIdx}-${rowIdx}`} position={[0, 0, zOffset]} rotation={[0, 0, 0]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.08, 12]} />
                    <meshStandardMaterial
                      color="#4ADE80"
                      emissive="#22C55E"
                      emissiveIntensity={1.8}
                      roughness={0.2}
                    />
                  </mesh>
                ))}
              </group>
            ))}

            {/* Glowing Neon Green Circuit Board Edge Traces */}
            <mesh position={[0, 0.07, 0]}>
              <planeGeometry args={[0.34, 0.82]} />
              <meshStandardMaterial
                color="#4ADE80"
                emissive="#4ADE80"
                emissiveIntensity={1.2}
                transparent
                opacity={0.35}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>

        {/* Ventral Chin 360° EO/IR FLIR Sensor Gimbal Ball */}
        <group ref={turretRef} position={[0, -0.18, 2.05]}>
          <mesh castShadow>
            <sphereGeometry args={[0.26, 24, 24]} />
            <meshStandardMaterial color="#0F172A" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.06, 0.16]} rotation={[0.25, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
            <meshStandardMaterial color="#38BDF8" emissive="#38BDF8" emissiveIntensity={0.65} />
          </mesh>
        </group>

        {/* Nose Front Rotating Propeller */}
        <group position={[0, 0.25, 2.75]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.14, 0.28, 16]} />
            <meshStandardMaterial color="#1E293B" metalness={0.9} />
          </mesh>
          <group ref={leftPropRef} position={[0, 0, 0.1]}>
            <group position={[0, 0.52, 0]}>
              <mesh><boxGeometry args={[0.07, 1.0, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
              <mesh position={[0, 0, 0.01]}><boxGeometry args={[0.08, 1.02, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.8} /></mesh>
            </group>
            <group position={[0.45, -0.26, 0]} rotation={[0, 0, (2*Math.PI)/3]}>
              <mesh><boxGeometry args={[0.07, 1.0, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
              <mesh position={[0, 0, 0.01]}><boxGeometry args={[0.08, 1.02, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.8} /></mesh>
            </group>
            <group position={[-0.45, -0.26, 0]} rotation={[0, 0, (4*Math.PI)/3]}>
              <mesh><boxGeometry args={[0.07, 1.0, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
              <mesh position={[0, 0, 0.01]}><boxGeometry args={[0.08, 1.02, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.8} /></mesh>
            </group>
          </group>
        </group>

        {/* Pitot Tube Sensor on Nose Tip */}
        <mesh position={[0, 0.25, 3.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
          <meshStandardMaterial color="#334155" metalness={0.95} />
        </mesh>
      </group>

      {/* ── 3. High-Aspect-Ratio High-Mounted Shoulder Wings ─── */}
      {/* Left Wing */}
      <group position={[-3.4, 0.48, 0.35]}>
        <mesh rotation={[0, 0, 0.025]} castShadow>
          <boxGeometry args={[6.4, 0.06, 0.72]} />
          <meshStandardMaterial
            color={airframeColor}
            metalness={0.65}
            roughness={0.28}
            wireframe={isWireframe}
          />
        </mesh>
        {/* Left Winglet */}
        <mesh position={[-3.2, 0.22, 0]} rotation={[0, 0, -0.4]}>
          <boxGeometry args={[0.04, 0.48, 0.52]} />
          <meshStandardMaterial color="#475569" metalness={0.75} />
        </mesh>
        {/* Port Nav Light (Red) */}
        <mesh position={[-3.25, 0.44, 0.15]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      </group>

      {/* Right Wing */}
      <group position={[3.4, 0.48, 0.35]}>
        <mesh rotation={[0, 0, -0.025]} castShadow>
          <boxGeometry args={[6.4, 0.06, 0.72]} />
          <meshStandardMaterial
            color={airframeColor}
            metalness={0.65}
            roughness={0.28}
            wireframe={isWireframe}
          />
        </mesh>
        {/* Right Winglet */}
        <mesh position={[3.2, 0.22, 0]} rotation={[0, 0, 0.4]}>
          <boxGeometry args={[0.04, 0.48, 0.52]} />
          <meshStandardMaterial color="#475569" metalness={0.75} />
        </mesh>
        {/* Starboard Nav Light (Green) */}
        <mesh position={[3.25, 0.44, 0.15]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
      </group>

      {/* ── 4. Twin Under-Wing Engine Nacelles ───────────────── */}
      {/* Left Engine Pod */}
      <group position={[-1.6, 0.28, 0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.24, 1.45, 24]} />
          <meshStandardMaterial
            color={nacelleColor}
            emissive={isOverheating ? '#EF4444' : '#000000'}
            emissiveIntensity={isOverheating ? 0.6 : 0}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <group ref={rightPropRef} position={[0, 0, -0.88]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[0, 0.45, 0.008]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>
          
          <mesh position={[0.38, -0.22, 0]} rotation={[0, 0, (2*Math.PI)/3]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[0.38, -0.22, 0.008]} rotation={[0, 0, (2*Math.PI)/3]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>

          <mesh position={[-0.38, -0.22, 0]} rotation={[0, 0, (4*Math.PI)/3]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[-0.38, -0.22, 0.008]} rotation={[0, 0, (4*Math.PI)/3]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>
        </group>
      </group>

      {/* Right Engine Pod */}
      <group position={[1.6, 0.28, 0.35]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.24, 1.45, 24]} />
          <meshStandardMaterial
            color={nacelleColor}
            emissive={isOverheating ? '#EF4444' : '#000000'}
            emissiveIntensity={isOverheating ? 0.6 : 0}
            metalness={0.8}
            roughness={0.25}
          />
        </mesh>
        <group position={[0, 0, -0.88]}>
          <mesh position={[0, 0.45, 0]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[0, 0.45, 0.008]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>

          <mesh position={[0.38, -0.22, 0]} rotation={[0, 0, (2*Math.PI)/3]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[0.38, -0.22, 0.008]} rotation={[0, 0, (2*Math.PI)/3]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>

          <mesh position={[-0.38, -0.22, 0]} rotation={[0, 0, (4*Math.PI)/3]}><boxGeometry args={[0.06, 0.85, 0.015]} /><meshStandardMaterial color="#0F172A" metalness={0.8} /></mesh>
          <mesh position={[-0.38, -0.22, 0.008]} rotation={[0, 0, (4*Math.PI)/3]}><boxGeometry args={[0.065, 0.86, 0.005]} /><meshStandardMaterial color="#4ADE80" emissive="#22C55E" emissiveIntensity={1.5} /></mesh>
        </group>
      </group>

      {/* ── 5. Iconic TAPAS T-Tail Empennage ─────────────────── */}
      <group position={[0, 0.3, -2.25]}>
        <mesh position={[0, 0.65, 0]} rotation={[0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 1.45, 0.65]} />
          <meshStandardMaterial color={airframeColor} metalness={0.65} roughness={0.3} />
        </mesh>

        <mesh position={[0, 1.35, -0.2]} castShadow>
          <boxGeometry args={[2.4, 0.04, 0.52]} />
          <meshStandardMaterial color={airframeColor} metalness={0.65} roughness={0.3} />
        </mesh>
      </group>

      {/* ── 6. Retractable Tricycle Landing Gear ─────────────── */}
      <group position={[0, -0.45, 1.6]}>
        <mesh rotation={[0.2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.65, 12]} />
          <meshStandardMaterial color={strutColor} metalness={0.9} />
        </mesh>
        <mesh position={[0, -0.32, 0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.11, 0.11, 0.08, 16]} />
          <meshStandardMaterial color={tireColor} roughness={0.8} />
        </mesh>
      </group>

      <group position={[-1.2, -0.45, 0.1]}>
        <mesh rotation={[0, 0, -0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.72, 12]} />
          <meshStandardMaterial color={strutColor} metalness={0.9} />
        </mesh>
        <mesh position={[-0.1, -0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.09, 16]} />
          <meshStandardMaterial color={tireColor} roughness={0.8} />
        </mesh>
      </group>

      <group position={[1.2, -0.45, 0.1]}>
        <mesh rotation={[0, 0, 0.2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.72, 12]} />
          <meshStandardMaterial color={strutColor} metalness={0.9} />
        </mesh>
        <mesh position={[0.1, -0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.14, 0.14, 0.09, 16]} />
          <meshStandardMaterial color={tireColor} roughness={0.8} />
        </mesh>
      </group>

      {/* ── 7. Wet Asphalt Runway Ground Tarmac Markings ──────────── */}
      <group position={[0, -0.88, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial
            color="#080C14"
            roughness={0.35}
            metalness={0.4}
          />
        </mesh>

        {[-8, -4, 0, 4, 8].map((zPos, idx) => (
          <mesh key={`runway-stripe-${idx}`} position={[0, 0.005, zPos]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.18, 2.2]} />
            <meshStandardMaterial color="#E2E8F0" roughness={0.5} opacity={0.65} transparent />
          </mesh>
        ))}

        <mesh position={[-2.8, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 24]} />
          <meshStandardMaterial color="#EAB308" opacity={0.4} transparent />
        </mesh>
        <mesh position={[2.8, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.08, 24]} />
          <meshStandardMaterial color="#EAB308" opacity={0.4} transparent />
        </mesh>
      </group>
    </group>
  );
}
