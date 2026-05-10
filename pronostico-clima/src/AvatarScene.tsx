import { useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei'

function AvatarModel() {
  const { scene, animations } = useGLTF('/hongo2.glb');
  const { actions } = useAnimations(animations, scene);
  const group = useRef<any>(null);

  useEffect(() => {
    if (actions && actions['base']) {
      actions['base'].play();
    }

    if (group.current) {
      group.current.scale.set(1.8, 1.8, 1.8);
      group.current.position.set(0, -1.5, 0);
    }
  }, [actions]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

export default function AvatarScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
      camera={{ position: [0, 0, 6.5], fov: 40 }}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={2} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <Suspense fallback={null}>
        <AvatarModel />
      </Suspense>
      <OrbitControls enableZoom={false} enableRotate={false} enablePan={false} />
    </Canvas>
  );
}

useGLTF.preload('/hongo2.glb');
