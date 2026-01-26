import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  // @ts-ignore
  getReactNativePersistence,
  initializeAuth
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyBjEHyNWYfhZxJ4qHuPJFr6sz8zY0LEIco",
  authDomain: "vivaservice-84e7e.firebaseapp.com",
  projectId: "vivaservice-84e7e",
  storageBucket: "vivaservice-84e7e.appspot.com",
  messagingSenderId: "621623490789",
  appId: "1:621623490789:web:bc97788ffb15eba9873c0c",
  measurementId: "G-S81DKCJ33S"
};

// 1. Khởi tạo App (tránh khởi tạo lại nhiều lần)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// 2. Khởi tạo Auth dựa trên nền tảng (Platform)
let auth;
if (Platform.OS === 'web') {
  // Nếu là Web: Dùng getAuth tiêu chuẩn
  auth = getAuth(app);
} else {
  // Nếu là Smartphone: Bắt buộc dùng Persistence với AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const db = getFirestore(app);

export { auth, db };

