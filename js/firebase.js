import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { UIElements } from './ui.js';

const firebaseConfig = {
  apiKey: "AIzaSyB5He-ZOIeXr9Fa76YyVf8lNrq99-BUIAw",
  authDomain: "mindmeld-78456.firebaseapp.com",
  projectId: "mindmeld-78456",
  storageBucket: "mindmeld-78456.appspot.com",
  messagingSenderId: "87687271158",
  appId: "1:87687271158:web:d857e0e522365263c452d7",
  measurementId: "G-3V5YL6YDFS"
};

export const appId = firebaseConfig.projectId;
export let db, auth;
let currentUserId = null;

export function getCurrentUserId() {
    return currentUserId;
}

export function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUserId = user.uid;
                console.log("User authenticated:", currentUserId);
            }
        });

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        UIElements.homeError.textContent = "Error connecting to server. Please refresh.";
    }
}

export async function authenticateUser() {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        UIElements.homeError.textContent = "Authentication failed. Please refresh.";
    }
}

