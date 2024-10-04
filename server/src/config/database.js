const admin = require('firebase-admin');
const { db } = require('./firebase');

const collections = {
    users: 'users',
    posts: 'posts',
    comments: 'comments'
};

const createDocument = async (collection, data) => {
    const docRef = await db.collection(collection).add(data);
    return docRef.id;
};

const getDocument = async (collection, id) => {
    const docRef = await db.collection(collection).doc(id).get();
    return docRef.exists ? { id: docRef.id, ...docRef.data() } : null;
};

const updateDocument = async (collection, id, data) => {
    await db.collection(collection).doc(id).update(data);
};

const deleteDocument = async (collection, id) => {
    await db.collection(collection).doc(id).delete();
};

const queryDocuments = async (collection, queryFn) => {
    const snapshot = await queryFn(db.collection(collection)).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

const runTransaction = async (transactionFn) => {
    return db.runTransaction(transactionFn);
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
    serverTimestamp
};