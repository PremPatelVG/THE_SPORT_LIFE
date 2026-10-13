// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     allowedHosts: ['.ngrok-free.dev'],
//   },
// })

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react' // or vue, etc.

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This allows external access
    allowedHosts: [
      'documented-patient-palmer-copying.trycloudflare.com',
      // 'staging.thesportlife.com'
    ]
  }
})