const admin = require('firebase-admin');
const { initializeFirebase } = require('./firebase');
const logger = require('../utils/logger');

let db;
(async () => {
    const firebase = await initializeFirebase();
    db = firebase.db;
})();

const collections = {
    users: 'users',
    posts: 'posts',
    comments: 'comments',
    reports: 'reports',
    auditLogs: 'auditLogs',
    blockedUsers: 'blockedUsers',
    notifications: 'notifications',
    friendRequests: 'friendRequests',
    friends: 'friends',
    savedSearches: 'savedSearches',
};

const ensureDbInitialized = async () => {
    if (!db) {
        logger.error('Firestore is not initialized. Reinitializing...');
        const firebase = await initializeFirebase();
        db = firebase.db;
    }
    return db;
};

const createDocument = async (collection, data) => {
    try {
        const db = await ensureDbInitialized();
        const docRef = await db.collection(collection).add(data);
        return docRef.id;
    } catch (error) {
        logger.error(`Error creating document in ${collection}:`, error);
        throw error;
    }
};

const getDocument = async (collection, id) => {
    try {
        const db = await ensureDbInitialized();
        const docRef = await db.collection(collection).doc(id).get();
        return docRef.exists ? { id: docRef.id, ...docRef.data() } : null;
    } catch (error) {
        logger.error(`Error fetching document ${id} from ${collection}:`, error);
        throw error;
    }
};

const updateDocument = async (collection, id, data) => {
    try {
        const db = await ensureDbInitialized();
        await db.collection(collection).doc(id).update(data);
    } catch (error) {
        logger.error(`Error updating document ${id} in ${collection}:`, error);
        throw error;
    }
};

const deleteDocument = async (collection, id) => {
    try {
        const db = await ensureDbInitialized();
        await db.collection(collection).doc(id).delete();
    } catch (error) {
        logger.error(`Error deleting document ${id} from ${collection}:`, error);
        throw error;
    }
};

const queryDocuments = async (collection, field, operator, value) => {
    try {
        const db = await ensureDbInitialized();
        const snapshot = await db.collection(collection).where(field, operator, value).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        logger.error(`Error querying documents from ${collection}:`, error);
        throw error;
    }
};

const runTransaction = async (transactionFn) => {
    try {
        const db = await ensureDbInitialized();
        return await db.runTransaction(transactionFn);
    } catch (error) {
        logger.error('Error running Firestore transaction:', error);
        throw error;
    }
};

const incrementField = (value) => {
    return admin.firestore.FieldValue.increment(value);
};

const arrayUnion = (value) => {
    return admin.firestore.FieldValue.arrayUnion(value);
};

const arrayRemove = (value) => {
    return admin.firestore.FieldValue.arrayRemove(value);
};

const serverTimestamp = () => {
    return admin.firestore.FieldValue.serverTimestamp();
};

module.exports = {
    collections,
    createDocument,
    getDocument,
    updateDocument,
    deleteDocument,
    queryDocuments,
    runTransaction,
    incrementField,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
};