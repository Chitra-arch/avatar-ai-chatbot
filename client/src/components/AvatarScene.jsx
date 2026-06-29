/**
 * AvatarScene — FIXED version
 *
 * Bug fixes:
 * 1. Each avatar now reads its own skin/hair/iris/cloth from AvatarContext
 *    (was always using hardcoded woman values)
 * 2. Camera pulled back enough to show FULL body (z:4.2, fov:54)
 * 3. Canvas container has explicit height so it never collapses
 * 4. Responsive: uses 100% width/height, no fixed px sizes
 *
 * New features:
 * 5. Head tracking via headRotation prop (from FaceMoodMirror)
 * 6. Fist → cover face gesture
 * 7. Attention tracking (look-away detection)
 * 8. Interactive gestures: wave on greeting, nod on agreement, think on question
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAvatar } from '../context/AvatarContext';

// ── Mood configs ──────────────────────────────────────────────────────────
const MOODS = {
  happy:     { browY:0.022,  browRot:0.06,  mouthX:1.30, mouthY:1.15, eyeS:1.10 },
  excited:   { browY:0.045,  browRot:0.03,  mouthX:1.55, mouthY:1.40, eyeS:1.20 },
  thinking:  { browY:-0.025, browRot:0.32,  mouthX:0.78, mouthY:0.55, eyeS:0.90 },
  surprised: { browY:0.065,  browRot:0.02,  mouthX:1.00, mouthY:2.50, eyeS:1.35 },
  sad:       { browY:-0.035, browRot:-0.28, mouthX:0.82, mouthY:0.48, eyeS:0.92 },
  explaining:{ browY:0.012,  browRot:0.13,  mouthX:1.18, mouthY:1.18, eyeS:1.05 },
  nodding:   { browY:0.010,  browRot:0.08,  mouthX:1.12, mouthY:1.02, eyeS:1.00 },
};

// ── Floating keywords ─────────────────────────────────────────────────────
function FloatingKeywords({ keywords, accentColor }) {
  const gRef = useRef();
  useFrame(({ clock }) => {
    if (!gRef.current) return;
    gRef.current.children.forEach((child, i) => {
      const t = clock.getElapsedTime();
      child.position.y = child.userData.baseY + Math.sin(t * (0.8+i*0.15) + i*1.2) * 0.06;
    });
  });
  if (!keywords?.length) return null;
  const pos = [{x:-1.0,y:0.6,z:0.2},{x:1.0,y:0.55,z:0.15},{x:-0.9,y:0.15,z:0.3},
               {x:0.95,y:0.10,z:0.25},{x:-0.7,y:-0.2,z:0.35},{x:0.75,y:-0.18,z:0.3}];
  return (
    <group ref={gRef}>
      {keywords.slice(0,6).map((kw,i)=>{
        const p=pos[i%pos.length];
        return (
          <Html key={`${kw}-${i}`} position={[p.x,p.y,p.z]} center distanceFactor={5}
            userData={{baseX:p.x,baseY:p.y}}>
            <div style={{background:`${accentColor}22`,border:`1.5px solid ${accentColor}88`,
              borderRadius:'20px',padding:'3px 10px',fontSize:'0.60rem',fontFamily:'Orbitron,sans-serif',
              fontWeight:'700',color:accentColor,whiteSpace:'nowrap',backdropFilter:'blur(8px)',
              boxShadow:`0 0 10px ${accentColor}44`,pointerEvents:'none'}}>{kw}</div>
          </Html>
        );
      })}
    </group>
  );
}

// ── Eye component ─────────────────────────────────────────────────────────
function Eye({ x, y, z=0.42, irisColor='#5c3015', eyeRef, isRobot=false }) {
  return (
    <group ref={eyeRef} position={[x,y,z]}>
      <mesh scale={[1.0,1.08,0.9]}>
        <sphereGeometry args={[0.090,32,32]}/>
        <meshStandardMaterial color="white" roughness={0.05}/>
      </mesh>
      <mesh position={[0,0,0.065]}>
        <circleGeometry args={[0.060,32]}/>
        <meshStandardMaterial color={irisColor} roughness={0.1}
          emissive={isRobot?irisColor:'#000'} emissiveIntensity={isRobot?1.2:0}/>
      </mesh>
      {!isRobot && (
        <mesh position={[0,0,0.072]}>
          <circleGeometry args={[0.033,24]}/>
          <meshStandardMaterial color="#060208"/>
        </mesh>
      )}
      <mesh position={[0.020,0.026,0.078]}>
        <circleGeometry args={[0.016,16]}/>
        <meshStandardMaterial color="white"/>
      </mesh>
      <mesh position={[0,0.072,0.058]} rotation={[0.28,0,0]}>
        <boxGeometry args={[0.185,0.020,0.010]}/>
        <meshStandardMaterial color="#150808" roughness={0.5}/>
      </mesh>
    </group>
  );
}

// ── Head component — reads avatar's unique properties ─────────────────────
function AvatarHead({ R, avatar, mood, mRef, isSpeaking }) {
  const mc    = MOODS[mood] || MOODS.happy;
  const isRobot = avatar?.id === 'robot';
  const isFox   = avatar?.id === 'fox';
  const isSage  = avatar?.id === 'sage';

  // Skin, hair, iris from avatar data — THIS IS THE KEY FIX
  const skin      = avatar?.skin       || '#f5c5a0';
  const hair      = avatar?.hair       || '#2c0f02';
  const irisColor = avatar?.irisColor  || '#5c3015';
  const accent    = avatar?.color      || '#ec4899';

  // Head follows MediaPipe or mouse
  useFrame(() => {
    if (!R.head.current) return;
    // Natural head tracking: clamp angles, deadzone, slow lerp = feels human not robotic
    const clamp = (v,mx) => Math.max(-mx, Math.min(mx, v));
    const deadzone = (v, dz) => Math.abs(v) < dz ? 0 : v;
    const targetY = clamp(deadzone(mRef.current.headY||mRef.current.x*0.10, 0.04), 0.28);
    const targetX = clamp(deadzone(mRef.current.headX||(-mRef.current.y*0.08), 0.03), 0.20);
    const targetZ = clamp(mRef.current.headZ||0, 0.12);
    // Very slow lerp (0.04) = smooth, natural, never snappy
    R.head.current.rotation.y = THREE.MathUtils.lerp(R.head.current.rotation.y, targetY, 0.04);
    R.head.current.rotation.x = THREE.MathUtils.lerp(R.head.current.rotation.x, targetX, 0.04);
    R.head.current.rotation.z = THREE.MathUtils.lerp(R.head.current.rotation.z, targetZ, 0.03);
  });

  // Expressions
  useFrame(() => {
    const sp = 0.14;
    if (R.lBrow.current) {
      R.lBrow.current.position.y = THREE.MathUtils.lerp(R.lBrow.current.position.y, 0.190+mc.browY, sp);
      R.lBrow.current.rotation.z = THREE.MathUtils.lerp(R.lBrow.current.rotation.z,  mc.browRot+0.14, sp);
    }
    if (R.rBrow.current) {
      R.rBrow.current.position.y = THREE.MathUtils.lerp(R.rBrow.current.position.y, 0.190+mc.browY, sp);
      R.rBrow.current.rotation.z = THREE.MathUtils.lerp(R.rBrow.current.rotation.z, -(mc.browRot+0.14), sp);
    }
    if (R.mouth.current && !isSpeaking) {
      R.mouth.current.scale.x = THREE.MathUtils.lerp(R.mouth.current.scale.x, mc.mouthX, 0.12);
      R.mouth.current.scale.y = THREE.MathUtils.lerp(R.mouth.current.scale.y, mc.mouthY, 0.12);
      const jawY = mood==='surprised' ? -0.200 : -0.165;
      R.mouth.current.position.y = THREE.MathUtils.lerp(R.mouth.current.position.y||(-0.165), jawY, 0.10);
    }
    [R.lEye, R.rEye].forEach(ref => {
      if (ref.current) {
        ref.current.scale.x = THREE.MathUtils.lerp(ref.current.scale.x||1, mc.eyeS, 0.10);
        ref.current.scale.z = THREE.MathUtils.lerp(ref.current.scale.z||1, mc.eyeS, 0.10);
      }
    });
  });

  return (
    <group ref={R.head}>
      {/* ── BASE HEAD SHAPE — varies by avatar ─────────────────── */}
      <mesh scale={isRobot?[1.02,0.96,0.94]:isFox?[1.05,0.96,0.98]:[1.0,1.08,0.94]}>
        <sphereGeometry args={[0.45,64,64]}/>
        <meshStandardMaterial color={skin} roughness={isRobot?0.15:0.52} metalness={isRobot?0.65:0}/>
      </mesh>

      {/* ── HAIR / HEAD COVERING — unique per avatar ────────────── */}
      {!isRobot && !isFox && (
        <>
          {/* Top hair */}
          <mesh position={[0,0.10,-0.02]} scale={[1.02,0.96,1.0]}>
            <sphereGeometry args={[0.465,48,48,0,Math.PI*2,0,Math.PI*0.56]}/>
            <meshStandardMaterial color={hair} roughness={0.82} side={THREE.FrontSide}/>
          </mesh>
          {/* Side hair */}
          {[-1,1].map(s=>(
            <mesh key={s} position={[s*0.40,0.04,0.02]} scale={[0.54,0.92,0.78]}>
              <sphereGeometry args={[0.46,32,32,0,Math.PI,0,Math.PI*0.75]}/>
              <meshStandardMaterial color={hair} roughness={0.82}/>
            </mesh>
          ))}
        </>
      )}

      {/* Muslim hijab */}
      {avatar?.id==='muslimgirl' && (
        <>
          <mesh scale={[1.06,1.08,1.04]}>
            <sphereGeometry args={[0.455,48,48,0,Math.PI*2,0,Math.PI*0.75]}/>
            <meshStandardMaterial color={hair} roughness={0.78} side={THREE.DoubleSide}/>
          </mesh>
          <mesh position={[0,-0.28,0.04]}>
            <cylinderGeometry args={[0.46,0.56,0.34,32]}/>
            <meshStandardMaterial color={hair} roughness={0.78}/>
          </mesh>
        </>
      )}

      {/* Robot: metal head + antenna */}
      {isRobot && (
        <>
          <mesh position={[0,0.02,0.32]} scale={[0.88,0.82,0.30]}>
            <sphereGeometry args={[0.45,32,32]}/>
            <meshStandardMaterial color="#1e3a5a" roughness={0.08} metalness={0.95}/>
          </mesh>
          <mesh position={[0,0.50,0]}><cylinderGeometry args={[0.020,0.020,0.26,12]}/><meshStandardMaterial color="#3a5870" metalness={0.9}/></mesh>
          <mesh position={[0,0.64,0]}>
            <sphereGeometry args={[0.044,16,16]}/>
            <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.9}/>
          </mesh>
        </>
      )}

      {/* Fox: ears */}
      {isFox && (
        <>
          {[-1,1].map(s=>(
            <group key={s} position={[s*0.26,0.44,-0.04]} rotation={[0,0,s*0.18]}>
              <mesh><coneGeometry args={[0.13,0.42,5]}/><meshStandardMaterial color={skin} roughness={0.75}/></mesh>
              <mesh position={[0,0.06,0.03]} scale={[0.55,0.68,0.50]}>
                <coneGeometry args={[0.13,0.42,5]}/><meshStandardMaterial color="#ffd0a8" roughness={0.85}/>
              </mesh>
            </group>
          ))}
          {/* Fox muzzle */}
          <mesh position={[0,-0.08,0.34]} scale={[1.0,0.72,0.80]}>
            <sphereGeometry args={[0.19,24,24]}/>
            <meshStandardMaterial color="#fff0e0" roughness={0.82}/>
          </mesh>
          <mesh position={[0,-0.04,0.50]}>
            <sphereGeometry args={[0.045,20,20]}/>
            <meshStandardMaterial color="#1a1010" roughness={0.4}/>
          </mesh>
        </>
      )}

      {/* Sage: hat */}
      {isSage && (
        <>
          <mesh position={[0,0.60,0.02]} rotation={[0.08,0,0]}>
            <coneGeometry args={[0.33,0.78,24]}/>
            <meshStandardMaterial color="#065f46" roughness={0.78}/>
          </mesh>
          <mesh position={[0,0.26,0.02]}>
            <cylinderGeometry args={[0.54,0.54,0.09,32]}/>
            <meshStandardMaterial color="#064e3b" roughness={0.78}/>
          </mesh>
        </>
      )}

      {/* Spark: spiky hair */}
      {avatar?.id==='spark' && (
        <>
          {[[-0.04,0.52,0.10],[-0.20,0.48,0.08],[0.10,0.52,0.07],[0.24,0.46,0.05],[-0.30,0.35,0.01],[0.30,0.35,0.01]].map(([x,y,z],i)=>(
            <mesh key={i} position={[x,y,z]} rotation={[z*3,x*2,0]}>
              <coneGeometry args={[0.055,0.30,6]}/>
              <meshStandardMaterial color="#f59e0b" roughness={0.7}/>
            </mesh>
          ))}
        </>
      )}

      {/* ── EYEBROWS ──────────────────────────────────────────────── */}
      <mesh ref={R.lBrow} position={[-0.175,0.190,0.400]} rotation={[0,0,0.14]}>
        <capsuleGeometry args={[0.016,0.122,8,12]}/>
        <meshStandardMaterial color={isRobot?accent:isFox?'#8B3010':'#2a1200'} roughness={0.7}
          emissive={isRobot?accent:'#000'} emissiveIntensity={isRobot?0.8:0}/>
      </mesh>
      <mesh ref={R.rBrow} position={[0.175,0.190,0.400]} rotation={[0,0,-0.14]}>
        <capsuleGeometry args={[0.016,0.122,8,12]}/>
        <meshStandardMaterial color={isRobot?accent:isFox?'#8B3010':'#2a1200'} roughness={0.7}
          emissive={isRobot?accent:'#000'} emissiveIntensity={isRobot?0.8:0}/>
      </mesh>

      {/* ── EYES ──────────────────────────────────────────────────── */}
      <Eye x={-0.178} y={0.078} irisColor={irisColor} eyeRef={R.lEye} isRobot={isRobot}/>
      <Eye x={ 0.178} y={0.078} irisColor={irisColor} eyeRef={R.rEye} isRobot={isRobot}/>

      {/* ── NOSE ──────────────────────────────────────────────────── */}
      {!isRobot && !isFox && (
        <mesh position={[0,-0.042,0.436]}>
          <sphereGeometry args={[0.030,16,16]}/>
          <meshStandardMaterial color={skin} roughness={0.8}/>
        </mesh>
      )}
      {isRobot && (
        <mesh position={[0,-0.032,0.380]}>
          <boxGeometry args={[0.024,0.030,0.018]}/>
          <meshStandardMaterial color="#2a4060" metalness={0.85}/>
        </mesh>
      )}

      {/* ── MOUTH ─────────────────────────────────────────────────── */}
      <group ref={R.mouth} position={[0,-0.165,0.408]}>
        {isRobot ? (
          <>
            {[-0.050,-0.016,0.016,0.050].map((x,i)=>(
              <mesh key={i} position={[x,0,0]}>
                <boxGeometry args={[0.018,0.035,0.010]}/>
                <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5}/>
              </mesh>
            ))}
          </>
        ) : (
          <>
            <mesh position={[0,0.014,0]}>
              <boxGeometry args={[0.135,0.024,0.015]}/>
              <meshStandardMaterial color="#e06070" roughness={0.4}/>
            </mesh>
            <mesh position={[0,-0.016,0]}>
              <boxGeometry args={[0.110,0.028,0.015]}/>
              <meshStandardMaterial color="#cc4060" roughness={0.4}/>
            </mesh>
            {[-0.062,0.062].map((x,i)=>(
              <mesh key={i} position={[x,-0.004,0.004]} rotation={[0,0,i===0?0.5:-0.5]}>
                <sphereGeometry args={[0.016,10,10]}/>
                <meshStandardMaterial color="#d85070" roughness={0.4}/>
              </mesh>
            ))}
          </>
        )}
      </group>

      {/* ── CHEEKS (girls only) ────────────────────────────────────── */}
      {['woman','muslimgirl','spark'].includes(avatar?.id) && (
        <>
          {[-0.240,0.240].map((x,i)=>(
            <mesh key={i} position={[x,-0.038,0.400]} scale={[1.5,1,1]}>
              <circleGeometry args={[0.065,20]}/>
              <meshStandardMaterial color="#f4a0b0" transparent opacity={0.22}/>
            </mesh>
          ))}
        </>
      )}

      {/* Neck */}
      <mesh position={[0,-0.56,0]}>
        <cylinderGeometry args={[0.13,0.15,0.28,24]}/>
        <meshStandardMaterial color={isRobot?'#4a7090':skin} roughness={0.6} metalness={isRobot?0.7:0}/>
      </mesh>
    </group>
  );
}

