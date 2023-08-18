const express = require('express');
const { google } = require('googleapis');
const fs = require('fs');
const app = express();
const moment = require('moment-timezone'); // Import the moment-timezone library

const PORT = 3000;

// Your credentials from Google Cloud Console
const credentials = {
  // Your client ID and client secret
  client_id: '136949416397-00njlqn4ot9seoa8lmcvi3fj3ff8g6kr.apps.googleusercontent.com',
  client_secret: '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',
  // Redirect URIs should match the one you set in the Google Cloud Console
  redirect_uris: ['http://localhost:3000/auth-callback'],
};

const oAuth2Client = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  credentials.redirect_uris[0]
);

// Generate the authorization URL and print it
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
});

// Handle the authorization callback
app.get('/auth-callback', (req, res) => {
  const code = req.query.code;
  if (code) {
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        console.error('Error retrieving access token', err);
        res.status(500).send('Error retrieving access token');
        return;
      }
      oAuth2Client.setCredentials(token);
      // Store the token for later use
      // Here you should store the token securely (e.g., in a database)
      // for subsequent API requests.
      // Store the token locally
      fs.writeFileSync('./token.json', JSON.stringify(token));
      console.log('Access token retrieved and stored:', token);
      res.send('Authorization successful!');
    });
  } else {
    res.status(400).send('Missing authorization code.');
  }
});

// Create an event
app.get('/create-event', (req, res) => {
  // Use the access token to make API requests
  // Load the stored token from the local file
  const storedToken = require('./token.json');
  oAuth2Client.setCredentials(storedToken);

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  // Get the current time in Kolkata (IST)
  const now = moment.tz('Asia/Kolkata');

  // Add 1 hour to the current time for the event's start and end times
  const startTime = now.clone().add(1, 'hours');
  const endTime = startTime.clone().add(2, 'hours');

  const event = {
    summary: 'Sample Event',
    description: 'This is a sample event created using the Google Calendar API.',
    start: {
      dateTime: startTime.format(), // Format the time in ISO 8601
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: endTime.format(), // Format the time in ISO 8601
      timeZone: 'Asia/Kolkata',
    },
     // Conference details for Google Meet
     conferenceData: {
      createRequest: {
        requestId: 'random-string', // Unique string identifier for the request
      },
    },
  };

  calendar.events.insert(
    {
      calendarId: 'primary', // Use 'primary' to add the event to the user's primary calendar
      resource: event,
      conferenceDataVersion: 1, // Conference data version
    },
    (err, result) => {
      if (err) {
        console.error('Error creating event:', err);
        res.status(500).send('Error creating event');
        return;
      }
      console.log('Event created:', result.data.htmlLink);
      res.send('Event created: ' + result.data.htmlLink);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log('Authorize this app by visiting this URL:', authUrl);
});
