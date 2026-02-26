// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDPoFq-i36w87HvgwWoNRhoJg4qAzJM-BI",
  authDomain: "fabrics-91782.firebaseapp.com",
  projectId: "fabrics-91782",
  storageBucket: "fabrics-91782.firebasestorage.app",
  messagingSenderId: "260859565414",
  appId: "1:260859565414:web:fcbe5b9be31d5af12e24a7",
  measurementId: "G-NG9PTFK2S7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);