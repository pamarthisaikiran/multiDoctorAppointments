import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBCqTRlkWHINujkD8byEfFv0WI0M8pjkOA",
    authDomain: "sai123-54d82.firebaseapp.com",
    projectId: "sai123-54d82",
    storageBucket: "sai123-54d82.appspot.com",
    messagingSenderId: "657061317710",
    appId: "1:657061317710:web:a3b070f5ba9f4d4dab871f",
    measurementId: "G-P60049Z6Y3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };