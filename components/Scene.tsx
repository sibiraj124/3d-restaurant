"use client";

import React, { Suspense, useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, Html, useGLTF } from "@react-three/drei";
import { useSpring, a } from "@react-spring/three";
import { Vector3, Box3 } from "three";
import { EffectComposer, Bloom, DepthOfField, Vignette } from "@react-three/postprocessing";
import HotspotPanel from "./HotspotPanel";
import HotspotCard from "./HotspotCard";
import type { Mesh } from "three";

function RotatingBox() {
  const ref = useRef<Mesh | null>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });
  return (
    <mesh ref={ref} position={[0, 0.6, 0]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ff6b6b" />
    </mesh>
  );
}

function Model({ src = "/restaurant.glb" }: { src?: string }) {
  // useGLTF handles DRACO loading automatically when draco files are in public/
  const gltf = useGLTF(src, "/draco/") as any;

  const [hovered, setHovered] = useState(false);
  const [active, setActive] = useState(false);

  const { scale } = useSpring({ scale: active ? 1.05 : hovered ? 1.02 : 1 });

  useEffect(() => {
    if (!gltf?.scene) return;
    // auto-fit model to ~2 units maximum dimension and center it at ground=0
    const box = new Box3().setFromObject(gltf.scene);
    const size = box.getSize(new Vector3());
    const max = Math.max(size.x, size.y, size.z) || 1;
    const desired = 2; // desired max size
    const scaleFactor = desired / max;
    gltf.scene.scale.setScalar(scaleFactor);

    // re-calc bounds after scaling
    const box2 = new Box3().setFromObject(gltf.scene);
    const center = box2.getCenter(new Vector3());
    // move center to origin
    gltf.scene.position.x -= center.x;
    gltf.scene.position.y -= center.y;
    gltf.scene.position.z -= center.z;
    // lift so lowest point sits at y=0
    const box3 = new Box3().setFromObject(gltf.scene);
    gltf.scene.position.y -= box3.min.y;
  }, [gltf]);

  if (!gltf?.scene) return <RotatingBox />;

  return (
    <a.group
      scale={scale as any}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setActive((v) => !v);
      }}
    >
      <primitive object={gltf.scene} position={[0, 0, 0]} />
    </a.group>
  );
}