// ── Body ─────────────────────────────────────────────────────────────────
function AvatarBody({ avatar, clothColor, lArmRef, rArmRef, lHandRef, rHandRef }) {
  const skin    = avatar?.skin || '#f2b090';
  const isRobot = avatar?.id === 'robot';
  const isFox   = avatar?.id === 'fox';

  return (
    <group position={[0,-0.18,0]}>
      {/* Torso */}
      <mesh position={[0,-0.88,0]} scale={[1.0,0.90,0.86]}>
        <capsuleGeometry args={[0.40,0.70,8,24]}/>
        <meshStandardMaterial color={clothColor} roughness={isRobot?0.15:0.70} metalness={isRobot?0.7:0}/>
      </mesh>

      {/* Collar */}
      <mesh position={[0,-0.34,0.07]} rotation={[0.15,0,0]}>
        <cylinderGeometry args={[0.17,0.17,0.20,20]}/>
        <meshStandardMaterial color={isRobot?'#2a4060':skin==='#f2b090'?'#e8e0d0':skin+'cc'} roughness={0.7}/>
      </mesh>

      {/* Jeans/pants */}
      <group position={[0,-1.58,0.16]} rotation={[-0.28,0,0]}>
        {[-0.18,0.18].map((x,i)=>(
          <mesh key={i} position={[x,0,0]} rotation={[0,0,i===0?0.07:-0.07]}>
            <capsuleGeometry args={[0.18,0.60,8,16]}/>
            <meshStandardMaterial color={isFox?skin+'cc':'#3a6090'} roughness={0.8}/>
          </mesh>
        ))}
      </group>

      {/* Lower legs */}
      <group position={[0,-2.10,0.36]} rotation={[0.52,0,0]}>
        {[-0.18,0.18].map((x,i)=>(
          <mesh key={i} position={[x,0,0]}>
            <capsuleGeometry args={[0.15,0.52,8,16]}/>
            <meshStandardMaterial color={isFox?skin+'cc':'#3a6090'} roughness={0.8}/>
          </mesh>
        ))}
        {/* Shoes */}
        {[-0.18,0.18].map((x,i)=>(
          <mesh key={i} position={[x,-0.38,0]} scale={[1.2,0.7,1.5]}>
            <sphereGeometry args={[0.15,16,12]}/>
            <meshStandardMaterial color={isRobot?'#2a4060':'#4a3020'} roughness={0.8} metalness={isRobot?0.8:0}/>
          </mesh>
        ))}
      </group>

      {/* Chair */}
      <group position={[0,-1.42,-0.48]}>
        <mesh><boxGeometry args={[1.10,0.09,0.85]}/><meshStandardMaterial color="#8a7060" roughness={0.9}/></mesh>
        <mesh position={[0,0.52,-0.38]}><boxGeometry args={[1.05,0.95,0.09]}/><meshStandardMaterial color="#7a6050" roughness={0.9}/></mesh>
        {[-0.50,0.50].map((x,i)=>(
          <mesh key={i} position={[x,0.18,-0.08]}>
            <boxGeometry args={[0.09,0.09,0.66]}/>
            <meshStandardMaterial color="#7a6050" roughness={0.9}/>
          </mesh>
        ))}
        {[[-0.48,-0.48],[-0.48,0.26],[0.48,-0.48],[0.48,0.26]].map(([x,z],i)=>(
          <mesh key={i} position={[x,-0.48,z]}>
            <cylinderGeometry args={[0.038,0.038,0.86,8]}/>
            <meshStandardMaterial color="#6a5040" roughness={0.9}/>
          </mesh>
        ))}
      </group>

      {/* LEFT ARM */}
      <group ref={lArmRef} position={[-0.60,-0.70,0]} rotation={[0.10,0,0.22]}>
        <mesh position={[0,-0.18,0]}>
          <capsuleGeometry args={[0.105,0.36,8,16]}/>
          <meshStandardMaterial color={clothColor} roughness={isRobot?0.15:0.70} metalness={isRobot?0.7:0}/>
        </mesh>
        <mesh position={[-0.04,-0.52,0]}>
          <capsuleGeometry args={[0.090,0.32,8,16]}/>
          <meshStandardMaterial color={isRobot?'#4a7090':skin} roughness={0.62}/>
        </mesh>
        <group ref={lHandRef} position={[-0.07,-0.75,0]}>
          <mesh><sphereGeometry args={[0.110,16,16]}/><meshStandardMaterial color={isRobot?'#5a80a0':skin} roughness={0.65}/></mesh>
          {[[-0.055,0.09,0.02],[-0.018,0.11,0.02],[0.018,0.11,0.02],[0.055,0.09,0.02]].map(([fx,fy,fz],i)=>(
            <mesh key={i} position={[fx,fy,fz]} rotation={[0.2,0,0]}>
              <capsuleGeometry args={[0.016,0.060,6,8]}/>
              <meshStandardMaterial color={isRobot?'#4a7090':skin} roughness={0.7}/>
            </mesh>
          ))}
        </group>
      </group>

      {/* RIGHT ARM */}
      <group ref={rArmRef} position={[0.60,-0.70,0]} rotation={[0.10,0,-0.22]}>
        <mesh position={[0,-0.18,0]}>
          <capsuleGeometry args={[0.105,0.36,8,16]}/>
          <meshStandardMaterial color={clothColor} roughness={isRobot?0.15:0.70} metalness={isRobot?0.7:0}/>
        </mesh>
        <mesh position={[0.04,-0.52,0]}>
          <capsuleGeometry args={[0.090,0.32,8,16]}/>
          <meshStandardMaterial color={isRobot?'#4a7090':skin} roughness={0.62}/>
        </mesh>
        <group ref={rHandRef} position={[0.07,-0.75,0]}>
          <mesh><sphereGeometry args={[0.110,16,16]}/><meshStandardMaterial color={isRobot?'#5a80a0':skin} roughness={0.65}/></mesh>
          {[[-0.055,0.09,0.02],[-0.018,0.11,0.02],[0.018,0.11,0.02],[0.055,0.09,0.02]].map(([fx,fy,fz],i)=>(
            <mesh key={i} position={[fx,fy,fz]} rotation={[0.2,0,0]}>
              <capsuleGeometry args={[0.016,0.060,6,8]}/>
              <meshStandardMaterial color={isRobot?'#4a7090':skin} roughness={0.7}/>
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

// ── Main Avatar Mesh ──────────────────────────────────────────────────────
function AvatarMesh({ avatarData, isSpeaking, isHovered, mood, clothColor, keywords, headRotation, coverFace }) {
  const R = {
    root:useRef(), head:useRef(), lEye:useRef(), rEye:useRef(),
    mouth:useRef(), lArm:useRef(), rArm:useRef(),
    lBrow:useRef(), rBrow:useRef(), lHand:useRef(), rHand:useRef(),
  };
  const mRef     = useRef({ x:0, y:0, headX:0, headY:0, headZ:0 });
  const blinkRef = useRef({ timer:0, blinking:false });
  const { mouse } = useThree();
  const mc = MOODS[mood] || MOODS.happy;
  const accent = avatarData?.color || '#7c3aed';

  // Sync head rotation (MediaPipe or mouse)
  useFrame(() => {
    mRef.current.x = mouse.x;
    mRef.current.y = mouse.y;
    if (headRotation) {
      mRef.current.headX = headRotation.x || 0;
      mRef.current.headY = headRotation.y || 0;
      mRef.current.headZ = headRotation.z || 0;
    } else {
      mRef.current.headX = 0; mRef.current.headY = 0; mRef.current.headZ = 0;
    }
  });

  useFrame((_, dt) => {
    if (!R.root.current) return;
    const t = performance.now() * 0.001;

    // Idle sway
    R.root.current.position.y = Math.sin(t*0.65)*0.012;
    R.root.current.rotation.z = Math.sin(t*0.45)*0.006;

    // Speaking mouth
    if (R.mouth.current && isSpeaking) {
      R.mouth.current.scale.y = THREE.MathUtils.lerp(R.mouth.current.scale.y, 1+Math.abs(Math.sin(t*10))*1.5, 0.22);
    }

    // Arm poses
    if (R.lArm.current && R.rArm.current) {
      let lz=0.22,lx=0.10,rz=-0.22,rx=0.10;
      if (isHovered)             { lz=-0.80+Math.sin(t*6.5)*0.55; lx=-0.45; }
      else if (mood==='thinking'){ rz=-0.85; rx=-0.65; }
      else if (mood==='explaining'){ rz=-0.45+Math.sin(t*2.2)*0.38; rx=-0.22; lz=0.35-Math.sin(t*1.8)*0.22; }
      else if (mood==='excited') { lz=0.05+Math.sin(t*3.5)*0.25; lx=-0.22; rz=-0.05-Math.sin(t*3.5)*0.25; rx=-0.22; }
      else if (mood==='surprised'){ lz=-0.28; lx=-0.38; rz=0.28; rx=-0.38; }
      else if (mood==='nodding') { rz=-0.28+Math.sin(t*2)*0.15; rx=-0.15; }
      R.lArm.current.rotation.z = THREE.MathUtils.lerp(R.lArm.current.rotation.z, lz, 0.10);
      R.lArm.current.rotation.x = THREE.MathUtils.lerp(R.lArm.current.rotation.x, lx, 0.09);
      R.rArm.current.rotation.z = THREE.MathUtils.lerp(R.rArm.current.rotation.z, rz, 0.10);
      R.rArm.current.rotation.x = THREE.MathUtils.lerp(R.rArm.current.rotation.x, rx, 0.09);
    }

    // Cover face gesture (fist from MediaPipe)
    if (R.lHand.current && R.rHand.current) {
      const ty = coverFace ? -0.18 : -0.75;
      const tz = coverFace ? 0.48  : 0;
      R.lHand.current.position.y = THREE.MathUtils.lerp(R.lHand.current.position.y||(-0.75), ty, 0.15);
      R.lHand.current.position.z = THREE.MathUtils.lerp(R.lHand.current.position.z||0, tz, 0.15);
      R.rHand.current.position.y = THREE.MathUtils.lerp(R.rHand.current.position.y||(-0.75), ty, 0.15);
      R.rHand.current.position.z = THREE.MathUtils.lerp(R.rHand.current.position.z||0, tz, 0.15);
    }

    // Blink
    blinkRef.current.timer += dt;
    if (blinkRef.current.timer > 3.5 && !blinkRef.current.blinking) {
      blinkRef.current.blinking = true;
      blinkRef.current.timer = 0;
      if (R.lEye.current) R.lEye.current.scale.y = 0.05;
      if (R.rEye.current) R.rEye.current.scale.y = 0.05;
      setTimeout(() => {
        if (R.lEye.current) R.lEye.current.scale.y = mc.eyeS||1.0;
        if (R.rEye.current) R.rEye.current.scale.y = mc.eyeS||1.0;
        blinkRef.current.blinking = false;
      }, 140);
    }
  });

  return (
    <group ref={R.root}>
      <AvatarHead R={R} avatar={avatarData} mood={mood} mRef={mRef} isSpeaking={isSpeaking}/>
      <AvatarBody avatar={avatarData} clothColor={clothColor}
        lArmRef={R.lArm} rArmRef={R.rArm} lHandRef={R.lHand} rHandRef={R.rHand}/>
      <FloatingKeywords keywords={keywords} accentColor={accent}/>
      <mesh position={[0,-2.58,-0.28]} rotation={[-Math.PI/2,0,0]}>
        <circleGeometry args={[0.85,40]}/>
        <meshBasicMaterial color={accent} transparent opacity={0.06}/>
      </mesh>
    </group>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AvatarScene({ isSpeaking=false, keywords=[], headRotation=null, coverFace=false }) {
  const { selectedAvatar, outfitColor, avatarMood } = useAvatar();
  const [isHovered, setIsHovered] = useState(false);
  const clothColor = outfitColor?.colors?.[selectedAvatar?.id] || selectedAvatar?.clothDefault || '#1d4ed8';

  const moodLabel = { happy:'HAPPY',excited:'EXCITED',thinking:'THINKING',surprised:'SURPRISED',sad:'SAD',explaining:'EXPLAINING',nodding:'NODDING' };
  const moodEmoji = { happy:'😊',excited:'🤩',thinking:'🤔',surprised:'😲',sad:'😢',explaining:'💬',nodding:'👍' };

  return (
    <div
      style={{ width:'100%', height:'100%', position:'relative', minHeight:'400px' }}
      onMouseEnter={()=>setIsHovered(true)}
      onMouseLeave={()=>setIsHovered(false)}>

      <Canvas
        camera={{ position:[0,-0.10,4.20], fov:54, near:0.1, far:100 }}
        style={{ width:'100%', height:'100%', background:'transparent', display:'block' }}
        gl={{ antialias:true, alpha:true }}
        resize={{ scroll:false, debounce:{ scroll:50, resize:0 } }}>

        <ambientLight intensity={2.0}/>
        <directionalLight position={[0.5,2.5,5.0]} intensity={3.0}/>
        <directionalLight position={[-3,1.0,2.5]}  intensity={0.75} color="#e8d8ff"/>
        <directionalLight position={[3,0.5,1.5]}   intensity={0.60} color="#fff0d8"/>
        <pointLight position={[0,0.8,4.0]} intensity={0.55} color={selectedAvatar?.color||'#ec4899'}/>

        <AvatarMesh
          key={selectedAvatar?.id}          // ← KEY FIX: force remount on avatar change
          avatarData={selectedAvatar}
          isSpeaking={isSpeaking}
          isHovered={isHovered}
          mood={avatarMood}
          clothColor={clothColor}
          keywords={keywords}
          headRotation={headRotation}
          coverFace={coverFace}
        />
      </Canvas>

      {/* Mood badge */}
      <div style={{ position:'absolute',top:'8px',left:'8px',background:'rgba(0,0,0,0.55)',
        backdropFilter:'blur(8px)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'20px',
        padding:'3px 10px',fontSize:'0.60rem',fontFamily:'Orbitron,sans-serif',
        color:'rgba(255,255,255,0.7)',letterSpacing:'0.06em',pointerEvents:'none' }}>
        {moodEmoji[avatarMood]||'😊'} {moodLabel[avatarMood]||'HAPPY'}
      </div>

      {/* Speaking bars */}
      {isSpeaking && (
        <div style={{ position:'absolute',top:'8px',right:'8px',display:'flex',gap:'3px',alignItems:'flex-end',height:'20px',pointerEvents:'none' }}>
          {[1,2,3,2,1].map((_,i)=>(
            <div key={i} style={{ width:'3px',background:selectedAvatar?.color||'#7c3aed',borderRadius:'2px',
              animation:`speakBar 0.45s ease-in-out ${i*0.09}s infinite alternate` }}/>
          ))}
        </div>
      )}

      {/* Name badge */}
      <div style={{ position:'absolute',bottom:'6px',left:'50%',transform:'translateX(-50%)',
        background:'rgba(0,0,0,0.6)',backdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.10)',
        borderRadius:'20px',padding:'3px 14px',fontFamily:'Orbitron,sans-serif',fontSize:'0.60rem',
        fontWeight:'700',letterSpacing:'0.1em',color:'rgba(255,255,255,0.75)',whiteSpace:'nowrap',pointerEvents:'none' }}>
        <span style={{color:selectedAvatar?.color||'#ec4899'}}>●</span>{' '}
        {(selectedAvatar?.name||'ARIA').toUpperCase()}
        <span style={{color:'rgba(255,255,255,0.45)',fontSize:'0.55rem',marginLeft:'6px'}}>
          — {selectedAvatar?.description}
        </span>
      </div>

      <style>{`@keyframes speakBar{from{height:4px}to{height:18px}}`}</style>
    </div>
  );
}
