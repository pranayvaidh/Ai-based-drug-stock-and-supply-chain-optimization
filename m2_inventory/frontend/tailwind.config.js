import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{js,jsx}'),
    path.join(root, 'm1_auth_lucky/frontend/**/*.{js,jsx}'),
    path.join(root, 'm4_dashboard_pranay/frontend/**/*.{js,jsx}'),
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff', 100: '#d9edff', 200: '#bce0ff', 300: '#8ecdff', 400: '#59b0ff',
          500: '#338dfc', 600: '#1d6ef1', 700: '#1558de', 800: '#1847b4', 900: '#1a3f8d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