export default function Scene() {
  const [activeHotspot, setActiveHotspot] = useState<any | null>(null);

  // hotspot definitions: position, label, camera target position and lookAt
  const HOTSPOTS = [
    {
      id: "entrance",
      label: "Entrance",
      pos: new Vector3(2, 0.6, 1),
      cam: new Vector3(2, 1.6, 4),
      lookAt: new Vector3(0, 0.6, 0),
    },
    {
      id: "bar",
      label: "Bar",
      pos: new Vector3(-1.5, 0.6, -0.5),
      cam: new Vector3(-3, 1.8, -1),
      lookAt: new Vector3(-1.5, 0.6, -0.5),
    },
    {
      id: "table",
      label: "Table",
      pos: new Vector3(0.5, 0.6, -2),
      cam: new Vector3(0.5, 1.4, -4),
      lookAt: new Vector3(0.5, 0.6, -2),
    },
  ];

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Canvas shadows camera={{ position: [0, 2, 6], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

        <SceneContents HOTSPOTS={HOTSPOTS} onHotspotClick={setActiveHotspot} />
      </Canvas>

      <HotspotPanel HOTSPOTS={HOTSPOTS} />
      <HotspotCard hotspot={activeHotspot} onClose={() => setActiveHotspot(null)} />
    </div>
  );
}

function SceneContents({ HOTSPOTS, onHotspotClick }: { HOTSPOTS: Array<any>; onHotspotClick: (hp: any) => void }) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // target positions the camera will lerp toward
  const targetPosRef = useRef(new Vector3().copy(camera.position));
  const targetLookRef = useRef(new Vector3(0, 0, 0));

  const lastLoggedRef = useRef(new Vector3().copy(camera.position));
  const loggingIntervalRef = useRef(0);
  const userInteractingRef = useRef(false);
  const transitionRef = useRef<any | null>(null);

  // called by hotspots to move camera
  function moveCameraTo(cam: Vector3, lookAt: Vector3) {
    targetPosRef.current.copy(cam);
    targetLookRef.current.copy(lookAt);
  }

  // Hotspot visual + label
  function Hotspot({ hp }: { hp: any }) {
    const [hovered, setHovered] = useState(false);
    return (
      <group position={hp.pos.toArray()}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHovered(false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            moveCameraTo(hp.cam, hp.lookAt);
            onHotspotClick(hp);
            console.log("Hotspot clicked:", hp.id, "-> move camera to", hp.cam.toArray());
          }}
        >
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={hovered ? "#ffd166" : "#06b6d4"} emissive={hovered ? "#ffd166" : "#000"} />
        </mesh>
        <Html distanceFactor={8} center transform occlude>
          <div style={{ background: "rgba(0,0,0,0.6)", color: "white", padding: "6px 8px", borderRadius: 6, fontSize: 12 }}>
            {hp.label}
          </div>
        </Html>
      </group>
    );
  }

  // animate camera every frame toward targets
  useFrame((state, delta) => {
    // lerp camera position
    camera.position.lerp(targetPosRef.current, 0.08);
    // lerp controls target if available
    if (controlsRef.current?.target) {
      controlsRef.current.target.lerp(targetLookRef.current, 0.08);
    }
    if (controlsRef.current?.update) controlsRef.current.update();

    // throttle console logging to once per 0.6s and emit camera position for HUD
    loggingIntervalRef.current += delta;
    if (loggingIntervalRef.current > 0.6) {
      loggingIntervalRef.current = 0;
      const camPos = camera.position.clone();
      // only log if changed significantly
      if (camPos.distanceTo(lastLoggedRef.current) > 0.001) {
        const arr = camPos.toArray().map((n) => Number(n.toFixed(3)));
        console.log("Camera position:", arr);
        // dispatch for HUD to consume
        try {
          window.dispatchEvent(new CustomEvent("cameraPos", { detail: arr }));
        } catch (e) {
          /* ignore server-side or non-window hosts */
        }
        lastLoggedRef.current.copy(camPos);
      }
    }
  });

  // listen for external moveCameraTo events (e.g., from HUD)
  useEffect(() => {
    function handler(e: any) {
      const d = e.detail;
      if (!d || !d.cam) return;
      const cam = new Vector3(d.cam[0], d.cam[1], d.cam[2]);
      const lookAt = new Vector3(d.lookAt[0], d.lookAt[1], d.lookAt[2]);
      moveCameraTo(cam, lookAt);
    }
    window.addEventListener("moveCameraTo", handler as EventListener);
    return () => window.removeEventListener("moveCameraTo", handler as EventListener);
  }, []);

  return (
    <>
      <Suspense fallback={<Html center>Loading 3D...</Html>}>
        <Model />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        <Environment preset="city" />

        {HOTSPOTS.map((hp) => (
          <Hotspot key={hp.id} hp={hp} />
        ))}
      </Suspense>

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enablePan={true}
        enableRotate={true}
        enableZoom={true}
        enableDamping={true}
        dampingFactor={0.08}
        onStart={() => {
            // cancel any running camera transition when the user begins interacting
            if (transitionRef.current) {
              transitionRef.current = null;
              console.log("OrbitControls onStart: cancelled transition");
            }
            // ensure automatic lerp targets match the current camera so it doesn't snap back
            try {
              targetPosRef.current.copy(camera.position);
              if (controlsRef.current?.target) targetLookRef.current.copy(controlsRef.current.target);
            } catch (e) {
              // ignore if running server-side
            }
          userInteractingRef.current = true;
        }}
        onEnd={() => {
          // when the user stops interacting, lock the lerp targets to the current camera so it stays
          try {
            targetPosRef.current.copy(camera.position);
            if (controlsRef.current?.target) targetLookRef.current.copy(controlsRef.current.target);
          } catch (e) {}
          userInteractingRef.current = false;
          // clear any in-progress automatic transitions
          if (transitionRef.current) transitionRef.current = null;
          console.log("OrbitControls onEnd: updated targets to current camera");
        }}
      />
    </>
  );
}

/*
  Notes / next steps:
  - Replace `RotatingBox` with a loaded GLTF model using `useGLTF` from `@react-three/drei`.
  - Add interactions (hover, click) via pointer events on meshes.
  - Add postprocessing for bloom/depth-of-field with `@react-three/postprocessing`.
*/
