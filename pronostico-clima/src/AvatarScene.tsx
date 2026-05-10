import { useEffect, useRef, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment, useAnimations } from '@react-three/drei'
import gsap from 'gsap'

function AvatarModel() {
  const { scene, animations } = useGLTF('/hongo2.glb');
  const { actions } = useAnimations(animations, scene);
  const group = useRef<any>(null);

  useEffect(() => {
    // Reproducir la animación base
    if (actions && actions['base']) {
      actions['base'].play();
    }

    if (group.current) {
      gsap.fromTo(group.current.scale, 
        { x: 0, y: 0, z: 0 },
        {
          x: 1, y: 1, z: 1,
          duration: 1.5,
          ease: 'elastic.out(1, 0.5)',
          delay: 0.5,
          overwrite: 'auto'
        }
      );
      gsap.fromTo(group.current.position, 
        { y: -3 },
        {
          y: -1.5,
          duration: 1.5,
          ease: 'power3.out',
          delay: 0.5,
          overwrite: 'auto'
        }
      );
    }
  }, [actions]);

  return (
    <group ref={group}>
      <primitive object={scene} scale={1.8} />
    </group>
  );
}

export default function AvatarScene() {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 6.5], fov: 40 }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <Environment preset="city" />
      <Suspense fallback={null}>
        <AvatarModel />
      </Suspense>
      <OrbitControls enableZoom={false} enableRotate={false} enablePan={false} />
    </Canvas>
  );
}

// Lo precargamos pero SÓLO cuando este componente asíncrono se ha descargado,
// evitando bloquear la carga inicial de la aplicación.
useGLTF.preload('/hongo2.glb');
