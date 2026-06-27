// API Configuration
export const API_URL = window.location.hostname === 'localhost' 
  ? "http://localhost:3000/api" 
  : `http://${window.location.hostname}:3000/api`;
