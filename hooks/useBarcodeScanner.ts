import { useEffect } from 'react';

/**
 * Hook to detect barcode scanner input.
 * Scanners typically act as keyboards, sending characters rapidly followed by Enter.
 *
 * @param onScan Callback function when a barcode is successfully scanned.
 */
export const useBarcodeScanner = (onScan: (code: string) => void) => {
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const target = e.target as HTMLElement;

      // Ignore input if user is typing in a text field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Reset buffer if keystrokes are too slow (manual typing vs scanner)
      // 50ms is standard for scanners, but 100ms is safer for some devices/browsers
      if (now - lastKeyTime > 100) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length > 2) { // Minimal length check to avoid noise
          e.preventDefault(); // Prevent default Enter behavior (like submitting a form)
          onScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) { // Printable chars
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
};
