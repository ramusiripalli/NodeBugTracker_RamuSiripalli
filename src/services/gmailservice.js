const { google } = require('googleapis');
const { JSDOM } = require('jsdom');
const logger = require('../utils/logger');

async function fetchEmails() {
    const oauth2Client = new google.auth.OAuth2(
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        process.env.REDIRECT_URI
    );
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fetch recent messages
    const response = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
    const messages = response.data.messages || [];

    const emails = [];
    for (const message of messages) {
        const email = await gmail.users.messages.get({ userId: 'me', id: message.id });
        const payload = email.data.payload;

        // Extract headers
        const headers = payload.headers.reduce((acc, header) => {
            acc[header.name.toLowerCase()] = header.value;
            return acc;
        }, {});

        // Extract body content
        const extractBody = (parts) => {
            for (const part of parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.mimeType === 'text/html' && part.body?.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                } else if (part.parts) {
                    const body = extractBody(part.parts);
                    if (body) return body;
                }
            }
            return null;
        };

        let body = '';
        if (payload.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
        } else if (payload.parts) {
            body = extractBody(payload.parts) || '(No Body Content)';
        }

        // Parse HTML to plain text if needed
        let plainTextBody = body;
        if (body.startsWith('<')) {
            const dom = new JSDOM(body);
            plainTextBody = dom.window.document.body.textContent || '';
        }

        // Extract attachments
        const attachments = [];
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.filename && part.body?.attachmentId) {
                    try {
                        const attachment = await gmail.users.messages.attachments.get({
                            userId: 'me',
                            messageId: message.id,
                            id: part.body.attachmentId,
                        });

                        attachments.push({
                            filename: part.filename,
                            mimeType: part.mimeType,
                            data: Buffer.from(attachment.data.data, 'base64'),
                        });
                    } catch (error) {
                        logger.error(`Error fetching attachment ${part.filename}: ${error.message}`);
                    }
                }
            }
        }

        // Add email to the list
        emails.push({
            subject: headers.subject || '(No Subject)',
            body: plainTextBody || '(No Body Content)',
            attachments,
        });
    }

    logger.info('Fetched emails successfully.');
    return emails;
}

module.exports = { fetchEmails };
