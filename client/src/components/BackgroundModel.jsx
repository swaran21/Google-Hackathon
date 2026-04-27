import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, useAnimations } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import earthGlb from './models/Earth.glb?url';

function EarthModel() {
  const modelRef = useRef();
  const { scene, animations } = useGLTF(earthGlb);
  const { actions } = useAnimations(animations, modelRef);

  // Track independent rotation states
  const autoRotateY = useRef(0);
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Automatically play all embedded GLB animations
    if (actions) {
      Object.values(actions).forEach(action => {
        action.reset().play();
      });
    }

    // Global mouse listener for parallax rotation (doesn't block UI clicks)
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1; // Inverted vertical axis to match expected movement
      // Mouse controls up to ~0.8 radians of offset
      targetOffset.current = { x: y * 0.6, y: x * 0.8 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [actions]);

  useFrame((state, delta) => {
    if (modelRef.current) {
      // 1. Advance the continuous auto-rotation
      autoRotateY.current += delta * 0.15;

      // 2. Calculate the desired final rotation (auto + mouse offset)
      const desiredY = autoRotateY.current + targetOffset.current.y;
      const desiredX = targetOffset.current.x;

      // 3. Smoothly damp the actual rotation towards the desired rotation
      modelRef.current.rotation.y += (desiredY - modelRef.current.rotation.y) * 0.08;
      modelRef.current.rotation.x += (desiredX - modelRef.current.rotation.x) * 0.08;
    }
  });

  return (
    <primitive 
      ref={modelRef} 
      object={scene} 
      scale={3.8} // Increased size
      position={[0, -1.5, 0]} 
    />
  );
}

export default function BackgroundModel() {
  const { isDark } = useTheme();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0, 
      pointerEvents: 'none', 
      opacity: isDark ? 0.15 : 0.25, // Stronger opacity in light mode
      mixBlendMode: isDark ? 'screen' : 'multiply', // 'multiply' works beautifully in light mode
    }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
        <ambientLight intensity={isDark ? 0.4 : 1.2} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} color="#FF3B30" />
        <directionalLight position={[-10, -10, -5]} intensity={isDark ? 0.5 : 1.0} color="#2ED5FF" />
        <React.Suspense fallback={null}>
          <EarthModel />
          <Environment preset="city" />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
