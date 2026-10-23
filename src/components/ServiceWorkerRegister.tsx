'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('PWA ServiceWorker registrado con éxito:', reg.scope);
          })
          .catch((err) => {
            console.warn('Error al registrar ServiceWorker:', err);
          });
      });
    }
  }, []);

  return null;
}
