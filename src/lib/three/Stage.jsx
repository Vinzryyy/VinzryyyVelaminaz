import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'

/** Games Hub 3D stage — placeholder scene. Replace mesh with real assets. */
export default function Stage() {
  return (
    <Canvas camera={{ position: [0, 2, 6], fov: 50 }} className="w-full h-full">
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} />
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#4ee2a6" />
      </mesh>
      <OrbitControls enablePan={false} />
      <Environment preset="night" />
    </Canvas>
  )
}
