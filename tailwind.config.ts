import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tesco-inspired palette: primary brand blue and supporting red
        brand: {
          50: '#eaf3fb',
          100: '#d7e8f7',
          200: '#aecded',
          300: '#85b3e3',
          400: '#5c98d9',
          500: '#2f7fcc',
          600: '#00539F', // Tesco Blue
          700: '#004b8f',
          800: '#00407a',
          900: '#002e58'
        },
        tescoRed: {
          50: '#fee9ec',
          100: '#fecfd6',
          200: '#f99eab',
          300: '#f26c80',
          400: '#ef3f59',
          500: '#EE1C2E', // Tesco Red
          600: '#d7192a',
          700: '#b71424',
          800: '#97101d',
          900: '#6c0b14'
        }
      }
    }
  },
  plugins: []
}

export default config
