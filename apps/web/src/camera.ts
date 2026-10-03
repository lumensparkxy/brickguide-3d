import { MathUtils, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type CameraAction = 'reset' | 'left' | 'right' | 'in' | 'out' | 'pan-left' | 'pan-right';

/** Discard drag inertia at the currently displayed view before an explicit button action. */
export function stopCameraMotion(camera: PerspectiveCamera, controls: OrbitControls) {
  const position = camera.position.clone();
  const target = controls.target.clone();
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update(); // Public API clears pending rotation and pan deltas without damping.
  camera.position.copy(position);
  controls.target.copy(target);
  controls.update();
  controls.enableDamping = damping;
}

export function moveCamera(camera: PerspectiveCamera, controls: OrbitControls, action: Exclude<CameraAction, 'reset'>) {
  stopCameraMotion(camera, controls);
  // Capture the offset BEFORE modifying camera.position (Vector3 methods mutate their receiver).
  const offset = camera.position.clone().sub(controls.target);
  if (action === 'in' || action === 'out') {
    const distance = MathUtils.clamp(offset.length() * (action === 'in' ? .8 : 1.25), controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setLength(distance));
  } else if (action === 'left' || action === 'right') {
    offset.applyAxisAngle(camera.up, action === 'left' ? -.3 : .3);
    camera.position.copy(controls.target).add(offset);
  } else {
    // Move the camera by 10% of the visible width, independent of model size and zoom.
    const width = 2 * offset.length() * Math.tan(MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    camera.updateMatrixWorld();
    const pan = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      .multiplyScalar(width * (action === 'pan-left' ? -.1 : .1));
    camera.position.add(pan);
    controls.target.add(pan);
  }
  controls.update();
}
