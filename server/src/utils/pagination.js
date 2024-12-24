const paginateQuery = async (query, startAfterDoc = null, limit = 20) => {
    if (startAfterDoc) {
        query = query.startAfter(startAfterDoc).limit(limit);
    } else {
        query = query.limit(limit);
    }
    const snapshot = await query.get();
    return snapshot;
};

export default { paginateQuery };