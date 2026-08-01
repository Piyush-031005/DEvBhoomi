export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0a0a0a',
        ash: '#f4f4f5',
        bone: '#e5e5e5',
        copper: '#315c54',
        gold: '#cfb53b',
        maroon: '#3d0c02',
        blood: '#8a0303',
        fog: '#8a9596'
      },
      fontFamily: {
        'sans-editorial': ['"Inter"', 'sans-serif'],
        'serif-hero': ['"Playfair Display"', 'serif'],
      },
      fontSize: {
        '10xl': '10rem',
        '11xl': '12rem',
        '12xl': '14rem',
      }
    },
  },
  plugins: [],
}
