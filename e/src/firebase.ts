import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
apiKey: "AIzaSyBtMhp95EbLAC2wuCsEABIJCmPp280Hbps",
  authDomain: "inventory-a63b8.firebaseapp.com",
  projectId: "inventory-a63b8",
  storageBucket: "inventory-a63b8.firebasestorage.app",
  messagingSenderId: "702685493566",
  appId: "1:702685493566:web:2c0557ffe5077c4a61546f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
