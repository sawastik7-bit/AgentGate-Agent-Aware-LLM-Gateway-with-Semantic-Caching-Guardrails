// config/roles.js
export const ROLE_PERMISSIONS = {
  admin: [
    'get_weather', 
    'get_geolocation', 
    'convert_currency', 
    'execute_database_query' // Restricted admin-only tool
  ],
  employee:[  // for the employees
    'get_weather', 
    'get_geolocation', 
    'convert_currency'
  ],
  user: [
    'get_weather' // Users can only check weather
  ]
};