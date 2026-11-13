import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';
configure({ asyncUtilTimeout: 5000 });

// Mock seguro de getContext para Canvas en entorno JSDOM
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}

// Limpieza automática del DOM después de cada prueba
afterEach(() => {
  cleanup();
});
