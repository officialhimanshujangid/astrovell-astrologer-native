import axios from 'axios';

/**
 * A dedicated location service using OpenStreetMap (Nominatim).
 * This acts as a reliable alternative to the failing backend location API.
 */
class LocationService {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://nominatim.openstreetmap.org',
      timeout: 10000,
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'AstrologyApp/1.0' // Nominatim requires a User-Agent
      }
    });
  }

  /**
   * Search for places (Autocomplete style)
   * @param {string} query 
   */
  async search(query) {
    if (!query || query.length < 2) return [];
    try {
      const response = await this.client.get('/search', {
        params: {
          q: query,
          format: 'json',
          addressdetails: 1,
          limit: 10,
          countrycodes: 'in' // Prioritize India for this app
        }
      });

      return response.data.map(item => ({
        name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        description: item.display_name,
        type: item.type,
        address: item.address
      }));
    } catch (error) {
      console.error('[LocationService] Search Error:', error.message);
      return [];
    }
  }

  /**
   * Get coordinates for a specific place name
   * @param {string} placeName 
   */
  async geocode(placeName) {
    const results = await this.search(placeName);
    if (results.length > 0) {
      return {
        latitude: results[0].lat,
        longitude: results[0].lon
      };
    }
    return null;
  }
}

export const locationService = new LocationService();
