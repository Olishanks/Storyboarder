import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetPenMemory } from './draw/pointerPolicy';

afterEach(() => {
  cleanup();
  resetPenMemory();
  window.location.hash = '';
});
