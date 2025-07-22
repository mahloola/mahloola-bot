const getRandomPlayer = async (db: FirebaseFirestore.Firestore) => {
    let player;
    // get a random player (rank 1 - 10,000)
    while (!player) {
        const querySnapshot = await db
            .collection('players')
            .where('rollIndex', '>', Math.floor(Math.random() * 9_223_372_036_854)) // big brain (assign random indexes to work around deleted users)
            .limit(1)
            .get();
        player = querySnapshot.size > 0 ? (querySnapshot.docs[0].data() as any) : null;
    }
    return player;
};

export default getRandomPlayer;
