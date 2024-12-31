const { google } = require('googleapis');
const config = require('../utils/config');
const logger = require('../utils/logger');

async function fetchEmails() {
    const { user, pass } = config.gmail;

    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
    const messages = response.data.messages || [];

    const emails = [];
    for (const message of messages) {
        const email = await gmail.users.messages.get({ userId: 'me', id: message.id });
        const payload = email.data.payload;
        const headers = payload.headers.reduce((acc, header) => {
            acc[header.name] = header.value;
            return acc;
        }, {});
        emails.push({
            subject: headers.Subject,
            body: payload.parts?.[0]?.body?.data || '',
            attachments: payload.parts?.filter(part => part.filename) || [],
        });
    }

    logger.info('Fetched emails successfully.');
    return emails;
}

module.exports = { fetchEmails };
