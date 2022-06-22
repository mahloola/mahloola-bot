import { populateUsers } from '../../db/database';
import { adminDiscordId } from '../../auth.json';
export async function populate(inboundMessage) {
    if (inboundMessage.author.id !== adminDiscordId) {
        inboundMessage.channel.send('You need to be mahloola to use this command.');
        return;
    } else {
        await populateUsers();
    }
}
