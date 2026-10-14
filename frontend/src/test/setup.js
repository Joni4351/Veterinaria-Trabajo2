import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mock seguro de getContext para Canvas en entorno JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// Limpieza automática del DOM después de cada prueba
afterEach(() => {
  cleanup();
});
