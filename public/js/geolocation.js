// Geolocation utility
const GeoLocation = {
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    });
  },

  async getNearbyWorkers(latitude, longitude, radius = 50) {
    try {
      const response = await fetch(
        `/workers/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch nearby workers');
      }

      return await response.json();
    } catch (error) {
      console.error('Get nearby workers error:', error);
      throw error;
    }
  },

  async requestLocationPermission() {
    try {
      const position = await this.getCurrentPosition();
      return { success: true, position };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        code: error.code 
      };
    }
  }
};