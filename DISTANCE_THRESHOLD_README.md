# Location-Based Attendance: Distance Threshold Guide

The GeoAttend application now includes improved distance threshold verification that provides students with clear feedback when marking attendance. This document explains how the distance threshold feature works and how to configure it.

## How it Works

1. **Distance Calculation**: GeoAttend calculates the distance between the student's current location and the class location using the Haversine formula, which accounts for the Earth's curvature.

2. **Visual Indicators**: Students now see:
   - A distance indicator showing how far they are from the class location
   - A progress bar showing their distance relative to the threshold
   - Color-coded indicators (green for within range, amber for out of range)
   - Clear messages about whether they meet the distance requirements

3. **Timeout Protection**: The system now includes protection against hanging verification processes. If verification takes more than 30 seconds, it will automatically time out and prompt the student to try again.

## For Lecturers: Setting Distance Thresholds

Lecturers can set custom distance thresholds for each class:

1. When creating a class, specify the `distanceThreshold` value in meters
2. The default threshold is 100 meters if not specified
3. Smaller values (e.g., 50m) require students to be closer to the class location
4. Larger values (e.g., 200m) allow students to mark attendance from further away

## For Students: Understanding Distance Feedback

As a student, you'll now see clearer feedback when marking attendance:

1. **Within Range**: If you're within the required distance threshold, you'll see a green indicator and can mark attendance successfully.

2. **Out of Range**: If you're outside the threshold, you'll see:
   - An amber indicator
   - The exact distance you are from the class (e.g., "You are 150m away")
   - The required threshold (e.g., "Maximum allowed distance is 100m")
   - A suggestion to move closer to the class location

3. **Location Accuracy**: The system shows your location accuracy (e.g., "±15m accuracy"). For best results, ensure your device has good GPS signal.

## Troubleshooting

If you encounter issues with the distance threshold:

1. **Location Not Available**: Make sure your device's location services are enabled and you've granted permission to the application.

2. **Inaccurate Location**: If your device shows poor location accuracy (e.g., "±100m accuracy"), try moving to an area with better GPS reception or switch to a device with better location services.

3. **Verification Timeout**: If the verification process times out, try again or use QR code check-in as an alternative method.

4. **Distance Discrepancy**: If you believe you are within the threshold but the system says otherwise, this may be due to:
   - GPS inaccuracy
   - Incorrect class location coordinates
   - Building interference with GPS signals

For technical support, contact your institution's administrator with specific error messages or screenshots showing the distance calculation. 