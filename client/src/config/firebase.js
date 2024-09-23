import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAChPsOi0Vt4cvfdx7BAy75mitvx3IHn1Q",
    authDomain: "facebook-clone-3d881.firebaseapp.com",
    projectId: "facebook-clone-3d881",
    storageBucket: "facebook-clone-3d881.appspot.com",
    messagingSenderId: "586945253757",
    appId: "1:586945253757:web:99252b78ab166191a0fc14",
    measurementId: "G-9L20SJ16J5"
  };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };