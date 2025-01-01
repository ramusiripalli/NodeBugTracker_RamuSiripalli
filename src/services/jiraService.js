const JiraClient = require('jira-client');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../utils/config');
const logger = require('../utils/logger');

const jira = new JiraClient({
    protocol: 'https',
    host: config.jira.host,
    username: config.jira.user,
    password: config.jira.apiToken,
    apiVersion: '2',
    strictSSL: true,
});

async function createJiraTicket(subject, body, attachments = []) {
    try {
        const issue = await jira.addNewIssue({
            fields: {
                project: { key: config.jira.projectKey },
                summary: subject,
                description: body,
                issuetype: { name: 'Bug' },
            },
        });

        logger.info(`Created Jira ticket: ${issue.key}`);

        if (attachments.length > 0) {
            for (const attachment of attachments) {
                const form = new FormData();
                form.append('file', attachment.data, attachment.filename);

                const response = await axios.post(
                    `https://${config.jira.host}/rest/api/2/issue/${issue.key}/attachments`,
                    form,
                    {
                        headers: {
                            ...form.getHeaders(),
                            Authorization: `Basic ${Buffer.from(
                                `${config.jira.user}:${config.jira.apiToken}`
                            ).toString('base64')}`,
                            'X-Atlassian-Token': 'no-check',
                        },
                    }
                );

                if (response.status === 200 || response.status === 201) {
                    logger.info(`Uploaded attachment: ${attachment.filename}`);
                } else {
                    logger.error(`Failed to upload attachment: ${attachment.filename}`);
                }
            }
        }

        return `https://${config.jira.host}/browse/${issue.key}`;
    } catch (error) {
        logger.error(`Failed to create Jira ticket: ${error.message}`);
        throw error;
    }
}

module.exports = { createJiraTicket };
