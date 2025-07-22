import auth from '../../config/auth.js';
import { populateUsers } from '../../db/database.js';
const { adminDiscordId } = auth;
export async function populate(inboundMessage) {
    if (inboundMessage.author.id !== adminDiscordId) {
        inboundMessage.channel.send('You need to be mahloola to use this command.');
        return;
    } else {
        await populateUsers();
    }
}
