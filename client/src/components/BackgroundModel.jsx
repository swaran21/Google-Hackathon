import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, useAnimations } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import earthGlb from './models/Earth.glb?url';

function EarthModel({ onLoaded }) {
  const modelRef = useRef();
  const { scene, animations } = useGLTF(earthGlb);
  const { actions } = useAnimations(animations, modelRef);

  // Track independent rotation states
  const autoRotateY = useRef(0);
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (scene) {
      onLoaded();
    }
    
    // Automatically play all embedded GLB animations
    if (actions) {
      Object.values(actions).forEach(action => {
        action.reset().play();
      });
    }

    // Global mouse listener for parallax rotation (doesn't block UI clicks)
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      targetOffset.current = { x: y * 0.6, y: x * 0.8 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [actions, scene, onLoaded]);

  useFrame((state, delta) => {
    if (modelRef.current) {
      const safeDelta = Math.min(delta, 0.1);
      autoRotateY.current += safeDelta * 0.15;
      const desiredY = autoRotateY.current + targetOffset.current.y;
      const desiredX = targetOffset.current.x;

      modelRef.current.rotation.y += (desiredY - modelRef.current.rotation.y) * 0.08;
      modelRef.current.rotation.x += (desiredX - modelRef.current.rotation.x) * 0.08;
    }
  });

  return (
    <primitive 
      ref={modelRef} 
      object={scene} 
      scale={3.8} 
      position={[0, -1.5, 0]} 
    />
  );
}

function StarField() {
  const stars = React.useMemo(() => {
    return Array.from({ length: 200 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      duration: `${Math.random() * 4 + 2}s`,
      delay: `${Math.random() * 10}s`,
    }));
  }, []);

  const shootingStars = React.useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: `ss-${i}`,
      top: `${Math.random() * 80}%`,
      left: `${Math.random() * 100}%`,
      width: `${Math.random() * 150 + 100}px`,
      duration: `${Math.random() * 2 + 3}s`,
      delay: `${Math.random() * 60}s`, // Much longer delay for rarity
    }));
  }, []);

  return (
    <div className="stars-background">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            '--duration': star.duration,
            animationDelay: star.delay,
          }}
        />
      ))}
      {shootingStars.map((ss) => (
        <div
          key={ss.id}
          className="shooting-star"
          style={{
            top: ss.top,
            left: ss.left,
            width: ss.width,
            '--duration': ss.duration,
            '--delay': ss.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function BackgroundModel() {
  const { isDark } = useTheme();
  const [loaded, setLoaded] = useState(false);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: isDark ? 0.35 : 0.5, // Unified reduction in visibility
        transition: 'opacity 0.3s ease'
      }}
    >
      <StarField />
      <div 
        className={`model-container ${loaded ? 'model-loaded' : ''}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1, 
          opacity: loaded ? 1 : 0,
          transition: 'opacity 2.5s ease-out'
        }}
      >
        <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
          <ambientLight intensity={isDark ? 0.4 : 1.2} /> 
          <directionalLight position={[10, 10, 5]} intensity={2.0} color="#FF3B30" />
          <directionalLight position={[-10, -10, -5]} intensity={isDark ? 0.8 : 1.5} color="#2ED5FF" />
          <React.Suspense fallback={null}>
            <EarthModel onLoaded={() => setLoaded(true)} />
            <Environment preset="city" />
          </React.Suspense>
        </Canvas>
      </div>
    </div>
  );
}
