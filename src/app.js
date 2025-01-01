const { fetchEmails } = require('./services/gmailservice');
const { createJiraTicket } = require('./services/jiraService');
const logger = require('./utils/logger');

async function main() {
    try {
        const emails = await fetchEmails();
        for (const email of emails) {
            const ticketUrl = await createJiraTicket(email.subject, email.body, email.attachments);
        }
    } catch (error) {
        logger.error(`Error: ${error.message}`);
    }
}

main();
