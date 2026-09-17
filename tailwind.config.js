/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3D1F5C',
          light: '#5A3580',
          dark: '#2A1540',
        },
        secondary: {
          DEFAULT: '#6B2FA0',
          light: '#8B4FC0',
        },
        accent: {
          DEFAULT: '#D6208F',
          light: '#E8579E',
        },
        blush: {
          DEFAULT: '#FBE4EC',
          light: '#FDF0F5',
        },
        warmwhite: {
          DEFAULT: '#FFF9FB',
        },
        ink: {
          DEFAULT: '#2A1B3D',
        },
        muted: {
          DEFAULT: '#8A7B92',
        },
        danger: {
          DEFAULT: '#E0563D',
        },
        success: {
          DEFAULT: '#3FA37E',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
        body: ['Inter', 'Nunito', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
