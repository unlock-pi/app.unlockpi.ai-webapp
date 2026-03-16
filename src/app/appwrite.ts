import { Client, Account } from 'appwrite';

export const client = new Client();

client
    .setEndpoint('https://sgp.cloud.appwrite.io/v1')
    .setProject('unlockpi'); // Replace with your project ID

export const account = new Account(client);
export { ID } from 'appwrite';
