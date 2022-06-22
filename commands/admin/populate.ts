import { populateUsers } from '../../db/database';

export async function populate(inboundMessage) {
    await populateUsers();
}
