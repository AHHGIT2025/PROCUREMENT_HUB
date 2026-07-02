// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';
// export default defineConfig({ plugins: [react()], server: { port: 5173 } });
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // ✅ network access (10.10.50.23)
    port: 5173,        // ✅ localhost:5173 
      strictPort: true, 
  }
});
