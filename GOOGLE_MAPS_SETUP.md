# Setting Up Google Maps for GeoAttend Route Tracking

The GeoAttend application now supports route tracking for students to visualize their path to class. To enable this feature, you need to set up a Google Maps API key.

## Getting a Google Maps API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to the "APIs & Services" dashboard
4. Click on "Enable APIs and Services"
5. Search for and enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
   - Geocoding API
6. Go to "Credentials" and click "Create Credentials" > "API Key"
7. Copy the generated API key

## Configuring the API Key in GeoAttend

1. Open the `.env.local` file in the root of your project
2. Add the following line with your API key:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
   ```
3. Save the file

## Update the StudentRouteMap Component

1. Open `src/components/student/StudentRouteMap.tsx`
2. Find this line in the `loadGoogleMapsApi` function:
   ```javascript
   script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places,geometry`;
   ```
3. Replace it with:
   ```javascript
   script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
   ```

## Securing Your API Key

For security, make sure to:

1. Restrict your API key to specific websites in the Google Cloud Console
2. Add HTTP referrer restrictions to prevent unauthorized use
3. Monitor your API usage in the Cloud Console
4. NEVER commit your actual API key to your code repository

## Testing the Map Integration

Once configured, students will see a "Show Route to Class" button when marking attendance. Clicking this will:

1. Display a Google Map showing their current location and the class location
2. Draw the walking route between these points
3. Show distance information and estimated arrival time
4. Allow real-time tracking of their movement
5. Record the path taken to class

## Troubleshooting

If the map doesn't load properly:

1. Check the browser console for errors
2. Verify the API key is correctly set in `.env.local`
3. Ensure all required Google APIs are enabled in the Cloud Console
4. Check that your API key has no usage restrictions preventing it from working
5. Verify that the device has location services enabled and permissions granted 