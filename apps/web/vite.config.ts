import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// relative base so it works at raghava1096.github.io/mybuddy/
export default defineConfig({
  plugins: [react()],
  base: './',
})
