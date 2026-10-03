import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { moveCamera } from './camera';

function setup() {
  const camera = new PerspectiveCamera(38, 1.5, .1, 20000);
  const controls = new OrbitControls(camera, null);
  controls.target.set(30, 12, -70);
  camera.position.set(-130, 198, -166);
  controls.minDistance = 120; controls.maxDistance = 1200;
  controls.enableDamping = true; controls.update();
  return { camera, controls };
}
const close = (actual: Vector3, expected: Vector3) => expect(actual.distanceTo(expected)).toBeLessThan(1e-8);
describe('camera toolbar', () => {
  it('zooms towards an offset target without jumping into it, and reverses', () => {
    const {camera, controls} = setup(); const original = camera.position.clone();
    const offset = original.clone().sub(controls.target);
    moveCamera(camera, controls, 'in');
    close(camera.position.clone().sub(controls.target), offset.clone().multiplyScalar(.8));
    moveCamera(camera, controls, 'out'); close(camera.position, original);
  });
  it.each(['left', 'right'] as const)('%s rotates repeatedly at constant distance and elevation', action => {
    const {camera, controls} = setup(); const original = camera.position.clone(); const target = controls.target.clone();
    for (let i=0; i<24; i++) {
      moveCamera(camera, controls, action);
      expect(camera.position.distanceTo(target)).toBeCloseTo(original.distanceTo(target), 8);
      expect(camera.position.y).toBeCloseTo(original.y, 8); close(controls.target, target);
    }
    expect(camera.position.distanceTo(original)).toBeGreaterThan(10);
    for (let i=0; i<24; i++) moveCamera(camera, controls, action === 'left' ? 'right' : 'left');
    close(camera.position, original);
  });
  it('clamps repeated zoom in and out to finite useful distances', () => {
    const {camera, controls} = setup();
    for (let i=0; i<100; i++) moveCamera(camera, controls, 'in');
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(120, 8);
    for (let i=0; i<100; i++) moveCamera(camera, controls, 'out');
    expect(camera.position.distanceTo(controls.target)).toBeCloseTo(1200, 8);
  });
  it('pans along screen horizontal without changing orientation or zoom, and reverses', () => {
    const {camera, controls} = setup(); const original = camera.position.clone(); const target = controls.target.clone();
    const rotation = camera.quaternion.clone(); const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    moveCamera(camera, controls, 'pan-left');
    const delta = camera.position.clone().sub(original);
    expect(delta.dot(right)).toBeLessThan(0); close(controls.target.clone().sub(target), delta);
    expect(camera.quaternion.angleTo(rotation)).toBeLessThan(1e-7);
    moveCamera(camera, controls, 'pan-right'); close(camera.position, original); close(controls.target, target);
  });
  it('pans by the same fraction of visible width at different zoom levels', () => {
    const a = setup(), b = setup(); moveCamera(b.camera, b.controls, 'out');
    const startA = a.camera.position.clone(), startB = b.camera.position.clone();
    moveCamera(a.camera, a.controls, 'pan-right'); moveCamera(b.camera, b.controls, 'pan-right');
    expect(b.camera.position.distanceTo(startB) / a.camera.position.distanceTo(startA)).toBeCloseTo(1.25, 8);
  });
});
