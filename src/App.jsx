import React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useLocalStorage, clearLocalStorage, getLocalStorageSize } from "./hooks/useLocalStorage";
import { Share } from '@capacitor/share';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Browser } from '@capacitor/browser';
import { db, auth as firebaseAuth, isFirebaseConfigured } from "./firebase";
import { doc, getDoc, setDoc, collection, query, where, getDocs, onSnapshot, updateDoc } from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const COLLECTION_CAMPEONATOS = "campeonatos";


/* ─────────────────────────── ÍCONES SVG OUTLINE ─────────────────────────── */
const IconClipboard = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

const IconCalendar = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const IconSettings = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const IconGlobe = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const IconCloud = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
  </svg>
);

const IconCrown = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/>
    <path d="M5 20h14"/>
  </svg>
);

const IconHandshake = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 18h4"/>
    <path d="M14 6H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>
    <path d="M12 2v4"/>
    <path d="M12 16v6"/>
    <path d="M8 12h8"/>
  </svg>
);

const IconAlertCircle = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconSearch = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconUpload = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const IconDownload = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const IconFile = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>
);

const IconEdit = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconRefresh = ({size=18,color="currentColor",style={}}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M23 4v6h-6"/>
    <path d="M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

const IconBallFutsal = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M6.2 6.2c2.4-2.4 6-2.4 8.4 0m-8.4 8.4c2.4 2.4 6 2.4 8.4 0m-8.4-8.4c-2.4 2.4-2.4 6 0 8.4m8.4-8.4c2.4 2.4 2.4 6 0 8.4"/>
  </svg>
);

const IconBallVolley = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 2a10 10 0 0 0-5.3 1.5M12 22a10 10 0 0 0 5.3-1.5M2.5 12a10 10 0 0 0 1.5 5.3M21.5 12a10 10 0 0 0-1.5-5.3"/>
  </svg>
);

const IconGoalNet = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="14" rx="1"/>
    <path d="M6 6v14M18 6v14M2 11h20M2 16h20"/>
  </svg>
);

const IconBallBasket = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M6.2 6.2C7.8 7.8 7.8 10.2 6.2 11.8M17.8 6.2c-1.6 1.6-1.6 4 0 5.6M12 2v20M2 12h20"/>
  </svg>
);

const IconPlayerHandball = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="5" r="2"/>
    <path d="M6 20h3l2-6 2-3h3"/>
    <path d="M15 11l4-2"/>
    <path d="M8 12l2 3-4 5"/>
  </svg>
);

const IconGoalkeeper = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 14V3a2 2 0 0 1 4 0v11"/>
    <path d="M6 14V6a2 2 0 0 1 4 0v8"/>
    <path d="M14 14V5a2 2 0 0 1 4 0v9"/>
    <path d="M18 14V8a2 2 0 0 1 4 0v6a8 8 0 0 1-16 0V11a2 2 0 0 1 4 0v3"/>
  </svg>
);

const IconPrinter = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IconWallet = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h14v4"/>
    <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/>
    <path d="M18 12a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v-6h-4z"/>
  </svg>
);

const IconSoccer = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="m12 2-2.5 3.5H7M12 2l2.5 3.5h2.5M12 22l-2.5-3.5H7M12 22l2.5-3.5h2.5M2 12l3.5-2.5V7M2 12l3.5 2.5v2.5M22 12l-3.5-2.5V7M22 12l-3.5 2.5v2.5"/>
    <polygon points="12,9.5 14,11 13,13.5 11,13.5 10,11"/>
  </svg>
);

const IconUsers = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconDatabase = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
  </svg>
);

const IconTrophy = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"/>
    <path d="M12 2a7 7 0 0 0-7 7c0 2.58 1.37 4.83 3.42 6.08a7 7 0 0 0 7.16 0A6.98 6.98 0 0 0 19 9a7 7 0 0 0-7-7z"/>
  </svg>
);

const IconShield = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const IconSun = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const IconMoon = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const IconHome = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const IconTrash = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const IconPlus = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconCheck = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const IconX = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconUser = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const IconLogout = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const IconLock = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const IconMail = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconPhone = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconInfo = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="16" x2="12" y2="12"/>
    <line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
);

const IconShare = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

const IconCamera = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const IconActivity = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const IconClock = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const IconMapPin = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-10a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconStar = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{display: "inline-block", verticalAlign: "middle"}}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const IconStarFilled = ({size=18,color="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{display: "inline-block", verticalAlign: "middle"}}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

/* ─────────────────────────── CONSTANTES ─────────────────────────── */
const COLORS = ["#1D9E75","#22b7d9","#D85A30","#7F77DD","#BA7517","#D4537E","#639922","#E24B4A","#5F5E5A","#0F6E56"];
const MODALIDADES_ESPORTIVAS = [
  { id: "Futsal",   label: "Futsal",   icon: <IconBallFutsal />, color: "#22b7d9" },
  { id: "Vôlei",   label: "Vôlei",    icon: <IconBallVolley />, color: "#D85A30" },
  { id: "Society",  label: "Society",  icon: <IconGoalNet />, color: "#1D9E75" },
  { id: "Basquete", label: "Basquete", icon: <IconBallBasket />, color: "#BA7517" },
  { id: "Handebol", label: "Handebol", icon: <IconPlayerHandball />, color: "#7F77DD" },
];

const deepClone = o => JSON.parse(JSON.stringify(o));
const fmtDate = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
const fmtCur  = v => `R$ ${Number(v||0).toFixed(2).replace(".",",")}`;
const todayStr= () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const SKILL_COLORS = ["#888","#BA7517","#22b7d9","#1D9E75","#D85A30"];
const SKILL_NAMES  = ["Iniciante","Básico","Intermediário","Avançado","Elite"];
const LIGHT = { bg: "#F3F4F6", card: "#ffffff", cardBorder: "#E5E7EB", inputBg: "#F9FAFB", inputBorder: "#D1D5DB", inputColor: "#1A1C23", text: "#1A1C23", textSec: "#6B7280", tabBorder: "#E5E7EB" };
const DARK  = { bg: "#000000", card: "#0B0D11", cardBorder: "#1B1E24", inputBg: "#12141A", inputBorder: "#1F242C", inputColor: "#F5F6F8", text: "#F5F6F8", textSec: "#8E929E", tabBorder: "#1B1E24" };

function useTheme(){ 
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme_dark");
    return saved !== null ? saved === "true" : true;
  });
  const toggleDark = (value) => {
    setDark(prev => {
      const next = typeof value === 'function' ? value(prev) : value;
      localStorage.setItem("theme_dark", next ? "true" : "false");
      return next;
    });
  };
  return { dark, setDark: toggleDark, t: dark ? DARK : LIGHT }; 
}
function makeStyles(t){
  const isDark = t.bg === "#0F1116";
  const scale = typeof window !== 'undefined' ? (parseFloat(localStorage.getItem("app_font_scale")) || 1.0) : 1.0;
  
  const fs = (base) => Math.round(base * scale);
  const pad = (str) => {
    if (scale === 1.0) return str;
    return str.replace(/(\d+)px/g, (match, p1) => {
      return Math.round(parseInt(p1) * scale) + "px";
    });
  };

  return{
    page:  {minHeight:"100vh",padding:pad("24px 0"),maxWidth:1200,margin:"0 auto",background:t.bg,color:t.text,fontFamily:"'Inter', sans-serif"},
    card:  {background:t.card,borderRadius:12,padding:pad("24px"),border:"1px solid " + t.cardBorder,boxShadow:!isDark?"0 4px 20px rgba(0,0,0,0.04)":"none",transition:"all 0.25s"},
    input: {padding:pad("10px 14px"),borderRadius:8,border:"1px solid " + t.inputBorder,fontSize:fs(14),background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none",transition:"all 0.2s ease",focus:{borderColor:t.accent}},
    select:{padding:pad("10px 14px"),borderRadius:8,border:"1px solid " + t.inputBorder,fontSize:fs(14),background:t.inputBg,color:t.inputColor,width:"100%",boxSizing:"border-box",outline:"none",transition:"all 0.2s ease"},
    btn:   (bg,c)=>{
      const backColor = bg || t.accent || "#22b7d9";
      const isNeonGreen = backColor.toLowerCase() === "#20e278" || backColor.toLowerCase() === "#00e676" || backColor.toLowerCase() === "#1d9e75" || backColor.toLowerCase() === "#06aa48";
      const textColor = c || (isNeonGreen ? "#0F1116" : "#fff");
      return {
        padding:pad("10px 18px"),
        borderRadius:12,
        border:"none",
        background:backColor,
        color:textColor,
        cursor:"pointer",
        fontWeight:700,
        fontSize:fs(14),
        display:"inline-flex",
        alignItems:"center",
        justifyContent:"center",
        gap:6,
        transition:"all 0.2s ease",
        boxShadow: isNeonGreen && !isDark ? "0 4px 12px rgba(6, 170, 72, 0.25)" : "none"
      };
    },
    btnSm: (bg,c)=>{
      const backColor = bg || t.inputBg;
      const isNeonGreen = backColor.toLowerCase() === "#20e278" || backColor.toLowerCase() === "#00e676" || backColor.toLowerCase() === "#06aa48";
      const textColor = c || (isNeonGreen ? "#0F1116" : t.text);
      return {
        padding:pad("6px 14px"),
        borderRadius:12,
        border:"1px solid " + t.cardBorder,
        background:backColor,
        color:textColor,
        cursor:"pointer",
        fontWeight:700,
        fontSize:fs(12),
        transition:"all 0.2s ease"
      };
    },
    label: {fontSize:fs(11),color:t.textSec,fontWeight:800,textTransform:"uppercase",letterSpacing:0.8,marginBottom:6,display:"block"},
    tab:   a=>({
      padding:pad("10px 16px"),
      border:"none",
      borderBottom:a?("3px solid " + (t.accent||"#20E278")):"3px solid transparent",
      background:"none",
      color:a?t.text:t.textSec,
      cursor:"pointer",
      fontSize:fs(13),
      fontWeight:a?800:600,
      letterSpacing:"0.6px",
      textTransform:"uppercase",
      whiteSpace:"nowrap",
      transition:"all 0.2s ease"
    }),
    layoutContainer: isMobile => ({
      display: "flex",
      gap: pad("20px"),
      flexDirection: isMobile ? "column" : "row",
      alignItems: "flex-start",
      width: "100%",
      marginTop: pad("8px")
    }),
    sidebarLeft: isMobile => ({
      width: isMobile ? "100%" : pad("280px"),
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("16px"),
      position: isMobile ? "static" : "sticky",
      top: pad("24px")
    }),
    sidebarRight: isMobile => ({
      width: isMobile ? "100%" : pad("300px"),
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("16px"),
      position: isMobile ? "static" : "sticky",
      top: pad("24px")
    }),
    mainContent: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      gap: pad("20px"),
      width: "100%"
    },
    sidebarItem: (active, activeColor) => ({
      display: "flex",
      alignItems: "center",
      gap: pad("10px"),
      padding: pad("10px 12px"),
      borderRadius: "12px",
      border: "none",
      background: active ? activeColor + "15" : "transparent",
      color: active ? activeColor : t.text,
      cursor: "pointer",
      textAlign: "left",
      fontSize: fs(13) + "px",
      fontWeight: active ? 700 : 500,
      width: "100%",
      transition: "all 0.2s ease"
    })
  };
}

/* ─────────────────────────── UTILS ──────────────────────────────── */
function cryptoShuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const b=new Uint32Array(1);crypto.getRandomValues(b);const j=b[0]%(i+1);[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
const formatarData = d => { if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric"}); };
const getAtletaById = (atletas,id) => atletas.find(a=>a.id===id);
const getParticipacoesByAtleta = (participacoes,aid) => participacoes.filter(p=>p.atleta_id===aid);
const getParticipacoesByData = (participacoes,did) => participacoes.filter(p=>p.data_realizacao_id===did);

const calcularEstatisticasData = (matchLog) => {
  const stats = {};
  const playedMatches = (matchLog || []).filter(m => m.played);
  
  playedMatches.forEach(m => {
    const scoreA = parseInt(m.scoreA) || 0;
    const scoreB = parseInt(m.scoreB) || 0;
    const sumula = m.sumula || {};

    (m.playersA || []).forEach(p => {
      const pId = p.id || p.atleta_id;
      if (!pId) return;
      if (!stats[pId]) {
        stats[pId] = { id: pId, nome: p.apelido || p.nome || `Atleta #${pId}`, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
      }
      const s = stats[pId];
      s.j++;
      s.gp += parseInt(sumula[pId]) || 0;
      s.gc += scoreB;
      if (scoreA > scoreB) {
        s.v++;
        s.pts += 3;
      } else if (scoreA === scoreB) {
        s.e++;
        s.pts += 1;
      } else {
        s.d++;
      }
    });

    (m.playersB || []).forEach(p => {
      const pId = p.id || p.atleta_id;
      if (!pId) return;
      if (!stats[pId]) {
        stats[pId] = { id: pId, nome: p.apelido || p.nome || `Atleta #${pId}`, j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0 };
      }
      const s = stats[pId];
      s.j++;
      s.gp += parseInt(sumula[pId]) || 0;
      s.gc += scoreA;
      if (scoreB > scoreA) {
        s.v++;
        s.pts += 3;
      } else if (scoreB === scoreA) {
        s.e++;
        s.pts += 1;
      } else {
        s.d++;
      }
    });
  });
  
  return Object.values(stats);
};

const calcularClassificacaoData = (teams, matchLog) => {
  if (!teams) return [];
  const st = teams.filter(Boolean).map(t => ({ name: t.name || "", j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, sg: 0, pts: 0 }));
  const playedMatches = (matchLog || []).filter(m => m.played);
  
  playedMatches.forEach(m => {
    const h = st.find(x => x.name === m.teamA);
    const a = st.find(x => x.name === m.teamB);
    if (!h || !a) return;
    const hs = parseInt(m.scoreA) || 0;
    const as2 = parseInt(m.scoreB) || 0;
    h.j++; a.j++;
    h.gp += hs; h.gc += as2;
    a.gp += as2; a.gc += hs;
    h.sg = h.gp - h.gc;
    a.sg = a.gp - a.gc;
    if (hs > as2) {
      h.v++; h.pts += 3; a.d++;
    } else if (hs === as2) {
      h.e++; h.pts++; a.e++; a.pts++;
    } else {
      a.v++; a.pts += 3; h.d++;
    }
  });
  return st.sort((a, b) => b.pts - a.pts || b.sg - a.sg || b.gp - a.gp);
};

function resizeImage(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width, height = img.height;
      if(width > height) { if(width > maxSize) { height *= maxSize / width; width = maxSize; } }
      else { if(height > maxSize) { width *= maxSize / height; height = maxSize; } }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.6));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function compressBase64(base64Str, maxSize, quality = 0.6) {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    // Se a imagem já for leve (menor que 20KB de Base64), não precisa processar de novo
    if (base64Str.length < 25000) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width, height = img.height;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = function() {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

async function otimizarTodoEstado(state) {
  const newState = { ...state };

  // 1. Otimizar atletas gerais (pelada)
  if (Array.isArray(newState.atletas)) {
    newState.atletas = await Promise.all(newState.atletas.map(async (atleta) => {
      let foto = atleta.foto;
      let docFoto = atleta.docFoto;
      if (foto) foto = await compressBase64(foto, 120, 0.6);
      if (docFoto) docFoto = await compressBase64(docFoto, 400, 0.6);
      return { ...atleta, foto, docFoto };
    }));
  }

  return newState;
}

const getPlayerName = a => {
  if (!a) return "";
  return a.apelido || a.nome || a.name || `Atleta #${a.id || 'Sem ID'}`;
};

const getDirectImageUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  // Converte links do OneDrive Embed para Download direto para renderizar como imagem/vídeo
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl.replace(/\/embed/i, "/download");
  }
  
  // Converte links curtos do OneDrive (1drv.ms) para Download direto
  // Substitui /v/s!, /i/s! ou /s! por /download?s=
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/download?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/download?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

const getOneDriveEmbedUrl = (url) => {
  if (!url) return "";
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  // Converte links do OneDrive Download para Embed
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("download")) {
    return cleanUrl.replace(/\/download/i, "/embed");
  }
  
  // Se for embed do OneDrive, retorna ele mesmo
  if (cleanUrl.toLowerCase().includes("onedrive.live.com") && cleanUrl.toLowerCase().includes("embed")) {
    return cleanUrl;
  }
  
  // Converte links curtos do OneDrive (1drv.ms) para Embed
  if (cleanUrl.toLowerCase().includes("1drv.ms")) {
    cleanUrl = cleanUrl.replace(/\/[vi]\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/s!/i, "/embed?s=");
    cleanUrl = cleanUrl.replace(/\/download\?s=/i, "/embed?s=");
    return cleanUrl;
  }
  
  return cleanUrl;
};

const isImageUrl = url => {
  if (!url) return false;
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  const cleanUrlLower = cleanUrl.toLowerCase();
  
  if (
    cleanUrlLower.startsWith("data:image/") || 
    cleanUrlLower.includes("images.unsplash.com") || 
    cleanUrlLower.includes("firebasestorage.googleapis.com") || 
    cleanUrlLower.includes("imgbb.com") ||
    cleanUrlLower.includes("imgur.com") ||
    cleanUrlLower.includes("postimg.cc") ||
    cleanUrlLower.includes("cloudinary.com") ||
    cleanUrlLower.includes("media.discordapp.net") ||
    cleanUrlLower.includes("onedrive.live.com") ||
    cleanUrlLower.includes("1drv.ms") ||
    cleanUrlLower.includes("sharepoint.com")
  ) {
    return true;
  }
  
  const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff"];
  if (extensions.some(ext => cleanUrlLower.includes(ext))) {
    return true;
  }
  
  // Detecta URLs com parâmetros que contêm extensões de imagens
  if (cleanUrlLower.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)\b/)) {
    return true;
  }

  return false;
};

const getEmbedUrl = (url) => {
  if (!url) return null;
  let cleanUrl = url.trim();
  
  // Extrai o link src caso o usuário tenha colado o iframe HTML completo
  if (cleanUrl.startsWith("<") && cleanUrl.includes("src=")) {
    const match = cleanUrl.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      cleanUrl = match[1].trim();
    }
  }
  
  let regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  let match = cleanUrl.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

const handleOpenExternalLink = async (url) => {
  if (!url) return;
  try {
    await Browser.open({ url, presentationStyle: 'popover' });
  } catch (e) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const escapeHtmlGlobal = (value) => {
  const str = String(value ?? "");
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
};

const downloadCsv = (filename, headers, rows) => {
  const csvFilename = filename.replace(/\.xls$/, '.csv');
  const escCsv = (v) => {
    const s = String(v == null ? '' : v);
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [
    headers.map(escCsv).join(','),
    ...rows.map(row => headers.map(h => escCsv(row[h])).join(','))
  ];
  const csv = '\uFEFF' + lines.join('\r\n'); // BOM para o Excel reconhecer UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href; link.download = csvFilename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(href);
};
// Alias para manter compatibilidade com todo o código existente
const downloadXls = downloadCsv;


function PlayerAvatar({atleta, size=24}) {
  const display = getPlayerName(atleta) || "?";
  if (atleta?.foto) return <img src={atleta.foto} style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}} alt={display} />;
  return <div style={{width:size,height:size,borderRadius:"50%",background:"#22b7d9",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.5,fontWeight:700,flexShrink:0}}>{display.charAt(0).toUpperCase()}</div>;
}

function initStandings(teams){return teams.map(n=>({name:n,pts:0,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0}));}
function recalcStandings(teams,rounds){
  const st=initStandings(teams);
  rounds.forEach(rd=>rd.matches.forEach(m=>{
    if(!m.played)return;
    const h=st.find(x=>x.name===m.home),a=st.find(x=>x.name===m.away);if(!h||!a)return;
    const hs=parseInt(m.homeScore),as2=parseInt(m.awayScore);
    h.j++;a.j++;h.gp+=hs;h.gc+=as2;a.gp+=as2;a.gc+=hs;h.sg=h.gp-h.gc;a.sg=a.gp-a.gc;
    if(hs>as2){h.v++;h.pts+=3;a.d++;}else if(hs===as2){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
  }));
  return st.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp);
}
function generateRR(teams,turno){
  const list=[...teams];if(list.length%2!==0)list.push("_bye_");
  const rounds=list.length-1,half=list.length/2,result=[];let r=[...list];
  for(let i=0;i<rounds;i++){
    const rm=[];
    for(let j=0;j<half;j++){const h=r[j],av=r[r.length-1-j];if(h!=="_bye_"&&av!=="_bye_")rm.push({home:h,away:av,homeScore:"",awayScore:"",played:false,date:""});}
    result.push({round:i+1,matches:rm});
    r=[r[0],...r.slice(r.length-1),...r.slice(1,r.length-1)];
  }
  if(turno){const ret=result.map((rd,i)=>({round:rounds+i+1,matches:rd.matches.map(m=>({home:m.away,away:m.home,homeScore:"",awayScore:"",played:false,date:""}))}));return[...result,...ret];}
  return result;
}
function phaseName(n){if(n===2)return"Final";if(n===4)return"Semifinal";if(n===8)return"Quartas";if(n===16)return"Oitavas";return`Fase de ${n}`;}
function generateKO(teams, noShuffle = false){
  const s=noShuffle ? [...teams] : cryptoShuffle([...teams]);const phases=[];let cur=s,ph=1;
  while(cur.length>1){
    const pairs=[];for(let i=0;i<cur.length;i+=2)if(cur[i+1])pairs.push({home:cur[i],away:cur[i+1],homeScore:"",awayScore:"",played:false,winner:null,date:""});
    phases.push({phase:ph,name:phaseName(cur.length),matches:pairs,advancers:[]});
    cur=new Array(Math.ceil(cur.length/2)).fill(null);ph++;
  }
  return phases;
}

function separarAtletasSorteio(presentes, numTeams, ppt) {
  const normais = presentes.filter(a => !a.isConvidado);
  const convidados = presentes.filter(a => a.isConvidado);
  const vagasNecessarias = numTeams * ppt;
  
  if (normais.length >= vagasNecessarias) {
    return {
      sorteaveis: normais,
      revezadores: convidados
    };
  } else {
    const numAvulsos = vagasNecessarias - normais.length;
    const avulsos = convidados.slice(0, numAvulsos);
    const revezadores = convidados.slice(numAvulsos);
    return {
      sorteaveis: [...normais, ...avulsos],
      revezadores: revezadores
    };
  }
}

function agruparUnidades(players) {
  const unidades = [];
  const visitados = new Set();
  
  const getAtletaId = (p) => {
    if (!p) return "";
    return String(p.id || p.atleta_id || p.idAtleta || "");
  };

  players.forEach(p => {
    const pId = getAtletaId(p);
    if (!pId || visitados.has(pId)) return;
    
    if (p.isConvidado && p.convidadoDe) {
      const host = players.find(x => getAtletaId(x) === String(p.convidadoDe));
      if (host) {
        const hostId = getAtletaId(host);
        if (hostId && !visitados.has(hostId)) {
          unidades.push([host, p]);
          visitados.add(hostId);
          visitados.add(pId);
          return;
        }
      }
    }
    
    const guest = players.find(x => x.isConvidado && String(x.convidadoDe) === pId);
    if (guest) {
      const guestId = getAtletaId(guest);
      if (guestId && !visitados.has(guestId)) {
        unidades.push([p, guest]);
        visitados.add(pId);
        visitados.add(guestId);
        return;
      }
    }
    
    unidades.push([p]);
    visitados.add(pId);
  });
  
  return unidades;
}

function drawBalancedTeams(athletes, numTeams, ppt, metodoFormacao = "igual") {
  // Primeiro, embaralha aleatoriamente todos os atletas para que o desempate
  // de atletas com a mesma nota de habilidade seja 100% randômico.
  const shuffled = cryptoShuffle(athletes);

  const sortedAthletes = shuffled.sort((a, b) => {
    const s1 = a.habilidade || a.skill || 3;
    const s2 = b.habilidade || b.skill || 3;
    return s2 - s1;
  });

  let tamanhosDesejados = [];
  let numTeamsReal = numTeams;

  if (metodoFormacao === "completo") {
    numTeamsReal = Math.min(numTeams, Math.ceil(sortedAthletes.length / ppt));
    if (numTeamsReal < 2) numTeamsReal = Math.min(numTeams, 2);
    
    let restante = sortedAthletes.length;
    for (let i = 0; i < numTeamsReal; i++) {
      if (i === numTeamsReal - 1) {
        tamanhosDesejados.push(Math.min(ppt, restante));
      } else {
        tamanhosDesejados.push(ppt);
        restante -= ppt;
      }
    }
  } else {
    const totalDisponivel = Math.min(sortedAthletes.length, numTeams * ppt);
    const baseCount = Math.floor(totalDisponivel / numTeams);
    const resto = totalDisponivel % numTeams;
    tamanhosDesejados = Array.from({ length: numTeams }, (_, i) => 
      baseCount + (i < resto ? 1 : 0)
    );
  }

  const teams = Array.from({ length: numTeamsReal }, (_, i) => ({
    name: "Time " + (i + 1),
    players: [],
    skillSum: 0
  }));

  const atletasDisponiveis = [...sortedAthletes];
  let direction = 1;
  
  while (atletasDisponiveis.length > 0) {
    let colocouAlgum = false;
    const startIdx = direction === 1 ? 0 : numTeamsReal - 1;
    const endIdx = direction === 1 ? numTeamsReal : -1;
    const step = direction === 1 ? 1 : -1;

    for (let i = startIdx; i !== endIdx; i += step) {
      const targetSize = tamanhosDesejados[i] || 0;
      if (teams[i].players.length < targetSize && atletasDisponiveis.length > 0) {
        const a = atletasDisponiveis.shift();
        teams[i].players.push(a);
        teams[i].skillSum += a.habilidade || a.skill || 3;
        colocouAlgum = true;
      }
    }

    if (!colocouAlgum) break;
    direction *= -1;
  }

  const bench = cryptoShuffle(atletasDisponiveis);
  return { fullTeams: teams, bench };
}
function buildInitialPeladaState(drawnTeams,bench,existingMatchLog=[],oldState=null){
  const queue=drawnTeams.map(t=>t.name);
  const teamBases = {};
  drawnTeams.forEach(t => {
    teamBases[t.name] = t.players.map(p => p.id || p.atleta_id || p.idAtleta);
  });
  const baseState = {
    teams:drawnTeams,
    queue,
    bench,
    matchLog:existingMatchLog,
    currentMatch:null,
    teamBases
  };
  if (oldState) {
    if (oldState.minAtletasNovoTime !== undefined) baseState.minAtletasNovoTime = oldState.minAtletasNovoTime;
    if (oldState.modoRodizio !== undefined) baseState.modoRodizio = oldState.modoRodizio;
    if (oldState.modoRodizioFixo !== undefined) baseState.modoRodizioFixo = oldState.modoRodizioFixo;
  }
  return baseState;
}
async function comprimirDados(obj) {
  try {
    if (typeof CompressionStream !== 'undefined') {
      const str = JSON.stringify(obj);
      const byteArray = new TextEncoder().encode(str);
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter();
      writer.write(byteArray);
      writer.close();
      const output = [];
      const reader = cs.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output.push(value);
      }
      const length = output.reduce((sum, arr) => sum + arr.length, 0);
      const merged = new Uint8Array(length);
      let offset = 0;
      for (const arr of output) {
        merged.set(arr, offset);
        offset += arr.length;
      }
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < merged.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, merged.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    }
  } catch (e) {
    console.error("[COMPRESS] Erro ao comprimir dados:", e);
  }
  return null;
}

async function descomprimirDados(base64Str) {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const binaryString = atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const output = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        output.push(value);
      }
      const totalLength = output.reduce((sum, arr) => sum + arr.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of output) {
        merged.set(arr, offset);
        offset += arr.length;
      }
      const decoded = new TextDecoder().decode(merged);
      return JSON.parse(decoded);
    }
  } catch (e) {
    console.error("[DECOMPRESS] Erro ao descomprimir dados:", e);
  }
  return null;
}

async function extrairAppStateDeDocumento(docData) {
  if (!docData) return null;
  if (docData.appStateCompressed) {
    const decompressed = await descomprimirDados(docData.appStateCompressed);
    if (decompressed) return decompressed;
  }
  return docData.appState || null;
}

async function prepararPayloadParaNuvem(stateToUpload, authName = "Sem Nome") {
  // Otimiza o estado
  const otimizado = await otimizarTodoEstado(stateToUpload);
  
  const payload = {
    lastUpdated: new Date().toISOString(),
    updatedBy: authName
  };
  
  const compressed = await comprimirDados(otimizado);
  if (compressed) {
    payload.appStateCompressed = compressed;
  } else {
    payload.appState = otimizado;
  }
  
  return {
    payload: JSON.parse(JSON.stringify(payload)),
    otimizado
  };
}

function obterCandidatosEmprestimoProximaPartida(ps, pptParam = null) {
  return { paraA: [], paraB: [], destaques: [] };
  if (!ps || !ps.queue || ps.queue.length < 2) return { paraA: [], paraB: [], destaques: [] };
  const modoRodizio = ps.modoRodizio || "misto";
  if (modoRodizio !== "misto") return { paraA: [], paraB: [], destaques: [] };
  if (!ps.teamBases) return { paraA: [], paraB: [], destaques: [] };

  const jogadoresPorTime = pptParam || ps?.playersPerTeam || 4;
  const emAndamento = ps.currentMatch && !ps.currentMatch.played;

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: [...t.players] })) : [];

  newTeams = newTeams.map(t => {
    const baseIds = ps.teamBases[t.name] || [];
    const todosJogadores = [];
    if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
    if (ps.bench) todosJogadores.push(...ps.bench);
    
    const uniquePlayers = [];
    const seenIds = new Set();
    todosJogadores.forEach(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        uniquePlayers.push(p);
      }
    });
    
    const originalPlayers = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
    return { ...t, players: originalPlayers };
  });

  const [a, b] = [ps.queue[0], ps.queue[1]];
  const paraA = [];
  const paraB = [];
  const destaques = [];

  if (emAndamento) {
    if (ps.queue.length < 3) return { paraA: [], paraB: [], destaques: [] };
    const proxEntrando = ps.queue[2];
    const teamEntrandoObj = newTeams.find(t => t.name === proxEntrando);
    const countEntrando = teamEntrandoObj ? teamEntrandoObj.players.length : 0;
    const isLockedEntrando = ps.loanLocks && ps.loanLocks[proxEntrando] === true;
    const precisaEntrando = isLockedEntrando ? 0 : Math.max(0, jogadoresPorTime - countEntrando);

    const teamAObj = newTeams.find(t => t.name === a);
    const teamBObj = newTeams.find(t => t.name === b);
    const countA = teamAObj ? teamAObj.players.length : 0;
    const countB = teamBObj ? teamBObj.players.length : 0;
    const isLockedA = ps.loanLocks && ps.loanLocks[a] === true;
    const isLockedB = ps.loanLocks && ps.loanLocks[b] === true;
    const precisaA = isLockedA ? 0 : Math.max(0, jogadoresPorTime - countA);
    const precisaB = isLockedB ? 0 : Math.max(0, jogadoresPorTime - countB);

    if (precisaEntrando > 0 || precisaA > 0 || precisaB > 0) {
      const totalTimes = ps.teams.length;
      
      // Cenário A: Time A vence, Time B perde (b vira o perdedor de fora)
      let doadorNomeA = "";
      if (totalTimes === 3) {
        doadorNomeA = b;
      } else if (totalTimes === 4) {
        doadorNomeA = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNomeA = ps.queue[4];
      } else {
        doadorNomeA = b;
      }

      // Cenário B: Time B vence, Time A perde (a vira o perdedor de fora)
      let doadorNomeB = "";
      if (totalTimes === 3) {
        doadorNomeB = a;
      } else if (totalTimes === 4) {
        doadorNomeB = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNomeB = ps.queue[4];
      } else {
        doadorNomeB = a;
      }

      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });

      const obterCandidatosParaDoador = (doadorNome) => {
        const isDoadorEligible = doadorNome && doadorNome !== a && doadorNome !== b;
        if (!isDoadorEligible) {
          const deForaName = ps.queue.slice(3).find(n => n !== a && n !== b);
          if (deForaName) {
            const baseIds = ps.teamBases[deForaName] || [];
            return baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
          }
          return [];
        }
        const baseIds = ps.teamBases[doadorNome] || [];
        return baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      };

      const candidatosA = obterCandidatosParaDoador(doadorNomeA);
      const candidatosB = obterCandidatosParaDoador(doadorNomeB);

      const ultimaPartida = ps.matchLog && ps.matchLog.length > 0 ? ps.matchLog[ps.matchLog.length - 1] : null;
      const idJogadoresUltimaPartida = [];
      if (ultimaPartida) {
        const tA = newTeams.find(t => t.name === ultimaPartida.teamA);
        const tB = newTeams.find(t => t.name === ultimaPartida.teamB);
        if (tA) idJogadoresUltimaPartida.push(...tA.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (tB) idJogadoresUltimaPartida.push(...tB.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (ultimaPartida.teamAEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamAEmprestados.map(id => String(id)));
        if (ultimaPartida.teamBEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamBEmprestados.map(id => String(id)));
      }

      const historicoEmprestimos = ps.historicoEmprestimos || {};
      const sortCandidatos = (list) => {
        list.sort((p1, p2) => {
          const id1 = String(p1.id || p1.atleta_id || p1.idAtleta);
          const id2 = String(p2.id || p2.atleta_id || p2.idAtleta);
          const jogouUltima1 = idJogadoresUltimaPartida.includes(id1) ? 1 : 0;
          const jogouUltima2 = idJogadoresUltimaPartida.includes(id2) ? 1 : 0;
          if (jogouUltima1 !== jogouUltima2) {
            return jogouUltima1 - jogouUltima2;
          }
          const count1 = historicoEmprestimos[id1] || 0;
          const count2 = historicoEmprestimos[id2] || 0;
          return count1 - count2;
        });
      };

      sortCandidatos(candidatosA);
      sortCandidatos(candidatosB);

      // Cenário A: Time A vence a partida atual
      let offsetA = 0;
      const empA = [];
      for (let i = 0; i < precisaA && offsetA < candidatosA.length; i++) {
        empA.push(candidatosA[offsetA++]);
      }
      for (let i = 0; i < precisaEntrando && offsetA < candidatosA.length; i++) {
        paraA.push(candidatosA[offsetA++]);
      }

      // Cenário B: Time B vence a partida atual
      let offsetB = 0;
      const empB = [];
      for (let i = 0; i < precisaB && offsetB < candidatosB.length; i++) {
        empB.push(candidatosB[offsetB++]);
      }
      for (let i = 0; i < precisaEntrando && offsetB < candidatosB.length; i++) {
        paraB.push(candidatosB[offsetB++]);
      }

      const todosDestaques = [...empA, ...paraA, ...empB, ...paraB];
      const seen = new Set();
      todosDestaques.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          destaques.push(p);
        }
      });
    }
  } else {
    const teamAObj = newTeams.find(t => t.name === a);
    const teamBObj = newTeams.find(t => t.name === b);
    const countA = teamAObj ? teamAObj.players.length : 0;
    const countB = teamBObj ? teamBObj.players.length : 0;
    const precisaA = Math.max(0, jogadoresPorTime - countA);
    const precisaB = Math.max(0, jogadoresPorTime - countB);

    if (precisaA > 0 || precisaB > 0) {
      let doadorNome = "";
      const totalTimes = ps.teams.length;
      if (totalTimes === 3) {
        doadorNome = ps.queue[ps.queue.length - 1];
      } else if (totalTimes === 4) {
        doadorNome = ps.queue[3];
      } else if (totalTimes === 5) {
        doadorNome = ps.queue[4];
      } else {
        doadorNome = ps.queue[ps.queue.length - 1];
      }

      const isDoadorEligible = doadorNome && 
                               doadorNome !== a && 
                               doadorNome !== b;

      let candidatos = [];
      if (isDoadorEligible) {
        const baseIds = ps.teamBases[doadorNome] || [];
        const todosJogadores = [];
        if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
        if (ps.bench) todosJogadores.push(...ps.bench);
        
        const uniquePlayers = [];
        const seenIds = new Set();
        todosJogadores.forEach(p => {
          const idStr = String(p.id || p.atleta_id || p.idAtleta);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            uniquePlayers.push(p);
          }
        });
        
        candidatos = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      }

      const ultimaPartida = ps.matchLog && ps.matchLog.length > 0 ? ps.matchLog[ps.matchLog.length - 1] : null;
      const idJogadoresUltimaPartida = [];
      if (ultimaPartida) {
        const tA = newTeams.find(t => t.name === ultimaPartida.teamA);
        const tB = newTeams.find(t => t.name === ultimaPartida.teamB);
        if (tA) idJogadoresUltimaPartida.push(...tA.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (tB) idJogadoresUltimaPartida.push(...tB.players.map(p => String(p.id || p.atleta_id || p.idAtleta)));
        if (ultimaPartida.teamAEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamAEmprestados.map(id => String(id)));
        if (ultimaPartida.teamBEmprestados) idJogadoresUltimaPartida.push(...ultimaPartida.teamBEmprestados.map(id => String(id)));
      }

      const historicoEmprestimos = ps.historicoEmprestimos || {};

      candidatos.sort((p1, p2) => {
        const id1 = String(p1.id || p1.atleta_id || p1.idAtleta);
        const id2 = String(p2.id || p2.atleta_id || p2.idAtleta);
        const jogouUltima1 = idJogadoresUltimaPartida.includes(id1) ? 1 : 0;
        const jogouUltima2 = idJogadoresUltimaPartida.includes(id2) ? 1 : 0;
        if (jogouUltima1 !== jogouUltima2) {
          return jogouUltima1 - jogouUltima2;
        }
        const count1 = historicoEmprestimos[id1] || 0;
        const count2 = historicoEmprestimos[id2] || 0;
        return count1 - count2;
      });

      let offset = 0;
      for (let i = 0; i < precisaA && offset < candidatos.length; i++) {
        paraA.push(candidatos[offset++]);
      }
      for (let i = 0; i < precisaB && offset < candidatos.length; i++) {
        paraB.push(candidatos[offset++]);
      }
      destaques.push(...paraA, ...paraB);
    }
  }

  return { paraA, paraB, destaques };
}

function obterTimeDoador(ps) {
  if (!ps || !ps.queue || ps.queue.length < 3) return null;
  const numTimesAtivos = ps.queue.length;
  const fila = ps.queue.slice(2);
  let idxFila = -1;
  if (numTimesAtivos === 3) {
    idxFila = 0;
  } else if (numTimesAtivos === 4) {
    idxFila = 1;
  } else if (numTimesAtivos >= 5) {
    idxFila = 2;
  }
  
  if (idxFila >= 0 && idxFila < fila.length) {
    return fila[idxFila];
  }
  return null;
}

function startNextMatch(ps,dataRealizacaoId="",pptParam=null){
  if(!ps||ps.queue.length<2)return ps;
  const[a,b]=[ps.queue[0],ps.queue[1]];
  const modoRodizio = ps.modoRodizio || "misto";
  const jogadoresPorTime = pptParam || ps?.playersPerTeam || 4;

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: [...t.players] })) : [];
  let teamAEmprestados = [];
  let teamBEmprestados = [];

  if (modoRodizio === "misto" && ps.teamBases) {
    newTeams = newTeams.map(t => {
      const baseIds = ps.teamBases[t.name] || [];
      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });
      
      const originalPlayers = baseIds.map(id => {
        const found = uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id));
        if (found) {
          const clean = { ...found };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          return clean;
        }
        return null;
      }).filter(Boolean);
      return { ...t, players: originalPlayers };
    });

  }

  const teamAObj = newTeams.find(t=>t.name===a);
  const teamBObj = newTeams.find(t=>t.name===b);

  const donorTeamName = obterTimeDoador(ps);
  if (donorTeamName) {
    const donorTeam = newTeams.find(t => t.name === donorTeamName);
    if (donorTeam && donorTeam.players && donorTeam.players.length > 0) {
      const M = donorTeam.players.length;
      let pointer = donorTeam.ponteiroRodizio || 0;
      pointer = pointer % M;

      const neededA = Math.max(0, jogadoresPorTime - (teamAObj?.players?.length || 0));
      const neededB = Math.max(0, jogadoresPorTime - (teamBObj?.players?.length || 0));

      if (neededA > 0 && teamAObj) {
        const selectedA = [];
        for (let i = 0; i < neededA; i++) {
          const idx = (pointer + i) % M;
          selectedA.push(donorTeam.players[idx]);
        }
        pointer = (pointer + neededA) % M;
        const clonedA = selectedA.map(p => ({
          ...p,
          isEmprestado: true,
          isTemporary: true,
          originalTeamId: donorTeamName,
          originalTeamName: donorTeamName,
          origTeam: donorTeamName
        }));
        newTeams = newTeams.map(t => t.name === a ? { ...t, players: [...t.players, ...clonedA] } : t);
        teamAEmprestados = clonedA.map(p => p.id || p.atleta_id || p.idAtleta);
      }

      if (neededB > 0 && teamBObj) {
        const selectedB = [];
        for (let i = 0; i < neededB; i++) {
          const idx = (pointer + i) % M;
          selectedB.push(donorTeam.players[idx]);
        }
        pointer = (pointer + neededB) % M;
        const clonedB = selectedB.map(p => ({
          ...p,
          isEmprestado: true,
          isTemporary: true,
          originalTeamId: donorTeamName,
          originalTeamName: donorTeamName,
          origTeam: donorTeamName
        }));
        newTeams = newTeams.map(t => t.name === b ? { ...t, players: [...t.players, ...clonedB] } : t);
        teamBEmprestados = clonedB.map(p => p.id || p.atleta_id || p.idAtleta);
      }

      newTeams = newTeams.map(t => t.name === donorTeamName ? { ...t, ponteiroRodizio: pointer } : t);
    }
  }

  const updatedTeamAObj = newTeams.find(t=>t.name===a);
  const updatedTeamBObj = newTeams.find(t=>t.name===b);
  const defaultGoleiroA = updatedTeamAObj?.players?.find(p=>p.goleiro||p.isGoalkeeper)?.id || "";
  const defaultGoleiroB = updatedTeamBObj?.players?.find(p=>p.goleiro||p.isGoalkeeper)?.id || "";

  let defaultSecs = 600;
  if (typeof window !== "undefined") {
    const timerKey = `pelada_${dataRealizacaoId || ps.currentMatch?.dataRealizacaoId || ""}`;
    try {
      localStorage.setItem(`${timerKey}_running`, "false");
      localStorage.setItem(`${timerKey}_startTimestamp`, "");
      const savedInitial = localStorage.getItem(`${timerKey}_initial`);
      defaultSecs = savedInitial ? parseInt(savedInitial) : 600;
      localStorage.setItem(`${timerKey}_seconds`, String(defaultSecs));
    } catch (e) {
      console.warn("Erro ao manipular localStorage no timer:", e);
    }
  }

  return {
    ...ps,
    teams: newTeams,
    currentMatch: {
      id: Date.now() + "_" + Math.floor(Math.random() * 1000),
      teamA: a,
      teamB: b,
      scoreA: "",
      scoreB: "",
      date: todayStr(),
      dataRealizacaoId,
      played: false,
      goleiroA: defaultGoleiroA,
      goleiroB: defaultGoleiroB,
      goleiroAInteiro: true,
      goleiroBInteiro: true,
      teamAEmprestados,
      teamBEmprestados,
      timerRunning: false,
      timerSecondsAtStart: defaultSecs,
      timerStartTimestamp: null,
      jogadoresAtrasados: []
    }
  };
}

function deduplicarEstadoPelada(ps) {
  if (!ps || !ps.teams) return ps;
  
  const seenIds = new Set();
  
  ps.teams.forEach(t => {
    const baseIds = (ps.teamBases && ps.teamBases[t.name]) ? ps.teamBases[t.name].map(id => String(id)) : [];
    
    t.players = t.players.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      
      // Se for um empréstimo ativo na partida atual, permitimos sem restrições
      const isEmprestadoAtivo = ps.currentMatch && (
        (ps.currentMatch.teamA === t.name && ps.currentMatch.teamAEmprestados?.map(id => String(id)).includes(idStr)) ||
        (ps.currentMatch.teamB === t.name && ps.currentMatch.teamBEmprestados?.map(id => String(id)).includes(idStr))
      );

      if (isEmprestadoAtivo) {
        return true;
      }
      
      if (baseIds.includes(idStr)) {
        seenIds.add(idStr);
        return true;
      }
      
      if (seenIds.has(idStr)) {
        return false;
      }
      
      let pertenceAOutroTime = false;
      if (ps.teamBases) {
        Object.keys(ps.teamBases).forEach(tName => {
          if (tName !== t.name) {
            const outroBaseIds = ps.teamBases[tName].map(id => String(id));
            if (outroBaseIds.includes(idStr)) {
              pertenceAOutroTime = true;
            }
          }
        });
      }
      
      if (pertenceAOutroTime) {
        return false;
      }
      
      seenIds.add(idStr);
      return true;
    });
  });
  
  if (ps.bench) {
    ps.bench = ps.bench.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (seenIds.has(idStr)) {
        return false;
      }
      seenIds.add(idStr);
      return true;
    });
  }
  
  return ps;
}
function getVitoriasSeguidas(matchLog, teamName, dataRealizacaoId) {
  let vitorias = 0;
  const partidasDoDia = (matchLog || []).filter(m => m.played && String(m.dataRealizacaoId) === String(dataRealizacaoId));
  for (let i = partidasDoDia.length - 1; i >= 0; i--) {
    const m = partidasDoDia[i];
    if (m.winner === teamName) {
      vitorias++;
    } else {
      break;
    }
  }
  return vitorias;
}
function resolveMatch(ps,scoreA,scoreB,dataRealizacaoId=""){
  const sA=parseInt(scoreA),sB=parseInt(scoreB);
  
  const regraEmpate = ps.regraEmpate || (ps.empateAmbosSaem === true ? "ambosSaem" : "campeaoFica");
  const limiteVitorias = parseInt(ps.limiteVitorias) || 0;
  
  let winner = "";
  let loser = "";
  let ambosSairamEmpate = false;
  let vencedorAtingiuLimite = false;
  
  if (sA === sB) {
    if (regraEmpate === "ambosSaem") {
      ambosSairamEmpate = true;
      winner = "Empate (Ambos Saíram)";
      loser = "Ambos";
    } else if (regraEmpate === "desafianteFica") {
      winner = ps.currentMatch.teamB;
      loser = ps.currentMatch.teamA;
    } else if (regraEmpate === "manual") {
      const vencedorEscolhido = ps.currentMatch?.empateVencedorManual;
      if (vencedorEscolhido === "teamB") {
        winner = ps.currentMatch.teamB;
        loser = ps.currentMatch.teamA;
      } else {
        winner = ps.currentMatch.teamA;
        loser = ps.currentMatch.teamB;
      }
    } else {
      winner = ps.currentMatch.teamA;
      loser = ps.currentMatch.teamB;
    }
  } else {
    winner = sA > sB ? ps.currentMatch.teamA : ps.currentMatch.teamB;
    loser = winner === ps.currentMatch.teamA ? ps.currentMatch.teamB : ps.currentMatch.teamA;
  }
  
  const teamAObjOriginal = ps.teams.find(t=>t.name===ps.currentMatch.teamA);
  const teamBObjOriginal = ps.teams.find(t=>t.name===ps.currentMatch.teamB);
  
  const jogadoresAtrasadosIds = (ps.currentMatch?.jogadoresAtrasados || []).map(String);
  const playersA = teamAObjOriginal ? deepClone(teamAObjOriginal.players).filter(p => !jogadoresAtrasadosIds.includes(String(p.id || p.atleta_id || p.idAtleta))) : [];
  const playersB = teamBObjOriginal ? deepClone(teamBObjOriginal.players).filter(p => !jogadoresAtrasadosIds.includes(String(p.id || p.atleta_id || p.idAtleta))) : [];

  let newTeams = ps.teams ? ps.teams.map(t => ({ ...t, players: t.players ? [...t.players] : [] })) : [];
  let newBench = ps.bench ? [...ps.bench] : [];

  // Limpeza mandatória de empréstimos temporários na finalização do jogo
  newTeams = newTeams.map(t => ({
    ...t,
    players: t.players ? t.players.filter(p => !p.isTemporary && !p.isEmprestado) : []
  }));
  newBench = newBench.filter(p => !p.isTemporary && !p.isEmprestado);
  const modoRodizio = ps.modoRodizio || "misto";

  // Estorno de jogadores de empréstimo vindos do banco de reservas
  const emprestadosAtivosIds = new Set([
    ...(ps.currentMatch?.teamAEmprestados || []),
    ...(ps.currentMatch?.teamBEmprestados || [])
  ].map(String));

  const todosJogadoresPartida = [];
  if (teamAObjOriginal) todosJogadoresPartida.push(...teamAObjOriginal.players);
  if (teamBObjOriginal) todosJogadoresPartida.push(...teamBObjOriginal.players);

  todosJogadoresPartida.forEach(p => {
    const idStr = String(p.id || p.atleta_id || p.idAtleta);
    if (emprestadosAtivosIds.has(idStr)) {
      if (p.originalTeamId === "bench" || !p.originalTeamId) {
        if (!newBench.some(b => String(b.id) === idStr)) {
          const clean = { ...p };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          newBench.push(clean);
        }
      }
    }
  });

  if (ps.teamBases && modoRodizio !== "manual") {
    newTeams = newTeams.map(t => {
      const baseIds = ps.teamBases[t.name] || [];
      const todosJogadores = [];
      if (ps.teams) ps.teams.forEach(tm => todosJogadores.push(...tm.players));
      if (ps.bench) todosJogadores.push(...ps.bench);
      const uniquePlayers = [];
      const seenIds = new Set();
      todosJogadores.forEach(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (!seenIds.has(idStr)) {
          seenIds.add(idStr);
          uniquePlayers.push(p);
        }
      });
      const originalPlayers = baseIds.map(id => {
        const found = uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id));
        if (found) {
          const clean = { ...found };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          return clean;
        }
        return null;
      }).filter(Boolean);
      return { ...t, players: originalPlayers };
    });
  }
  
  const currentMatchLogEntry = {
    ...ps.currentMatch,
    scoreA,
    scoreB,
    winner,
    loser,
    played: true,
    playersA,
    playersB,
    ambosSairam: ambosSairamEmpate
  };
  
  const tempLog = [...(ps.matchLog || []), currentMatchLogEntry];
  
  if (!ambosSairamEmpate && limiteVitorias > 0) {
    const permSeguidas = getVitoriasSeguidas(tempLog, winner, dataRealizacaoId || ps.currentMatch.dataRealizacaoId);
    if (permSeguidas >= limiteVitorias) {
      vencedorAtingiuLimite = true;
      currentMatchLogEntry.limiteAtingido = true;
    }
  }
  
  if ((modoRodizio === "auto" || modoRodizio === "misto") && newBench.length > 0) {
    if (ambosSairamEmpate) {
      // Time A
      const tA = newTeams.find(t=>t.name===ps.currentMatch.teamA);
      if (tA) {
        const timeUnidades = agruparUnidades(tA.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===ps.currentMatch.teamA ? {...t, players: newPlayers} : t);
      }
      
      // Time B
      const tB = newTeams.find(t=>t.name===ps.currentMatch.teamB);
      if (tB && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tB.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===ps.currentMatch.teamB ? {...t, players: newPlayers} : t);
      }
    } else if (vencedorAtingiuLimite) {
      // Primeiro o perdedor
      const tLoser = newTeams.find(t=>t.name===loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===loser ? {...t, players: newPlayers} : t);
      }
      
      // Depois o vencedor
      const tWinner = newTeams.find(t=>t.name===winner);
      if (tWinner && newBench.length > 0) {
        const timeUnidades = agruparUnidades(tWinner.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===winner ? {...t, players: newPlayers} : t);
      }
    } else {
      // Caso padrão: apenas perdedor
      const tLoser = newTeams.find(t=>t.name===loser);
      if (tLoser) {
        const timeUnidades = agruparUnidades(tLoser.players);
        const bancoUnidades = agruparUnidades(newBench);
        const swapCount = Math.min(bancoUnidades.length, timeUnidades.length);
        const leaving = timeUnidades.slice(-swapCount);
        const remaining = timeUnidades.slice(0, timeUnidades.length - swapCount);
        const incoming = bancoUnidades.slice(0, swapCount);
        const newPlayers = [...incoming, ...remaining].flat();
        newBench = [...bancoUnidades.slice(swapCount), ...leaving].flat();
        newTeams = newTeams.map(t=>t.name===loser ? {...t, players: newPlayers} : t);
      }
    }
  }

  let historicoEmprestimos = { ...(ps.historicoEmprestimos || {}) };
  if (modoRodizio === "misto") {
    const emprestados = [
      ...(ps.currentMatch?.teamAEmprestados || []),
      ...(ps.currentMatch?.teamBEmprestados || [])
    ];
    emprestados.forEach(id => {
      const idStr = String(id);
      historicoEmprestimos[idStr] = (historicoEmprestimos[idStr] || 0) + 1;
    });
  }


  const rest = ps.queue.slice(2);
  let newQueue = [];
  if (modoRodizio === "manual") {
    newQueue = [...ps.queue];
  } else if (ambosSairamEmpate) {
    newQueue = [...rest, ps.currentMatch.teamA, ps.currentMatch.teamB];
  } else if (vencedorAtingiuLimite) {
    const destinoVencedorLimite = ps.destinoVencedorLimite || "finalFila";
    if (destinoVencedorLimite === "esperarUmJogo") {
      const nextA = rest[0];
      const nextB = rest[1];
      const remaining = rest.slice(2);
      if (nextA && nextB) {
        newQueue = [nextA, nextB, winner, ...remaining, loser];
      } else if (nextA) {
        newQueue = [nextA, winner, loser];
      } else {
        newQueue = [winner, loser];
      }
    } else {
      newQueue = [...rest, loser, winner];
    }
  } else {
    newQueue = [winner, ...rest, loser];
  }

  let finalState = {...ps, teams: newTeams, queue: newQueue, bench: newBench, matchLog: tempLog, currentMatch: null, historicoEmprestimos};
  finalState = sincronizarBasesDosTimes(finalState);
  return finalState;
}

function higienizarJogadoresDuplicados(ps) {
  if (!ps || !ps.teams) return ps;
  const idsVistos = new Set();
  
  ps.teams.forEach(t => {
    t.players = t.players.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      
      const isEmprestadoAtivo = ps.currentMatch && (
        (ps.currentMatch.teamA === t.name && ps.currentMatch.teamAEmprestados?.map(id => String(id)).includes(idStr)) ||
        (ps.currentMatch.teamB === t.name && ps.currentMatch.teamBEmprestados?.map(id => String(id)).includes(idStr))
      );

      if (isEmprestadoAtivo) {
        return true;
      }

      if (idsVistos.has(idStr)) return false;
      idsVistos.add(idStr);
      return true;
    });
  });
  
  if (ps.bench) {
    ps.bench = ps.bench.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (idsVistos.has(idStr)) return false;
      idsVistos.add(idStr);
      return true;
    });
  }
  
  if (ps.teamBases) {
    const basesVistas = new Set();
    Object.keys(ps.teamBases).forEach(teamName => {
      if (Array.isArray(ps.teamBases[teamName])) {
        ps.teamBases[teamName] = ps.teamBases[teamName].filter(id => {
          const idStr = String(id);
          if (basesVistas.has(idStr)) return false;
          basesVistas.add(idStr);
          return true;
        });
      }
    });
  }
  return ps;
}

function higienizarFilaTimes(ps) {
  if (!ps) return ps;
  if (!ps.teams) ps.teams = [];
  if (!ps.queue) ps.queue = [];
  
  // 1. Garantir que ps.queue contenha apenas nomes de times que existem em ps.teams
  const existingTeamNames = new Set(ps.teams.map(t => t.name));
  let cleanQueue = ps.queue.filter(name => existingTeamNames.has(name));
  
  // 2. Remover duplicatas da fila mantendo apenas a primeira ocorrência
  const seenInQueue = new Set();
  cleanQueue = cleanQueue.filter(name => {
    if (seenInQueue.has(name)) return false;
    seenInQueue.add(name);
    return true;
  });
  
  // 3. Garantir que todos os times em ps.teams estejam na fila
  ps.teams.forEach(t => {
    if (!seenInQueue.has(t.name)) {
      cleanQueue.push(t.name);
      seenInQueue.add(t.name);
    }
  });
  
  ps.queue = cleanQueue;
  return ps;
}

function sincronizarBasesDosTimes(ps) {
  if (!ps || !ps.teams) return ps;
  ps = higienizarJogadoresDuplicados(ps);
  ps = higienizarFilaTimes(ps);
  if (!ps.teamBases) ps.teamBases = {};
  
  const jogadoresAtrasadosIds = (ps.currentMatch?.jogadoresAtrasados || []).map(id => String(id));
  
  ps.teams.forEach(t => {
    const atrasadosDesteTime = (ps.teamBases[t.name] || [])
      .map(id => String(id))
      .filter(id => jogadoresAtrasadosIds.includes(id));

    const novosIds = t.players
      .filter(p => !p.isTemporary && !p.isEmprestado)
      .map(p => p.id || p.atleta_id || p.idAtleta)
      .filter(Boolean)
      .map(id => String(id));

    const uniqueIds = Array.from(new Set([...novosIds, ...atrasadosDesteTime]));
    ps.teamBases[t.name] = uniqueIds;
  });
  return ps;
}

/* ─────────────────────────── CRONÔMETRO E AUDIO ─────────────────── */
const playWhistleSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const whistle = (delay, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, ctx.currentTime + delay);
      
      const oscMod = ctx.createOscillator();
      const gainMod = ctx.createGain();
      oscMod.frequency.value = 60;
      gainMod.gain.value = 180;
      
      oscMod.connect(gainMod.gain);
      gainMod.connect(osc.frequency);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + delay + 0.05);
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delay + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      oscMod.connect(gainMod);
      
      oscMod.start(ctx.currentTime + delay);
      osc.start(ctx.currentTime + delay);
      
      oscMod.stop(ctx.currentTime + delay + duration);
      osc.stop(ctx.currentTime + delay + duration);
    };
    
    whistle(0, 0.25);
    whistle(0.35, 0.25);
    whistle(0.7, 0.7);
  } catch (e) {
    console.error("Erro ao gerar áudio:", e);
  }
};

function MatchTimer({ t, defaultMinutes = 10, timerKey, onTimerUpdate }) {
  const [minutesInput, setMinutesInput] = useState(defaultMinutes);
  const [seconds, setSeconds] = useState(defaultMinutes * 60);
  const [initialSeconds, setInitialSeconds] = useState(defaultMinutes * 60);
  const [running, setRunning] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const timerRef = useRef(null);

  // Carrega o estado persistido na montagem ou quando a chave de temporização mudar
  useEffect(() => {
    if (!timerKey) return;
    
    const savedRunning = localStorage.getItem(`${timerKey}_running`) === "true";
    const savedInitial = localStorage.getItem(`${timerKey}_initial`);
    const savedSeconds = localStorage.getItem(`${timerKey}_seconds`);
    const savedStart = localStorage.getItem(`${timerKey}_startTimestamp`);
    const savedConfig = localStorage.getItem(`${timerKey}_isConfiguring`);

    const initialSecs = savedInitial ? parseInt(savedInitial) : defaultMinutes * 60;
    setInitialSeconds(initialSecs);
    setMinutesInput(Math.floor(initialSecs / 60));

    if (savedConfig !== null) {
      setIsConfiguring(savedConfig === "true");
    } else {
      setIsConfiguring(true);
    }

    if (savedRunning && savedStart && savedSeconds) {
      const startMs = parseInt(savedStart);
      const secsAtStart = parseInt(savedSeconds);
      const elapsedSecs = Math.floor((Date.now() - startMs) / 1000);
      const remainingSecs = secsAtStart - elapsedSecs;

      if (remainingSecs <= 0) {
        setSeconds(0);
        setRunning(false);
        setIsFinished(true);
        localStorage.setItem(`${timerKey}_running`, "false");
        localStorage.setItem(`${timerKey}_seconds`, "0");
        if (onTimerUpdate) {
          onTimerUpdate({
            timerRunning: false,
            timerSecondsAtStart: 0,
            timerStartTimestamp: null
          });
        }
      } else {
        setSeconds(remainingSecs);
        setRunning(true);
        setIsFinished(false);
        if (onTimerUpdate) {
          onTimerUpdate({
            timerRunning: true,
            timerSecondsAtStart: secsAtStart,
            timerStartTimestamp: startMs
          });
        }
      }
    } else {
      const secs = savedSeconds ? parseInt(savedSeconds) : initialSecs;
      setSeconds(secs);
      setRunning(false);
      setIsFinished(secs === 0 && savedSeconds !== null);
      if (onTimerUpdate) {
        onTimerUpdate({
          timerRunning: false,
          timerSecondsAtStart: secs,
          timerStartTimestamp: null
        });
      }
    }
  }, [timerKey]);

  // Salva reativamente no localStorage
  const saveStateToLocalStorage = (newRunning, newSeconds, newInitial, newConfig) => {
    if (!timerKey) return;
    
    localStorage.setItem(`${timerKey}_running`, String(newRunning));
    localStorage.setItem(`${timerKey}_seconds`, String(newSeconds));
    localStorage.setItem(`${timerKey}_initial`, String(newInitial));
    localStorage.setItem(`${timerKey}_isConfiguring`, String(newConfig));
    
    const timestamp = Date.now();
    if (newRunning) {
      localStorage.setItem(`${timerKey}_startTimestamp`, String(timestamp));
    } else {
      localStorage.removeItem(`${timerKey}_startTimestamp`);
    }

    if (onTimerUpdate) {
      onTimerUpdate({
        timerRunning: newRunning,
        timerSecondsAtStart: newSeconds,
        timerStartTimestamp: newRunning ? timestamp : null
      });
    }
  };

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setRunning(false);
            setIsFinished(true);
            playWhistleSound();
            saveStateToLocalStorage(false, 0, initialSeconds, isConfiguring);
            return 0;
          }
          const nextSecs = prev - 1;
          if (timerKey) {
            localStorage.setItem(`${timerKey}_seconds`, String(nextSecs));
          }
          return nextSecs;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running, initialSeconds, isConfiguring, timerKey]);

  const handleStart = () => {
    let secs = seconds;
    if (isFinished) {
      secs = initialSeconds;
      setSeconds(initialSeconds);
      setIsFinished(false);
    }
    setRunning(true);
    saveStateToLocalStorage(true, secs, initialSeconds, isConfiguring);
  };

  const handlePause = () => {
    setRunning(false);
    saveStateToLocalStorage(false, seconds, initialSeconds, isConfiguring);
  };

  const handleReset = () => {
    setRunning(false);
    setSeconds(initialSeconds);
    setIsFinished(false);
    saveStateToLocalStorage(false, initialSeconds, initialSeconds, isConfiguring);
  };

  const handleConfigSave = () => {
    if (minutesInput === "" || Number(minutesInput) < 1) {
      alert("Você precisa digitar um valor acima de 1.");
      return;
    }
    const totalSecs = Math.max(1, Number(minutesInput)) * 60;
    setSeconds(totalSecs);
    setInitialSeconds(totalSecs);
    setIsConfiguring(false);
    setIsFinished(false);
    saveStateToLocalStorage(false, totalSecs, totalSecs, false);
  };

  const handleAddMinute = () => {
    const nextSecs = seconds + 60;
    const nextInit = initialSeconds + 60;
    setSeconds(nextSecs);
    setInitialSeconds(nextInit);
    saveStateToLocalStorage(running, nextSecs, nextInit, isConfiguring);
  };

  const handleSubMinute = () => {
    const nextSecs = Math.max(0, seconds - 60);
    const nextInit = Math.max(60, initialSeconds - 60);
    setSeconds(nextSecs);
    setInitialSeconds(nextInit);
    saveStateToLocalStorage(running, nextSecs, nextInit, isConfiguring);
  };

  const formatTimer = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const progressPercent = initialSeconds > 0 ? (seconds / initialSeconds) * 100 : 0;
  const isUrgent = seconds > 0 && seconds <= 30;
  const isDark = t.bg === "#0f1117" || t.bg === "#000000";

  return (
    <div style={{
      background: "#0D0E12",
      border: `1.5px solid ${isFinished ? "#E24B4A" : isUrgent ? "#E24B4A" : `${t.accent}33`}`,
      borderRadius: 16,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      width: "100%",
      boxSizing: "border-box",
      marginBottom: 16,
      boxShadow: isFinished || isUrgent 
        ? "0 0 15px rgba(226, 75, 74, 0.25), inset 0 0 8px rgba(226, 75, 74, 0.1)"
        : `0 0 15px ${t.accent}25, inset 0 0 8px ${t.accent}10`,
      transition: "all 0.3s ease"
    }}>
      <style>{`
        @keyframes pulse-red-timer {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.97); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes blink-red-timer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
      {isConfiguring ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>Tempo de Jogo:</span>
            <input 
              type="number" 
              value={minutesInput} 
              onChange={e => setMinutesInput(e.target.value)}
              style={{
                width: 50,
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #334155",
                background: "#0F172A",
                color: "#F8FAFC",
                fontSize: 13,
                fontWeight: 700,
                textAlign: "center",
                outline: "none"
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8" }}>minutos</span>
          </div>
          <button 
            onClick={handleConfigSave}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "linear-gradient(135deg, #10B981, #059669)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 800,
              fontSize: 11,
              boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)"
            }}
          >
            ✓ Definir
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%" }}>
          {/* Relógio Centralizado */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{
              fontSize: 36,
              fontWeight: 900,
              fontFamily: "monospace",
              color: isFinished ? "#E24B4A" : isUrgent ? "#E24B4A" : t.accent,
              textShadow: isFinished ? "0 0 10px #E24B4A" : isUrgent ? "0 0 10px #E24B4A" : `0 0 10px ${t.accent}`,
              animation: isUrgent ? "pulse-red-timer 1s infinite" : isFinished ? "blink-red-timer 1.5s infinite" : "none",
              letterSpacing: 1
            }}>
              {formatTimer(seconds)}
            </span>
            {isFinished && (
              <span style={{
                fontSize: 9,
                fontWeight: 900,
                color: "#E24B4A",
                background: "#E24B4A22",
                padding: "2px 8px",
                borderRadius: 20,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                border: "1px solid #E24B4A44",
                boxShadow: "0 0 8px rgba(226, 75, 74, 0.2)"
              }}>
                ⚽ Fim de Jogo!
              </span>
            )}
          </div>

          {/* Barra de Progresso Neon */}
          {!isFinished && (
            <div style={{
              width: "100%",
              height: 4,
              borderRadius: 2,
              background: "#1E293B",
              overflow: "hidden",
              border: "1px solid #33415544"
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: "100%",
                background: isUrgent ? "#E24B4A" : `linear-gradient(90deg, ${t.accent}, #22b7d9)`,
                boxShadow: isUrgent ? "0 0 8px #E24B4A" : `0 0 8px ${t.accent}`,
                transition: "width 1s linear"
              }} />
            </div>
          )}

          {/* Controles Principais */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", width: "100%" }}>
            {/* -1 min */}
            <button 
              onClick={handleSubMinute} 
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: "#1E293B",
                color: "#94A3B8",
                border: "1px solid #334155",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#334155"}
              onMouseLeave={e => e.currentTarget.style.background = "#1E293B"}
            >
              - 1 min
            </button>

            {/* Iniciar / Pausar */}
            {running ? (
              <button 
                onClick={handlePause} 
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #BA7517, #D97706)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                  boxShadow: "0 0 8px rgba(186, 117, 23, 0.4)"
                }}
              >
                ⏸ Pausar
              </button>
            ) : (
              <button 
                onClick={handleStart} 
                style={{
                  padding: "6px 14px",
                  borderRadius: 20,
                  background: "linear-gradient(135deg, #10B981, #059669)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)"
                }}
              >
                ▶ Iniciar
              </button>
            )}
            
            {/* Reset */}
            <button 
              onClick={handleReset} 
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                background: "#334155",
                color: "#E2E8F0",
                border: "none",
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer"
              }}
            >
              🔄 Reset
            </button>

            {/* +1 min */}
            <button 
              onClick={handleAddMinute} 
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: "#1E293B",
                color: "#94A3B8",
                border: "1px solid #334155",
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "#334155"}
              onMouseLeave={e => e.currentTarget.style.background = "#1E293B"}
            >
              + 1 min
            </button>
          </div>

          {/* Linha Auxiliar de Apito / Configurar */}
          <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <button 
              onClick={() => setIsConfiguring(true)} 
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "transparent",
                color: "#64748B",
                border: "1px solid #334155",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4
              }}
              title="Ajustar tempo inicial"
            >
              <IconSettings size={10} /> Ajustar Tempo
            </button>

            {isFinished && (
              <button 
                onClick={playWhistleSound}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "#BA751722",
                  color: "#BA7517",
                  border: "1px solid #BA751744",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4
                }}
              >
                📢 Apitar Novamente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── LOGIN SCREENS ───────────────────────── */
function LoginScreen({ onLogin, onRegister, onForgotPassword, onBack, t }) {
  const S = makeStyles(t);
  const [activeTab, setActiveTab] = useState("login"); // login | register | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (activeTab === "login") {
        if (!email.trim() || !password.trim()) {
          setError("Informe seu e-mail e sua senha.");
          setLoading(false);
          return;
        }
        const err = await onLogin({ email: email.trim(), password });
        if (err) setError(err);
      } else if (activeTab === "register") {
        if (!email.trim() || !password.trim() || !name.trim()) {
          setError("Preencha todos os campos.");
          setLoading(false);
          return;
        }
        const err = await onRegister({ email: email.trim(), password, name: name.trim() });
        if (err) {
          setError(err);
        } else {
          setSuccess("Conta criada com sucesso! Você já pode entrar.");
          setActiveTab("login");
          setPassword("");
        }
      } else if (activeTab === "forgot") {
        if (!email.trim()) {
          setError("Informe o seu e-mail cadastrado.");
          setLoading(false);
          return;
        }
        const err = await onForgotPassword(email.trim());
        if (err) {
          setError(err);
        } else {
          setSuccess("Link de redefinição de senha enviado para o seu e-mail!");
        }
      }
    } catch (err) {
      setError("Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  };

  const isDark = t.bg === "#0f1117";

  return (
    <div style={{
      ...S.page,
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
      padding: "24px 16px"
    }}>
      {/* Esferas de background brilhantes para efeito de profundidade premium */}
      <div style={{
        position: "absolute",
        width: 300,
        height: 300,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(29, 158, 117, 0.4) 0%, rgba(29, 158, 117, 0) 70%)",
        top: "-50px",
        left: "-50px",
        filter: "blur(40px)",
        pointerEvents: "none",
        zIndex: 0
      }} />
      <div style={{
        position: "absolute",
        width: 350,
        height: 350,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34, 183, 217, 0.35) 0%, rgba(34, 183, 217, 0) 70%)",
        bottom: "-100px",
        right: "-50px",
        filter: "blur(50px)",
        pointerEvents: "none",
        zIndex: 0
      }} />

      <div style={{
        width: "100%",
        maxWidth: 480,
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 20
      }}>
        {/* Logotipo/Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "inline-flex", justifyContent: "center", alignItems: "center", width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)", color: "#fff", marginBottom: 16, boxShadow: "0 4px 15px rgba(220,39,67,0.4)" }}>
            <IconSoccer size={30} color="#fff" />
          </div>
          <br />
          <div style={{
            fontSize: 48,
            fontWeight: 900,
            background: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            display: "inline-block",
            animation: "pulse-logo 3s infinite ease-in-out",
            letterSpacing: "-1.5px"
          }}>
            Thorneios
          </div>
          <p style={{
            color: t.textSec,
            fontSize: 14,
            margin: "8px 0 0",
            fontWeight: 500
          }}>
            O gerenciador definitivo para suas peladas
          </p>
        </div>

        {/* Card de Autenticação Premium (Glassmorphism) */}
        <div style={{
          background: isDark ? "rgba(18, 18, 18, 0.75)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          borderRadius: 12,
          padding: "32px 28px",
          border: `1px solid ${isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)"}`,
          boxShadow: isDark 
            ? "0 20px 40px rgba(0, 0, 0, 0.6), 0 0 50px rgba(0, 149, 246, 0.05)" 
            : "0 20px 40px rgba(0, 0, 0, 0.05)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease"
        }}>
          {/* Abas */}
          <div style={{
            display: "flex",
            borderBottom: `1.5px solid ${t.cardBorder}`,
            marginBottom: 26,
            gap: 12
          }}>
            <button 
              type="button"
              onClick={() => { setActiveTab("login"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "login" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "login" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "login" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              🔑 Entrar
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("register"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "register" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "register" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "register" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              📝 Criar Conta
            </button>
            <button 
              type="button"
              onClick={() => { setActiveTab("forgot"); setError(""); setSuccess(""); }}
              style={{
                flex: 1,
                padding: "12px 6px",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === "forgot" ? "2.5px solid #0095F6" : "2.5px solid transparent",
                color: activeTab === "forgot" ? t.text : t.textSec,
                fontSize: 14,
                fontWeight: activeTab === "forgot" ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              ❓ Recuperar
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Campo Nome (Apenas Registro) */}
            {activeTab === "register" && (
              <div>
                <label style={S.label}>Nome Completo</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>👤</span>
                  <input 
                    style={{ ...S.input, paddingLeft: 38 }}
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    placeholder="Seu nome" 
                    required 
                  />
                </div>
              </div>
            )}

            {/* Campo E-mail (Todos os modos) */}
            <div>
              <label style={S.label}>E-mail</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>✉️</span>
                <input 
                  type="email"
                  style={{ ...S.input, paddingLeft: 38 }}
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="seu@email.com" 
                  required 
                />
              </div>
            </div>

            {/* Campo Senha (Login e Registro) */}
            {activeTab !== "forgot" && (
              <div>
                <label style={S.label}>Senha</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}><IconLock size={12} /></span>
                  <input 
                    style={{ ...S.input, paddingLeft: 38, paddingRight: 42 }} 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="Sua senha" 
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: t.textSec,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0
                    }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18 }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Mensagem de Erro */}
            {error && (
              <div style={{
                background: "rgba(226, 75, 74, 0.12)",
                border: "1px solid rgba(226, 75, 74, 0.2)",
                color: "#E24B4A",
                padding: "24px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
                animation: "shake 0.4s"
              }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Mensagem de Sucesso */}
            {success && (
              <div style={{
                background: "rgba(0, 149, 246, 0.12)",
                border: "1px solid rgba(0, 149, 246, 0.2)",
                color: "#0095F6",
                padding: "24px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>✅</span>
                <span>{success}</span>
              </div>
            )}

            {/* Botão de Ação */}
            <button 
              type="submit" 
              disabled={loading}
              style={{
                ...S.btn(loading ? "#0095F6aa" : "#0095F6"),
                padding: "14px 20px",
                fontSize: 14,
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 8,
                justifyContent: "center",
                boxShadow: isDark ? "0 4px 12px rgba(0, 149, 246, 0.2)" : "0 4px 12px rgba(0, 149, 246, 0.1)",
                transition: "all 0.2s ease",
                transform: loading ? "scale(0.98)" : "none"
              }}
            >
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 14,
                    height: 14,
                    border: "2px solid rgba(255,255,255,0.4)",
                    borderTop: "2px solid #fff",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite"
                  }} />
                  <span>Processando...</span>
                </div>
              ) : activeTab === "login" ? "Entrar na Minha Conta" : activeTab === "register" ? "Cadastrar Minha Conta" : "Enviar E-mail de Recuperação"}
            </button>
          </form>
        </div>

        {/* Botão de Voltar para Seleção */}
        <button 
          onClick={onBack}
          style={{
            alignSelf: "center",
            padding: "10px 20px",
            background: "transparent",
            border: `1.5px solid ${t.cardBorder}`,
            color: t.text,
            borderRadius: 14,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = t.card;
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.transform = "none";
          }}
        >
          <span>←</span>
          <span>Acompanhar Peladas (Voltar)</span>
        </button>
      </div>

      {/* Estilos e animações globais inseridos dinamicamente */}
      <style>{`
        @keyframes pulse-logo {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 2px rgba(29, 158, 117, 0.1)); }
          50% { transform: scale(1.02); filter: drop-shadow(0 0 10px rgba(34, 183, 217, 0.2)); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────── VISUALIZAÇÃO NUVEM PÚBLICA ──────────────── */
function CloudPublicPeladaScreen({ peladaData, onRefresh, onBack, t }) {
  const S = makeStyles(t);
  const { pelada: initialPelada, selDataId } = peladaData;
  const [localPelada, setLocalPelada] = useState(initialPelada || {});

  const datas = localPelada?.datasRealizacao || [];
  const atletas = localPelada?.atletas || [];

  const [dataSelId, setDataSelId] = useState(selDataId || (datas[0]?.id || ""));
  const [modalPixOpen, setModalPixOpen] = useState(false);
  const [pixAtletaId, setPixAtletaId] = useState("novo_atleta");
  const [pixNome, setPixNome] = useState("");
  const [pixEmail, setPixEmail] = useState("");
  const [pixCpf, setPixCpf] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixQrCode, setPixQrCode] = useState(null);
  const [pixCopiaCola, setPixCopiaCola] = useState("");
  const [pixPaymentId, setPixPaymentId] = useState(null);
  const [pixError, setPixError] = useState("");
  const [pixSucesso, setPixSucesso] = useState(false);

  const activeDate = datas.find(d => String(d.id) === String(dataSelId));

  const handleGerarPix = async () => {
    setPixLoading(true);
    setPixError("");
    try {
      const selectedAtletaObj = pixAtletaId === "novo_atleta" ? null : atletas.find(a => String(a.id) === String(pixAtletaId));
      const nomeFinal = selectedAtletaObj ? selectedAtletaObj.nome : pixNome;

      if (!nomeFinal || !pixEmail || !pixCpf) {
        throw new Error("Por favor, preencha todos os campos obrigatórios.");
      }

      const cleanCpf = pixCpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        throw new Error("Por favor, insira um CPF válido com 11 dígitos.");
      }

      if (!pixEmail.includes("@") || !pixEmail.includes(".")) {
        throw new Error("Por favor, insira um e-mail válido.");
      }

      const valorDiaria = Number(activeDate?.valor !== undefined && activeDate?.valor !== "" && activeDate?.valor !== null ? activeDate.valor : (localPelada.valor_contribuicao || 15.00));

      const payload = {
        atleta_id: pixAtletaId,
        pelada_id: String(localPelada.id),
        data_realizacao_id: String(dataSelId),
        nome: nomeFinal,
        email: pixEmail,
        cpf: pixCpf,
        valor: valorDiaria
      };

      const response = await fetch(`https://us-central1-thorneios-app.cloudfunctions.net/criarPagamentoPix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.error || "Falha ao gerar o Pix. Verifique as credenciais.");
      }

      setPixQrCode(resData.qrCodeBase64);
      setPixCopiaCola(resData.qrCodeCopiaCola);
      setPixPaymentId(resData.paymentId);
    } catch (err) {
      setPixError(err.message);
    } finally {
      setPixLoading(false);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !pixPaymentId || !modalPixOpen) return;

    const docRef = doc(db, "pagamentos_pix", String(pixPaymentId));
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === "approved") {
          setPixSucesso(true);
          if (onRefresh) onRefresh();
        }
      }
    });

    return () => unsubscribe();
  }, [pixPaymentId, modalPixOpen, isFirebaseConfigured]);

  useEffect(() => {
    if (!isFirebaseConfigured || !peladaData?.docKey) return;
    const docRef = doc(db, COLLECTION_CAMPEONATOS, "pelada_" + peladaData.docKey);

    // includeMetadataChanges: true permite detectar hasPendingWrites
    // (escrita pendente de confirmação pelo servidor)
    // Cronômetro agora é independente: o listener só precisa passar timerRunning e timerSecondsAtStart.
    // Não há mais necessidade de sanitizar timerStartTimestamp (serverTimestamp não é usado pelo timer público).
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      setLocalPelada(prev => {
        if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
        return data;
      });
    }, (err) => {
      console.error("[Público] Erro no listener em tempo real:", err);
    });
    return () => unsubscribe();
  }, [peladaData?.docKey]);

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const ps = activeDate?.peladaState || null;
  const currentMatch = ps?.currentMatch;
  const queue = ps?.queue || [];
  const bench = ps?.bench || [];

  const ppt = activeDate?.playersPerTeam || localPelada.playersPerTeam || 4;
  const { paraA: proxParaA = [], paraB: proxParaB = [], destaques: proxDestaques = [] } = obterCandidatosEmprestimoProximaPartida(ps, ppt);
  const proxCandidatosEmprestimoIds = proxDestaques.map(p => String(p.id || p.atleta_id || p.idAtleta));

  const getOrigemTeamName = (atletaId) => {
    if (!ps || !ps.teamBases) return "";
    const targetId = String(atletaId);
    for (const teamName of Object.keys(ps.teamBases)) {
      const ids = ps.teamBases[teamName] || [];
      if (ids.some(id => String(id) === targetId)) {
        return teamName;
      }
    }
    return "";
  };

  const limiteVitorias = ps ? (parseInt(ps.limiteVitorias) || 0) : 0;
  const vitoriasA = (ps && currentMatch) ? getVitoriasSeguidas(ps.matchLog, currentMatch.teamA, dataSelId) : 0;
  const vitoriasB = (ps && currentMatch) ? getVitoriasSeguidas(ps.matchLog, currentMatch.teamB, dataSelId) : 0;

  const formatarData = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return "";
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const [ano, mes, dia] = parts;
    return `${dia}/${mes}/${ano}`;
  };

  const getPlayerName = (p) => {
    if (!p) return "";
    const id = p.id || p.atleta_id || p.idAtleta;
    const atl = atletas.find(x => String(x.id) === String(id));
    return atl ? (atl.apelido || atl.nome) : p.nome;
  };

  const getLoanTag = (p, teamName) => {
    if (!p) return "";
    if (p.isEmprestado && p.origTeam && p.origTeam !== teamName) {
      return ` (Emp. ${p.origTeam})`;
    }
    return "";
  };

  const colorOfTeam = n => {
    const i = (ps?.teams || []).findIndex(x => x.name === n);
    return COLORS[i % COLORS.length] || "#888";
  };

  const getRankingDia = () => {
    if (!ps || !ps.matchLog) return [];
    
    const stats = {};
    const activeTeams = ps.teams || [];
    activeTeams.forEach(team => {
      team.players.forEach(p => {
        const id = p.id || p.atleta_id;
        stats[id] = { id, name: getPlayerName(p), v: 0, e: 0, d: 0, gp: 0, pts: 0 };
      });
    });

    const filteredMatches = ps.matchLog.filter(m => String(m.dataRealizacaoId) === String(dataSelId));
    filteredMatches.forEach(m => {
      if (m.played) {
        const scoreA = Number(m.scoreA || 0);
        const scoreB = Number(m.scoreB || 0);

        if (m.sumula) {
          Object.entries(m.sumula).forEach(([pId, goals]) => {
            if (!stats[pId]) {
              const atl = atletas.find(x => String(x.id) === String(pId));
              stats[pId] = { id: pId, name: atl ? (atl.apelido || atl.nome) : "Convidado", v: 0, e: 0, d: 0, gp: 0, pts: 0 };
            }
            stats[pId].gp += Number(goals || 0);
          });
        }

        const processTeamResult = (teamPlayers, ptsToAdd, isWin, isDraw, isLoss) => {
          teamPlayers.forEach(p => {
            const id = p.id || p.atleta_id;
            if (!stats[id]) {
              stats[id] = { id, name: getPlayerName(p), v: 0, e: 0, d: 0, gp: 0, pts: 0 };
            }
            stats[id].pts += ptsToAdd;
            if (isWin) stats[id].v += 1;
            if (isDraw) stats[id].e += 1;
            if (isLoss) stats[id].d += 1;
          });
        };

        const playersA = m.playersA || [];
        const playersB = m.playersB || [];

        if (scoreA > scoreB) {
          processTeamResult(playersA, 3, true, false, false);
          processTeamResult(playersB, 0, false, false, true);
        } else if (scoreB > scoreA) {
          processTeamResult(playersB, 3, true, false, false);
          processTeamResult(playersA, 0, false, false, true);
        } else {
          const regra = ps.regraEmpate || (ps.empateAmbosSaem ? "ambosSaem" : "campeaoFica");
          if (regra === "ambosSaem") {
            processTeamResult(playersA, 1, false, true, false);
            processTeamResult(playersB, 1, false, true, false);
          } else {
            processTeamResult(playersA, 1, false, true, false);
            processTeamResult(playersB, 1, false, true, false);
          }
        }
      }
    });

    return Object.values(stats).sort((a, b) => b.pts - a.pts || b.v - a.v || b.gp - a.gp);
  };

  const ranking = getRankingDia();

  return (
    <div style={{
      maxWidth: 800,
      margin: "0 auto",
      padding: "16px",
      minHeight: "100vh",
      background: t.bg,
      color: t.text,
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: `1px solid ${t.cardBorder}`
      }}>
        <div style={{display: "flex", alignItems: "center", gap: 10}}>
          <span style={{fontSize: 24}}>⚽</span>
          <div>
            <h2 style={{fontSize: 16, fontWeight: 800, margin: 0}}>{localPelada.name || "Acompanhamento"}</h2>
            <div style={{fontSize: 11, color: t.textSec, marginTop: 2}}>Painel de Jogos Público</div>
          </div>
        </div>
        <div style={{display: "flex", gap: 8}}>
          <button onClick={() => setModalPixOpen(true)} style={{...S.btnSm(t.accent, "#000"), background: t.accent, color: "#000", fontWeight: 700}}>
            Pagar Diária (Pix)
          </button>
          <button onClick={onBack} style={S.btnSm(t.card, t.text)}>
            ⬅️ Sair
          </button>
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 10,
        marginBottom: 16
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, display: "flex", alignItems: "center", gap: 6 }}>
          <IconCalendar size={13} style={{marginRight: 4}} /> {formatarData(activeDate?.dateStr || activeDate?.data) || "Carregando..."}
        </div>
        
        <div style={{display: "flex", alignItems: "center", gap: 8}}>
          <style>{`
            @keyframes public-live-pulse {
              0% { transform: scale(0.95); opacity: 0.5; }
              50% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.5; }
            }
          `}</style>
          <span style={{
            fontSize: 11,
            background: "#1D9E7515",
            color: "#1D9E75",
            padding: "4px 10px",
            borderRadius: 12,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            border: "1px solid #1D9E7533"
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#1D9E75",
              display: "inline-block",
              animation: "public-live-pulse 2s infinite ease-in-out"
            }} />
            Tempo Real
          </span>
        </div>
      </div>

      {currentMatch && !currentMatch.played ? (
        <div style={{
          ...S.card,
          border: `2px solid #1D9E75`,
          background: `${t.card}`,
          marginBottom: 16,
          padding: 16,
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#1D9E75",
            textTransform: "uppercase",
            marginBottom: 4,
            textAlign: "center",
            letterSpacing: 1
          }}>
            <IconActivity size={12} style={{marginRight: 4}} /> JOGO EM ANDAMENTO
          </div>

          <IndependentPublicTimer
            timerRunning={currentMatch.timerRunning}
            timerSecondsAtStart={currentMatch.timerSecondsAtStart}
            t={t}
          />
          
          <div style={{
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center",
            gap: 10,
            margin: "4px 0 12px 0"
          }}>
            <div style={{textAlign: "center", flex: 1}}>
              <div style={{fontSize: 15, fontWeight: 800, color: colorOfTeam(currentMatch.teamA)}}>{currentMatch.teamA}</div>
            </div>
            
            <div style={{fontSize: 32, fontWeight: 900, color: t.text, fontVariantNumeric: "tabular-nums"}}>
              {(currentMatch.scoreA !== "" && currentMatch.scoreA !== undefined) ? currentMatch.scoreA : 0} × {(currentMatch.scoreB !== "" && currentMatch.scoreB !== undefined) ? currentMatch.scoreB : 0}
            </div>

            <div style={{textAlign: "center", flex: 1}}>
              <div style={{fontSize: 15, fontWeight: 800, color: colorOfTeam(currentMatch.teamB)}}>{currentMatch.teamB}</div>
            </div>
          </div>

          {(() => {
            const prestesSairA = limiteVitorias > 0 && vitoriasA >= limiteVitorias;
            const prestesSairB = limiteVitorias > 0 && vitoriasB >= limiteVitorias;
            return (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"start",width:"100%",overflow:"hidden"}}>
                <div style={{
                  ...S.card,
                  border: prestesSairA ? `3px solid #E24B4A` : `2px solid ${colorOfTeam(currentMatch.teamA)}55`,
                  boxShadow: prestesSairA ? "0 0 12px rgba(226, 75, 74, 0.4)" : "none",
                  background: prestesSairA ? "#E24B4A10" : undefined,
                  padding: 8,
                  textAlign: "right",
                  minWidth: 0,
                  overflow: "hidden"
                }}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4,minWidth:0,overflow:"hidden",marginBottom:6}}>
                    {prestesSairA && (
                      <span style={{fontSize:9,fontWeight:800,color:"#E24B4A",background:"#E24B4A15",padding:"2px 4px",borderRadius:4,marginRight:4}}>
                        ⚠️ NO LIMITE ({vitoriasA}/{limiteVitorias} vitórias)
                      </span>
                    )}
                    <span style={{fontWeight:700,fontSize:12,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentMatch.teamA}</span>
                    <div style={{width:8,height:8,borderRadius:"50%",background:colorOfTeam(currentMatch.teamA),flexShrink:0}}/>
                  </div>
                  <div style={{fontSize:11,color:t.textSec,display:"flex",flexDirection:"column",gap:6}}>
                    {(ps?.teams?.find(tm=>tm.name===currentMatch.teamA)?.players || currentMatch.playersA || []).map((p,pi)=>{
                      const athleteId = String(p.id || p.atleta_id || p.idAtleta);
                      const goals = currentMatch.sumula?.[athleteId] || currentMatch.sumula?.[Number(athleteId)];
                      const isProxEmprestado = proxCandidatosEmprestimoIds.includes(athleteId);
                      return (
                        <div key={pi} style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {goals ? (
                            <span style={{fontSize:10,fontWeight:600,color:"#BA7517",marginRight:2,flexShrink:0}}>
                              <IconSoccer size={12} style={{marginRight: 2}} />{goals > 1 ? ` ${goals}` : ""}
                            </span>
                          ) : null}
                          <span style={{
                            fontWeight: isProxEmprestado ? 700 : 500,
                            color: isProxEmprestado ? "#1D9E75" : t.text,
                            overflow:"hidden",
                            textOverflow:"ellipsis",
                            ...(isProxEmprestado ? {
                              background: "#1D9E7518",
                              border: "1px solid #1D9E75",
                              borderRadius: 4,
                              padding: "1px 5px"
                            } : {})
                          }}>{isProxEmprestado ? "🔄 " : ""}{getPlayerName(p)}{getLoanTag(p, currentMatch.teamA)}</span>
                        </div>
                      );
                    })}
                  </div>
                  {currentMatch.goleiroA && (
                    <div style={{marginTop: 8, borderTop: `1px solid ${t.cardBorder}`, paddingTop: 6, display: "flex", justifyContent: "flex-end", fontSize: 10, color: t.textSec, gap: 4}}>
                      <IconGoalkeeper size={12} style={{marginRight: 4}} /> Goleiro: <b>{getPlayerName({ id: currentMatch.goleiroA })}</b>
                    </div>
                  )}
                </div>

                <div style={{
                  ...S.card,
                  border: prestesSairB ? `3px solid #E24B4A` : `2px solid ${colorOfTeam(currentMatch.teamB)}55`,
                  boxShadow: prestesSairB ? "0 0 12px rgba(226, 75, 74, 0.4)" : "none",
                  background: prestesSairB ? "#E24B4A10" : undefined,
                  padding: 8,
                  minWidth: 0,
                  overflow: "hidden"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:4,minWidth:0,overflow:"hidden",marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:colorOfTeam(currentMatch.teamB),flexShrink:0}}/>
                    <span style={{fontWeight:700,fontSize:12,color:t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentMatch.teamB}</span>
                    {prestesSairB && (
                      <span style={{fontSize:9,fontWeight:800,color:"#E24B4A",background:"#E24B4A15",padding:"2px 4px",borderRadius:4,marginLeft:4}}>
                        ⚠️ NO LIMITE ({vitoriasB}/{limiteVitorias} vitórias)
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:11,color:t.textSec,display:"flex",flexDirection:"column",gap:6}}>
                    {(ps?.teams?.find(tm=>tm.name===currentMatch.teamB)?.players || currentMatch.playersB || []).map((p,pi)=>{
                      const athleteId = String(p.id || p.atleta_id || p.idAtleta);
                      const goals = currentMatch.sumula?.[athleteId] || currentMatch.sumula?.[Number(athleteId)];
                      const isProxEmprestado = proxCandidatosEmprestimoIds.includes(athleteId);
                      return (
                        <div key={pi} style={{display:"flex",alignItems:"center",gap:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          <span style={{
                            fontWeight: isProxEmprestado ? 700 : 500,
                            color: isProxEmprestado ? "#1D9E75" : t.text,
                            overflow:"hidden",
                            textOverflow:"ellipsis",
                            ...(isProxEmprestado ? {
                              background: "#1D9E7518",
                              border: "1px solid #1D9E75",
                              borderRadius: 4,
                              padding: "1px 5px"
                            } : {})
                          }}>{isProxEmprestado ? "🔄 " : ""}{getPlayerName(p)}{getLoanTag(p, currentMatch.teamB)}</span>
                          {goals ? (
                            <span style={{fontSize:10,fontWeight:600,color:"#BA7517",marginLeft:2,flexShrink:0}}>
                              <IconSoccer size={12} style={{marginRight: 2}} />{goals > 1 ? ` ${goals}` : ""}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {currentMatch.goleiroB && (
                    <div style={{marginTop: 8, borderTop: `1px solid ${t.cardBorder}`, paddingTop: 6, display: "flex", justifyContent: "flex-start", fontSize: 10, color: t.textSec, gap: 4}}>
                      <IconGoalkeeper size={12} style={{marginRight: 4}} /> Goleiro: <b>{getPlayerName({ id: currentMatch.goleiroB })}</b>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      ) : (
        <div style={{
          ...S.card,
          textAlign: "center",
          color: t.textSec,
          padding: 24,
          marginBottom: 16,
          borderRadius: 12
        }}>
          <IconSoccer size={14} style={{marginRight: 4}} /> Nenhum jogo rolando no momento.
        </div>
      )}

      {/* Grid vertical para empilhar Fila e Reservas no Banco */}
      <div style={{display: "flex", flexDirection: "column", gap: 14, marginBottom: 16}}>
        <div style={{...S.card, padding: 24, borderRadius: 12}}>
          <h4 style={{fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: t.text, display: "flex", alignItems: "center", gap: 6}}>
            <span>Próximos Times (Fila)</span>
            <span style={{fontSize: 10, background: "#7F77DD22", color: "#7F77DD", padding: "1px 6px", borderRadius: 4}}>{queue.slice(2).length}</span>
          </h4>
          {queue.slice(2).length > 0 ? (
            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
              {queue.slice(2).map((teamName, qIdx) => {
                const teamObj = ps?.teams?.find(tm => tm.name === teamName);
                let playersToRender = teamObj ? [...teamObj.players] : [];
                const isProxEntrando = (qIdx === 0);
                const emAndamento = currentMatch && !currentMatch.played;
                
                if (isProxEntrando && emAndamento && proxParaA && proxParaA.length > 0) {
                  // Adiciona os jogadores estimados de empréstimo para completar a visualização
                  proxParaA.forEach(p => {
                    const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
                    if (!playersToRender.some(orig => String(orig.id || orig.atleta_id || orig.idAtleta) === pIdStr)) {
                      playersToRender.push({
                        ...p,
                        isEstimadoEmprestimo: true
                      });
                    }
                  });
                }

                return (
                  <div key={teamName} style={{background: t.inputBg, borderRadius: 10, padding: 10, border: `1px solid ${t.cardBorder}`}}>
                    <div style={{fontSize:12, fontWeight:700, color:"#7F77DD", marginBottom:16, display:"flex", alignItems:"center", gap:6}}>
                      <div style={{width:8, height:8, borderRadius:"50%", background:colorOfTeam(teamName)}}/>
                      <span>{qIdx === 0 ? "Próximo a entrar" : `${qIdx + 1}º na Fila`}: {teamName}</span>
                    </div>
                    <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                      {playersToRender.map((p, pi) => {
                        const athleteId = String(p.id || p.atleta_id || p.idAtleta);
                        const pIsRev = p.isConvidado && p.convidadoDe;
                        const pAnfNome = pIsRev ? (atletas.find(x=>x.id===p.convidadoDe)?.apelido||atletas.find(x=>x.id===p.convidadoDe)?.nome||"?") : null;
                        
                        if (p.isEstimadoEmprestimo) {
                          const origTeam = getOrigemTeamName(athleteId);
                          const matches = origTeam.match(/\d+/);
                          const sigla = matches ? `T${matches[0]}` : origTeam.substring(0, 3).toUpperCase();
                          return (
                            <div 
                              key={`est-${pi}`}
                              title={`Empréstimo estimado vindo de: ${origTeam}`}
                              style={{
                                display:"inline-flex", 
                                alignItems:"center", 
                                gap:4, 
                                fontSize:11, 
                                background: "#1D9E7518", 
                                padding:"4px 8px", 
                                borderRadius:12, 
                                border: "1.5px dashed #1D9E75",
                                boxShadow: "0 0 4px rgba(29, 158, 117, 0.2)"
                              }}
                            >
                              <PlayerAvatar atleta={p} size={16}/>
                              <span style={{fontWeight:600, color: "#1D9E75"}}>{getPlayerName(p)} <IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>
                            </div>
                          );
                        }

                        const isCandidatoEmprestimo = proxCandidatosEmprestimoIds.includes(athleteId);
                        return (
                          <div 
                            key={pi} 
                            title={isCandidatoEmprestimo ? "Selecionado para empréstimo no próximo jogo" : undefined}
                            style={{
                              display:"inline-flex", 
                              alignItems:"center", 
                              gap:4, 
                              fontSize:11, 
                              background: isCandidatoEmprestimo ? "#1D9E7515" : (pIsRev ? "#7F77DD22" : t.card), 
                              padding:"4px 8px", 
                              borderRadius:12, 
                              border: isCandidatoEmprestimo ? "1.5px solid #1D9E75" : (pIsRev ? "1px solid #7F77DD44" : `1px solid ${t.inputBorder}`),
                              boxShadow: isCandidatoEmprestimo ? "0 0 6px rgba(29, 158, 117, 0.3)" : "none",
                              transition: "all 0.2s ease"
                            }}
                          >
                            <PlayerAvatar atleta={p} size={16}/>
                            <span style={{fontWeight:500, color: pIsRev ? "#7F77DD" : t.text}}>{getPlayerName(p)}{isCandidatoEmprestimo && " 🤝"}</span>
                            {pIsRev && <span style={{fontSize:9, color:"#7F77DD", opacity:0.8}} title={`Reveza com ${pAnfNome}`}>🔄</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{fontSize: 11, color: t.textSec, textAlign: "center", padding: 10}}>Sem times na fila de espera.</div>
          )}
        </div>

        <div style={{...S.card, padding: 24, borderRadius: 12}}>
          <h4 style={{fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: t.text, display: "flex", alignItems: "center", gap: 6}}>
            <span>Reservas no Banco</span>
            <span style={{fontSize: 10, background: "#BA751722", color: "#BA7517", padding: "1px 6px", borderRadius: 4}}>{bench.length}</span>
          </h4>
          {bench.length > 0 ? (
            <div style={{display: "flex", flexWrap: "wrap", gap: 6}}>
              {bench.map((b, i) => {
                const isRev = b.isConvidado && b.convidadoDe;
                const anfitriaoNome = isRev ? (atletas.find(x=>x.id===b.convidadoDe)?.apelido || atletas.find(x=>x.id===b.convidadoDe)?.nome || "?") : null;
                const athleteId = String(b.id || b.atleta_id || b.idAtleta);
                const isCandidatoEmprestimo = proxCandidatosEmprestimoIds.includes(athleteId);
                return (
                  <span 
                    key={i} 
                    title={isCandidatoEmprestimo ? "Selecionado para empréstimo no próximo jogo" : undefined}
                    style={{
                      display:"inline-flex",
                      alignItems:"center",
                      gap:4,
                      fontSize:12,
                      padding:"3px 10px",
                      borderRadius:16,
                      background: isCandidatoEmprestimo ? "#1D9E7515" : (isRev ? "#7F77DD22" : "#BA751722"),
                      color: isCandidatoEmprestimo ? "#1D9E75" : (isRev ? "#7F77DD" : "#BA7517"),
                      fontWeight:600,
                      border: isCandidatoEmprestimo ? "1.5px solid #1D9E75" : (isRev ? "1px solid #7F77DD44" : "none"),
                      boxShadow: isCandidatoEmprestimo ? "0 0 6px rgba(29, 158, 117, 0.3)" : "none",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <PlayerAvatar atleta={b} size={16}/>
                    {b.goleiro ? <IconGoalkeeper size={14} /> : <IconSoccer size={14} />} {getPlayerName(b)}{isCandidatoEmprestimo && " 🤝"}
                    {isRev && <span title={`Reveza com ${anfitriaoNome}`} style={{fontSize:9,opacity:0.85}}>🔄{anfitriaoNome}</span>}
                  </span>
                );
              })}
            </div>
          ) : (
            <div style={{fontSize: 11, color: t.textSec, textAlign: "center", padding: 10}}>Banco de reservas vazio.</div>
          )}
        </div>
      </div>
      
      {/* Lista de Confirmados na Pelada */}
      {(() => {
        const confirmadosParts = activeDate?.participacoes || [];
        const confirmadosSorted = confirmadosParts.map(part => {
          const a = atletas.find(x => String(x.id) === String(part.atleta_id));
          const nomeExibido = a ? (a.apelido || a.nome) : `Jogador #${part.atleta_id}`;
          return { ...part, atleta: a, nomeExibido };
        }).sort((a, b) => a.nomeExibido.localeCompare(b.nomeExibido, "pt-BR", { sensitivity: "base" }));

        return (
          <div style={{...S.card, padding: 24, borderRadius: 12, marginBottom: 16}}>
            <h4 style={{fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: t.text, display: "flex", alignItems: "center", gap: 6}}>
              <span>Lista de Confirmados ({confirmadosParts.length})</span>
            </h4>
            {confirmadosSorted.length > 0 ? (
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr",
                gap: 8
              }}>
                {confirmadosSorted.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11.5,
                      padding: "6px 10px",
                      borderRadius: 8,
                      background: t.inputBg,
                      color: t.text,
                      fontWeight: 600,
                      border: `1px solid ${t.cardBorder}`,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span style={{color: t.textSec, minWidth: 16, fontSize: 10.5, fontWeight: 700}}>{index + 1}.</span>
                    <PlayerAvatar atleta={item.atleta} size={16}/>
                    <span style={{overflow: "hidden", textOverflow: "ellipsis"}}>{item.nomeExibido}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{fontSize: 11, color: t.textSec, textAlign: "center", padding: 10}}>
                Nenhum atleta confirmado nesta data.
              </div>
            )}
          </div>
        );
      })()}

      {/* Card único do Ranking do Dia (Histórico de Jogos removido) */}
      <div style={{...S.card, padding: 24, borderRadius: 12, marginBottom: 16}}>
        <h4 style={{fontSize: 13, fontWeight: 700, margin: "0 0 10px 0", color: t.text}}>Ranking do Dia</h4>
        {ranking.length > 0 ? (
          <div style={{display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto"}}>
            {ranking.map((row, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "4px 8px",
                borderRadius: 6,
                background: i === 0 ? "#BA751715" : "transparent",
                borderBottom: `1px solid ${t.cardBorder}`,
                fontSize: 11
              }}>
                <span style={{fontWeight: i === 0 ? 700 : 500}}>
                  {i + 1}º {row.name}
                </span>
                <div style={{display: "flex", gap: 8, color: t.textSec}}>
                  <span><b>{row.pts}</b> pts</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{fontSize: 11, color: t.textSec, textAlign: "center", padding: 24}}>Sem estatísticas.</div>
        )}
      </div>
      
      <div style={{textAlign: "center", fontSize: 10, color: t.textSec, marginTop: 30, opacity: 0.6}}>
        Desenvolvido com <IconSoccer size={12} /> pelo Futebol Manager
      </div>

      {modalPixOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:16,color:t.text}}>Pagar Diária via Pix</div>
              <button onClick={() => {
                setModalPixOpen(false);
                setPixQrCode(null);
                setPixCopiaCola("");
                setPixPaymentId(null);
                setPixSucesso(false);
                setPixError("");
              }} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>×</button>
            </div>

            {pixSucesso ? (
              <div style={{textAlign:"center",padding:"20px 10px"}}>
                <div style={{fontSize:48,marginBottom:16}}>✅</div>
                <h3 style={{fontSize:16,fontWeight:800,color:t.text,marginBottom:16}}>Pagamento Confirmado!</h3>
                <p style={{fontSize:13,color:t.textSec,lineHeight:1.5,marginBottom:20}}>
                  Seu Pix foi recebido e você foi adicionado à lista de presença da pelada com sucesso! Bom jogo!
                </p>
                <button onClick={() => {
                  setModalPixOpen(false);
                  setPixQrCode(null);
                  setPixCopiaCola("");
                  setPixPaymentId(null);
                  setPixSucesso(false);
                  setPixError("");
                }} style={{...S.btn(t.accent),width:"100%"}}>Entendido</button>
              </div>
            ) : pixQrCode ? (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:16}}>
                <div style={{fontSize:12,color:t.textSec,textAlign:"center"}}>
                  Escaneie o QR Code abaixo com o aplicativo do seu banco para pagar:
                </div>
                
                <img src={`data:image/png;base64,${pixQrCode}`} alt="QR Code Pix" style={{width:200,height:200,borderRadius:8,background:"#fff",padding:8}} />
                
                <div style={{width:"100%"}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.textSec,marginBottom:4}}>Pix Copia e Cola:</div>
                  <textarea readOnly value={pixCopiaCola} style={{...S.input,width:"100%",height:60,fontSize:11,resize:"none",marginBottom:16}} onClick={e => e.target.select()} />
                  <button onClick={() => {
                    navigator.clipboard.writeText(pixCopiaCola);
                    alert("Chave Pix copiada para a área de transferência! 🚀");
                  }} style={{...S.btn(t.accent),width:"100%",padding:"24px"}}>Copiar Código Pix</button>
                </div>

                <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:t.textSec,marginTop:8}}>
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: "#10B981",
                    display: "inline-block",
                    animation: "public-live-pulse 1.5s infinite"
                  }} />
                  Aguardando confirmação de pagamento...
                </div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div>
                  <label style={S.label}>Quem está pagando?</label>
                  <select value={pixAtletaId} onChange={e => {
                    setPixAtletaId(e.target.value);
                    if (e.target.value !== "novo_atleta") {
                      const selected = atletas.find(x => String(x.id) === String(e.target.value));
                      if (selected) {
                        setPixNome(selected.nome);
                        if (selected.email) setPixEmail(selected.email);
                        if (selected.cpf) setPixCpf(selected.cpf);
                      }
                    } else {
                      setPixNome("");
                      setPixEmail("");
                      setPixCpf("");
                    }
                  }} style={S.select}>
                    <option value="novo_atleta">Novo Jogador (Convidado/Diarista)</option>
                    {atletas.map(a => (
                      <option key={a.id} value={a.id}>{a.nome} {a.apelido ? `(${a.apelido})` : ""}</option>
                    ))}
                  </select>
                </div>

                {pixAtletaId === "novo_atleta" && (
                  <div>
                    <label style={S.label}>Nome Completo</label>
                    <input type="text" value={pixNome} onChange={e => setPixNome(e.target.value)} style={S.input} placeholder="Digite seu nome completo" />
                  </div>
                )}

                <div>
                  <label style={S.label}>E-mail</label>
                  <input type="email" value={pixEmail} onChange={e => setPixEmail(e.target.value)} style={S.input} placeholder="seu-email@exemplo.com" />
                </div>

                <div>
                  <label style={S.label}>CPF (necessário para Pix)</label>
                  <input type="text" value={pixCpf} onChange={e => setPixCpf(e.target.value)} style={S.input} placeholder="000.000.000-00" />
                </div>

                <div style={{...S.card,background:t.inputBg,padding:10,textAlign:"center",marginTop:6}}>
                  <span style={{fontSize:11,color:t.textSec}}>Valor da Contribuição:</span>
                  <div style={{fontSize:18,fontWeight:800,color:t.accent}}>{fmtCur(activeDate?.valor !== undefined && activeDate?.valor !== "" && activeDate?.valor !== null ? activeDate.valor : (localPelada.valor_contribuicao || 15.00))}</div>
                </div>

                {pixError && (
                  <div style={{color:"#E24B4A",fontSize:12,fontWeight:600,textAlign:"center",background:"#E24B4A10",padding:8,borderRadius:8}}>
                    {pixError}
                  </div>
                )}

                <button onClick={handleGerarPix} disabled={pixLoading} style={{...S.btn(t.accent),width:"100%",marginTop:10,justifyContent:"center"}}>
                  {pixLoading ? "Gerando Pix..." : "Gerar QR Code Pix "}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({name,size=28,color="#22b7d9",src}){
  if (src) {
    return (
      <img 
        src={src} 
        alt={name} 
        style={{width:size,height:size,borderRadius:"50%",objectFit:"cover",flexShrink:0}}
      />
    );
  }
  const initials = String(name||"?").split(" ").filter(Boolean).map(n=>n[0].toUpperCase()).slice(0,2).join("");
  return(
    <div style={{width:size,height:size,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:color,color:"#fff",fontSize:Math.max(12, size*0.45),fontWeight:700,flexShrink:0}}>
      {initials || "?"}
    </div>
  );
}

function Tag({label,color="#22b7d9"}){
  return (
    <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",padding:"4px 10px",borderRadius:999,background:color+"22",color:color,fontSize:11,fontWeight:700,letterSpacing:0.3}}>{label}</span>
  );
}

function Sec({title,children,t}){return<div style={{marginBottom:24}}><h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}>{title}</h3>{children}</div>;}

/* ─────────────────────────── STANDINGS ──────────────────────────── */
function StandingsTable({standings,teams,colorOf,accent,t,emblems}){
  const ac=accent||"#22b7d9";
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:340}}>
        <thead><tr style={{borderBottom:`2px solid ${t.cardBorder}`}}>
          {["#","Time","J","V","E","D","GP","GC","SG","Pts"].map(h=><th key={h} style={{padding:"8px 6px",fontWeight:600,textAlign:h==="Time"?"left":"center",color:t.textSec}}>{h}</th>)}
        </tr></thead>
        <tbody>{(standings||[]).map((s,i)=>(
          <tr key={s.name} style={{borderBottom:`1px solid ${t.cardBorder}`,background:i===0?ac+"14":"transparent"}}>
            <td style={{padding:"9px 6px",textAlign:"center",fontWeight:700,color:t.textSec}}>{i+1}</td>
            <td style={{padding:"9px 6px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={s.name} color={colorOf?colorOf(s.name,teams):"#1D9E75"} size={28} src={emblems?.[s.name]}/><span style={{fontWeight:700,color:t.text,fontSize:14}}>{s.name}</span></div></td>
            {[s.j,s.v,s.e,s.d,s.gp,s.gc,s.sg].map((v,vi)=><td key={vi} style={{padding:"9px 6px",textAlign:"center",color:t.text,fontSize:12}}>{v}</td>)}
            <td style={{padding:"9px 6px",textAlign:"center",fontWeight:800,color:ac,fontSize:14}}>{s.pts}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── RELATÓRIO PELADAS ───────────────────── */
function AbaRelatorioPelada({ peladaState, datas, atletas, selDataSorteio, repSortBy, setRepSortBy, formatarData, t }) {
  const S = makeStyles(t);
  const [activeRankTab, setActiveRankTab] = useState("linha");
  const [filtroPeriodoTipo, setFiltroPeriodoTipo] = useState("geral"); // "geral" | "mes" | "trimestre"
  const [filtroPeriodoValor, setFiltroPeriodoValor] = useState("");

  const opcoesMeses = React.useMemo(() => {
    try {
      const map = new Map();
      const arrDatas = Array.isArray(datas) ? datas : [];
      arrDatas.forEach(d => {
        if (!d || !d.data) return;
        const [ano, mes] = d.data.split('-');
        if (!mes) return;
        const nomeMeses = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        const idx = parseInt(mes) - 1;
        if (isNaN(idx) || idx < 0 || idx > 11) return;
        const rotulo = `${nomeMeses[idx]} de ${ano}`;
        map.set(`${ano}-${mes}`, rotulo);
      });
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    } catch (e) {
      console.error("Erro no useMemo opcoesMeses:", e);
      return [];
    }
  }, [datas]);

  const opcoesTrimestres = React.useMemo(() => {
    try {
      const map = new Map();
      const arrDatas = Array.isArray(datas) ? datas : [];
      arrDatas.forEach(d => {
        if (!d || !d.data) return;
        const [ano, mes] = d.data.split('-');
        if (!mes) return;
        const trim = Math.floor((parseInt(mes) - 1) / 3) + 1;
        if (isNaN(trim) || trim < 1 || trim > 4) return;
        const rotulo = `${trim}º Trimestre de ${ano}`;
        map.set(`${ano}-T${trim}`, rotulo);
      });
      return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    } catch (e) {
      console.error("Erro no useMemo opcoesTrimestres:", e);
      return [];
    }
  }, [datas]);

  useEffect(() => {
    try {
      if (filtroPeriodoTipo === "mes") {
        setFiltroPeriodoValor(opcoesMeses[0] ? opcoesMeses[0][0] : "");
      } else if (filtroPeriodoTipo === "trimestre") {
        setFiltroPeriodoValor(opcoesTrimestres[0] ? opcoesTrimestres[0][0] : "");
      } else {
        setFiltroPeriodoValor("");
      }
    } catch (e) {
      console.error("Erro no useEffect filtroPeriodo:", e);
    }
  }, [filtroPeriodoTipo, opcoesMeses, opcoesTrimestres]);

  try {
    const colorOfTeam = n => {
      const i = (peladaState?.teams || []).findIndex(x => x.name === n);
      return COLORS[i % COLORS.length] || "#888";
    };

    const getFilteredMatches = () => {
      const log = peladaState?.matchLog || [];
      let matches = log.filter(m => m.played);

      if (String(selDataSorteio) !== "todas") {
        matches = matches.filter(m => String(m.dataRealizacaoId) === String(selDataSorteio));
      } else {
        if (filtroPeriodoTipo === "mes" && filtroPeriodoValor) {
          matches = matches.filter(m => {
            const dObj = (datas || []).find(x => String(x.id) === String(m.dataRealizacaoId));
            if (!dObj || !dObj.data) return false;
            const [ano, mes] = dObj.data.split('-');
            return `${ano}-${mes}` === filtroPeriodoValor;
          });
        } else if (filtroPeriodoTipo === "trimestre" && filtroPeriodoValor) {
          matches = matches.filter(m => {
            const dObj = (datas || []).find(x => String(x.id) === String(m.dataRealizacaoId));
            if (!dObj || !dObj.data) return false;
            const [ano, mes] = dObj.data.split('-');
            const trim = Math.floor((parseInt(mes) - 1) / 3) + 1;
            return `${ano}-T${trim}` === filtroPeriodoValor;
          });
        }
      }
      return matches;
    };

  const getPlayersFallback = (match, teamLetter) => {
    const teamName = teamLetter === 'A' ? match.teamA : match.teamB;
    const matchPlayers = teamLetter === 'A' ? match.playersA : match.playersB;
    if (Array.isArray(matchPlayers) && matchPlayers.length > 0) {
      return matchPlayers;
    }
    const dataId = match.dataRealizacaoId;
    if (dataId) {
      const dObj = datas.find(x => String(x.id) === String(dataId));
      if (dObj) {
        const teams = dObj.peladaState?.teams || dObj.drawnTeams || dObj.formacoes || dObj.teams || [];
        if (Array.isArray(teams)) {
          const foundTeam = teams.find(t => t.name === teamName);
          if (foundTeam && Array.isArray(foundTeam.players)) {
            return foundTeam.players;
          }
        }
      }
    }
    if (peladaState && Array.isArray(peladaState.teams)) {
      const foundTeam = peladaState.teams.find(t => t.name === teamName);
      if (foundTeam && Array.isArray(foundTeam.players)) {
        return foundTeam.players;
      }
    }
    return [];
  };

  const getAtletaAtualizado = (p) => {
    const pId = p.id || p.atleta_id;
    const encontrado = atletas.find(a => String(a.id) === String(pId));
    return encontrado || p;
  };

  const buildReportData = () => {
    const filteredMatches = getFilteredMatches();
    const stats = {};
    const totalPartidas = filteredMatches.length;

    filteredMatches.forEach(m => {
      const scoreA = parseInt(m.scoreA) || 0;
      const scoreB = parseInt(m.scoreB) || 0;
      const sumula = m.sumula || {};

      // Time A
      const playersA = getPlayersFallback(m, 'A');
      playersA.forEach(p => {
        const pId = String(p.id || p.atleta_id || '');
        if (!pId) return;
        const atletaAtual = getAtletaAtualizado(p);
        
        if (!stats[pId]) {
          stats[pId] = { 
            player: atletaAtual, 
            j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, sgTime: 0, 
            bonusFidelidade: 0, ptsFinais: 0, mpj: 0, pctPresenca: 0,
            jogosGoleiro: 0,
            ptsGoleiro: 0,
            gcGoleiro: 0,
            sgGoleiro: 0,
            vGoleiro: 0,
            eGoleiro: 0,
            dGoleiro: 0,
            bonusFidelidadeGoleiro: 0,
            ptsFinaisGoleiro: 0,
            mpjGoleiro: 0
          };
        }
        const s = stats[pId];
        s.j++;
        const golsInd = parseInt(sumula[pId]) || parseInt(sumula[Number(pId)]) || 0;
        s.gp += golsInd;
        s.gc += scoreB;
        s.sgTime += (scoreA - scoreB);

        const foiGoleiroPartidaInteira = String(pId) === String(m.goleiroA) && m.goleiroAInteiro !== false;

        // Regras de Pontuação Base:
        let pontosPartida = 5; // 5 pontos de Presença por jogar
        
        if (scoreA > scoreB) {
          s.v++;
          pontosPartida += 10; // 10 pontos por Vitória
        } else if (scoreA === scoreB) {
          s.e++;
          pontosPartida += 5; // 5 pontos por Empate
        } else {
          s.d++;
        }

        if (foiGoleiroPartidaInteira) {
          // Bônus Baliza Zero para Goleiro: se o adversário (Time B) sofreu 0 gols, ganha 5 pontos
          if (scoreB === 0) {
            pontosPartida += 5;
          }
        } else {
          // Gols do Time: 2 pontos por gol marcado pelo time A
          pontosPartida += (scoreA * 2);
        }

        s.pts += pontosPartida;

        // Estatísticas específicas de atuação como goleiro na partida inteira
        if (foiGoleiroPartidaInteira) {
          s.jogosGoleiro++;
          s.ptsGoleiro += pontosPartida;
          s.gcGoleiro += scoreB;
          s.sgGoleiro += (scoreA - scoreB);
          if (scoreA > scoreB) {
            s.vGoleiro++;
          } else if (scoreA === scoreB) {
            s.eGoleiro++;
          } else {
            s.dGoleiro++;
          }
        }
      });

      // Time B
      const playersB = getPlayersFallback(m, 'B');
      playersB.forEach(p => {
        const pId = String(p.id || p.atleta_id || '');
        if (!pId) return;
        const atletaAtual = getAtletaAtualizado(p);
        
        if (!stats[pId]) {
          stats[pId] = { 
            player: atletaAtual, 
            j: 0, v: 0, e: 0, d: 0, gp: 0, gc: 0, pts: 0, sgTime: 0, 
            bonusFidelidade: 0, ptsFinais: 0, mpj: 0, pctPresenca: 0,
            jogosGoleiro: 0,
            ptsGoleiro: 0,
            gcGoleiro: 0,
            sgGoleiro: 0,
            vGoleiro: 0,
            eGoleiro: 0,
            dGoleiro: 0,
            bonusFidelidadeGoleiro: 0,
            ptsFinaisGoleiro: 0,
            mpjGoleiro: 0
          };
        }
        const s = stats[pId];
        s.j++;
        const golsInd = parseInt(sumula[pId]) || parseInt(sumula[Number(pId)]) || 0;
        s.gp += golsInd;
        s.gc += scoreA;
        s.sgTime += (scoreB - scoreA);

        const foiGoleiroPartidaInteira = String(pId) === String(m.goleiroB) && m.goleiroBInteiro !== false;

        // Regras de Pontuação Base:
        let pontosPartida = 5; // 5 pontos de Presença por jogar
        
        if (scoreB > scoreA) {
          s.v++;
          pontosPartida += 10; // 10 pontos por Vitória
        } else if (scoreB === scoreA) {
          s.e++;
          pontosPartida += 5; // 5 pontos por Empate
        } else {
          s.d++;
        }

        if (foiGoleiroPartidaInteira) {
          // Bônus Baliza Zero para Goleiro: se o adversário (Time A) sofreu 0 gols, ganha 5 pontos
          if (scoreA === 0) {
            pontosPartida += 5;
          }
        } else {
          // Gols do Time: 2 pontos por gol marcado pelo time B
          pontosPartida += (scoreB * 2);
        }

        s.pts += pontosPartida;

        // Estatísticas específicas de atuação como goleiro na partida inteira
        if (foiGoleiroPartidaInteira) {
          s.jogosGoleiro++;
          s.ptsGoleiro += pontosPartida;
          s.gcGoleiro += scoreA;
          s.sgGoleiro += (scoreB - scoreA);
          if (scoreB > scoreA) {
            s.vGoleiro++;
          } else if (scoreB === scoreA) {
            s.eGoleiro++;
          } else {
            s.dGoleiro++;
          }
        }
      });
    });

    const arr = Object.values(stats);
    arr.forEach(s => {
      s.pctPresenca = totalPartidas > 0 ? parseFloat(((s.j / totalPartidas) * 100).toFixed(1)) : 0;
      s.bonusFidelidade = parseFloat((s.j * 0.1).toFixed(2));
      s.ptsFinais = parseFloat((s.pts + s.bonusFidelidade).toFixed(2));
      s.mpj = s.j > 0 ? parseFloat((s.ptsFinais / s.j).toFixed(2)) : 0;

      s.bonusFidelidadeGoleiro = parseFloat((s.jogosGoleiro * 0.1).toFixed(2));
      s.ptsFinaisGoleiro = parseFloat((s.ptsGoleiro + s.bonusFidelidadeGoleiro).toFixed(2));
      s.mpjGoleiro = s.jogosGoleiro > 0 ? parseFloat((s.ptsFinaisGoleiro / s.jogosGoleiro).toFixed(2)) : 0;
    });

    return arr;
  };

  const totalPartidas = getFilteredMatches().length;
  const allStats = buildReportData();

  const sortRanking = (a, b) => {
    // 1. Qualificado primeiro
    const aQual = a.pctPresenca >= 50 ? 1 : 0;
    const bQual = b.pctPresenca >= 50 ? 1 : 0;
    if (aQual !== bQual) return bQual - aQual;

    // 2. Pontuação Final descrescente
    if (b.ptsFinais !== a.ptsFinais) return b.ptsFinais - a.ptsFinais;

    // 3. MPJ descrescente
    if (b.mpj !== a.mpj) return b.mpj - a.mpj;

    // 4. Saldo de Gols do Time descrescente
    if (b.sgTime !== a.sgTime) return b.sgTime - a.sgTime;

    // 5. Menor número de jogos
    return a.j - b.j;
  };

  const sortRankingGoleiros = (a, b) => {
    // 1. Qualificado primeiro (50% de presença como goleiro)
    const pctA = totalPartidas > 0 ? (a.jogosGoleiro / totalPartidas) * 100 : 0;
    const pctB = totalPartidas > 0 ? (b.jogosGoleiro / totalPartidas) * 100 : 0;
    const aQual = pctA >= 50 ? 1 : 0;
    const bQual = pctB >= 50 ? 1 : 0;
    if (aQual !== bQual) return bQual - aQual;

    // 2. Pontuação Final de Goleiro descrescente
    if (b.ptsFinaisGoleiro !== a.ptsFinaisGoleiro) return b.ptsFinaisGoleiro - a.ptsFinaisGoleiro;

    // 3. MPJ de Goleiro descrescente
    if (b.mpjGoleiro !== a.mpjGoleiro) return b.mpjGoleiro - a.mpjGoleiro;

    // 4. Saldo de Gols de Goleiro descrescente
    if (b.sgGoleiro !== a.sgGoleiro) return b.sgGoleiro - a.sgGoleiro;

    // 5. Menor número de jogos como goleiro
    return a.jogosGoleiro - b.jogosGoleiro;
  };

  // 1. Artilheiros
  const rankingArtilheiros = [...allStats]
    .filter(s => s.gp > 0)
    .sort((a, b) => b.gp - a.gp || b.mpj - a.mpj || a.j - b.j);

  // 2. Goleiros
  const rankingGoleiros = [...allStats]
    .filter(s => s.player.goleiro === true)
    .sort(sortRankingGoleiros);

  // 3. Jogadores de Linha
  const rankingJogadoresLinha = [...allStats]
    .filter(s => !s.player.goleiro)
    .sort(sortRanking);

  const getSelectedDateText = () => {
    if (String(selDataSorteio) === "todas") {
      if (filtroPeriodoTipo === "mes" && filtroPeriodoValor) {
        const opcao = opcoesMeses.find(o => o[0] === filtroPeriodoValor);
        return opcao ? opcao[1] : "Todas as Datas";
      }
      if (filtroPeriodoTipo === "trimestre" && filtroPeriodoValor) {
        const opcao = opcoesTrimestres.find(o => o[0] === filtroPeriodoValor);
        return opcao ? opcao[1] : "Todas as Datas";
      }
      return "Todas as Datas";
    }
    const dataObj = datas.find(x => String(x.id) === String(selDataSorteio));
    return dataObj ? formatarData(dataObj.data) : "—";
  };

  return (
    <div>
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-relatorio, #printable-relatorio * {
            visibility: visible;
          }
          #printable-relatorio {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
            background: ${t.bg} !important;
            color: ${t.text} !important;
            font-family: Arial, sans-serif;
            padding: 24px;
            box-sizing: border-box;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Visão de Tela (Escondida no PDF) */}
      <div className="no-print">
        {/* Seletor de Cores do Relatório & Sistema */}
        <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, borderColor: (t.accent || "#0095F6") + "55" }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>Tema de Cor (Ranking & Sistema):</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { name: "Azul Instagram", color: "#0095F6" },
              { name: "Verde Esmeralda", color: "#1D9E75" },
              { name: "Roxo Classic", color: "#7F77DD" },
              { name: "Laranja Sol", color: "#BA7517" },
              { name: "Vermelho Sunset", color: "#E24B4A" },
              { name: "Preto Minimal", color: "#262626" }
            ].map(c => (
              <button
                key={c.color}
                onClick={() => t.changeAccentColor(c.color)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: c.color,
                  border: `2.5px solid ${t.accent === c.color ? (t.dark ? "#ffffff" : "#000000") : "transparent"}`,
                  cursor: "pointer",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.15)",
                  transition: "transform 0.1s",
                }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Filtro por Período (Apenas para Todas as Datas) */}
        {String(selDataSorteio) === "todas" && (
          <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderColor: (t.accent || "#0095F6") + "44" }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: t.text }}>Filtrar por Período:</div>
            
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select 
                value={filtroPeriodoTipo} 
                onChange={e => setFiltroPeriodoTipo(e.target.value)}
                style={{ ...S.select, padding: "4px 8px", fontSize: 12, width: 160 }}
              >
                <option value="geral">Geral (Todo o histórico)</option>
                <option value="mes">Mensal</option>
                <option value="trimestre">Trimestral</option>
              </select>
            </div>

            {filtroPeriodoTipo === "mes" && opcoesMeses.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select 
                  value={filtroPeriodoValor} 
                  onChange={e => setFiltroPeriodoValor(e.target.value)}
                  style={{ ...S.select, padding: "4px 8px", fontSize: 12, width: 180 }}
                >
                  {opcoesMeses.map(([chave, rotulo]) => (
                    <option key={chave} value={chave}>{rotulo}</option>
                  ))}
                </select>
              </div>
            )}

            {filtroPeriodoTipo === "trimestre" && opcoesTrimestres.length > 0 && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <select 
                  value={filtroPeriodoValor} 
                  onChange={e => setFiltroPeriodoValor(e.target.value)}
                  style={{ ...S.select, padding: "4px 8px", fontSize: 12, width: 200 }}
                >
                  {opcoesTrimestres.map(([chave, rotulo]) => (
                    <option key={chave} value={chave}>{rotulo}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Dica para habilitar filtro de período se estiver visualizando uma data ativa específica */}
        {String(selDataSorteio) !== "todas" && (
          <div style={{ fontSize: 12, color: t.textSec, marginBottom: 16, background: (t.accent || "#0095F6") + "11", padding: "24px", borderRadius: 8, border: `1.5px dashed ${(t.accent || "#0095F6")}44`, display: "flex", alignItems: "center", gap: 6 }}>
            <span><IconInfo size={14} /></span>
            <span><strong>Dica:</strong> Para filtrar o ranking por período (mensal/trimestral), selecione a opção <strong>"Todas as Datas"</strong> no seletor de <strong>"Dia da Pelada"</strong> lá no topo da página.</span>
          </div>
        )}

        {/* Cards de Resumo & Botões de Ação */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "stretch" }} className="no-print">
          <div style={{ ...S.card, flex: 1, minWidth: 140, padding: 12, textAlign: "center", borderColor: (t.accent || "#0095F6") + "33", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 11, color: t.textSec, fontWeight: 600 }}>PARTIDAS JOGADAS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.accent || "#0095F6", marginTop: 4 }}>{totalPartidas}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "center", minWidth: 160 }}>
            <button 
              onClick={() => window.print()} 
              style={{...S.btnSm(t.accent || "#0095F6", "#fff"), fontWeight: 700, padding: "24px"}}
            >
              Exportar PDF do Ranking
            </button>
          </div>
        </div>

        {/* Abas internas do Ranking */}
        <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${t.tabBorder}`, overflowX: "auto", marginBottom: 16 }} className="no-print">
          {[
            { id: "linha", label: "👟 Jogadores de Linha" },
            { id: "goleiros", label: "🧤 Goleiros" },
            { id: "artilharia", label: "Artilharia" }
          ].map(tb => (
            <button 
              key={tb.id} 
              onClick={() => setActiveRankTab(tb.id)} 
              style={{
                padding: "8px 14px",
                border: "none",
                borderBottom: activeRankTab === tb.id ? `3px solid ${t.accent || "#0095F6"}` : "3px solid transparent",
                background: "none",
                color: activeRankTab === tb.id ? t.text : t.textSec,
                cursor: "pointer",
                fontSize: 12,
                fontWeight: activeRankTab === tb.id ? 800 : 600,
                whiteSpace: "nowrap",
                transition: "all 0.2s ease"
              }}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tabela do Ranking (Linha) */}
        {activeRankTab === "linha" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 16 }}>👟 Melhores Jogadores de Linha</div>
            {rankingJogadoresLinha.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 24, fontSize: 13 }}>Nenhum jogador de linha com partidas no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Jogador", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => {
                        let className = "";
                        if (["Pts Base", "Fidelidade", "SG Time"].includes(h)) {
                          className = "hide-on-mobile";
                        }
                        return (
                          <th key={hi} className={className} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingJogadoresLinha.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = <span style={{color:"#BA7517",fontWeight:800}}>1º</span>;
                      else if (idx === 1) badge = <span style={{color:"#8E929E",fontWeight:800}}>2º</span>;
                      else if (idx === 2) badge = <span style={{color:"#CD7F32",fontWeight:800}}>3º</span>;
                      
                      const isInqualificavel = item.pctPresenca < 50;
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent", opacity: isInqualificavel ? 0.75 : 1 }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                              {isInqualificavel && (
                                <span 
                                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A", fontWeight: 700 }}
                                  title={`Inqualificável: ${item.pctPresenca}% de presença (mínimo 50% para qualificação)`}
                                >
                                  Inqualificável
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.j}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">{item.pts}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">+{item.bonusFidelidade.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.ptsFinais.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: t.accent || "#0095F6" }}>{item.mpj.toFixed(2)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: item.sgTime > 0 ? "#1D9E75" : item.sgTime < 0 ? "#E24B4A" : t.textSec, fontWeight: 600 }} className="hide-on-mobile">
                            {item.sgTime > 0 ? `+${item.sgTime}` : item.sgTime}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabela do Ranking (Goleiros) */}
        {activeRankTab === "goleiros" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 16 }}>🧤 Melhores Goleiros</div>
            {rankingGoleiros.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 24, fontSize: 13 }}>Nenhum goleiro com partidas no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 400 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Goleiro", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => {
                        let className = "";
                        if (["Pts Base", "Fidelidade", "SG Time"].includes(h)) {
                          className = "hide-on-mobile";
                        }
                        return (
                          <th key={hi} className={className} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Goleiro" ? "left" : "center", color: t.textSec }}>
                            {h}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingGoleiros.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = <span style={{color:"#BA7517",fontWeight:800}}>1º</span>;
                      else if (idx === 1) badge = <span style={{color:"#8E929E",fontWeight:800}}>2º</span>;
                      else if (idx === 2) badge = <span style={{color:"#CD7F32",fontWeight:800}}>3º</span>;
                      
                      const pctGoleiro = totalPartidas > 0 ? (item.jogosGoleiro / totalPartidas) * 100 : 0;
                      const isInqualificavel = pctGoleiro < 50;
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent", opacity: isInqualificavel ? 0.75 : 1 }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                              {isInqualificavel && (
                                <span 
                                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#E24B4A22", color: "#E24B4A", fontWeight: 700 }}
                                  title={`Inqualificável: ${pctGoleiro.toFixed(1)}% de presença como goleiro (mínimo 50% para qualificação)`}
                                >
                                  Inqualificável
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.jogosGoleiro}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">{item.ptsGoleiro}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }} className="hide-on-mobile">+{item.bonusFidelidadeGoleiro.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.ptsFinaisGoleiro.toFixed(1)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: t.accent || "#0095F6" }}>{item.mpjGoleiro.toFixed(2)}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: item.sgGoleiro > 0 ? "#1D9E75" : item.sgGoleiro < 0 ? "#E24B4A" : t.textSec, fontWeight: 600 }} className="hide-on-mobile">
                            {item.sgGoleiro > 0 ? `+${item.sgGoleiro}` : item.sgGoleiro}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tabela do Ranking (Artilharia) */}
        {activeRankTab === "artilharia" && (
          <div style={S.card}>
            <div style={{ fontWeight: 700, fontSize: 14, color: t.text, marginBottom: 16 }}>⚽ Artilheiros (Gols Individuais)</div>
            {rankingArtilheiros.length === 0 ? (
              <div style={{ textAlign: "center", color: t.textSec, padding: 24, fontSize: 13 }}>Nenhum gol marcado no filtro selecionado.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 320 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                      {["Rank", "Jogador", "J", "Gols", "MPJ"].map((h, hi) => (
                        <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankingArtilheiros.map((item, idx) => {
                      let badge = idx + 1;
                      if (idx === 0) badge = <span style={{color:"#BA7517",fontWeight:800}}>1º</span>;
                      else if (idx === 1) badge = <span style={{color:"#8E929E",fontWeight:800}}>2º</span>;
                      else if (idx === 2) badge = <span style={{color:"#CD7F32",fontWeight:800}}>3º</span>;
                      
                      return (
                        <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, background: idx === 0 ? (t.accent ? t.accent + "11" : "#0095F611") : "transparent" }}>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{badge}</td>
                          <td style={{ padding: "9px 6px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <PlayerAvatar atleta={item.player} size={22} />
                              <span style={{ fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</span>
                            </div>
                          </td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.text }}>{item.j}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 800, color: t.accent || "#0095F6", fontSize: 13 }}>{item.gp}</td>
                          <td style={{ padding: "9px 6px", textAlign: "center", color: t.textSec }}>{item.mpj.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Visão de Impressão Exclusiva (PDF) */}
      <div id="printable-relatorio" style={{ display: "none" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, textAlign: "center", marginBottom: 20, color: t.text }}>
          Ranking da Pelada do dia {getSelectedDateText()}
        </h2>

        {/* Resumo em Impressão */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 12, borderRadius: 8, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: t.textSec, fontWeight: 600 }}>PARTIDAS JOGADAS</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.accent || "#0095F6", marginTop: 4 }}>{totalPartidas}</div>
          </div>
        </div>

        {/* 1. Ranking de Jogadores de Linha - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 24, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 16 }}>👟 Melhores Jogadores de Linha</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Jogador", "Status", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingJogadoresLinha.map((item, idx) => (
                <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, opacity: item.pctPresenca < 50 ? 0.75 : 1 }}>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: item.pctPresenca < 50 ? "#E24B4A" : "#1D9E75" }}>
                    {item.pctPresenca < 50 ? "Inqualificável" : "Qualificado"}
                  </td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.j}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.pts}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>+{item.bonusFidelidade.toFixed(1)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.ptsFinais.toFixed(1)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.mpj.toFixed(2)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.sgTime > 0 ? `+${item.sgTime}` : item.sgTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2. Ranking de Goleiros - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 24, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 16 }}>🧤 Melhores Goleiros</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Goleiro", "Status", "J", "Pts Base", "Fidelidade", "Pontuação Final", "MPJ", "SG Time"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Goleiro" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingGoleiros.map((item, idx) => {
                const pctGoleiro = totalPartidas > 0 ? (item.jogosGoleiro / totalPartidas) * 100 : 0;
                const isInqualificavel = pctGoleiro < 50;
                return (
                  <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}`, opacity: isInqualificavel ? 0.75 : 1 }}>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700, color: isInqualificavel ? "#E24B4A" : "#1D9E75" }}>
                      {isInqualificavel ? "Inqualificável" : "Qualificado"}
                    </td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.jogosGoleiro}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.ptsGoleiro}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center" }}>+{item.bonusFidelidadeGoleiro.toFixed(1)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.ptsFinaisGoleiro.toFixed(1)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.mpjGoleiro.toFixed(2)}</td>
                    <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.sgGoleiro > 0 ? `+${item.sgGoleiro}` : item.sgGoleiro}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 3. Ranking de Artilharia - Impressão */}
        <div style={{ border: `1px solid ${t.cardBorder}`, background: t.card, padding: 24, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: t.text, marginBottom: 16 }}>⚽ Artilheiros (Gols Individuais)</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${t.cardBorder}` }}>
                {["Rank", "Jogador", "J", "Gols", "MPJ"].map((h, hi) => (
                  <th key={hi} style={{ padding: "8px 6px", fontWeight: 600, textAlign: h === "Jogador" ? "left" : "center", color: t.textSec }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankingArtilheiros.map((item, idx) => (
                <tr key={item.player.id} style={{ borderBottom: `1px solid ${t.cardBorder}` }}>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "9px 6px", fontWeight: 600, color: t.text }}>{getPlayerName(item.player)}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.j}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center", fontWeight: 700 }}>{item.gp}</td>
                  <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.mpj.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    );
  } catch (err) {
    console.error("Erro na AbaRelatorioPelada:", err);
    return (
      <div style={{padding: 24, background: "#FFF5F5", border: "1px solid #E24B4A", borderRadius: 8, color: "#E24B4A", margin: "20px 0"}}>
        <h3>⚠️ Ocorreu um erro ao carregar o Ranking</h3>
        <p style={{fontWeight: 700}}>{err.message}</p>
        <pre style={{fontSize: 11, overflow: "auto", background: "#FFEBEB", padding: 10, borderRadius: 4}}>{err.stack}</pre>
      </div>
    );
  }
}

/* ─────────────────────────── FINANCEIRO ─────────────────────────── */
function FinancialPanel({finance,onChange,autoIncome=0,filtro="geral",filtroData="todas",peladas=[],datasRealizacao=[],t,entries,receitas,despesas,total}){
  const S=makeStyles(t);
  const[showAdd,setShowAdd]=useState(false);
  const[entry,setEntry]=useState({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:"",champ_id:""});
  const[editId,setEditId]=useState(null);

  const allEntries=finance?.entries||[];
  const isChamp = false;
  const champId = null;
  const CATS=["Coletes","Água","Bola","Aluguel do campo","Arbitragem","Material esportivo","Premiação","Alimentação","Transporte","Taxa de inscrição","Outros"];

  function save(){
    if(!entry.desc||!entry.amount)return;
    const localIsPelada = String(filtro).startsWith("pelada:");
    const localIsChamp = String(filtro).startsWith("champ:");
    const localFiltroId = localIsPelada || localIsChamp ? filtro.split(":")[1] : null;

    const pId = localIsPelada ? localFiltroId : (localIsChamp ? "" : entry.pelada_id);
    const dId = localIsPelada ? entry.data_id : "";
    const cId = localIsChamp ? localFiltroId : (localIsPelada ? "" : entry.champ_id);

    const finalEntry = {
      ...entry,
      pelada_id: pId || "",
      data_id: dId || "",
      champ_id: cId || ""
    };
    if(editId){onChange({entries:allEntries.map(e=>e.id===editId?{...finalEntry,id:editId}:e)});setEditId(null);}
    else{onChange({entries:[...allEntries,{...finalEntry,id:Date.now()}]});}
    setEntry({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:"",champ_id:""});setShowAdd(false);
  }
  function startEdit(e){setEntry({desc:e.desc,amount:e.amount,type:e.type,date:e.date,category:e.category||"",pelada_id:e.pelada_id||"",data_id:e.data_id||""});setEditId(e.id);setShowAdd(true);}
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
        {[["Receitas","#1D9E75",receitas],["Despesas","#E24B4A",despesas],["Saldo",total>=0?"#1D9E75":"#E24B4A",total]].map(([l,c,v])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:12}}><div style={{fontSize:10,color:t.textSec,fontWeight:700,marginBottom:4}}>{l}</div><div style={{fontSize:15,fontWeight:800,color:c}}>{fmtCur(Math.abs(v))}</div></div>
        ))}
      </div>
      {showAdd&&(
        <div style={{...S.card,marginBottom:16,border:"1.5px solid #1D9E7555"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1D9E75",marginBottom:16}}>{editId?"Editar":"Novo"} Lançamento</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            <div><label style={S.label}>Descrição</label><input style={S.input} value={entry.desc} onChange={e=>setEntry(v=>({...v,desc:e.target.value}))}/></div>
            <div><label style={S.label}>Valor (R$)</label><input style={S.input} type="number" min="0" value={entry.amount} onChange={e=>setEntry(v=>({...v,amount:e.target.value}))}/></div>
            <div><label style={S.label}>Tipo</label><div style={{display:"flex",gap:8}}>{["receita","despesa"].map(tp=><button key={tp} onClick={()=>setEntry(v=>({...v,type:tp}))} style={{flex:1,padding:8,border:`1px solid ${entry.type===tp?(tp==="receita"?"#1D9E75":"#E24B4A"):t.inputBorder}`,borderRadius:8,background:entry.type===tp?(tp==="receita"?"#1D9E75":"#E24B4A"):t.inputBg,color:entry.type===tp?"#fff":t.textSec,cursor:"pointer",fontSize:13,fontWeight:600,textTransform:"capitalize"}}>{tp}</button>)}</div></div>
            <div><label style={S.label}>Categoria</label><select style={S.select} value={entry.category} onChange={e=>setEntry(v=>({...v,category:e.target.value}))}><option value="">Sem categoria</option>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            {filtro==="geral"&&<div><label style={S.label}>Vincular a Evento</label><select style={S.select} value={entry.pelada_id} onChange={e=>setEntry(v=>({...v,pelada_id:e.target.value}))}><option value="">Nenhum (Geral)</option>{peladas.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>}
            {filtro!=="geral"&&<div><label style={S.label}>Vincular à Data</label><select style={S.select} value={entry.data_id} onChange={e=>setEntry(v=>({...v,data_id:e.target.value}))}><option value="">Nenhuma (Geral do Evento)</option>{datasRealizacao.map(d=><option key={d.id} value={d.id}>{fmtDate(d.data)}</option>)}</select></div>}
            <div><label style={S.label}>Data</label><input style={S.input} type="date" value={entry.date} onChange={e=>setEntry(v=>({...v,date:e.target.value}))}/></div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={save} style={S.btn()}>{editId?"Atualizar":"Salvar"}</button>
            <button onClick={()=>{setShowAdd(false);setEditId(null);setEntry({desc:"",amount:"",type:"receita",date:todayStr(),category:"",pelada_id:"",data_id:""});}} className="no-print" style={S.btn(t.card,t.textSec)}>Cancelar</button>
          </div>
        </div>
      )}
      {!showAdd&&<button onClick={()=>setShowAdd(true)} className="no-print" style={{...S.btn("#22b7d9"),marginBottom:16}}>+ Lançamento</button>}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {entries.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhum lançamento.</div>}
        {entries.map(e=>(
          <div key={e.id} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"24px",borderRadius:12,border:`1px solid ${t.cardBorder}`,background:t.card,gap:8,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,color:t.text}}>{e.desc}</div><div style={{fontSize:11,color:t.textSec,marginTop:2}}>{fmtDate(e.date)} · <span style={{color:e.type==="receita"?"#1D9E75":"#E24B4A",fontWeight:600}}>{e.type}</span>{e.category&&<span style={{marginLeft:6,background:"#7F77DD22",color:"#7F77DD",padding:"1px 8px",borderRadius:8,fontSize:11}}>{e.category}</span>}{filtro==="geral"&&e.pelada_id&&<span style={{marginLeft:6,background:"#22b7d922",color:"#22b7d9",padding:"1px 8px",borderRadius:8,fontSize:11}}>{peladas.find(p=>String(p.id)===String(e.pelada_id))?.nome||"Evento"}</span>}{filtro!=="geral"&&e.data_id&&<span style={{marginLeft:6,background:"#22b7d922",color:"#22b7d9",padding:"1px 8px",borderRadius:8,fontSize:11}}>{fmtDate(datasRealizacao.find(d=>String(d.id)===String(e.data_id))?.data)||"Data Específica"}</span>}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
              <span style={{fontWeight:700,color:e.type==="receita"?"#1D9E75":"#E24B4A",fontSize:13}}>{e.type==="receita"?"+":"-"}{fmtCur(e.amount)}</span>
              <div style={{display:"flex",gap:6}} className="no-print">
                <button onClick={()=>startEdit(e)} style={S.btnSm("#22b7d922","#22b7d9")}><IconEdit size={12} /></button>
                <button onClick={()=>onChange({entries:allEntries.filter(x=>x.id!==e.id)})} style={S.btnSm("#E24B4A22","#E24B4A")}><IconTrash size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FinanceiroScreen({financeiro,setFinanceiro,participacoes,peladas,datasRealizacao,setScreen,DarkBtn,FontScaleBtn,t,atletas,auth}){
  const S=makeStyles(t);
  const getFiltroInicial = () => {
    if (!auth || auth.role === "adm" || auth.scope === "geral") return "geral";
    if (auth.scope === "pelada") {
      const primeiraPelada = peladas[0];
      return primeiraPelada ? `pelada:${primeiraPelada.id}` : "geral";
    }
    return "geral";
  };
  const[filtro,setFiltroLocal]=useState(getFiltroInicial);
  const[filtroData,setFiltroData]=useState("todas");
  const[filtroMesFin,setFiltroMesFin]=useState("todos");

  function setFiltro(val){ setFiltroLocal(val); setFiltroData("todas"); setFiltroMesFin("todos"); }

  // helper to parse filtro values: 'geral' | 'pelada:<id>' | 'champ:<id>'
  const isGeral = filtro === "geral";
  const isPelada = String(filtro).startsWith("pelada:");
  const isChamp = false;
  const filtroId = isPelada || isChamp ? filtro.split(":")[1] : null;

  const datasPelada = isPelada ? datasRealizacao.filter(d=>String(d.pelada_id)===String(filtroId)) : [];
  const visiblePeladaIds = peladas.map(p=>String(p.id));
  const participacoesVisiveis = participacoes.filter(p=> visiblePeladaIds.includes(String(p.pelada_id)) );

  const mesesDisponiveisFin = React.useMemo(() => {
    const meses = new Set();
    const targetDatas = isPelada 
      ? datasPelada 
      : datasRealizacao.filter(d => visiblePeladaIds.includes(String(d.pelada_id)));
    
    targetDatas.forEach(d => {
      if (d.data) {
        const parts = d.data.split("-");
        if (parts[0] && parts[1]) {
          const anoMes = parts[0] + "-" + parts[1];
          meses.add(anoMes);
        }
      }
    });
    return Array.from(meses).sort((a, b) => b.localeCompare(a));
  }, [datasPelada, datasRealizacao, isPelada, visiblePeladaIds]);

  let autoIncome = 0;
  let autoIncomeDinheiro = 0;
  let autoIncomeSaldo = 0;

  if(isGeral){
    const activeDatasIds = datasRealizacao.map(d => String(d.id));
    autoIncomeDinheiro = participacoesVisiveis.filter(p=>{
      if(!p.pagou || p.usou_saldo) return false;
      if(p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
      if(!activeDatasIds.includes(String(p.data_realizacao_id))) return false;
      if(filtroMesFin !== "todos") {
        const d = datasRealizacao.find(x => String(x.id) === String(p.data_realizacao_id));
        if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return false;
      }
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncomeSaldo = participacoesVisiveis.filter(p=>{
      if(!p.pagou || !p.usou_saldo) return false;
      if(p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
      if(!activeDatasIds.includes(String(p.data_realizacao_id))) return false;
      if(filtroMesFin !== "todos") {
        const d = datasRealizacao.find(x => String(x.id) === String(p.data_realizacao_id));
        if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return false;
      }
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncome = autoIncomeDinheiro;
  } else if(isPelada){
    const activeDatasPeladaIds = datasPelada.map(d => String(d.id));
    autoIncomeDinheiro = participacoes.filter(p=>{
      if(!p.pagou || p.usou_saldo || String(p.pelada_id)!==String(filtroId)) return false;
      if(filtroData!=="todas") {
        if (String(p.data_realizacao_id)!==String(filtroData)) return false;
      } else {
        if(p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
        if(!activeDatasPeladaIds.includes(String(p.data_realizacao_id))) return false;
        if (filtroMesFin !== "todos") {
          const d = datasPelada.find(x => String(x.id) === String(p.data_realizacao_id));
          if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return false;
        }
      }
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncomeSaldo = participacoes.filter(p=>{
      if(!p.pagou || !p.usou_saldo || String(p.pelada_id)!==String(filtroId)) return false;
      if(filtroData!=="todas") {
        if (String(p.data_realizacao_id)!==String(filtroData)) return false;
      } else {
        if(p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
        if(!activeDatasPeladaIds.includes(String(p.data_realizacao_id))) return false;
        if (filtroMesFin !== "todos") {
          const d = datasPelada.find(x => String(x.id) === String(p.data_realizacao_id));
          if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return false;
        }
      }
      return true;
    }).reduce((acc,p)=>acc+Number(p.valor||0),0);

    autoIncome = autoIncomeDinheiro + autoIncomeSaldo;
  } else if(isChamp){
    autoIncome = 0; autoIncomeDinheiro = 0; autoIncomeSaldo = 0;
  }

  // recargas (mensalidades) should be computed only from finance entries related to visible peladas
  const recargasIncome = (()=>{
    if(isChamp) return 0;
    const entriesBase = (financeiro.entries||[]).filter(e=>e.category==="Mensalidade");
    const entriesFiltered = filtroMesFin === "todos" 
      ? entriesBase 
      : entriesBase.filter(e => e.date && e.date.startsWith(filtroMesFin));
      
    if(isGeral) return entriesFiltered.filter(e=> !e.pelada_id || visiblePeladaIds.includes(String(e.pelada_id)) ).reduce((acc,e)=>acc+Number(e.amount||0),0);
    if(isPelada) return entriesFiltered.filter(e=>String(e.pelada_id)===String(filtroId)).reduce((acc,e)=>acc+Number(e.amount||0),0);
    return 0;
  })();

  const allEntries = financeiro?.entries || [];
  const entries = allEntries.filter(e => {
    if (isChamp) return String(e.champ_id) === String(filtroId) || String(e.champ_id) === `champ:${filtroId}`;
    if (isPelada) {
      if (String(e.pelada_id) !== String(filtroId) && String(e.pelada_id) !== `pelada:${filtroId}`) return false;
      if (filtroData !== "todas") {
        if (e.data_id && String(e.data_id) !== String(filtroData)) return false;
      } else if (filtroMesFin !== "todos") {
        if (e.data_id) {
          const d = datasPelada.find(x => String(x.id) === String(e.data_id));
          if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return false;
        } else {
          if (!e.date || !e.date.startsWith(filtroMesFin)) return false;
        }
      }
      return true;
    }
    if (isGeral) {
      if (filtroMesFin !== "todos") {
        if (!e.date || !e.date.startsWith(filtroMesFin)) return false;
      }
      return true;
    }
    return true;
  });

  const despesas = entries.filter(e => e.type === "despesa").reduce((s, e) => s + Number(e.amount), 0);
  const receitas = entries.filter(e => e.type === "receita").reduce((s, e) => s + Number(e.amount), 0) + autoIncome;
  const total = receitas - despesas;

  return(
    <div style={S.page} id="print-area">
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          #print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-title {
            display: block !important;
          }
          /* Forçar cores de fundo brancas para os cards e bordas cinzas simples */
          div {
            background-color: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
          /* Forçar o texto a ficar escuro e visível */
          h1, h2, h3, span, p, label, div {
            color: #000000 !important;
          }
          /* Manter as cores de status de receitas (verde) e despesas (vermelho) para melhor leitura, forçando-as */
          .receita-text, [style*="#1D9E75"] {
            color: #1D9E75 !important;
          }
          .despesa-text, [style*="#E24B4A"] {
            color: #E24B4A !important;
          }
          .info-text, [style*="#22b7d9"] {
            color: #22b7d9 !important;
          }
        }
      `}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}} className="no-print">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setScreen("home")} style={S.btnSm()}>← Voltar</button>
          <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}>Financeiro</h2>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={() => window.print()} style={S.btnSm("#1D9E7522","#1D9E75")}>🖨️ Imprimir</button>
          {FontScaleBtn && <FontScaleBtn/>}
          <DarkBtn/>
        </div>
      </div>
      <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:16}} className="no-print">
        <div style={{flex:1, minWidth:200}}>
          <label style={{...S.label,marginRight:10}}>Visualizando Evento:</label>
          <select style={{...S.select,display:"inline-block"}} value={filtro} onChange={e=>setFiltro(e.target.value)}>
            {(!auth || auth.role === "adm" || auth.scope === "geral") && <option value="geral">Visão Geral (Todas as Peladas e Caixa Livre)</option>}
            
            {(!auth || auth.role === "adm" || auth.scope === "geral" || auth.scope === "pelada") && peladas.map(p=> <option key={`pelada:${p.id}`} value={`pelada:${p.id}`}>{p.nome}</option>)}
          </select>
        </div>
        {filtro!=="geral"&&(
          <div style={{flex:1, minWidth:200}}>
            <label style={{...S.label,marginRight:10}}>Filtrar Data:</label>
            <select style={{...S.select,display:"inline-block"}} value={filtroData} onChange={e=>setFiltroData(e.target.value)}>
              <option value="todas">Todas as datas (Balanço da Pelada)</option>
              {datasPelada.map(d=><option key={d.id} value={d.id}>{fmtDate(d.data)}</option>)}
            </select>
          </div>
        )}
        {filtroData === "todas" && !isChamp && (
          <div style={{flex:1, minWidth:200}}>
            <label style={{...S.label,marginRight:10}}>Filtrar por Mês:</label>
            <select style={{...S.select,display:"inline-block"}} value={filtroMesFin} onChange={e=>setFiltroMesFin(e.target.value)}>
              <option value="todos">Todos os Meses</option>
              {mesesDisponiveisFin.map(m => {
                const parts = m.split("-");
                const ano = parts[0];
                const mes = parts[1];
                const NOMES_MESES = {
                  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
                  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
                  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
                };
                const nomeMes = NOMES_MESES[mes] || mes;
                return <option key={m} value={m}>{nomeMes} / {ano}</option>;
              })}
            </select>
          </div>
        )}
      </div>

      {/* Cabeçalho de Impressão */}
      <div className="print-title" style={{display:"none", borderBottom:"2px solid #1D9E75", paddingBottom:12, marginBottom:20}}>
        <h1 style={{fontSize:22, fontWeight:800, margin:0, color:t.text}}>📊 Relatório Financeiro Minhas Peladas</h1>
        <p style={{fontSize:14, margin:"6px 0 0 0", color:t.textSec}}>
          <b>Evento:</b> {isGeral ? "Visão Geral (Todas as Peladas e Caixa Geral)" : (peladas.find(p=>String(p.id)===String(filtroId))?.nome || "Pelada")}
        </p>
      </div>

      <div style={{...S.card,marginBottom:16,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
        
        {
        <>
        <div style={{fontWeight:700,color:"#1D9E75",marginBottom:16}}>Receitas Automáticas (Peladas)</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
          <span style={{fontSize:13,color:t.textSec}}>Total pago na hora (dinheiro)</span>
          <span style={{fontSize:15,fontWeight:700,color:"#1D9E75"}}>{fmtCur(autoIncomeDinheiro)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <span style={{fontSize:13,color:t.textSec}}>Total descontado de saldos (mensalistas)</span>
          <span style={{fontSize:15,fontWeight:700,color:"#22b7d9"}}>{fmtCur(autoIncomeSaldo)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderTop:"1px dashed #1D9E7555",paddingTop:8}}>
          <span style={{fontSize:14,color:t.text,fontWeight:600}}>Arrecadação Bruta da Pelada</span>
          <span style={{fontSize:18,fontWeight:800,color:"#1D9E75"}}>{fmtCur(autoIncomeDinheiro+autoIncomeSaldo)}</span>
        </div>
        {isGeral&&(
          <>
            <div style={{height:1,background:"#1D9E7522",margin:"10px 0"}}/>
            <div style={{fontWeight:700,color:"#BA7517",marginBottom:16}}>Receitas de Mensalidades (Recargas)</div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:13,color:t.textSec}}>Total recarregado por mensalistas</span>
              <span style={{fontSize:18,fontWeight:800,color:"#BA7517"}}>{fmtCur(recargasIncome)}</span>
            </div>
            <div style={{fontSize:11,color:t.textSec,lineHeight:1.4}}>
              * O valor "Pago com saldo" <b>não</b> é somado ao total de Receitas do Caixa Geral para evitar contagem dupla, pois o dinheiro real já foi contabilizado na categoria Recargas.
            </div>
          </>
        )}
        </>
      }
      </div>
      {isPelada&&(
        <div style={{...S.card,marginBottom:16,borderColor:"#BA751755"}}>
          <div style={{fontWeight:700,color:"#BA7517",marginBottom:16}}>Resumo de Presenças e Pagamentos</div>
          {(()=>{
            const mapAtletas = new Map();
            participacoesVisiveis.forEach(p => {
              if(String(p.pelada_id)!==String(filtroId)) return;
              if(filtroData!=="todas") {
                if (String(p.data_realizacao_id)!==String(filtroData)) return;
              } else {
                if (p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return;
                const dataExiste = datasPelada.some(d => String(d.id) === String(p.data_realizacao_id));
                if (!dataExiste) return;
                if (filtroMesFin !== "todos") {
                  const d = datasPelada.find(x => String(x.id) === String(p.data_realizacao_id));
                  if (!d || !d.data || !d.data.startsWith(filtroMesFin)) return;
                }
              }
              const atletaId = String(p.atleta_id);
              if (!mapAtletas.has(atletaId)) {
                mapAtletas.set(atletaId, { ...p });
              } else {
                const existente = mapAtletas.get(atletaId);
                existente.compareceu = existente.compareceu || p.compareceu;
                existente.pagou = existente.pagou || p.pagou;
                if (Number(p.valor || 0) > Number(existente.valor || 0)) {
                  existente.valor = p.valor;
                }
              }
            });
            const partesFiltradas = Array.from(mapAtletas.values());
            const presentesList = partesFiltradas.filter(p=>p.compareceu);
            const pagantesList = partesFiltradas.filter(p=>p.pagou); // todos que pagaram, presentes ou ausentes
            const inadimplentesList = partesFiltradas.filter(p=>!p.pagou && p.compareceu);
            return(
              <div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16}}>
                  <div style={{...S.card,padding:"24px",textAlign:"center",background:"#22b7d910",borderColor:"#22b7d933"}}><div style={{fontSize:11,fontWeight:700,color:"#22b7d9",marginBottom:4}}>Presentes</div><div style={{fontSize:16,fontWeight:800,color:"#22b7d9"}}>{presentesList.length}</div></div>
                  <div style={{...S.card,padding:"24px",textAlign:"center",background:"#1D9E7510",borderColor:"#1D9E7533"}}><div style={{fontSize:11,fontWeight:700,color:"#1D9E75",marginBottom:4}}>Pagaram</div><div style={{fontSize:16,fontWeight:800,color:"#1D9E75"}}>{pagantesList.length}</div></div>
                  <div style={{...S.card,padding:"24px",textAlign:"center",background:"#E24B4A10",borderColor:"#E24B4A33"}}><div style={{fontSize:11,fontWeight:700,color:"#E24B4A",marginBottom:4}}>Pendentes</div><div style={{fontSize:16,fontWeight:800,color:"#E24B4A"}}>{inadimplentesList.length}</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#1D9E75",marginBottom:6,borderBottom:"1px solid #1D9E7533",paddingBottom:4}}>✅ Pagaram</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {pagantesList.map(p=>{
                        const a = atletas.find(x=>String(x.id)===String(p.atleta_id));
                        const ausente = (() => {
                          if (filtroData !== "todas") {
                            return !p.compareceu;
                          }
                          // Na visão "Todas as datas":
                          // O atleta só é considerado "ausente" se ele tem pelo menos uma participação em data REALIZADA onde compareceu = false,
                          // E NÃO compareceu a nenhuma outra data REALIZADA.
                          // Se ele só participou de datas futuras (não-realizadas), não é considerado ausente.
                          const partsRealizadasAtleta = participacoes.filter(x => 
                            String(x.atleta_id) === String(p.atleta_id) && 
                            String(x.pelada_id) === String(filtroId) && 
                            x.data_realizacao_id
                          ).filter(x => {
                            const dObj = datasPelada.find(d => String(d.id) === String(x.data_realizacao_id));
                            return dObj?.status === "realizado";
                          });
                          
                          if (partsRealizadasAtleta.length === 0) return false;
                          
                          const compareceuAlguma = partsRealizadasAtleta.some(x => x.compareceu);
                          return !compareceuAlguma;
                        })();
                        return <div key={p.id} style={{fontSize:12,color: ausente ? t.textSec : t.text,display:"flex",alignItems:"center",gap:6}}>
                          <PlayerAvatar atleta={a} size={16}/> {getPlayerName(a)}
                          {ausente && <span style={{fontSize:9,fontWeight:700,background:"#BA751722",color:"#BA7517",padding:"1px 5px",borderRadius:10,whiteSpace:"nowrap"}}>ausente</span>}
                        </div>;
                      })}
                      {pagantesList.length===0&&<div style={{fontSize:11,color:t.textSec}}>Ninguém.</div>}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:"#E24B4A",marginBottom:6,borderBottom:"1px solid #E24B4A33",paddingBottom:4}}>❌ Pendentes</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {inadimplentesList.map(p=>{
                        const a = atletas.find(x=>String(x.id)===String(p.atleta_id));
                        const ausente = !p.compareceu;
                        return <div key={p.id} style={{fontSize:12,color: ausente ? t.textSec : t.text,display:"flex",alignItems:"center",gap:6}}>
                          <PlayerAvatar atleta={a} size={16}/> {getPlayerName(a)}
                          {ausente && <span style={{fontSize:9,fontWeight:700,background:"#BA751722",color:"#BA7517",padding:"1px 5px",borderRadius:10,whiteSpace:"nowrap"}}>ausente</span>}
                        </div>;
                      })}
                      {inadimplentesList.length===0&&<div style={{fontSize:11,color:t.textSec}}>Nenhuma pendência.</div>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      <h3 style={{fontSize:15,fontWeight:700,margin:"24px 0 10px 0",color:t.text}}>Lançamentos Manuais</h3>
      <FinancialPanel finance={financeiro} onChange={setFinanceiro} autoIncome={autoIncome} filtro={filtro} filtroData={filtroData} peladas={peladas} datasRealizacao={datasPelada} t={t} entries={entries} receitas={receitas} despesas={despesas} total={total} />
    </div>
  );
}

/* ─────────────────────────── CRUD ATLETAS ───────────────────────── */
function CRUDAtletas({
  atletas, onAdd, onUpdate, onRemove, onExport, onImport, onDownloadTemplate,
  peladas, t
}){
  const S=makeStyles(t);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [filtroVinculo, setFiltroVinculo] = useState("todos"); // "todos", "pelada_ID"
  
  const defaultForm = {
    nome: "",
    apelido: "",
    foto: "",
    habilidade: 3,
    goleiro: false,
    ativo: true,
    documento: "", // RG/CPF
    dataNascimento: "",
    numeroCamisa: "",
    celular1: "",
    celular2: "",
    foneResidencial: "",
    email: "",
    tipoAtleta: "Adventista",
    igrejaMembro: "",
    logradouro: "Rua",
    nomeVia: "",
    cep: "",
    complemento: "",
    bairro: "",
    nomeMae: "",
    docFoto: "",
    modalidades: [],
    vinculos: [], // Array de strings formatadas: "pelada_${id}"
    customFields: {}
  };

  const [form, setForm] = useState(defaultForm);
  const [filtro, setFiltro] = useState("");
  const [expandMenu, setExpandMenu] = useState(false);

  // No modelo unificado, usamos sempre as ações gerais de Atleta
  const handleAdd = onAdd;
  const handleUpdate = onUpdate;
  const handleRemove = onRemove;
  const handleExport = onExport;
  const handleImport = onImport;
  const handleDownloadTemplate = onDownloadTemplate;

  function abrirNovo(){
    setEditId(null);
    const vinculosIniciais = [];
    if (filtroVinculo !== "todos") {
      vinculosIniciais.push(filtroVinculo);
    }
    setForm({
      ...defaultForm,
      nome: filtro.trim(),
      vinculos: vinculosIniciais
    });
    setModal(true);
  }

  function abrirEdicao(a){
    setEditId(a.id);
    setForm({
      nome: a.nome || "",
      apelido: a.apelido || "",
      foto: a.foto || "",
      habilidade: a.habilidade || 3,
      goleiro: a.goleiro || false,
      ativo: a.ativo !== false,
      documento: a.documento || "",
      dataNascimento: a.dataNascimento || "",
      numeroCamisa: a.numeroCamisa || "",
      celular1: a.celular1 || "",
      celular2: a.celular2 || "",
      foneResidencial: a.foneResidencial || "",
      email: a.email || "",
      tipoAtleta: a.tipoAtleta || "Adventista",
      igrejaMembro: a.igrejaMembro || "",
      logradouro: a.logradouro || "Rua",
      nomeVia: a.nomeVia || "",
      cep: a.cep || "",
      complemento: a.complemento || "",
      bairro: a.bairro || "",
      nomeMae: a.nomeMae || "",
      docFoto: a.docFoto || "",
      modalidades: Array.isArray(a.modalidades) ? a.modalidades : [],
      vinculos: Array.isArray(a.vinculos) ? a.vinculos : [],
      customFields: a.customFields || {}
    });
    setModal(true);
  }

  function salvar(){
    if(!form.nome.trim())return;
    // O cadastro de atletas depende de ter ao menos um vínculo (ou de ter Ligas/Peladas criadas no sistema)
    if (form.vinculos.length === 0) {
      alert("Por favor, selecione ao menos uma Pelada para vincular o atleta!");
      return;
    }
    if(editId) handleUpdate(editId, form);
    else handleAdd(form);
    setModal(false);
  }
  
  const lista = atletas.filter(a => {
    const matchesTexto = a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
                         (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()));
    let matchesVinculo = true;
    if (filtroVinculo !== "todos") {
      matchesVinculo = Array.isArray(a.vinculos) && a.vinculos.includes(filtroVinculo);
    }
    return matchesTexto && matchesVinculo;
  });
  const ativos = lista.filter(a => a.ativo).length;

  return(
    <div>
      {/* Filtro Dropdown de Vínculos (Ligas/Peladas) */}
      <div style={{display:"flex", flexDirection:"column", gap:6, marginBottom:16}}>
        <label style={{...S.label, margin:0, fontWeight:700}}>Filtrar Atletas por Liga ou Pelada:</label>
        <select 
          style={{...S.select, margin:0, width:"100%"}} 
          value={filtroVinculo} 
          onChange={e=>{ setFiltroVinculo(e.target.value); setFiltro(""); }}
        >
          <option value="todos">Todos os Atletas (Sem Filtro)</option>
          
          {peladas && peladas.length > 0 && (
            <optgroup label="Peladas">
              {peladas.map(p => <option key={p.id} value={"pelada_" + p.id}>{p.nome}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[["Total",lista.length,"#22b7d9"],["Ativos",ativos,"#1D9E75"],["Inativos",lista.length-ativos,"#E24B4A"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div></div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...S.input,flex:1,minWidth:120}} placeholder="Buscar atleta por nome/apelido..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <button onClick={abrirNovo} style={S.btn("#10b981")}>+ Novo Atleta</button>
        <button onClick={()=>setExpandMenu(!expandMenu)} style={{...S.btn("#a0a0a0"),display:"inline-flex",gap:6}}>
          <span>⚙️ Importar/Exportar</span>
          <span style={{transform:expandMenu?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s",display:"inline-block"}}>▼</span>
        </button>
      </div>

      {expandMenu&&(
        <div style={{...S.card,marginBottom:16,background:t.inputBg,border:`1px solid ${t.inputBorder}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            <button onClick={()=>{handleExport();setExpandMenu(false);}} style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=t.card} onMouseLeave={e=>e.target.style.background="transparent"}>
              <span>📤</span>
              <div><div style={{fontWeight:600}}>Exportar Atletas</div><div style={{fontSize:11,color:t.textSec}}>Baixar lista em XLS</div></div>
            </button>
            <button onClick={()=>{handleDownloadTemplate();setExpandMenu(false);}} style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.target.style.background=t.card} onMouseLeave={e=>e.target.style.background="transparent"}>
              <span>📄</span>
              <div><div style={{fontWeight:600}}>Baixar Modelo</div><div style={{fontSize:11,color:t.textSec}}>Planilha em branco</div></div>
            </button>
            <label style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s",margin:0}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📥</span>
              <div><div style={{fontWeight:600}}>Importar Atletas</div><div style={{fontSize:11,color:t.textSec}}>Carregar arquivo XLS</div></div>
              <input type="file" accept=".csv,.xls" style={{display:"none"}} onChange={(e)=>{handleImport(e);setExpandMenu(false);}} />
            </label>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {lista.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhum atleta encontrado nesta categoria.</div>}
        {lista.map(a=>(
          <div key={a.id} style={{...S.card,padding:"24px",border:`1px solid ${a.ativo?t.cardBorder:t.cardBorder+"88"}`,opacity:a.ativo?1:0.6}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <PlayerAvatar atleta={a} size={38} />
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.text}}>
                  {getPlayerName(a)}
                  {a.apelido?<span style={{fontSize:11,color:t.textSec,marginLeft:6}}>({a.apelido})</span>:null}
                  {a.numeroCamisa && <span style={{fontSize:11,fontWeight:800,color:"#22b7d9",background:"#22b7d915",padding:"1px 5px",borderRadius:4,marginLeft:6}}>#{a.numeroCamisa}</span>}
                  {!a.ativo&&<span style={{marginLeft:8,fontSize:10,background:"#E24B4A22",color:"#E24B4A",padding:"1px 7px",borderRadius:8}}>Inativo</span>}
                </div>
                
                {/* Badges de Ligas / Peladas Vinculadas */}
                {Array.isArray(a.vinculos) && a.vinculos.length > 0 && (
                  <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:4, marginBottom:6}}>
                    {a.vinculos.map(vId => {
                       if (vId.startsWith("pelada_")) {
                        const id = Number(vId.replace("pelada_", ""));
                        const p = peladas.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <span key={vId} style={{display: "inline-flex", alignItems: "center", gap: 4, fontSize:9, fontWeight:700, color:"#22b7d9", background:"#22b7d912", padding:"2px 6px", borderRadius:4, border: "1px solid #22b7d922"}}>
                            <IconSoccer size={10} /> {p.nome}
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}

                <div style={{fontSize:11,color:t.textSec,marginTop:4,display:"flex",flexDirection:"column",gap:2}}>
                  <div style={{color:SKILL_COLORS[a.habilidade-1],fontWeight:700}}>
                    {Array.from({length: 5}, (_, i) => i < a.habilidade ? <IconStarFilled key={i} size={11} color={SKILL_COLORS[a.habilidade-1]} style={{marginRight:1}} /> : <IconStar key={i} size={11} color={t.textSec} style={{marginRight:1}} />)} · {SKILL_NAMES[a.habilidade-1]}
                    {a.dataNascimento && ` · <IconCalendar size={11} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Nasc: ${a.dataNascimento.split("-").reverse().join("/")}`}
                    {a.documento && ` · 🪪 RG/CPF: ${a.documento}`}
                  </div>
                  <div>
                    <span style={{fontWeight:700,color:a.tipoAtleta === "Adventista" ? "#1D9E75" : "#BA7517"}}>
                      <IconHome size={11} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> {a.tipoAtleta || "Adventista"} {a.igrejaMembro ? `(${a.igrejaMembro})` : ""}
                    </span>
                    {a.celular1 && ` · 📞 ${a.celular1}`}
                    {a.email && ` · ✉️ ${a.email}`}
                  </div>
                  {a.nomeMae && <div><IconUser size={11} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Mãe: {a.nomeMae}</div>}
                  {(a.nomeVia || a.bairro) && <div><IconMapPin size={11} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Endereço: {a.logradouro || ""} {a.nomeVia || ""}, {a.bairro || ""}</div>}
                  
                  {Array.isArray(a.modalidades) && a.modalidades.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:3}}>
                      {a.modalidades.map(mid => {
                        const mod = MODALIDADES_ESPORTIVAS.find(x => x.id === mid);
                        if (!mod) return null;
                        return (
                          <span key={mid} style={{fontSize:10,fontWeight:700,color:mod.color,background:mod.color+"22",padding:"1px 7px",borderRadius:10,border:`1px solid ${mod.color}44`}}>
                            {mod.icon} {mod.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8,marginTop:4}}>
                    {a.foto ? <span style={{color:"#1D9E75", fontSize: 10.5}}>Foto Perfil Anexada</span> : <span style={{color:"#E24B4A", fontSize: 10.5}}>Sem Foto Perfil</span>}
                    {a.docFoto ? <span style={{color:"#1D9E75", fontSize: 10.5}}>Documento Anexado</span> : <span style={{color:"#E24B4A", fontSize: 10.5}}>Sem Documento</span>}
                  </div>
                </div>

                {a.customFields && Object.keys(a.customFields).length > 0 && (
                  <div style={{fontSize:11,color:t.textSec,marginTop:3,display:"flex",gap:6,flexWrap:"wrap"}}>
                    {Object.entries(a.customFields).map(([k,v]) => v && (
                      <span key={k}><strong>{k}:</strong> {v}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>abrirEdicao(a)} style={S.btnSm("#22b7d922","#22b7d9")}><IconEdit size={12} /></button>
                <button onClick={()=>{if(window.confirm("Excluir atleta?"))handleRemove(a.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}><IconTrash size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>{editId ? "<IconEdit size={12} /> Editar Atleta" : "Novo Atleta"}</div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {/* 1. Identificação Básica */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>1. Identificação do Atleta</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome Completo</label><input style={S.input} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Nome completo"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Apelido</label><input style={S.input} value={form.apelido} onChange={e=>setForm(v=>({...v,apelido:e.target.value}))} placeholder="Nome de camisa"/></div>
              </div>
              
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}>
                  <label style={S.label}>Número da Camisa</label>
                  <input type="text" style={S.input} value={form.numeroCamisa || ""} onChange={e=>setForm(v=>({...v,numeroCamisa:e.target.value}))} placeholder="Ex: 10"/>
                </div>
                <div style={{flex:1,minWidth:100,display:"flex",alignItems:"center",marginTop:16}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.goleiro} onChange={e=>setForm(v=>({...v,goleiro:e.target.checked}))}/>🧤 Goleiro</label>
                </div>
                <div style={{flex:1,minWidth:100,display:"flex",alignItems:"center",marginTop:16}}>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={form.ativo} onChange={e=>setForm(v=>({...v,ativo:e.target.checked}))}/>✓ Ativo</label>
                </div>
              </div>

              <div>
                <label style={S.label}>Habilidade (Nível técnico)</label>
                <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setForm(v=>({...v,habilidade:s}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${form.habilidade===s?SKILL_COLORS[s-1]:t.inputBorder}`,background:form.habilidade===s?SKILL_COLORS[s-1]+"22":t.inputBg,cursor:"pointer",fontSize:12,color:form.habilidade===s?SKILL_COLORS[s-1]:t.textSec,fontWeight:form.habilidade===s?700:400}}>{Array.from({length: 5}, (_, i) => i < s ? <IconStarFilled key={i} size={10} color={form.habilidade===s?SKILL_COLORS[s-1]:t.textSec} style={{marginRight: 1}} /> : <IconStar key={i} size={10} color={t.textSec} style={{marginRight: 1}} />)}</button>)}</div>
              </div>

              {/* Vínculo de Ligas e Peladas */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>Vínculos de Ligas e Peladas</div>
              <div>
                <div style={{
                  maxHeight: 140,
                  overflowY: "auto",
                  border: `1px solid ${t.cardBorder}`,
                  borderRadius: 8,
                  padding: 10,
                  background: t.inputBg,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8
                }}>
                  {peladas && peladas.length > 0 && (
                    <div style={{marginTop: 6}}>
                      <div style={{fontSize: 10, fontWeight: 700, color: "#22b7d9", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}>Peladas</div>
                      {peladas.map(p => {
                        const vinculoId = "pelada_" + p.id;
                        const checked = (form.vinculos || []).includes(vinculoId);
                        return (
                          <label key={p.id} style={{display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: t.text, padding: "2px 0"}}>
                            <input 
                              type="checkbox" 
                              checked={checked} 
                              onChange={() => {
                                setForm(v => {
                                  const cur = Array.isArray(v.vinculos) ? v.vinculos : [];
                                  return {
                                    ...v,
                                    vinculos: checked ? cur.filter(x => x !== vinculoId) : [...cur, vinculoId]
                                  };
                                });
                              }}
                            />
                            {p.nome}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {(!peladas || peladas.length === 0) && (
                    <div style={{fontSize: 12, color: t.textSec, fontStyle: "italic"}}>
                      Nenhuma Liga ou Pelada criada no sistema. Crie ao menos uma antes de cadastrar atletas.
                    </div>
                  )}
                </div>
                {(!peladas || peladas.length === 0) && (
                  <div style={{fontSize:11, color:"#E24B4A", marginTop:4}}>
                    ⚠️ Impossível salvar: cadastre uma Liga ou Pelada primeiro.
                  </div>
                )}
              </div>

              {/* 2. Dados de Contato e Pessoais */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>2. Dados Pessoais e de Contato</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Documento (RG/CPF)</label><input style={S.input} value={form.documento || ""} onChange={e=>setForm(v=>({...v,documento:e.target.value}))} placeholder="RG ou CPF"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Data de Nascimento</label><input type="date" style={S.input} value={form.dataNascimento || ""} onChange={e=>setForm(v=>({...v,dataNascimento:e.target.value}))}/></div>
              </div>
              
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome da Mãe</label><input style={S.input} value={form.nomeMae || ""} onChange={e=>setForm(v=>({...v,nomeMae:e.target.value}))} placeholder="Nome completo da mãe"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>E-mail</label><input type="email" style={S.input} value={form.email || ""} onChange={e=>setForm(v=>({...v,email:e.target.value}))} placeholder="exemplo@email.com"/></div>
              </div>

              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Celular 1 (WhatsApp)</label><input style={S.input} value={form.celular1 || ""} onChange={e=>setForm(v=>({...v,celular1:e.target.value}))} placeholder="Ex: 11999999999"/></div>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Celular 2</label><input style={S.input} value={form.celular2 || ""} onChange={e=>setForm(v=>({...v,celular2:e.target.value}))} placeholder="Ex: 11999999998"/></div>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>Fone Fixo</label><input style={S.input} value={form.foneResidencial || ""} onChange={e=>setForm(v=>({...v,foneResidencial:e.target.value}))} placeholder="Ex: 1136123456"/></div>
              </div>

              {/* 3. Modalidades de Inscrição */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>3. Modalidades de Inscrição</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>
                {MODALIDADES_ESPORTIVAS.map(m => {
                  const mods = Array.isArray(form.modalidades) ? form.modalidades : [];
                  const selected = mods.includes(m.id);
                  return (
                    <label key={m.id} style={{
                      display:"flex",alignItems:"center",gap:6,cursor:"pointer",
                      padding:"6px 12px",borderRadius:20,border:`2px solid ${selected ? m.color : t.cardBorder}`,
                      background:selected ? m.color + "22" : t.inputBg,
                      color:selected ? m.color : t.textSec,fontWeight:selected ? 700 : 500,fontSize:13,
                      transition:"all 0.15s",userSelect:"none"
                    }}>
                      <input type="checkbox" style={{display:"none"}} checked={selected}
                        onChange={() => setForm(v => {
                          const cur = Array.isArray(v.modalidades) ? v.modalidades : [];
                          return {...v, modalidades: selected ? cur.filter(x => x !== m.id) : [...cur, m.id]};
                        })}
                      />
                      {m.icon} {m.label}
                    </label>
                  );
                })}
              </div>
              {Array.isArray(form.modalidades) && form.modalidades.length === 0 && (
                <div style={{fontSize:11,color:"#E24B4A",marginTop:4}}>⚠️ Selecione ao menos uma modalidade.</div>
              )}

              {/* 4. Vínculo Religioso */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>4. Vínculo Religioso</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}>
                  <label style={S.label}>Tipo de Atleta</label>
                  <select style={S.select} value={form.tipoAtleta || "Adventista"} onChange={e=>setForm(v=>({...v,tipoAtleta:e.target.value}))}>
                    <option value="Adventista">Atleta Adventista</option>
                    <option value="Não Adventista">Atleta Não Adventista</option>
                  </select>
                </div>
                {form.tipoAtleta === "Adventista" && (
                  <div style={{flex:1,minWidth:140}}>
                    <label style={S.label}>Igreja da Carta de Membro</label>
                    <input style={S.input} value={form.igrejaMembro || ""} onChange={e=>setForm(v=>({...v,igrejaMembro:e.target.value}))} placeholder="IASD a qual é membro"/>
                  </div>
                )}
              </div>

              {/* 5. Endereço Residencial */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>5. Endereço Residencial</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}><label style={S.label}>CEP</label><input style={S.input} value={form.cep || ""} onChange={e=>setForm(v=>({...v,cep:e.target.value}))} placeholder="Ex: 69000-000"/></div>
                <div style={{flex:1,minWidth:100}}>
                  <label style={{...S.label}}>Logradouro</label>
                  <select style={S.select} value={form.logradouro || "Rua"} onChange={e=>setForm(v=>({...v,logradouro:e.target.value}))}>
                    <option value="Rua">Rua</option>
                    <option value="Avenida">Avenida</option>
                    <option value="Travessa">Travessa</option>
                    <option value="Beco">Beco</option>
                  </select>
                </div>
                <div style={{flex:2,minWidth:140}}><label style={S.label}>Nome da Via</label><input style={S.input} value={form.nomeVia || ""} onChange={e=>setForm(v=>({...v,nomeVia:e.target.value}))} placeholder="Nome da rua/avenida"/></div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Bairro</label><input style={S.input} value={form.bairro || ""} onChange={e=>setForm(v=>({...v,bairro:e.target.value}))} placeholder="Bairro"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Complemento</label><input style={S.input} value={form.complemento || ""} onChange={e=>setForm(v=>({...v,complemento:e.target.value}))} placeholder="Ex: Casa, Apto, Fundos"/></div>
              </div>

              {/* 6. Documentos e Fotos */}
              <div style={{fontSize:12,fontWeight:800,color:t.accent,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:4,marginTop:6}}>6. Uploads de Arquivos / Fotos</div>
              <div>
                <label style={S.label}>Foto de Rosto (Perfil)</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {form.foto&&<img src={form.foto} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={form.foto} onChange={e=>setForm(v=>({...v,foto:e.target.value}))} placeholder="Cole URL ou selecione arquivo..."/>
                  <label style={{...S.btn("#22b7d922","#22b7d9"),margin:0}}>
                    Foto de Rosto
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],300,(b64)=>setForm(v=>({...v,foto:b64})))}}/>
                  </label>
                </div>
              </div>

              <div>
                <label style={S.label}>Documento Oficial com Foto (Frente e Verso)</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {form.docFoto&&<img src={form.docFoto} style={{width:40,height:40,borderRadius:4,objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={form.docFoto} onChange={e=>setForm(v=>({...v,docFoto:e.target.value}))} placeholder="Cole URL ou selecione arquivo..."/>
                  <label style={{...S.btn("#1D9E7522","#1D9E75"),margin:0}}>
                    Foto do Documento
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],600,(b64)=>setForm(v=>({...v,docFoto:b64})))}}/>
                  </label>
                </div>
              </div>

              {form.customFields && Object.keys(form.customFields).length > 0 && (
                <div style={{display:"flex",flexDirection:"column",gap:10,borderTop:`1px dashed ${t.cardBorder}`,paddingTop:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:t.textSec}}>Campos Customizados Existentes:</div>
                  {Object.entries(form.customFields).map(([k,v]) => (
                    <div key={k}>
                      <label style={S.label}>{k}</label>
                      <input 
                        style={S.input} 
                        value={v || ""} 
                        onChange={e => {
                          const val = e.target.value;
                          setForm(prev => ({
                            ...prev,
                            customFields: {
                              ...prev.customFields,
                              [k]: val
                            }
                          }));
                        }} 
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button 
                onClick={salvar} 
                style={S.btn("#1D9E75")}
                disabled={(!peladas || peladas.length === 0)}
              >
                Salvar
              </button>
              <button onClick={()=>setModal(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}

/* ─────────────────────────── CRUD QUADRAS ───────────────────────── */
function CRUDQuadras({
  quadras, onAdd, onUpdate, onRemove, onExport, onImport, onDownloadTemplate, t
}) {
  const S = makeStyles(t);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: "", endereco: "", ativa: true });
  const [filtro, setFiltro] = useState("");
  const [expandMenu, setExpandMenu] = useState(false);

  function abrirNovo() {
    setEditId(null);
    setForm({ nome: filtro.trim(), endereco: "", ativa: true });
    setModal(true);
  }

  function abrirEdicao(q) {
    setEditId(q.id);
    setForm({
      nome: q.nome || "",
      endereco: q.endereco || "",
      ativa: q.ativa !== false
    });
    setModal(true);
  }

  function salvar() {
    if (!form.nome.trim()) return;
    if (editId) onUpdate(editId, form);
    else onAdd(form);
    setModal(false);
  }

  const lista = quadras.filter(q => 
    q.nome.toLowerCase().includes(filtro.toLowerCase()) || 
    (q.endereco && q.endereco.toLowerCase().includes(filtro.toLowerCase()))
  );
  const ativas = quadras.filter(q => q.ativa).length;

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
        {[["Total", quadras.length, "#22b7d9"], ["Ativas", ativas, "#1D9E75"], ["Inativas", quadras.length - ativas, "#E24B4A"]].map(([l,v,c])=>(
          <div key={l} style={{...S.card,textAlign:"center",padding:10}}>
            <div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input style={{...S.input,flex:1,minWidth:120}} placeholder="Buscar quadra por nome ou endereço..." value={filtro} onChange={e=>setFiltro(e.target.value)}/>
        <button onClick={abrirNovo} style={S.btn("#10b981")}>+ Nova Quadra</button>
        <button onClick={()=>setExpandMenu(!expandMenu)} style={{...S.btn("#a0a0a0"),display:"inline-flex",gap:6}}>
          <span>⚙️ Importar/Exportar</span>
          <span style={{transform:expandMenu?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.3s",display:"inline-block"}}>▼</span>
        </button>
      </div>

      {expandMenu&&(
        <div style={{...S.card,marginBottom:16,background:t.inputBg,border:`1px solid ${t.cardBorder}`}}>
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            <button onClick={()=>{onExport();setExpandMenu(false);}} style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📤</span>
              <div><div style={{fontWeight:600}}>Exportar Quadras</div><div style={{fontSize:11,color:t.textSec}}>Baixar lista em XLS</div></div>
            </button>
            <button onClick={()=>{onDownloadTemplate();setExpandMenu(false);}} style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",borderBottom:`1px solid ${t.cardBorder}`,display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📄</span>
              <div><div style={{fontWeight:600}}>Baixar Modelo</div><div style={{fontSize:11,color:t.textSec}}>Planilha em branco</div></div>
            </button>
            <label style={{textAlign:"left",padding:"24px",border:"none",background:"transparent",color:t.text,cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13,fontWeight:500,transition:"background 0.2s",margin:0}} onMouseEnter={e=>e.currentTarget.style.background=t.card} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span>📥</span>
              <div><div style={{fontWeight:600}}>Importar Quadras</div><div style={{fontSize:11,color:t.textSec}}>Carregar arquivo XLS</div></div>
              <input type="file" accept=".csv,.xls" style={{display:"none"}} onChange={(e)=>{onImport(e);setExpandMenu(false);}} />
            </label>
          </div>
        </div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {lista.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhuma quadra cadastrada.</div>}
        {lista.map(q=>(
          <div key={q.id} style={{...S.card,padding:"24px",border:`1px solid ${q.ativa?t.cardBorder:t.cardBorder+"88"}`,opacity:q.ativa?1:0.6}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:24}}>🏟️</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:700,fontSize:14,color:t.text}}>
                  {q.nome}
                  {!q.ativa&&<span style={{marginLeft:8,fontSize:10,background:"#E24B4A22",color:"#E24B4A",padding:"1px 7px",borderRadius:8}}>Inativa</span>}
                </div>
                <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                  📍 {q.endereco || "Sem endereço cadastrado"}
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>abrirEdicao(q)} style={S.btnSm("#22b7d922","#22b7d9")}><IconEdit size={12} /></button>
                <button onClick={()=>{if(window.confirm("Excluir quadra?"))onRemove(q.id);}} style={S.btnSm("#E24B4A22","#E24B4A")}><IconTrash size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>{editId ? "<IconEdit size={12} /> Editar Quadra" : "Nova Quadra"}</div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={S.label}>Nome da Quadra / Campo</label>
                <input style={S.input} value={form.nome} onChange={e=>setForm(v=>({...v,nome:e.target.value}))} placeholder="Ex: Quadra Society 1"/>
              </div>
              <div>
                <label style={S.label}>Endereço ou Descrição</label>
                <input style={S.input} value={form.endereco} onChange={e=>setForm(v=>({...v,endereco:e.target.value}))} placeholder="Ex: Av. das Flores, 123"/>
              </div>
              <div>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:t.text,marginTop:6}}>
                  <input type="checkbox" checked={form.ativa} onChange={e=>setForm(v=>({...v,ativa:e.target.checked}))}/>
                  Quadra Ativa
                </label>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={salvar} style={S.btn("#10b981")}>Salvar</button>
              <button onClick={()=>setModal(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── CRIAR PELADA ───────────────────────── */
function CriarPelada({onSave,initial,t}){
  const S=makeStyles(t);
  const[nome,setNome]=useState(initial?.nome||"");
  const[dataCriacao,setDataCriacao]=useState(initial?.data_criacao||"");
  const[ativo,setAtivo]=useState(initial?.ativo!==false);
  function handle(){if(!nome.trim())return;onSave({nome:nome.trim(),data_criacao:dataCriacao||todayStr(),ativo});}
  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div><label style={S.label}>Nome da pelada</label><input style={S.input} value={nome} onChange={e=>setNome(e.target.value)} placeholder="Ex: Pelada de Quinta"/></div>
      <div><label style={S.label}>Data de criação</label><input style={S.input} type="date" value={dataCriacao} onChange={e=>setDataCriacao(e.target.value)}/></div>
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={ativo} onChange={e=>setAtivo(e.target.checked)}/>Ativa</label>
      <button onClick={handle} style={S.btn(initial ? t.accent : "#10b981")}>{initial?"Salvar Alterações":"Criar Pelada"}</button>
    </div>
  );
}

/* ─────────────────────────── ABA DATAS ──────────────────────────── */
function AbaDatas({peladaId,datasRealizacao,onAdd,onUpdate,onRemove,t,quadras=[]}){
  const S=makeStyles(t);
  const datas=datasRealizacao.filter(d=>d.pelada_id===peladaId);
  const[novaData,setNovaData]=useState("");
  const[novoLocal,setNovoLocal]=useState("");
  const[novoValor,setNovoValor]=useState("");
  const[editId,setEditId]=useState(null);
  const[editData,setEditData]=useState("");
  const[editLocal,setEditLocal]=useState("");
  const[editValor,setEditValor]=useState("");
  function adicionar(){if(!novaData)return;onAdd({pelada_id:peladaId,data:novaData,local:novoLocal,valor:novoValor,status:"agendado"});setNovaData("");setNovoLocal("");setNovoValor("");}
  function salvarEdicao(){onUpdate(editId,{data:editData,local:editLocal,valor:editValor});setEditId(null);}
  const STATUS_COLORS={"agendado":"#22b7d9","realizado":"#1D9E75","cancelado":"#E24B4A"};
  const quadrasAtivas = Array.isArray(quadras) ? quadras.filter(q => q.ativa) : [];

  return(
    <div>
      <div style={{...S.card,marginBottom:16,border:"1px solid #22b7d933",padding:"24px"}}>
        <div style={{fontWeight:700,fontSize:13,color:"#22b7d9",marginBottom:16}}>📅 Agendar Data</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          <input style={{...S.input,flex:1,minWidth:120}} type="date" value={novaData} onChange={e=>setNovaData(e.target.value)}/>
          <select style={{...S.select,flex:2,minWidth:140}} value={novoLocal} onChange={e=>setNovoLocal(e.target.value)}>
            <option value="">Selecionar Quadra/Campo (opcional)</option>
            {quadrasAtivas.map(q => (
              <option key={q.id} value={q.nome}>{q.nome}</option>
            ))}
          </select>
          <input style={{...S.input,flex:1,minWidth:100}} type="number" step="0.01" min="0" placeholder="Valor (R$)" value={novoValor} onChange={e=>setNovoValor(e.target.value)}/>
        </div>
        <button onClick={adicionar} style={S.btn("#22b7d9")}>+ Adicionar Data</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {datas.length===0&&<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhuma data agendada.</div>}
        {datas.map(d=>(
          <div key={d.id} style={{...S.card,padding:"24px"}}>
            {editId===d.id?(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <input style={{...S.input,flex:1}} type="date" value={editData} onChange={e=>setEditData(e.target.value)}/>
                  <select style={{...S.select,flex:2}} value={editLocal} onChange={e=>setEditLocal(e.target.value)}>
                    <option value="">Sem local</option>
                    {quadrasAtivas.map(q => (
                      <option key={q.id} value={q.nome}>{q.nome}</option>
                    ))}
                  </select>
                  <input style={{...S.input,flex:1}} type="number" step="0.01" min="0" placeholder="Valor (R$)" value={editValor} onChange={e=>setEditValor(e.target.value)}/>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={salvarEdicao} style={S.btn()}>Salvar</button>
                  <button onClick={()=>setEditId(null)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
                </div>
              </div>
            ):(
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14,color:t.text}}>{formatarData(d.data)}</div>
                  <div style={{fontSize:12,color:t.textSec,marginTop:2}}>{d.local||"Local não definido"} {d.valor ? `· ${fmtCur(d.valor)}` : ""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                  <select value={d.status} onChange={e=>onUpdate(d.id,{status:e.target.value})} style={{...S.select,width:"auto",padding:"4px 8px",fontSize:12,color:STATUS_COLORS[d.status]||t.textSec}}>
                    <option value="agendado">Agendado</option>
                    <option value="realizado">Realizado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button onClick={()=>{setEditId(d.id);setEditData(d.data);setEditLocal(d.local||"");setEditValor(d.valor||"");}} style={S.btnSm("#22b7d922","#22b7d9")}><IconEdit size={12} /></button>
                  <button 
                    onClick={() => {
                      if (d.status === "realizado") {
                        if (!confirm("⚠️ ATENÇÃO: Esta rodada está concluída/realizada! Excluí-la apagará permanentemente o histórico de jogos, gols e presenças. Tem certeza absoluta que deseja excluir?")) {
                          return;
                        }
                      } else {
                        if (!confirm("Deseja realmente excluir esta data?")) {
                          return;
                        }
                      }
                      onRemove(d.id);
                    }} 
                    style={S.btnSm("#E24B4A22","#E24B4A")}
                  >
                    <IconTrash size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── ABA ATLETAS PELADA ─────────────────── */
function AbaAtletasPelada({
  pelada,
  atletas,
  participacoes,
  onSavePartsLote,
  onAddFinanceiro,
  onAddAtleta,
  t,
  isRealizada,
  selDataSorteio,
  onUnsavedChangesChange,
  triggerSaveRef,
  onAddPart,
  onUpdate,
  onUpdateAtleta
}){
  const peladaId=pelada.id;
  const S=makeStyles(t);

  // Filtra as participações originais vinculadas à pelada na data selecionada
  const partsOriginais = React.useMemo(() => {
    const targetDataId = selDataSorteio === "todas" ? null : (selDataSorteio || null);
    const partsMembros = participacoes.filter(p => p.pelada_id === peladaId && (targetDataId === null ? (p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") : String(p.data_realizacao_id) === String(targetDataId)));
    return partsMembros;
  }, [participacoes, peladaId, selDataSorteio]);

  // Estado local para gerenciar os vínculos da pelada
  const [localParts, setLocalParts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Inicializa o estado local quando os vínculos originais mudam
  useEffect(() => {
    setLocalParts(partsOriginais);
    setHasChanges(false);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [partsOriginais]);

  // Monitora alterações para atualizar o estado de modificações pendentes
  useEffect(() => {
    const mudou = JSON.stringify(localParts) !== JSON.stringify(partsOriginais);
    setHasChanges(mudou);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(mudou);
    }
  }, [localParts, partsOriginais, onUnsavedChangesChange]);

  const handleSalvar = React.useCallback(() => {
    onSavePartsLote(peladaId, selDataSorteio || null, localParts);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [onSavePartsLote, peladaId, selDataSorteio, localParts, onUnsavedChangesChange]);

  useEffect(() => {
    if (triggerSaveRef) {
      triggerSaveRef.current = handleSalvar;
    }
    return () => {
      if (triggerSaveRef) {
        triggerSaveRef.current = null;
      }
    };
  }, [triggerSaveRef, handleSalvar]);

  const idsVinculadosData = React.useMemo(() => new Set(localParts.map(p => String(p.atleta_id))), [localParts]);

  // Lista de atletas vinculados à data selecionada, ordenada por nome
  const vinculados = React.useMemo(() => {
    const list = atletas.filter(a => idsVinculadosData.has(String(a.id)));
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, idsVinculadosData]);

  // Lista dos demais atletas que não estão vinculados à data da pelada selecionada, mas que estão no cadastro vinculados à pelada
  const disponiveis = React.useMemo(() => {
    const list = atletas.filter(a => 
      a.ativo && 
      Array.isArray(a.vinculos) && 
      a.vinculos.includes("pelada_" + peladaId) && 
      !idsVinculadosData.has(String(a.id))
    );
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, peladaId, idsVinculadosData]);

  const [filtro, setFiltro] = useState("");

  const vinculadosFiltrados = React.useMemo(() => {
    return vinculados.filter(a => 
      a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
      (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [vinculados, filtro]);

  const disponiveisFiltrados = React.useMemo(() => {
    return disponiveis.filter(a => 
      a.nome.toLowerCase().includes(filtro.toLowerCase()) || 
      (a.apelido && a.apelido.toLowerCase().includes(filtro.toLowerCase()))
    );
  }, [disponiveis, filtro]);

  const [modalAjustar, setModalAjustar] = useState(null);
  const [formTipo, setFormTipo] = useState("diarista");
  const [formValor, setFormValor] = useState("");
  const [formSaldo, setFormSaldo] = useState(0);
  const [recargaVal, setRecargaVal] = useState("");
  const [saldoOp, setSaldoOp] = useState("add");
  const [modalRelatorio, setModalRelatorio] = useState(false);

  const [modalNovoAtleta, setModalNovoAtleta] = useState(false);
  const [formAtleta, setFormAtleta] = useState({nome:"", apelido:"", foto:"", habilidade:3, goleiro:false, ativo:true});

  // Estado para modal de convidado
  const [modalConvidado, setModalConvidado] = useState(false);
  const [formConvidado, setFormConvidado] = useState({ nome: "", anfitriaoId: "", valor: "" });
 
  function abrirNovoAtleta() {
    setFormAtleta({nome: filtro.trim(), apelido:"", foto:"", habilidade:3, goleiro:false, ativo:true});
    setModalNovoAtleta(true);
  }

  function abrirModalConvidado() {
    // Pré-seleciona o primeiro atleta vinculado não-convidado como anfitrião
    const anfitrioes = vinculados.filter(a => !a.isConvidado);
    setFormConvidado({
      nome: "",
      anfitriaoId: anfitrioes[0]?.id || "",
      valor: String(pelada.valor_contribuicao || 15)
    });
    setModalConvidado(true);
  }

  function salvarConvidado() {
    if (!formConvidado.nome.trim()) { alert("Informe o nome do convidado!"); return; }
    if (!formConvidado.anfitriaoId) { alert("Selecione o anfitrião!"); return; }
    const anfitriao = atletas.find(a => String(a.id) === String(formConvidado.anfitriaoId));
    const novoId = Date.now();
    const novoConvidado = {
      id: novoId,
      nome: formConvidado.nome.trim(),
      apelido: "",
      foto: "",
      habilidade: anfitriao?.habilidade || 3,
      goleiro: false,
      ativo: true,
      isConvidado: true,
      convidadoDe: Number(formConvidado.anfitriaoId),
      vinculos: ["pelada_" + peladaId]
    };
    onAddAtleta(novoConvidado);
    if (onAddPart) {
      onAddPart({
        atleta_id: novoId,
        pelada_id: peladaId,
        data_realizacao_id: null,
        pagou: false,
        compareceu: false,
        tipo_pagamento: "diarista",
        valor_padrao: Number(formConvidado.valor) || pelada.valor_contribuicao || 15,
        saldo: 0
      });
    }
    const novoVinculoData = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: novoId,
      pelada_id: peladaId,
      data_realizacao_id: selDataSorteio || null,
      pagou: false,
      compareceu: false,
      tipo_pagamento: "diarista",
      valor_padrao: Number(formConvidado.valor) || pelada.valor_contribuicao || 15,
      saldo: 0
    };
    setLocalParts(prev => [...prev, novoVinculoData]);
    setModalConvidado(false);
  }
 
  const atualizarVinculoLocal = (partId, novosCampos) => {
    setLocalParts(prev => prev.map(p => String(p.id) === String(partId) ? { ...p, ...novosCampos } : p));
  };
 
  function salvarNovoAtleta() {
    if(!formAtleta.nome.trim()) return;
    const novoId = Date.now();
    const novoAtleta = {id: novoId, ...formAtleta, vinculos: ["pelada_" + peladaId]};
    onAddAtleta(novoAtleta);

    // Cria o vínculo permanente geral (data_realizacao_id === null) no estado global
    if (onAddPart) {
      onAddPart({
        atleta_id: novoId,
        pelada_id: peladaId,
        data_realizacao_id: null,
        pagou: false,
        compareceu: false,
        tipo_pagamento: "diarista",
        valor_padrao: pelada.valor_contribuicao || 15,
        saldo: 0
      });
    }

    // Adiciona a participação local na data selecionada
    const novoVinculoData = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: novoId,
      pelada_id: peladaId,
      data_realizacao_id: selDataSorteio || null,
      pagou: false,
      compareceu: false,
      tipo_pagamento: "diarista",
      valor_padrao: pelada.valor_contribuicao || 15,
      saldo: 0
    };
    setLocalParts(prev => [...prev, novoVinculoData]);
    setModalNovoAtleta(false);
    setFiltro("");
  }

  function vincular(id){
    const targetDataId = selDataSorteio === "todas" ? null : (selDataSorteio || null);
    // Busca se existe um vínculo geral (data_realizacao_id === null) para este atleta nesta pelada
    const vinculoGeral = participacoes.find(p => String(p.atleta_id) === String(id) && p.pelada_id === peladaId && p.data_realizacao_id === null);

    const novoVinculo = {
      id: "temp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      atleta_id: id,
      pelada_id: peladaId,
      data_realizacao_id: targetDataId,
      pagou: false,
      compareceu: false,
      tipo_pagamento: vinculoGeral?.tipo_pagamento || "diarista",
      valor_padrao: vinculoGeral?.valor_padrao || pelada.valor_contribuicao || 15,
      saldo: vinculoGeral?.saldo || 0
    };
    setLocalParts(prev => [...prev, novoVinculo]);
  }

  function desvincular(atletaId){
    setLocalParts(prev => prev.filter(p => p.atleta_id !== atletaId));
  }

  // Lista de anfitriões disponíveis para seleção no modal de convidado
  const anfitrioes = React.useMemo(() => vinculados.filter(a => !a.isConvidado), [vinculados]);

  return(
    <div>
      <div style={{marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap"}}>
        <input 
          style={{...S.input, flex: 1, minWidth: 160}} 
          placeholder="Buscar atleta por nome ou apelido..." 
          value={filtro} 
          onChange={e=>setFiltro(e.target.value)}
          disabled={isRealizada}
        />
        <button onClick={abrirNovoAtleta} style={S.btnSm("#10b981", "#fff")} disabled={isRealizada}>Novo Atleta</button>
        <button onClick={abrirModalConvidado} style={S.btnSm("#7F77DD22", "#7F77DD")} disabled={isRealizada} title="Adicionar convidado vinculado a um anfitrião"><IconUser size={13} style={{marginRight: 4}} /> Convidado</button>
      </div>

      <div style={{marginBottom: 16}}>
        <div style={{...S.card,textAlign:"center",padding:10}}>
          <div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>
            {selDataSorteio === "todas" ? "Elenco Permanente da Pelada (Geral)" : "Atletas Vinculados à Data"}
          </div>
          <div style={{fontSize:20,fontWeight:800,color:"#1D9E75"}}>{vinculados.length}</div>
        </div>
      </div>

      <div style={{marginBottom: 16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontWeight:700,fontSize:13,color:"#1D9E75"}}>
            {selDataSorteio === "todas" ? `Elenco Permanente da Pelada (${vinculadosFiltrados.length})` : `Atletas Vinculados à Data (${vinculadosFiltrados.length})`}
          </div>
          <button onClick={()=>setModalRelatorio(true)} style={S.btnSm(t.cardBorder,t.text)}>Mensalistas</button>
        </div>
        
        {vinculadosFiltrados.length===0 ? (
          <div style={{...S.card,color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>
            {filtro ? "Nenhum atleta correspondente vinculado à data." : "Nenhum atleta vinculado a esta data da pelada."}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {vinculadosFiltrados.map(a=>{
              const vinculo = localParts.find(p=>String(p.atleta_id)===String(a.id));
              const infoPag = vinculo?.tipo_pagamento === "mensalista" 
                ? `Mensalista (Saldo: ${fmtCur(vinculo.saldo||0)})`
                : `Diarista (Diária: ${fmtCur(vinculo?.valor_padrao||0)})`;
              const anfitriao = a.isConvidado && a.convidadoDe ? atletas.find(x => x.id === a.convidadoDe) : null;
              return(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background: a.isProvisorio ? "#BA751710" : (a.isConvidado ? "#7F77DD10" : `${t.accent}10`),border: a.isProvisorio ? "1px solid #BA751733" : (a.isConvidado ? "1px solid #7F77DD33" : `1px solid ${t.accent}33`),flexWrap:"wrap"}}>
                  <span style={{fontSize:16}}>{a.goleiro ? <IconGoalkeeper size={14} /> : <IconSoccer size={14} />}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:t.text,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                      {a.nome}{a.apelido ? ` (${a.apelido})` : ""}
                      {a.isConvidado && (
                        <span style={{fontSize:10,fontWeight:700,background:"#7F77DD22",color:"#7F77DD",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                          👤 Convidado de {anfitriao ? (anfitriao.apelido || anfitriao.nome) : "?"}
                        </span>
                      )}
                      {a.isProvisorio && (
                        <span style={{fontSize:10,fontWeight:700,background:"#BA751722",color:"#BA7517",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                          Pix Provisório
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:11,color:t.textSec}}>{infoPag}</div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    {a.isProvisorio && (
                      <button onClick={()=>{
                        if (onUpdateAtleta) {
                          onUpdateAtleta(a.id, { isProvisorio: false });
                          alert(`${a.nome} foi efetivado com sucesso como atleta permanente!`);
                        }
                      }} style={S.btnSm(`${t.accent}22`, t.accent)} disabled={isRealizada}>✓ Efetivar</button>
                    )}
                    <button onClick={()=>{
                      setModalAjustar(vinculo);
                      setFormTipo(vinculo?.tipo_pagamento || "diarista");
                      setFormValor(vinculo?.valor_padrao || 0);
                      setFormSaldo(vinculo?.saldo || 0);
                      setRecargaVal("");
                      setSaldoOp("add");
                    }} style={S.btnSm("#BA751722","#BA7517")} disabled={isRealizada}>Ajustar</button>
                    <button onClick={()=>desvincular(a.id)} style={S.btnSm("#E24B4A22","#E24B4A")} disabled={isRealizada}>Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{marginBottom: 16}}>
        <div style={{fontWeight:700,fontSize:13,color:t.textSec,marginBottom:16}}>Disponíveis no Cadastro ({disponiveisFiltrados.length})</div>
        {disponiveisFiltrados.length===0 ? (
          <div style={{...S.card,color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>
            {filtro ? "Nenhum atleta correspondente disponível." : "Todos os atletas do cadastro já estão vinculados a esta data."}
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {disponiveisFiltrados.map(a=>{
              const vinculoGeral = participacoes.find(p=>String(p.atleta_id)===String(a.id) && p.pelada_id===peladaId && p.data_realizacao_id === null);
              const infoPag = vinculoGeral?.tipo_pagamento === "mensalista" 
                ? `Mensalista (Saldo: ${fmtCur(vinculoGeral.saldo||0)})`
                : `Diarista (Diária: ${fmtCur(vinculoGeral?.valor_padrao||0)})`;
              return (
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:t.card,border:`1px solid ${t.cardBorder}`,flexWrap:"wrap"}}>
                  <span style={{fontSize:16}}>{a.goleiro ? <IconGoalkeeper size={14} /> : <IconSoccer size={14} />}</span>
                  <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:13,color:t.text}}>{a.nome}{a.apelido ? ` (${a.apelido})` : ""}</div><div style={{fontSize:11,color:t.textSec}}>{infoPag}</div></div>
                  <div>
                    <button onClick={()=>vincular(a.id)} style={S.btnSm(`${t.accent}22`,t.accent)} disabled={isRealizada}>Vincular à Data</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAjustar && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>Configurar Atleta na Pelada</div>
            <div style={{fontSize:13,color:t.textSec,marginBottom:16}}>Atleta: <b>{getPlayerName(atletas.find(x=>String(x.id)===String(modalAjustar.atleta_id)))}</b></div>
            
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              <div>
                <label style={S.label}>Tipo de Pagamento</label>
                <select style={S.select} value={formTipo} onChange={e=>setFormTipo(e.target.value)}>
                  <option value="diarista">Diarista</option>
                  <option value="mensalista">Mensalista</option>
                </select>
              </div>
              
              <div>
                <label style={S.label}>{formTipo === "mensalista" ? "Valor da Mensalidade (R$)" : "Valor da Diária (R$)"}</label>
                <input style={S.input} type="number" min="0" step="0.01" value={formValor} onChange={e=>setFormValor(e.target.value)}/>
              </div>

              {formTipo === "mensalista" && (
                <div style={{borderTop:`1px solid ${t.cardBorder}`,paddingTop:12,marginTop:4}}>
                  <div style={{fontWeight:600,fontSize:13,color:t.text,marginBottom:16}}>Gerenciar Saldo do Mensalista</div>
                  <div style={{fontSize:12,color:t.textSec,marginBottom:16}}>Saldo Atual: <b style={{color:t.text}}>{fmtCur(formSaldo)}</b></div>
                  
                  <div style={{display:"flex",gap:6,marginBottom:16}}>
                    <button onClick={()=>setSaldoOp("add")} style={{flex:1,padding:"5px",fontSize:11,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="add"?t.accent:t.cardBorder}`,background:saldoOp==="add"?t.accent:"transparent",color:saldoOp==="add"?"#fff":t.textSec,cursor:"pointer"}}>Recarregar</button>
                    <button onClick={()=>setSaldoOp("set")} style={{flex:1,padding:"5px",fontSize:11,fontWeight:600,borderRadius:8,border:`1px solid ${saldoOp==="set"?"#22b7d9":t.cardBorder}`,background:saldoOp==="set"?"#22b7d9":"transparent",color:saldoOp==="set"?"#fff":t.textSec,cursor:"pointer"}}>Corrigir Exato</button>
                  </div>

                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input style={{...S.input,flex:1}} type="number" step="0.01" value={recargaVal} onChange={e=>setRecargaVal(e.target.value)} placeholder="0.00"/>
                    <button onClick={()=>{
                      const val = Number(recargaVal);
                      if(isNaN(val) || val <= 0) return;
                      const a = atletas.find(x=>String(x.id)===String(modalAjustar.atleta_id));
                      if(saldoOp === "add") {
                        const novo = (modalAjustar.saldo||0) + val;
                        atualizarVinculoLocal(modalAjustar.id, {saldo: novo});
                        setFormSaldo(novo);
                        setModalAjustar(prev => ({ ...prev, saldo: novo }));
                        if(onAddFinanceiro) onAddFinanceiro(`Recarga Saldo Pelada - ${getPlayerName(a)}`, val);
                        alert("Recarga realizada com sucesso!");
                      } else {
                        atualizarVinculoLocal(modalAjustar.id, {saldo: val});
                        setFormSaldo(val);
                        setModalAjustar(prev => ({ ...prev, saldo: val }));
                        alert("Saldo updated com sucesso!");
                      }
                      setRecargaVal("");
                    }} style={S.btn(saldoOp==="add"?t.accent:"#22b7d9")}>Aplicar</button>
                  </div>
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                atualizarVinculoLocal(modalAjustar.id, {
                  tipo_pagamento: formTipo,
                  valor_padrao: Number(formValor),
                  saldo: Number(formSaldo)
                });
                setModalAjustar(null);
              }} style={S.btn("#22b7d9")}>Confirmar</button>
              <button onClick={()=>setModalAjustar(null)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalRelatorio && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"90vh",overflowY:"auto",display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:16,color:t.text}}>Mensalistas - {pelada.nome}</div>
              <button onClick={()=>setModalRelatorio(false)} style={{background:"none",border:"none",color:t.textSec,fontSize:20,cursor:"pointer"}}>×</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flex:1,overflowY:"auto"}}>
              {vinculados.map(a => {
                const vinc = localParts.find(p => p.atleta_id === a.id);
                if (vinc?.tipo_pagamento !== "mensalista") return null;
                const s = vinc.saldo || 0;
                return (
                  <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",border:`1px solid ${t.cardBorder}`,borderRadius:8,background:t.inputBg}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <PlayerAvatar atleta={a} size={24}/>
                      <span style={{fontSize:13,fontWeight:600,color:t.text}}>{getPlayerName(a)}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:700,color:s<0?"#E24B4A":s>0?t.accent:t.textSec}}>
                      {fmtCur(s)}
                    </div>
                  </div>
                );
              }).filter(Boolean)}
              {vinculados.filter(a => {
                const vinc = localParts.find(p => p.atleta_id === a.id);
                return vinc?.tipo_pagamento === "mensalista";
              }).length === 0 && <div style={{fontSize:12,color:t.textSec,textAlign:"center",padding:24}}>Nenhum mensalista vinculado.</div>}
            </div>
          </div>
        </div>
      )}
      {modalNovoAtleta && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>🆕 Cadastrar e Vincular Atleta</div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Nome</label><input style={S.input} value={formAtleta.nome} onChange={e=>setFormAtleta(v=>({...v,nome:e.target.value}))} placeholder="Nome completo"/></div>
                <div style={{flex:1,minWidth:140}}><label style={S.label}>Apelido</label><input style={S.input} value={formAtleta.apelido} onChange={e=>setFormAtleta(v=>({...v,apelido:e.target.value}))} placeholder="Como é chamado"/></div>
              </div>
              <div>
                <label style={S.label}>Foto</label>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  {formAtleta.foto&&<img src={formAtleta.foto} style={{width:40,height:40,borderRadius:"50%",objectFit:"cover"}}/>}
                  <input style={{...S.input,flex:1}} value={formAtleta.foto} onChange={e=>setFormAtleta(v=>({...v,foto:e.target.value}))} placeholder="Cole URL da foto..."/>
                  <label style={{...S.btn("#22b7d922","#22b7d9"),margin:0}}>
                    Selecionar Arquivo
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{if(e.target.files[0])resizeImage(e.target.files[0],300,(b64)=>setFormAtleta(v=>({...v,foto:b64})))}}/>
                  </label>
                </div>
              </div>
              <div>
                <label style={S.label}>Habilidade</label>
                <div style={{display:"flex",gap:6}}>{[1,2,3,4,5].map(s=><button key={s} onClick={()=>setFormAtleta(v=>({...v,habilidade:s}))} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`2px solid ${formAtleta.habilidade===s?SKILL_COLORS[s-1]:t.inputBorder}`,background:formAtleta.habilidade===s?SKILL_COLORS[s-1]+"22":t.inputBg,cursor:"pointer",fontSize:12,color:formAtleta.habilidade===s?SKILL_COLORS[s-1]:t.textSec,fontWeight:formAtleta.habilidade===s?700:400}}>{Array.from({length: 5}, (_, i) => i < s ? <IconStarFilled key={i} size={10} color={form.habilidade===s?SKILL_COLORS[s-1]:t.textSec} style={{marginRight: 1}} /> : <IconStar key={i} size={10} color={t.textSec} style={{marginRight: 1}} />)}</button>)}</div>
              </div>
              <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={formAtleta.goleiro} onChange={e=>setFormAtleta(v=>({...v,goleiro:e.target.checked}))}/>🧤 Goleiro</label>
                <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:t.text}}><input type="checkbox" checked={formAtleta.ativo} onChange={e=>setFormAtleta(v=>({...v,ativo:e.target.checked}))}/>✓ Ativo</label>
              </div>

            </div>
            <div style={{display:"flex",gap:8,marginTop:16}}>
              <button onClick={salvarNovoAtleta} style={S.btn("#22b7d9")}>Salvar e Vincular</button>
              <button onClick={()=>setModalNovoAtleta(false)} style={S.btn(t.card,t.textSec)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Convidado */}
      {modalConvidado && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1002,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:16,color:"#7F77DD"}}>Adicionar Convidado</div>
              <button onClick={()=>setModalConvidado(false)} style={{background:"none",border:"none",color:t.textSec,cursor:"pointer",fontSize:20,padding:0}}>×</button>
            </div>
            <div style={{fontSize:12,color:t.textSec,marginBottom:16,background:"#7F77DD10",border:"1px solid #7F77DD30",borderRadius:8,padding:"8px 12px"}}>
              Convidados de revezamento entram no mesmo time do anfitrião e se revezam com ele durante a pelada.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={S.label}>Nome do Convidado</label>
                <input
                  style={S.input}
                  value={formConvidado.nome}
                  onChange={e=>setFormConvidado(v=>({...v,nome:e.target.value}))}
                  placeholder="Nome completo do convidado"
                  autoFocus
                />
              </div>
              <div>
                <label style={S.label}>Anfitrião (quem trouxe)</label>
                <select
                  style={S.select}
                  value={formConvidado.anfitriaoId}
                  onChange={e=>setFormConvidado(v=>({...v,anfitriaoId:e.target.value}))}
                >
                  <option value="">Selecione o anfitrião...</option>
                  {anfitrioes.map(a=>(
                    <option key={a.id} value={a.id}>{a.apelido || a.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={S.label}>Valor da Diária (R$)</label>
                <input
                  style={S.input}
                  type="number"
                  min={0}
                  step={0.5}
                  value={formConvidado.valor}
                  onChange={e=>setFormConvidado(v=>({...v,valor:e.target.value}))}
                  placeholder={String(pelada.valor_contribuicao || 15)}
                />
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginTop:20}}>
              <button onClick={salvarConvidado} style={{...S.btn("#7F77DD"),flex:1,justifyContent:"center"}}>Adicionar Convidado</button>
              <button onClick={()=>setModalConvidado(false)} style={{...S.btn(t.card,t.textSec),border:`1px solid ${t.cardBorder}`,justifyContent:"center"}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {hasChanges && (
        <div style={{
          position: "sticky",
          bottom: 10,
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          padding: "24px",
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 10,
          marginTop: 16
        }}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>⚠️ Alterações não salvas!</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => {
                setLocalParts(partsOriginais);
              }} 
              style={S.btnSm(t.card, t.textSec)}
            >
              Descartar
            </button>
            <button 
              onClick={handleSalvar} 
              style={S.btnSm("#1D9E75", "#fff")}
            >
              Salvar Vínculos
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── ABA PARTICIPAÇÕES ──────────────────── */
function AbaParticipacoes({
  pelada,
  atletas,
  participacoes,
  datasRealizacao,
  onAdd,
  onUpdate,
  onRemove,
  onUpdateAtleta,
  onAddFinanceiro,
  t,
  selDataSorteio,
  onUnsavedChangesChange,
  triggerSaveRef,
  onSavePartsLote
}){
  const peladaId=pelada.id;
  const S=makeStyles(t);
  const datas=datasRealizacao.filter(d=>d.pelada_id===peladaId&&d.status!=="cancelado");

  const partsOriginais = React.useMemo(() => {
    const targetDataId = selDataSorteio || null;
    return participacoes.filter(p => p.pelada_id === peladaId && String(p.data_realizacao_id) === String(targetDataId));
  }, [participacoes, peladaId, selDataSorteio]);

  const [localParts, setLocalParts] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalParts(partsOriginais);
    setHasChanges(false);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [partsOriginais]);

  useEffect(() => {
    const mudou = JSON.stringify(localParts) !== JSON.stringify(partsOriginais);
    setHasChanges(mudou);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(mudou);
    }
  }, [localParts, partsOriginais, onUnsavedChangesChange]);

  const handleSalvar = React.useCallback(() => {
    localParts.forEach(pLocal => {
      const pOrig = partsOriginais.find(o => o.atleta_id === pLocal.atleta_id);
      const vinculoGeral = participacoes.find(x => x.atleta_id === pLocal.atleta_id && x.pelada_id === peladaId && x.data_realizacao_id === null);
      
      if (vinculoGeral) {
        let saldoAtual = Number(vinculoGeral.saldo || 0);
        let mudou = false;

        const origUsouSaldo = pOrig?.pagou && pOrig?.usou_saldo;
        const localUsouSaldo = pLocal.pagou && pLocal.usou_saldo;

        if (localUsouSaldo && !origUsouSaldo) {
          saldoAtual -= Number(pLocal.valor || 0);
          mudou = true;
        } else if (!localUsouSaldo && origUsouSaldo) {
          saldoAtual += Number(pOrig.valor || pLocal.valor || 0);
          mudou = true;
        }

        if (mudou) {
          onUpdate(vinculoGeral.id, { saldo: saldoAtual });
        }
      }
    });

    onSavePartsLote(peladaId, selDataSorteio || null, localParts);
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [onSavePartsLote, peladaId, selDataSorteio, localParts, partsOriginais, participacoes, onUpdate, onUnsavedChangesChange]);

  useEffect(() => {
    if (triggerSaveRef) {
      triggerSaveRef.current = handleSalvar;
    }
    return () => {
      if (triggerSaveRef) {
        triggerSaveRef.current = null;
      }
    };
  }, [triggerSaveRef, handleSalvar]);

  const vinculadosIds = React.useMemo(() => {
    return localParts.map(p => p.atleta_id);
  }, [localParts]);

  const vinculadosAtletas = React.useMemo(() => {
    const list = atletas.filter(a => vinculadosIds.includes(a.id));
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atletas, vinculadosIds]);

  function registrarPresenca(atletaId){
    setLocalParts(prev => prev.map(p => {
      if (p.atleta_id === atletaId) {
        return { ...p, compareceu: !p.compareceu };
      }
      return p;
    }));
  }

  const [absentModal, setAbsentModal] = useState(null);

  function togglePagou(atletaId){
    const p = localParts.find(x => x.atleta_id === atletaId);
    if (!p) return;
    const dataObj = datasRealizacao.find(d => String(d.id) === String(selDataSorteio));
    const vinculo = participacoes.find(x => x.atleta_id === atletaId && x.pelada_id === peladaId && x.data_realizacao_id === null);
    const valorCobrado = dataObj?.valor || pelada.valor_contribuicao || vinculo?.valor_padrao || 0;

    const vaiPagar = !p.pagou;
    const isAusente = !p.compareceu;

    if(vaiPagar && isAusente){
      setAbsentModal({aid: atletaId, dataId: selDataSorteio, pId: p.id, valor: valorCobrado});
      return;
    }

    if(vaiPagar){
      if(vinculo && vinculo.tipo_pagamento === "mensalista" && (vinculo.saldo||0) >= Number(valorCobrado)){
        setLocalParts(prev => prev.map(x => {
          if (x.atleta_id === atletaId) {
            return { ...x, pagou: true, usou_saldo: true, valor: valorCobrado };
          }
          return x;
        }));
      } else {
        setLocalParts(prev => prev.map(x => {
          if (x.atleta_id === atletaId) {
            return { ...x, pagou: true, usou_saldo: false, valor: valorCobrado };
          }
          return x;
        }));
      }
    } else {
      setLocalParts(prev => prev.map(x => {
        if (x.atleta_id === atletaId) {
          return { ...x, pagou: false, usou_saldo: false };
        }
        return x;
      }));
    }
  }

  if(datas.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhuma data agendada ou realizada. Crie datas na aba Datas.</div>;
  if(vinculadosAtletas.length===0)return<div style={{color:t.textSec,fontSize:13,textAlign:"center",padding:24}}>Nenhum atleta vinculado. Vincule atletas na aba Atletas.</div>;

  const dataAtual=datas.find(d=>String(d.id)===String(selDataSorteio))||datas[0];
  const presentes=vinculadosAtletas.filter(a=>{const p=localParts.find(x=>x.atleta_id===a.id);return p?.compareceu;});
  const pagaram=vinculadosAtletas.filter(a=>{const p=localParts.find(x=>x.atleta_id===a.id);return p?.pagou;});
  const totalArrecadado=pagaram.reduce((s,a)=>{const p=localParts.find(x=>x.atleta_id===a.id);return s+((p?.usou_saldo)?0:Number(p?.valor||0));},0);

  return(
    <div>
      {dataAtual&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:16}}>
            {[["Presentes",presentes.length+"/"+ vinculadosAtletas.length,t.accent],["Pagaram",pagaram.length+"/"+presentes.length,"#22b7d9"],["Arrecadado",fmtCur(totalArrecadado),"#BA7517"]].map(([l,v,c])=>(
              <div key={l} style={{...S.card,textAlign:"center",padding:10}}><div style={{fontSize:9,fontWeight:700,color:t.textSec,marginBottom:3}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:c}}>{v}</div></div>
            ))}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {vinculadosAtletas.map(atleta=>{
              const aid=atleta.id;
              const part=localParts.find(p=>p.atleta_id===aid);
              const compareceu=part?.compareceu||false;
              const pagou=part?.pagou||false;
              const vinculo = participacoes.find(x=>x.atleta_id===aid && x.pelada_id===peladaId && x.data_realizacao_id===null);
              const anfitriao = atleta.isConvidado && atleta.convidadoDe ? atletas.find(x => x.id === atleta.convidadoDe) : null;
              return(
                <div key={aid} style={{...S.card,padding:"24px",border:`1px solid ${compareceu?(atleta.isConvidado?"#7F77DD44":`${t.accent}33`):t.cardBorder}`,background:compareceu?(atleta.isConvidado?"#7F77DD08":`${t.accent}08`):t.card}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <PlayerAvatar atleta={atleta} size={30}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,color:t.text,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        {getPlayerName(atleta)}
                        {atleta.isConvidado && (
                          <span style={{fontSize:10,fontWeight:700,background:"#7F77DD22",color:"#7F77DD",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                            👤 Convidado de {anfitriao ? (anfitriao.apelido || anfitriao.nome) : "?"}
                          </span>
                        )}
                        {atleta.isProvisorio && (
                          <span style={{fontSize:10,fontWeight:700,background:"#BA751722",color:"#BA7517",padding:"1px 7px",borderRadius:20,whiteSpace:"nowrap"}}>
                            Pix Provisório
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                      <button onClick={()=>registrarPresenca(aid)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${compareceu?t.accent:"#ccc"}`,background:compareceu?t.accent:"transparent",color:compareceu?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{compareceu?"Presente":"Ausente"}</button>
                      <button onClick={()=>togglePagou(aid)} style={{padding:"5px 12px",borderRadius:20,fontSize:12,border:`1px solid ${pagou?(part?.usou_saldo?"#BA7517":"#22b7d9"):"#ccc"}`,background:pagou?(part?.usou_saldo?"#BA7517":"#22b7d9"):"transparent",color:pagou?"#fff":t.textSec,cursor:"pointer",fontWeight:600}}>{pagou?(part?.usou_saldo?"💳 Pago (Saldo)":"Pago"):(vinculo?.tipo_pagamento==="mensalista" ? ((vinculo?.saldo||0)>=Number(dataAtual?.valor||pelada.valor_contribuicao||vinculo?.valor_padrao||0)?"💳 Debitar Saldo":"Pendente") : "Pendente")}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {absentModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:340}}>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>Pagamento de Ausente</div>
            <div style={{fontSize:13,color:t.textSec,marginBottom:16}}>O atleta não compareceu, mas está pagando {fmtCur(absentModal.valor)}. Onde deseja registrar esse valor?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{
                setLocalParts(prev => prev.map(p => {
                  if (p.atleta_id === absentModal.aid) {
                    return { ...p, pagou: true, usou_saldo: false, valor: absentModal.valor };
                  }
                  return p;
                }));
                setAbsentModal(null);
              }} style={{...S.btn(t.accent), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8}}>Ir para o Caixa da Pelada</button>
              <button onClick={()=>{
                const atleta = atletas.find(a => String(a.id) === String(absentModal.aid));
                const vinculo = participacoes.find(x => String(x.atleta_id) === String(absentModal.aid) && String(x.pelada_id) === String(peladaId) && !x.data_realizacao_id);
                if (vinculo) {
                  onUpdate(vinculo.id, { saldo: (vinculo.saldo || 0) + Number(absentModal.valor) });
                } else {
                  if (onAddPart) {
                    onAddPart({
                      atleta_id: absentModal.aid,
                      pelada_id: peladaId,
                      data_realizacao_id: null,
                      pagou: false,
                      compareceu: false,
                      tipo_pagamento: "diarista",
                      valor_padrao: pelada.valor_contribuicao || 15,
                      saldo: Number(absentModal.valor)
                    });
                  }
                }
                if (onAddFinanceiro) onAddFinanceiro(`Recarga de Saldo (Ausente) - ${getPlayerName(atleta)}`, absentModal.valor);
                setLocalParts(prev => prev.map(p => {
                  if (p.atleta_id === absentModal.aid) {
                    return { ...p, pagou: false, usou_saldo: false };
                  }
                  return p;
                }));
                setAbsentModal(null);
              }} style={{...S.btn("#BA7517"), display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8}}>Converter em Saldo do Atleta</button>
              <button onClick={()=>setAbsentModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {hasChanges && (
        <div style={{
          position: "sticky",
          bottom: 0,
          background: t.card,
          border: `1px solid ${t.cardBorder}`,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.1)",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "12px 12px 0 0",
          zIndex: 10,
          marginTop: 16
        }}>
          <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>⚠️ Alterações não salvas!</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              onClick={() => {
                setLocalParts(partsOriginais);
              }} 
              style={S.btnSm(t.card, t.textSec)}
            >
              Descartar
            </button>
            <button 
              onClick={handleSalvar} 
              style={S.btnSm("#1D9E75", "#fff")}
            >
              Salvar Presenças
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── GERENCIAR PELADA ───────────────────── */
function GerenciarPelada({pelada,atletas,participacoes,datasRealizacao,onUpdatePelada,onRemovePelada,onAddData,onUpdateData,onRemoveData,onAddPart,onUpdatePart,onRemovePart,onUpdateAtleta,onAddFinanceiro,onAddAtleta,onBack,t,aba,setAba, auth, managers, assegurarManagerColaborador, onSavePartsLote, quadras}){
  const S=makeStyles(t);
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  const [localAba, setLocalAba] = useState("datas");
  const currentAba = aba || localAba;
  const currentSetAba = setAba || setLocalAba;
  const isDonoOuAdmin = auth.role === "adm" || (auth.role === "manager" && pelada.manager_id === auth.manager_id);
  const ABAS=["datas","atletas","participações","configuracoes","jogos","placar","ranking"];
  if (isDonoOuAdmin) {
    ABAS.push("colaboradores");
  }
  const datas=datasRealizacao.filter(d=>d.pelada_id===pelada.id);
  const parts=participacoes.filter(p=>p.pelada_id===pelada.id);
 
  const [hasUnsavedChangesAtletas, setHasUnsavedChangesAtletas] = useState(false);
  const [modalConfirmacaoNavegacao, setModalConfirmacaoNavegacao] = useState(null);
  const triggerSaveRef = useRef(null);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChangesAtletas) {
        const msg = "Você tem alterações não salvas nos atletas/participações. Se você sair, essas alterações serão perdidas.";
        e.preventDefault();
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChangesAtletas]);
 
  const executarNavegacaoDestino = (dest) => {
    if (!dest) return;
    if (dest.type === "aba") {
      currentSetAba(dest.target);
    } else if (dest.type === "data") {
      setIsCarregandoDados(true);
      setTimeout(() => {
        setSelDataSorteio(dest.target);
        setIsCarregandoDados(false);
      }, 450);
    } else if (dest.type === "voltar") {
      onBack();
    }
  };
 
  /* sorteio / jogos */
  /* sorteio / jogos */
  const[drawnTeams,setDrawnTeams]=useState(pelada.drawnTeams||null);
  const[peladaState,setPeladaStateLocalReal]=useState(pelada.peladaState||null);
  const [historicoEstados, setHistoricoEstados] = useState([]);
  const setPeladaStateLocal = (newPs) => {
    let cleanPs = newPs;
    if (cleanPs) {
      cleanPs = higienizarFilaTimes(cleanPs);
    }
    if (peladaState && cleanPs && cleanPs !== peladaState) {
      setHistoricoEstados(prev => {
        if (prev.length > 0 && JSON.stringify(prev[prev.length - 1]) === JSON.stringify(peladaState)) {
          return prev;
        }
        return [...prev, deepClone(peladaState)];
      });
    }
    setPeladaStateLocalReal(cleanPs);
  };
  const salvarPeladaStateComHistorico = (ps) => {
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  };
  const[benchState,setBenchState]=useState(pelada.initialBench||[]);
  const currentBench = peladaState?.bench || benchState;
  const [showEquipesFormadas, setShowEquipesFormadas] = useState(false);
  const[numTeams,setNumTeams]=useState(2);
  const [numTeamsInput, setNumTeamsInput] = useState("2");
  const[ppt,setPpt]=useState(pelada.playersPerTeam||4);
  const [pptInput, setPptInput] = useState(String(pelada.playersPerTeam||4));
  const [metodoFormacao, setMetodoFormacao] = useState(pelada.metodoFormacao || "igual");
  

  
  const { paraA: proxParaA, paraB: proxParaB, destaques: proxDestaques } = obterCandidatosEmprestimoProximaPartida(peladaState, ppt);
  const proxCandidatosEmprestimoIds = (proxDestaques || []).map(p => String(p.id || p.atleta_id || p.idAtleta));

  const getOrigemTeamName = (atletaId) => {
    if (!peladaState || !peladaState.teamBases) return "";
    const targetId = String(atletaId);
    for (const teamName of Object.keys(peladaState.teamBases)) {
      const ids = peladaState.teamBases[teamName] || [];
      if (ids.some(id => String(id) === targetId)) {
        return teamName;
      }
    }
    return "";
  };

  const getLoanTag = (atleta, currentTeamName) => {
    if (!atleta || !peladaState || !peladaState.currentMatch || !peladaState.teamBases) return null;
    const athleteId = String(atleta.id || atleta.atleta_id || atleta.idAtleta);
    const match = peladaState.currentMatch;
    const isEmprestadoA = (match.teamAEmprestados || []).some(id => String(id) === athleteId);
    const isEmprestadoB = (match.teamBEmprestados || []).some(id => String(id) === athleteId);
    if (isEmprestadoA || isEmprestadoB) {
      for (const teamName of Object.keys(peladaState.teamBases)) {
        if (teamName === currentTeamName) continue;
        const ids = peladaState.teamBases[teamName] || [];
        if (ids.some(id => String(id) === athleteId)) {
          const matches = teamName.match(/\d+/);
          const sigla = matches ? `T${matches[0]}` : teamName.substring(0, 3).toUpperCase();
          return <span style={{marginLeft: 4, color: "#FFA726", fontSize: 10, fontWeight: "bold"}} title={`Emprestado do ${teamName}`}><IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>;
        }
      }
    }
    return null;
  };

  const getLoanTagForEquipes = (atleta) => {
    if (!atleta || !peladaState || !peladaState.currentMatch || !peladaState.teamBases) return null;
    const athleteId = String(atleta.id || atleta.atleta_id || atleta.idAtleta);
    const match = peladaState.currentMatch;
    
    let originalTeamName = null;
    for (const teamName of Object.keys(peladaState.teamBases)) {
      const ids = peladaState.teamBases[teamName] || [];
      if (ids.some(id => String(id) === athleteId)) {
        originalTeamName = teamName;
        break;
      }
    }
    
    const isA = (match.teamAEmprestados || []).some(id => String(id) === athleteId);
    if (isA) {
      if (match.teamA === originalTeamName) return null;
      const matches = match.teamA.match(/\d+/);
      const sigla = matches ? `T${matches[0]}` : match.teamA.substring(0, 3).toUpperCase();
      return <span style={{marginLeft: 4, color: "#FFA726", fontSize: 10, fontWeight: "bold"}} title={`Emprestado para o ${match.teamA}`}><IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>;
    }
    const isB = (match.teamBEmprestados || []).some(id => String(id) === athleteId);
    if (isB) {
      if (match.teamB === originalTeamName) return null;
      const matches = match.teamB.match(/\d+/);
      const sigla = matches ? `T${matches[0]}` : match.teamB.substring(0, 3).toUpperCase();
      return <span style={{marginLeft: 4, color: "#FFA726", fontSize: 10, fontWeight: "bold"}} title={`Emprestado para o ${match.teamB}`}><IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>;
    }
    return null;
  };

  const reverterTimesOriginais = () => {
    const dataObj = datas.find(d => String(d.id) === String(selDataSorteio)) || pelada;
    const origTeams = dataObj?.drawnTeams || pelada?.drawnTeams;

    if (!origTeams || origTeams.length === 0) {
      alert("Não há dados de times originais salvos para esta rodada.");
      return;
    }
    
    if (!window.confirm("Deseja realmente voltar todos os jogadores para seus times originais de sorteio? Isso desfará trocas manuais, novos times criados pelo banco e empréstimos ativos.")) {
      return;
    }

    const todosJogadores = [];
    if (peladaState.teams) peladaState.teams.forEach(tm => todosJogadores.push(...tm.players));
    if (peladaState.bench) peladaState.bench.forEach(p => todosJogadores.push(p));
    
    const uniquePlayers = [];
    const seenIds = new Set();
    todosJogadores.forEach(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        uniquePlayers.push(p);
      }
    });

    const origTeamNames = origTeams.map(t => t.name);
    const origTeamBases = {};
    origTeams.forEach(t => {
      origTeamBases[t.name] = t.players.map(p => String(p.id || p.atleta_id || p.idAtleta));
    });

    const origBenchIds = (dataObj?.initialBench || pelada?.initialBench || []).map(id => String(id));

    const sobressalentes = uniquePlayers.filter(p => {
      const idStr = String(p.id || p.atleta_id || p.idAtleta);
      const pertenceATimeOrig = origTeamNames.some(tName => origTeamBases[tName].includes(idStr));
      const pertenceAoBancoOrig = origBenchIds.includes(idStr);
      return !pertenceATimeOrig && !pertenceAoBancoOrig;
    });

    if (sobressalentes.length > 0) {
      setSobrasModalData({ sobressalentes, uniquePlayers });
    } else {
      executarReversaoDirect(uniquePlayers, [], "bench");
    }
  };

  const executarReversaoDirect = (uniquePlayers, sobressalentes, destinoSobras) => {
    let ps = deepClone(peladaState);
    const dataObj = datas.find(d => String(d.id) === String(selDataSorteio)) || pelada;
    const origTeams = dataObj?.drawnTeams || pelada?.drawnTeams || [];
    
    const origTeamNames = origTeams.map(t => t.name);
    const origTeamBases = {};
    origTeams.forEach(t => {
      origTeamBases[t.name] = t.players.map(p => String(p.id || p.atleta_id || p.idAtleta));
    });

    ps.teams = origTeams.map(origT => {
      const baseIds = origTeamBases[origT.name] || [];
      const originalPlayers = baseIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
      return { name: origT.name, players: originalPlayers };
    });

    ps.teamBases = { ...origTeamBases };

    const origBenchIds = (dataObj?.initialBench || pelada?.initialBench || []).map(id => String(id));
    const originalBenchPlayers = origBenchIds.map(id => uniquePlayers.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(id))).filter(Boolean);
    ps.bench = originalBenchPlayers;

    const todosJogadoresQueEstavamEmSobressalentes = [];
    if (peladaState.teams) {
      peladaState.teams.forEach(t => {
        if (!origTeamNames.includes(t.name)) {
          todosJogadoresQueEstavamEmSobressalentes.push(...t.players);
        }
      });
    }

    todosJogadoresQueEstavamEmSobressalentes.forEach(p => {
      const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!ps.bench.some(bp => String(bp.id || bp.atleta_id || bp.idAtleta) === pIdStr)) {
        ps.bench.push(p);
      }
    });

    if (sobressalentes.length > 0) {
      if (destinoSobras === "bench") {
        sobressalentes.forEach(p => {
          const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
          if (!ps.bench.some(bp => String(bp.id || bp.atleta_id || bp.idAtleta) === pIdStr)) {
            ps.bench.push(p);
          }
        });
      } else if (destinoSobras === "newTeam") {
        let maxNum = 0;
        ps.teams.forEach(tm => {
          const m = tm.name.match(/Time\s+(\d+)/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : ps.teams.length + 1;
        const novoTimeNome = `Time ${nextNum}`;
        const novoTimeObj = {
          name: novoTimeNome,
          players: [...sobressalentes]
        };
        ps.teams.push(novoTimeObj);
        if (ps.queue) {
          ps.queue.push(novoTimeNome);
        } else {
          ps.queue = [novoTimeNome];
        }
        if (!ps.teamBases) ps.teamBases = {};
        ps.teamBases[novoTimeNome] = sobressalentes.map(p => p.id || p.atleta_id || p.idAtleta);
      }
    }

    ps.queue = ps.queue.filter(qName => ps.teams.some(t => t.name === qName));

    if (ps.currentMatch) {
      ps.currentMatch.teamAEmprestados = [];
      ps.currentMatch.teamBEmprestados = [];
      const teamAObj = ps.teams.find(tm => tm.name === ps.currentMatch.teamA);
      const teamBObj = ps.teams.find(tm => tm.name === ps.currentMatch.teamB);
      ps.currentMatch.goleiroA = teamAObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";
      ps.currentMatch.goleiroB = teamBObj?.players?.find(p => p.goleiro || p.isGoalkeeper)?.id || "";
    }

    setDrawnTeams(ps.teams);
    setBenchState(ps.bench);
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps, drawnTeams: ps.teams, initialBench: ps.bench });
    setSobrasModalData(null);
    alert("Jogadores restaurados com sucesso para as equipes e banco originais!");
  };

  const[scoreA,setScoreA]=useState("");const[scoreB,setScoreB]=useState("");
  const[empateVencedorManual,setEmpateVencedorManual]=useState("");
  const[proxTimeA,setProxTimeA]=useState("");
  const[proxTimeB,setProxTimeB]=useState("");
 
  const[modoSorteio,setModoSorteio]=useState("auto");
  const[showSorteioConfig,setShowSorteioConfig]=useState(false);
  const[selDataSorteio,setSelDataSorteio]=useState(() => {
    const sorted = [...datas].sort((a, b) => (b.data || b.dateStr || "").localeCompare(a.data || a.dateStr || ""));
    return sorted[0]?.id || "";
  });

  const prevDatasLengthRef = useRef(datas.length);
  useEffect(() => {
    if (datas.length > prevDatasLengthRef.current) {
      const sorted = [...datas].sort((a, b) => (b.data || b.dateStr || "").localeCompare(a.data || a.dateStr || ""));
      const novaDataObj = sorted[0];
      if (novaDataObj && novaDataObj.data) {
        const parts = novaDataObj.data.split("-");
        const ano = parts[0];
        const mes = parts[1];
        if (ano) setFiltroAno(ano);
        if (mes) setFiltroMes(mes);
        setSelDataSorteio(novaDataObj.id);
      }
    }
    prevDatasLengthRef.current = datas.length;
  }, [datas]);

  const [isEditingMinAtletas, setIsEditingMinAtletas] = useState(false);
  const [showConfigRodada, setShowConfigRodada] = useState(false);
  const [qrCodeModalUrl, setQrCodeModalUrl] = useState(null);

  const limiteVitorias = peladaState ? (parseInt(peladaState.limiteVitorias) || 0) : 0;
  const vitoriasA = (peladaState && peladaState.currentMatch) ? getVitoriasSeguidas(peladaState.matchLog, peladaState.currentMatch.teamA, selDataSorteio) : 0;
  const vitoriasB = (peladaState && peladaState.currentMatch) ? getVitoriasSeguidas(peladaState.matchLog, peladaState.currentMatch.teamB, selDataSorteio) : 0;
  const prestesSairA = limiteVitorias > 0 && vitoriasA >= (limiteVitorias - 1) && vitoriasA > 0;
  const prestesSairB = limiteVitorias > 0 && vitoriasB >= (limiteVitorias - 1) && vitoriasB > 0;
  const[manualAssignments,setManualAssignments]=useState({});
  const[assignModal,setAssignModal]=useState(null);
  const[subModal,setSubModal]=useState(null);
  const [sobrasModalData, setSobrasModalData] = useState(null);
  const[repSortBy,setRepSortBy]=useState("pts");
  const[sumulaGols,setSumulaGols]=useState({});
  const[sumulaAssists,setSumulaAssists]=useState({});
  const [modalGol, setModalGol] = useState(null);
  const [modalGerenciarTime, setModalGerenciarTime] = useState(null); // 'A' ou 'B'

  function trocarTimeAtleta(playerId, fromTeamName) {
    let ps = peladaState ? deepClone(peladaState) : null;
    if (!ps) return;
    
    const toTeamName = fromTeamName === ps.currentMatch.teamA ? ps.currentMatch.teamB : ps.currentMatch.teamA;
    
    const fromTeam = ps.teams.find(t => t.name === fromTeamName);
    const toTeam = ps.teams.find(t => t.name === toTeamName);
    
    if (fromTeam && toTeam) {
      const playerObj = fromTeam.players.find(p => String(p.id || p.atleta_id || p.idAtleta) === String(playerId));
      if (playerObj) {
        // Remove do time de origem
        fromTeam.players = fromTeam.players.filter(p => String(p.id || p.atleta_id || p.idAtleta) !== String(playerId));
        // Adiciona no time de destino
        toTeam.players = [...toTeam.players, playerObj];
        
        // Sincroniza também no currentMatch se estiver lá
        if (modalGerenciarTime === 'A') {
          // Atualiza goleiroA se for ele
          if (String(ps.currentMatch.goleiroA) === String(playerId)) {
            ps.currentMatch.goleiroA = "";
          }
        } else {
          // Atualiza goleiroB se for ele
          if (String(ps.currentMatch.goleiroB) === String(playerId)) {
            ps.currentMatch.goleiroB = "";
          }
        }

        setPeladaStateLocal(ps);
        saveDateState({ peladaState: ps });
        // Recarregar os times formados na tela principal
        setDrawnTeams(ps.teams);
        
        // Fechar modal de gerência
        setModalGerenciarTime(null);
      }
    }
  }

  const [autorGolId, setAutorGolId] = useState("");
  const [autorAssistenciaId, setAutorAssistenciaId] = useState("");

  function getJogadoresEmCampo(teamNameOrLetter) {
    const match = peladaState?.currentMatch;
    if (!match) return [];
    let teamName = teamNameOrLetter;
    if (teamNameOrLetter === 'A') teamName = match.teamA;
    else if (teamNameOrLetter === 'B') teamName = match.teamB;
    const players = peladaState.teams?.find(tm => tm.name === teamName)?.players || [];
    const atrasadosIds = (match.jogadoresAtrasados || []).map(String);
    return players.filter(p => !atrasadosIds.includes(String(p.id || p.atleta_id || p.idAtleta)));
  }

  function confirmarGolAssist() {
    if (!autorGolId) return;
    const currentGols = parseInt(sumulaGols[autorGolId]) || 0;
    const newGols = { ...sumulaGols, [autorGolId]: currentGols + 1 };
    setSumulaGols(newGols);

    if (autorAssistenciaId) {
      const currentAssists = parseInt(sumulaAssists[autorAssistenciaId]) || 0;
      const newAssists = { ...sumulaAssists, [autorAssistenciaId]: currentAssists + 1 };
      setSumulaAssists(newAssists);
    }

    if (modalGol === 'A') {
      const newScore = (parseInt(scoreA) || 0) + 1;
      setScoreA(String(newScore));
      updateScoreAndPersist(String(newScore), 'A');
    } else {
      const newScore = (parseInt(scoreB) || 0) + 1;
      setScoreB(String(newScore));
      updateScoreAndPersist(String(newScore), 'B');
    }

    const ps = {
      ...peladaState,
      currentMatch: {
        ...peladaState.currentMatch,
        sumula: newGols,
        assistencias: autorAssistenciaId 
          ? { ...(peladaState.currentMatch.assistencias || {}), [autorAssistenciaId]: (parseInt(peladaState.currentMatch.assistencias?.[autorAssistenciaId]) || 0) + 1 }
          : (peladaState.currentMatch.assistencias || {})
      }
    };
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });

    setModalGol(null);
    setAutorGolId("");
    setAutorAssistenciaId("");
  }

  const[editMatchId,setEditMatchId]=useState(null);
  const[editScoreA,setEditScoreA]=useState("");
  const[editScoreB,setEditScoreB]=useState("");
  const[editSumula,setEditSumula]=useState({});
  const[editGoleiroA,setEditGoleiroA]=useState("");
  const[editGoleiroB,setEditGoleiroB]=useState("");
  const[editGoleiroAInteiro,setEditGoleiroAInteiro]=useState(true);
  const[editGoleiroBInteiro,setEditGoleiroBInteiro]=useState(true);
  const[editPlayersA,setEditPlayersA]=useState([]);
  const[editPlayersB,setEditPlayersB]=useState([]);
 
  // Estado para modal de "Sair do Jogo"
  const[sairModal,setSairModal]=useState(null); // {playerId, playerName, teamName}
  const[sairMotivo,setSairMotivo]=useState("cansaco"); // cansaco | lesao | outro
  const[sairSubstitutoId,setSairSubstitutoId]=useState("");
  const[sairComConvidado,setSairComConvidado]=useState(false);
  const[substituirPorConvidado,setSubstituirPorConvidado]=useState(false);
  const[jogadoresPausados,setJogadoresPausados]=useState([]); // descansando — podem retornar
  const[timerResetKey,setTimerResetKey]=useState(0); // incrementar para forçar reset do cronômetro
  const timerSecondsRef = useRef(0); // guarda o tempo restante atual do timer para salvar no histórico
 
  const updateScoreAndPersist = (val, team) => {
    if (!peladaState || !peladaState.currentMatch) return;
    const cleanVal = val === "" ? "" : String(Math.max(0, parseInt(val) || 0));
    
    if (team === 'A') {
      setScoreA(cleanVal);
    } else {
      setScoreB(cleanVal);
    }
    
    const ps = {
      ...peladaState,
      currentMatch: {
        ...peladaState.currentMatch,
        scoreA: team === 'A' ? cleanVal : scoreA,
        scoreB: team === 'B' ? cleanVal : scoreB
      }
    };
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  };

  const updateSumulaAndScore = (playerId, val, teamType) => {
    if (!peladaState || !peladaState.currentMatch) return;
    const cleanVal = val.replace(/\D/g,"");
    const numVal = parseInt(cleanVal) || 0;
    const oldVal = parseInt(sumulaGols[playerId]) || 0;
    const diff = numVal - oldVal;
    
    const newSumula = {...sumulaGols, [playerId]: cleanVal};
    setSumulaGols(newSumula);
    
    let newScoreA = scoreA;
    let newScoreB = scoreB;
    
    if (teamType === 'A') {
      const current = parseInt(scoreA) || 0;
      newScoreA = String(Math.max(0, current + diff));
      setScoreA(newScoreA);
    } else {
      const current = parseInt(scoreB) || 0;
      newScoreB = String(Math.max(0, current + diff));
      setScoreB(newScoreB);
    }
    
    const ps = {
      ...peladaState,
      currentMatch: {
        ...peladaState.currentMatch,
        sumula: newSumula,
        scoreA: newScoreA,
        scoreB: newScoreB
      }
    };
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  };
 
  const updateEditSumulaAndScore = (playerId, val, teamType) => {
    const numVal = parseInt(val) || 0;
    const oldVal = parseInt(editSumula[playerId]) || 0;
    const diff = numVal - oldVal;
    setEditSumula(prev => ({...prev, [playerId]: numVal}));
    if (teamType === 'A') {
      setEditScoreA(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    } else {
      setEditScoreB(prev => {
        const current = parseInt(prev) || 0;
        return String(Math.max(0, current + diff));
      });
    }
  };
 


  useEffect(() => {
    if (peladaState && peladaState.currentMatch) {
      const match = peladaState.currentMatch;
      setScoreA(match.scoreA !== undefined && match.scoreA !== null && match.scoreA !== "" ? String(match.scoreA) : "0");
      setScoreB(match.scoreB !== undefined && match.scoreB !== null && match.scoreB !== "" ? String(match.scoreB) : "0");
      setSumulaGols(match.sumula || {});
      setSumulaAssists(match.assistencias || {});
    } else {
      setScoreA("0");
      setScoreB("0");
      setSumulaGols({});
      setSumulaAssists({});
      setSumulaAssists({});
    }
  }, [peladaState?.currentMatch?.id, selDataSorteio]);
  
  // Filtros de Ano, Mês e Dia
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
 
  const NOMES_MESES = {
    "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
    "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
    "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
  };
 
  const datasComAnoMes = React.useMemo(() => {
    return datas.map(d => {
      if (!d.data) return { ...d, ano: "", mes: "" };
      const parts = d.data.split("-");
      const ano = parts[0] || "";
      const mes = parts[1] || "";
      return { ...d, ano, mes };
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [datas]);
 
  const anosDisponiveis = React.useMemo(() => {
    const anosSet = new Set(datasComAnoMes.map(d => d.ano).filter(Boolean));
    return Array.from(anosSet).sort((a, b) => b.localeCompare(a));
  }, [datasComAnoMes]);
 
  useEffect(() => {
    if (anosDisponiveis.length > 0) {
      if (!filtroAno || !anosDisponiveis.includes(filtroAno)) {
        setFiltroAno(anosDisponiveis[0]);
      }
    } else {
      setFiltroAno("");
    }
  }, [anosDisponiveis, filtroAno]);
 
  const mesesDisponiveis = React.useMemo(() => {
    if (!filtroAno) return [];
    const mesesSet = new Set(datasComAnoMes.filter(d => d.ano === filtroAno).map(d => d.mes).filter(Boolean));
    return Array.from(mesesSet).sort((a, b) => b.localeCompare(a));
  }, [datasComAnoMes, filtroAno]);
 
  useEffect(() => {
    if (mesesDisponiveis.length > 0) {
      if (!filtroMes || !mesesDisponiveis.includes(filtroMes)) {
        setFiltroMes(mesesDisponiveis[0]);
      }
    } else {
      setFiltroMes("");
    }
  }, [mesesDisponiveis, filtroMes]);
 
  const diasDisponiveis = React.useMemo(() => {
    if (!filtroAno || !filtroMes) return [];
    return datasComAnoMes.filter(d => d.ano === filtroAno && d.mes === filtroMes);
  }, [datasComAnoMes, filtroAno, filtroMes]);
 
  useEffect(() => {
    if (selDataSorteio === "todas") return;
    if (diasDisponiveis.length > 0) {
      const match = diasDisponiveis.find(d => String(d.id) === String(selDataSorteio));
      if (!match) {
        setSelDataSorteio(diasDisponiveis[0].id);
      }
    } else if (datas.length > 0 && !selDataSorteio) {
      setSelDataSorteio(datas[0].id);
    }
  }, [diasDisponiveis, selDataSorteio, datas]);
 
  const lastLoadedDateIdRef = useRef(null);
 
  const getInitialPeladaStateForDate = (d) => {
    let ps = null;
    if (d.peladaState) {
      ps = d.peladaState;
    } else if (d.confrontos && d.confrontos.length > 0) {
      const teams = d.drawnTeams || d.formacoes || [];
      const bench = d.initialBench || [];
      ps = {
        teams,
        queue: teams.map(t => t.name),
        bench,
        matchLog: d.confrontos,
        currentMatch: null
      };
    } else {
      ps = pelada.peladaState || null;
    }

    if (ps) {
      ps = higienizarJogadoresDuplicados(ps);
      ps = higienizarFilaTimes(ps);
    }
    return ps;
  };
 
  const saveDateState = (updates) => {
    if (!selDataSorteio) return;
    let finalUpdates = { ...updates };
    const dt = finalUpdates.drawnTeams !== undefined ? finalUpdates.drawnTeams : drawnTeams;
    let ps = finalUpdates.peladaState !== undefined ? finalUpdates.peladaState : peladaState;
    if (dt && ps) {
      const teamBases = {};
      dt.forEach(t => {
        teamBases[t.name] = t.players
          .filter(p => !p.isTemporary && !p.isEmprestado)
          .map(p => p.id || p.atleta_id || p.idAtleta);
      });
      if (finalUpdates.drawnTeams !== undefined) {
        ps.teams = dt.map(t => {
          return { ...t, players: [...t.players] };
        });
      }
      ps = { ...ps, teamBases };
      ps = higienizarJogadoresDuplicados(ps);
      ps = higienizarFilaTimes(ps);
      finalUpdates.peladaState = ps;
      
      setPeladaStateLocalReal(ps);
      if (finalUpdates.drawnTeams !== undefined) {
        finalUpdates.drawnTeams = ps.teams;
        setDrawnTeams(ps.teams);
      } else if (drawnTeams) {
        setDrawnTeams(ps.teams);
      }
    }
    onUpdateData(selDataSorteio, finalUpdates);
  };
 
  useEffect(() => {
    if (!selDataSorteio) return;
    if (lastLoadedDateIdRef.current === selDataSorteio) return;
    const d = datas.find(x => String(x.id) === String(selDataSorteio));
    if (d) {
      setDrawnTeams(d.drawnTeams !== undefined ? d.drawnTeams : (pelada.drawnTeams || null));
      setPeladaStateLocalReal(getInitialPeladaStateForDate(d));
      setBenchState(d.initialBench !== undefined ? d.initialBench : (pelada.initialBench || []));
      setJogadoresPausados(d.jogadoresPausados !== undefined ? d.jogadoresPausados : []);
      const loadedPpt = d.playersPerTeam !== undefined ? d.playersPerTeam : (pelada.playersPerTeam || 4);
      const loadedNumTeams = d.numTeams !== undefined ? d.numTeams : 2;
      setPpt(loadedPpt);
      setPptInput(String(loadedPpt));
      setNumTeams(loadedNumTeams);
      setNumTeamsInput(String(loadedNumTeams));
      setManualAssignments(d.manualAssignments !== undefined ? d.manualAssignments : {});
      setHistoricoEstados([]);
      lastLoadedDateIdRef.current = selDataSorteio;
    } else {
      setDrawnTeams(null);
      setPeladaStateLocalReal(null);
      setBenchState([]);
      setJogadoresPausados([]);
      setPpt(7);
      setPptInput("7");
      setNumTeams(2);
      setNumTeamsInput("2");
      setManualAssignments({});
      setHistoricoEstados([]);
      lastLoadedDateIdRef.current = null;
    }
  }, [selDataSorteio, datas]);

  useEffect(() => {
    if (peladaState && peladaState.queue && peladaState.queue.length >= 2) {
      const q = peladaState.queue;
      if (!proxTimeA || !q.includes(proxTimeA)) {
        setProxTimeA(q[0]);
      }
      if (!proxTimeB || !q.includes(proxTimeB) || proxTimeB === proxTimeA) {
        const nextDiff = q.find(name => name !== (proxTimeA || q[0]));
        setProxTimeB(nextDiff || q[1]);
      }
    }
  }, [peladaState, proxTimeA, proxTimeB]);

  function iniciarPartidaManual() {
    if (!peladaState || !proxTimeA || !proxTimeB) return;
    if (proxTimeA === proxTimeB) {
      alert("Selecione dois times diferentes para jogar!");
      return;
    }
    const currentQueue = peladaState.queue || [];
    const rest = currentQueue.filter(t => t !== proxTimeA && t !== proxTimeB);
    const newQueue = [proxTimeA, proxTimeB, ...rest];
    
    const ps = startNextMatch({ ...peladaState, queue: newQueue }, selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  }

  const[addBenchId,setAddBenchId]=useState("");

  const vinculados = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + pelada.id));
  const vinculadosIds = vinculados.map(a => a.id);

  const presentesIds = parts.filter(p=>String(p.data_realizacao_id)===String(selDataSorteio)&&p.compareceu).map(p=>p.atleta_id);
  const presentes = vinculados.filter(a=>presentesIds.includes(a.id));

  function handleCriarNovaEquipe() {
    if (!drawnTeams) return;
    const nextNum = drawnTeams.length + 1;
    const newTeamName = `Time ${nextNum}`;
    
    const newDrawnTeams = [
      ...drawnTeams, 
      { name: newTeamName, players: [] }
    ];
    
    let newPs = peladaState ? { ...peladaState } : {
      teams: drawnTeams.map(t => ({ name: t.name, players: [...t.players] })),
      queue: drawnTeams.map(t => t.name),
      bench: currentBench,
      matchLog: [],
      currentMatch: null
    };
    
    newPs.teams = [
      ...newPs.teams,
      { name: newTeamName, players: [] }
    ];
    
    if (!newPs.queue.includes(newTeamName)) {
      newPs.queue = [
        ...newPs.queue,
        newTeamName
      ];
    }
    
    if (!newPs.currentMatch && newPs.queue.length >= 2) {
      newPs.currentMatch = {
        dataRealizacaoId: selDataSorteio,
        teamA: newPs.queue[0],
        teamB: newPs.queue[1],
        scoreA: "",
        scoreB: "",
        played: false,
        sumula: {}
      };
    }
    
    if (!newPs.teamBases) newPs.teamBases = {};
    newPs.teamBases[newTeamName] = [];
    newPs = sincronizarBasesDosTimes(newPs);
    
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(newPs);
    saveDateState({
      drawnTeams: newDrawnTeams,
      peladaState: newPs
    });
  }

  const inverterTimesAtivos = () => {
    if (!peladaState || !peladaState.queue || peladaState.queue.length < 2) return;
    const novaQueue = [...peladaState.queue];
    const temp = novaQueue[0];
    novaQueue[0] = novaQueue[1];
    novaQueue[1] = temp;
    
    const ps = { ...peladaState, queue: novaQueue };
    const psAtualizado = startNextMatch(ps, selDataSorteio, ppt);
    salvarPeladaStateComHistorico(psAtualizado);
  };

  const desfazerEmprestimoAtleta = (playerId, teamName) => {
    if (!peladaState || !peladaState.currentMatch) return;
    const ps = deepClone(peladaState);
    const match = ps.currentMatch;
    
    const teamObj = ps.teams.find(t => t.name === teamName);
    if (teamObj) {
      teamObj.players = teamObj.players.filter(p => String(p.id || p.atleta_id || p.idAtleta) !== String(playerId));
    }
    
    if (match.teamA === teamName) {
      match.teamAEmprestados = (match.teamAEmprestados || []).filter(id => String(id) !== String(playerId));
    } else if (match.teamB === teamName) {
      match.teamBEmprestados = (match.teamBEmprestados || []).filter(id => String(id) !== String(playerId));
    }
    
    setPeladaStateLocal(ps);
    saveDateState({ peladaState: ps });
  };
  
  const moverTimeFila = (realIdx, direcao) => {
    if (!peladaState || !peladaState.queue) return;
    const targetIdx = realIdx + direcao;
    if (targetIdx < 2 || targetIdx >= peladaState.queue.length) return;
    const novaFila = [...peladaState.queue];
    const temp = novaFila[realIdx];
    novaFila[realIdx] = novaFila[targetIdx];
    novaFila[targetIdx] = temp;
    
    const ps = { ...peladaState, queue: novaFila };
    salvarPeladaStateComHistorico(ps);
  };

  const embaralharFilaEspera = () => {
    if (!peladaState || !peladaState.queue || peladaState.queue.length <= 3) return;
    if (!confirm("Tem certeza que deseja embaralhar a Fila de Espera?")) return;
    
    const timesAtivos = peladaState.queue.slice(0, 2);
    const timesFila = peladaState.queue.slice(2);
    
    for (let i = timesFila.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = timesFila[i];
      timesFila[i] = timesFila[j];
      timesFila[j] = temp;
    }
    
    const ps = { ...peladaState, queue: [...timesAtivos, ...timesFila] };
    salvarPeladaStateComHistorico(ps);
  };

  function renomearEquipe(oldName, newName) {
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) return;
    if (trimmedNewName === oldName) return;
    
    const jaExiste = drawnTeams.some(t => t.name.toLowerCase() === trimmedNewName.toLowerCase());
    if (jaExiste) {
      alert(`Já existe um time com o nome "${trimmedNewName}". Escolha outro nome.`);
      return;
    }
    
    const newDrawnTeams = drawnTeams.map(t => 
      t.name === oldName ? { ...t, name: trimmedNewName } : t
    );
    
    let newPs = peladaState ? { ...peladaState } : null;
    if (newPs) {
      newPs.teams = newPs.teams.map(t => 
        t.name === oldName ? { ...t, name: trimmedNewName } : t
      );
      
      newPs.queue = newPs.queue.map(name => 
        name === oldName ? trimmedNewName : name
      );
      
      if (newPs.currentMatch) {
        if (newPs.currentMatch.teamA === oldName) newPs.currentMatch.teamA = trimmedNewName;
        if (newPs.currentMatch.teamB === oldName) newPs.currentMatch.teamB = trimmedNewName;
      }
      
      if (newPs.matchLog) {
        newPs.matchLog = newPs.matchLog.map(m => {
          let updated = { ...m };
          if (updated.teamA === oldName) updated.teamA = trimmedNewName;
          if (updated.teamB === oldName) updated.teamB = trimmedNewName;
          if (updated.winner === oldName) updated.winner = trimmedNewName;
          if (updated.loser === oldName) updated.loser = trimmedNewName;
          return updated;
        });
      }
    }
    
    if (!newPs.teamBases) newPs.teamBases = {};
    newPs.teamBases[newTeamName] = [];
    newPs = sincronizarBasesDosTimes(newPs);
    
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(newPs);
    saveDateState({
      drawnTeams: newDrawnTeams,
      peladaState: newPs
    });
  }

  function excluirEquipe(teamName) {
    let ps = peladaState ? deepClone(peladaState) : null;
    


    if (ps && ps.currentMatch && !ps.currentMatch.played) {
      if (ps.currentMatch.teamA === teamName || ps.currentMatch.teamB === teamName) {
        alert("Não é possível excluir um time que está jogando a partida atual. Finalize ou cancele a partida antes de excluir.");
        return;
      }
    }

    if (!confirm(`Tem certeza que deseja excluir o time "${teamName}"? Os jogadores voltarão para o banco de reservas.`)) {
      return;
    }

    let newBench = [...benchState];
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];

    const teamObj = newDrawnTeams.find(t => t.name === teamName);
    let playersToMove = [];
    if (teamObj) {
      playersToMove = teamObj.players || [];
    }



    const uniqueBench = [...newBench];
    playersToMove.forEach(p => {
      const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
      if (!uniqueBench.some(b => String(b.id || b.atleta_id || b.idAtleta) === pIdStr)) {
        uniqueBench.push({
          ...p,
          isTemporary: undefined,
          isEmprestado: undefined,
          originalTeamId: undefined
        });
      }
    });

    newDrawnTeams = newDrawnTeams.filter(t => t.name !== teamName);

    if (ps) {
      ps.teams = ps.teams.filter(t => t.name !== teamName);
      ps.queue = ps.queue.filter(name => name !== teamName);
      ps.bench = uniqueBench;
      if (ps.teamBases) {
        delete ps.teamBases[teamName];
      }

      ps = sincronizarBasesDosTimes(ps);
    }

    setBenchState(uniqueBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: newDrawnTeams,
      initialBench: uniqueBench,
      peladaState: ps
    });
  }

  function doDraw(){
    if(!selDataSorteio){alert("Selecione uma data para realizar o sorteio!");return;}
    if(drawnTeams) {
      if(!confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
        return;
      }
    }
    
    // Separa os presentes em sorteáveis (independentes) e revezadores
    const { sorteaveis, revezadores } = separarAtletasSorteio(presentes, numTeams, ppt);
    
    if(sorteaveis.length === 0){alert("Não existem atletas independentes presentes na data para realizar o sorteio!");return;}
    
    const { fullTeams, bench } = drawBalancedTeams(sorteaveis, numTeams, ppt, metodoFormacao);
    
    // Aloca os convidados de revezamento no mesmo time/banco que seus respectivos anfitriões
    revezadores.forEach(rev => {
      const hostId = rev.convidadoDe;
      
      // Procura o anfitrião nos times sorteados
      let alocado = false;
      fullTeams.forEach(t => {
        if (t.players.some(p => p.id === hostId)) {
          t.players.push(rev);
          alocado = true;
        }
      });
      
      // Se não encontrou nos times, coloca no banco logo atrás do anfitrião
      if (!alocado) {
        const hostIndex = bench.findIndex(p => p.id === hostId);
        if (hostIndex > -1) {
          bench.splice(hostIndex + 1, 0, rev);
        } else {
          // Fallback se o anfitrião por algum motivo não está sorteado
          bench.push(rev);
        }
      }
    });

    setDrawnTeams(fullTeams);setBenchState(bench);
    const oldLog = peladaState?.matchLog || [];
    const cleanLog = oldLog.filter(m => String(m.dataRealizacaoId) !== String(selDataSorteio));
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench,cleanLog,peladaState), selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: fullTeams,
      initialBench: bench,
      peladaState: ps,
      playersPerTeam: ppt,
      numTeams,
      metodoFormacao
    });
  }

  function confirmManualFormation() {
    if(!selDataSorteio){alert("Selecione uma data!");return;}
    if(drawnTeams) {
      if(!confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
        return;
      }
    }
    
    // Auto-aloca convidados de revezamento que ficaram "Sem Time" na mesma partição do anfitrião
    const updatedAssignments = { ...manualAssignments };
    presentes.filter(p => p.isConvidado && p.convidadoDe).forEach(rev => {
      const assignment = updatedAssignments[rev.id];
      if (!assignment || assignment === "none") {
        const hostAssignment = updatedAssignments[rev.convidadoDe];
        if (hostAssignment && hostAssignment !== "none") {
          updatedAssignments[rev.id] = hostAssignment;
        }
      }
    });

    const unassignedCount = presentes.filter(p => !updatedAssignments[p.id] || updatedAssignments[p.id]==="none").length;
    if(unassignedCount > 0 && !confirm(`Existem ${unassignedCount} atletas sem time. Deseja iniciar assim mesmo? (Eles não entrarão no jogo)`)) return;
    
    const fullTeams = [];
    for(let i=1; i<=numTeams; i++) {
       const pIds = Object.keys(updatedAssignments).filter(id => updatedAssignments[id] === `t${i}`);
       const teamPlayersCorrect = presentes.filter(p => pIds.includes(String(p.id)));
       if (teamPlayersCorrect.length > 0) fullTeams.push({name: "Time "+i, players: teamPlayersCorrect});
    }
    const benchIds = Object.keys(updatedAssignments).filter(id => updatedAssignments[id] === "bench");
    const bench = presentes.filter(p => benchIds.includes(String(p.id)));

    if(fullTeams.length < 2) { alert("Você precisa formar pelo menos 2 times!"); return; }

    setDrawnTeams(fullTeams);setBenchState(bench);
    const oldLog = peladaState?.matchLog || [];
    const cleanLog = oldLog.filter(m => String(m.dataRealizacaoId) !== String(selDataSorteio));
    const ps=startNextMatch(buildInitialPeladaState(fullTeams,bench,cleanLog,peladaState), selDataSorteio, ppt);
    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: fullTeams,
      initialBench: bench,
      peladaState: ps,
      playersPerTeam: ppt,
      numTeams,
      manualAssignments: updatedAssignments
    });
    currentSetAba("jogos");
  }

  function toggleManualAssignment(playerId, target) {
    const updatedAssignments = {...manualAssignments, [playerId]: target};
    setManualAssignments(updatedAssignments);
    saveDateState({ manualAssignments: updatedAssignments });
    setAssignModal(null);
  }

  function randomFillManual() {
    if(presentes.length === 0) return;
    const shuffled=cryptoShuffle(presentes);
    const newAssig = {};
    const nt=Math.min(numTeams,Math.floor(presentes.length/ppt)||numTeams);
    shuffled.forEach((a,idx) => {
       const ti = idx % nt;
       if (Math.floor(idx / nt) < ppt) {
          newAssig[a.id] = `t${ti+1}`;
       } else {
          newAssig[a.id] = "bench";
       }
    });
    setManualAssignments(newAssig);
    saveDateState({ manualAssignments: newAssig });
  }

  function addToBench(){
    if(!addBenchId)return;
    const a=atletas.find(x=>String(x.id)===String(addBenchId));if(!a)return;
    const newPlayer={nome:a.nome,name:a.nome,habilidade:a.habilidade,skill:a.habilidade,goleiro:a.goleiro,isGoalkeeper:a.goleiro,id:a.id};
    const newBench=[...benchState,newPlayer];
    setBenchState(newBench);
    let ps=peladaState;
    if(ps){ps={...ps,bench:[...ps.bench,newPlayer]};setPeladaStateLocal(ps);}
    saveDateState({initialBench:newBench,peladaState:ps});
    const pExistente = parts.find(p=>String(p.atleta_id)===String(a.id) && String(p.data_realizacao_id)===String(selDataSorteio));
    if(pExistente){
      if(!pExistente.compareceu) onUpdatePart(pExistente.id, {compareceu:true});
    }else{
      const dataObj = datas.find(d=>String(d.id)===String(selDataSorteio));
      onAddPart({atleta_id:a.id, pelada_id:pelada.id, data_realizacao_id:selDataSorteio, pagou:false, compareceu:true, valor:dataObj?.valor||pelada.valor_contribuicao||a.valor_padrao||0});
    }
    setAddBenchId("");
  }

  function adicionarAtrasadoDiretoAoTime(athleteId, teamName) {
    if (!athleteId || !teamName) return;
    const a = atletas.find(x => String(x.id) === String(athleteId));
    if (!a) return;
    
    const newPlayer = {
      nome: a.nome,
      name: a.nome,
      habilidade: a.habilidade,
      skill: a.habilidade,
      goleiro: a.goleiro,
      isGoalkeeper: a.goleiro,
      id: a.id
    };
    
    let ps = peladaState ? deepClone(peladaState) : null;
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];
    
    if (ps) {
      if (!ps.teamBases) ps.teamBases = {};
      if (!ps.teamBases[teamName]) ps.teamBases[teamName] = [];
      
      const pIdStr = String(a.id);
      
      // Adiciona na base do time
      if (!ps.teamBases[teamName].includes(pIdStr)) {
        ps.teamBases[teamName].push(pIdStr);
      }
      
      // Se o time de destino está jogando a partida ativa, marcar como atrasado
      if (ps.currentMatch && !ps.currentMatch.played) {
        if (ps.currentMatch.teamA === teamName || ps.currentMatch.teamB === teamName) {
          if (!ps.currentMatch.jogadoresAtrasados) {
            ps.currentMatch.jogadoresAtrasados = [];
          }
          if (!ps.currentMatch.jogadoresAtrasados.includes(pIdStr)) {
            ps.currentMatch.jogadoresAtrasados.push(pIdStr);
          }
        }
      }
      
      // Adiciona ao time correspondente no ps.teams
      const targetTeam = ps.teams.find(t => t.name === teamName);
      if (targetTeam) {
        if (!targetTeam.players.some(p => String(p.id) === pIdStr)) {
          targetTeam.players.push(newPlayer);
        }
      } else {
        ps.teams.push({ name: teamName, players: [newPlayer] });
      }
      
      ps = sincronizarBasesDosTimes(ps);
      newDrawnTeams = ps.teams;
    }
    
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({ drawnTeams: newDrawnTeams, peladaState: ps });
    
    // Registra presença no Firebase
    const pExistente = parts.find(p => String(p.atleta_id) === String(a.id) && String(p.data_realizacao_id) === String(selDataSorteio));
    if (pExistente) {
      if (!pExistente.compareceu) onUpdatePart(pExistente.id, { compareceu: true });
    } else {
      const dataObj = datas.find(d => String(d.id) === String(selDataSorteio));
      onAddPart({
        atleta_id: a.id,
        pelada_id: pelada.id,
        data_realizacao_id: selDataSorteio,
        pagou: false,
        compareceu: true,
        valor: dataObj?.valor || pelada.valor_contribuicao || a.valor_padrao || 0
      });
    }
  }

  function removeFromRotation(playerId){
    let ps=peladaState?deepClone(peladaState):null;
    let teamName = "";
    if (ps && ps.teamBases) {
      for (const tName of Object.keys(ps.teamBases)) {
        const ids = ps.teamBases[tName] || [];
        if (ids.some(id => String(id) === String(playerId))) {
          teamName = tName;
          break;
        }
      }
    }


    if(!confirm("Remover este jogador do rodízio atual? (Ele será substituído por alguém do banco, se houver)")) return;
    let newBench=[...benchState];
    let newDrawnTeams=drawnTeams?deepClone(drawnTeams):null;

    // Achar se esse jogador é um anfitrião e se o seu convidado correspondente está ativo
    const atleta = atletas.find(x => String(x.id) === String(playerId));
    const isHost = atleta && !atleta.isConvidado;
    let convidadoPromovido = null;
    
    if (isHost) {
      const guestAtleta = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
      if (guestAtleta) {
        const inTeams = newDrawnTeams?.some(t => t.players.some(p => String(p.id) === String(guestAtleta.id)));
        const inBench = newBench.some(b => String(b.id) === String(guestAtleta.id));
        const inPsTeams = ps?.teams?.some(t => t.players.some(p => String(p.id) === String(guestAtleta.id)));
        const inPsBench = ps?.bench?.some(b => String(b.id) === String(guestAtleta.id));
        
        if (inTeams || inBench || inPsTeams || inPsBench) {
          convidadoPromovido = guestAtleta;
        }
      }
    }

    if (convidadoPromovido && confirm(`O atleta é anfitrião do convidado "${getPlayerName(convidadoPromovido)}". Deseja que este convidado assuma a vaga dele na pelada (como substituto permanente)?`)) {
      onUpdateAtleta(convidadoPromovido.id, { isConvidado: false, convidadoDe: null });
      // Remove o anfitrião, e o convidado permanece no mesmo local como substituto permanente e independente
      const promoteGuest = (p) => {
        if (String(p.id) === String(convidadoPromovido.id)) {
          return { ...p, isConvidado: false, convidadoDe: undefined };
        }
        return p;
      };
      newBench = newBench.filter(b => String(b.id) !== String(playerId)).map(promoteGuest);
      if (newDrawnTeams) {
        newDrawnTeams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(playerId)).map(promoteGuest);
        });
      }
      if (ps) {
        ps.bench = ps.bench.filter(b => String(b.id) !== String(playerId)).map(promoteGuest);
        ps.teams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(playerId)).map(promoteGuest);
        });
      }
      setBenchState(newBench);
      setDrawnTeams(newDrawnTeams);
      setPeladaStateLocal(ps);
      saveDateState({drawnTeams:newDrawnTeams,initialBench:newBench,peladaState:ps});
      return;
    }

    const inBenchIndex=newBench.findIndex(b=>String(b.id)===String(playerId));
    if(inBenchIndex>-1){
      newBench.splice(inBenchIndex,1);
      if(ps)ps.bench=ps.bench.filter(b=>String(b.id)!==String(playerId));
    }else{
      if(newDrawnTeams){
        newDrawnTeams.forEach(t=>{
          const pIdx=t.players.findIndex(p=>String(p.id)===String(playerId));
          if(pIdx>-1){
            t.players.splice(pIdx,1);
            if(newBench.length>0){const promoted=newBench.shift();t.players.push(promoted);}
          }
        });
      }
      if(ps){
        ps.teams.forEach(t=>{
          const pIdx=t.players.findIndex(p=>String(p.id)===String(playerId));
          if(pIdx>-1){
            t.players.splice(pIdx,1);
            if(ps.bench.length>0){const promoted=ps.bench.shift();t.players.push(promoted);}
          }
        });
      }
    }
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({drawnTeams:newDrawnTeams,initialBench:newBench,peladaState:ps});
  }


  function higienizarJogadoresDuplicados(ps) {
    if (!ps || !ps.teams) return ps;
    const idsVistos = new Set();
    
    ps.teams.forEach(t => {
      t.players = t.players.filter(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (idsVistos.has(idStr)) return false;
        idsVistos.add(idStr);
        return true;
      });
    });
    
    if (ps.bench) {
      ps.bench = ps.bench.filter(p => {
        const idStr = String(p.id || p.atleta_id || p.idAtleta);
        if (idsVistos.has(idStr)) return false;
        idsVistos.add(idStr);
        return true;
      });
    }
    
    if (ps.teamBases) {
      const basesVistas = new Set();
      Object.keys(ps.teamBases).forEach(teamName => {
        if (Array.isArray(ps.teamBases[teamName])) {
          ps.teamBases[teamName] = ps.teamBases[teamName].filter(id => {
            const idStr = String(id);
            if (basesVistas.has(idStr)) return false;
            basesVistas.add(idStr);
            return true;
          });
        }
      });
    }
    return ps;
  }




  function movePlayerInRotation(playerId, target) {
    let ps = peladaState ? deepClone(peladaState) : null;
    if (ps) {
      let timeOrigem = "";
      if (ps.teams) {
        ps.teams.forEach(t => {
          if (t.players.some(p => String(p.id || p.atleta_id || p.idAtleta) === String(playerId))) {
            timeOrigem = t.name;
          }
        });
      }
      let timeDestino = "";
      if (target && target.startsWith("t")) {
        const teamIndex = parseInt(target.replace("t", "")) - 1;
        timeDestino = (drawnTeams && drawnTeams[teamIndex]?.name) || `Time ${teamIndex + 1}`;
      }

    }

    let newBench = [...benchState];
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];



    // Achar o parceiro de revezamento (se houver) a partir do estado do dia
    let atletaObj = newBench.find(x => String(x.id) === String(playerId));
    if (!atletaObj) {
      newDrawnTeams.forEach(t => {
        const found = t.players.find(x => String(x.id) === String(playerId));
        if (found) atletaObj = found;
      });
    }
    
    let partnerId = null;
    if (atletaObj) {
      if (atletaObj.isConvidado && atletaObj.convidadoDe) {
        partnerId = atletaObj.convidadoDe;
      } else {
        // Busca se existe algum convidado atrelado a este jogador na partida
        let guest = newBench.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
        if (!guest) {
          newDrawnTeams.forEach(t => {
            const found = t.players.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
            if (found) guest = found;
          });
        }
        if (guest) partnerId = guest.id;
      }
    }

    const idsToMove = [playerId];
    
    // Verifica se o parceiro está no mesmo local de origem
    if (partnerId) {
      const isHostInBench = newBench.some(b => String(b.id) === String(playerId));
      const isPartnerInBench = newBench.some(b => String(b.id) === String(partnerId));
      
      if (isHostInBench && isPartnerInBench) {
        idsToMove.push(partnerId);
      } else {
        newDrawnTeams.forEach(t => {
          const isHostInTeam = t.players.some(p => String(p.id) === String(playerId));
          const isPartnerInTeam = t.players.some(p => String(p.id) === String(partnerId));
          if (isHostInTeam && isPartnerInTeam) {
            idsToMove.push(partnerId);
          }
        });
      }
    }

    let playersObjList = [];

    // Remove do banco todos os IDs a serem movidos
    idsToMove.forEach(id => {
      const idx = newBench.findIndex(b => String(b.id) === String(id));
      if (idx > -1) {
        playersObjList.push(newBench[idx]);
        newBench.splice(idx, 1);
      }
    });

    // Remove dos times todos os IDs a serem movidos
    idsToMove.forEach(id => {
      newDrawnTeams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(id));
        if (idx > -1) {
          playersObjList.push(t.players[idx]);
          t.players.splice(idx, 1);
        }
      });
    });

    if (playersObjList.length === 0) {
      setSubModal(null);
      return;
    }

    // Adiciona ao destino
    if (target === "bench") {
      newBench.push(...playersObjList.map(p => {
        const clean = { ...p };
        delete clean.isEmprestado;
        delete clean.isTemporary;
        delete clean.originalTeamId;
        delete clean.originalTeamName;
        return clean;
      }));
    } else if (target.startsWith("t")) {
      const teamIndex = parseInt(target.replace("t", "")) - 1;
      if (newDrawnTeams[teamIndex]) {
        newDrawnTeams[teamIndex].players.push(...playersObjList);
      }
    }

    // Sincroniza peladaState
    if (ps) {
      idsToMove.forEach(id => {
        ps.bench = ps.bench.filter(b => String(b.id) !== String(id));
        ps.teams.forEach(t => {
          t.players = t.players.filter(p => String(p.id) !== String(id));
        });
      });

      if (target === "bench") {
        ps.bench.push(...playersObjList.map(p => {
          const clean = { ...p };
          delete clean.isEmprestado;
          delete clean.isTemporary;
          delete clean.originalTeamId;
          delete clean.originalTeamName;
          return clean;
        }));
      } else if (target.startsWith("t")) {
        const teamIndex = parseInt(target.replace("t", "")) - 1;
        const teamName = newDrawnTeams[teamIndex]?.name || `Time ${teamIndex + 1}`;
        const targetTeam = ps.teams.find(t => t.name === teamName);
        if (targetTeam) {
          targetTeam.players.push(...playersObjList);
        } else {
          ps.teams.push({ name: teamName, players: playersObjList });
        }

        // Se o time de destino esta jogando a partida ativa, marcar como atrasado
        if (ps.currentMatch && !ps.currentMatch.played) {
          if (ps.currentMatch.teamA === teamName || ps.currentMatch.teamB === teamName) {
            if (!ps.currentMatch.jogadoresAtrasados) {
              ps.currentMatch.jogadoresAtrasados = [];
            }
            playersObjList.forEach(p => {
              const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
              if (!ps.currentMatch.jogadoresAtrasados.includes(pIdStr)) {
                ps.currentMatch.jogadoresAtrasados.push(pIdStr);
              }
            });
          }
        }
      }
      ps = sincronizarBasesDosTimes(ps);
      newDrawnTeams = ps.teams;
    }

    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);

    setPeladaStateLocal(ps);
    saveDateState({ drawnTeams: newDrawnTeams, initialBench: newBench, peladaState: ps });
    setSubModal(null);
  }

  function saveMatchLocal(){
    try {
      const finalScoreA = scoreA === "" ? "0" : scoreA;
      const finalScoreB = scoreB === "" ? "0" : scoreB;
      if (!peladaState || !peladaState.currentMatch) {
        alert("Aviso: Nenhuma partida ativa encontrada para registrar!");
        return;
      }
      
      if (parseInt(finalScoreA) === parseInt(finalScoreB) && peladaState?.regraEmpate === "manual") {
        if (!empateVencedorManual) {
          alert("Por favor, selecione qual time permanece na quadra (empate sob regra manual)!");
          return;
        }
      }

      // Captura quanto tempo de jogo foi utilizado
      const timerKey = `pelada_${pelada.id}`;
      const savedInitial = localStorage.getItem(`${timerKey}_initial`);
      const savedSeconds = localStorage.getItem(`${timerKey}_seconds`);
      const initialSecs = savedInitial ? parseInt(savedInitial) : 600;
      const currentSecs = savedSeconds !== null ? parseInt(savedSeconds) : initialSecs;
      const tempoJogadoSecs = Math.max(0, initialSecs - currentSecs);

      const ps2=resolveMatch({
        ...peladaState,
        currentMatch:{
          ...peladaState.currentMatch,
          scoreA: finalScoreA,
          scoreB: finalScoreB,
          played:true,
          sumula:sumulaGols,
          assistencias:sumulaAssists,
          empateVencedorManual: empateVencedorManual,
          tempoJogadoSecs
        }
      },finalScoreA,finalScoreB,selDataSorteio);
      const ps3=startNextMatch(ps2, selDataSorteio, ppt);
      setBenchState(ps3.bench);
      setDrawnTeams(ps3.teams);
      salvarPeladaStateComHistorico(ps3);
      setScoreA("0");setScoreB("0");
      setSumulaGols({});
      setEmpateVencedorManual("");
      // Reseta o cronômetro para o tempo configurado
      const timerInitial = savedInitial ? parseInt(savedInitial) : 600;
      localStorage.setItem(`${timerKey}_running`, "false");
      localStorage.setItem(`${timerKey}_seconds`, String(timerInitial));
      localStorage.removeItem(`${timerKey}_startTimestamp`);
      setTimerResetKey(k => k + 1);
    } catch (err) {
      console.error("Erro ao registrar jogo:", err);
      alert("Erro ao registrar jogo: " + err.message + "\nStack: " + err.stack);
    }
  }

  function saveEditedMatch() {
    if (editMatchId === null) return;
    let ps = peladaState ? deepClone(peladaState) : null;
    if (ps && ps.matchLog[editMatchId]) {
      const match = ps.matchLog[editMatchId];
      
      const sA = parseInt(editScoreA) || 0;
      const sB = parseInt(editScoreB) || 0;
      
      const winner = sA > sB ? match.teamA : sA < sB ? match.teamB : match.teamA;
      const loser = winner === match.teamA ? match.teamB : match.teamA;

      ps.matchLog[editMatchId] = {
        ...match,
        scoreA: editScoreA,
        scoreB: editScoreB,
        winner,
        loser,
        sumula: editSumula,
        goleiroA: editGoleiroA,
        goleiroB: editGoleiroB,
        goleiroAInteiro: editGoleiroAInteiro,
        goleiroBInteiro: editGoleiroBInteiro,
        playersA: editPlayersA,
        playersB: editPlayersB
      };

      setPeladaStateLocal(ps);
      saveDateState({ peladaState: ps });
    }
    setEditMatchId(null);
  }

  function handleSairJogo() {
    if (!sairModal) return;
    const { playerId, teamName } = sairModal;

    let newBench = deepClone(benchState);
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];
    let newPausados = deepClone(jogadoresPausados);
    let ps = peladaState ? deepClone(peladaState) : null;
    if (!ps) { setSairModal(null); return; }

    // Helper: remove um jogador dos times e do drawn, retorna o objeto dele
    function removerDaPartida(pid) {
      let obj = null;
      ps.teams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(pid));
        if (idx > -1) { [obj] = t.players.splice(idx, 1); }
      });
      // também do banco interno do ps
      if (!obj) {
        const bIdx = ps.bench.findIndex(b => String(b.id) === String(pid));
        if (bIdx > -1) { [obj] = ps.bench.splice(bIdx, 1); }
      }
      newDrawnTeams.forEach(t => {
        const idx = t.players.findIndex(p => String(p.id) === String(pid));
        if (idx > -1) t.players.splice(idx, 1);
      });
      newBench = newBench.filter(b => String(b.id) !== String(pid));
      return obj;
    }

    // Passo 1: Remove o jogador principal
    const playerObj = removerDaPartida(playerId);

    // Passo 2: Remove convidado junto se o anfitriao escolheu levar o convidado
    let convidadoObj = null;
    const convidado = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
    if (sairComConvidado) {
      if (convidado) {
        const emJogo = ps.teams.some(t => t.players.some(p => String(p.id) === String(convidado.id)))
          || ps.bench.some(b => String(b.id) === String(convidado.id))
          || newBench.some(b => String(b.id) === String(convidado.id))
          || newPausados.some(j => String(j.id) === String(convidado.id));
        if (emJogo) convidadoObj = removerDaPartida(convidado.id);
      }
    } else if (convidado && sairMotivo === "lesao") {
      onUpdateAtleta(convidado.id, { isConvidado: false, convidadoDe: null });
      // Se o anfitrião saiu por lesão (permanente) e o convidado ficou, promove o convidado a independente
      const promoteGuest = (p) => {
        if (String(p.id) === String(convidado.id)) {
          return { ...p, isConvidado: false, convidadoDe: undefined };
        }
        return p;
      };
      newBench = newBench.map(promoteGuest);
      newDrawnTeams.forEach(t => {
        t.players = t.players.map(promoteGuest);
      });
      ps.bench = ps.bench.map(promoteGuest);
      ps.teams.forEach(t => {
        t.players = t.players.map(promoteGuest);
      });
    }

    // Passo 3: Aplica substituto do banco (se escolhido) ou pelo convidado (se configurado)
    if (substituirPorConvidado && convidado) {
      // Localiza e remove o convidado do banco ou da lista de pausados
      const inBenchIdx = newBench.findIndex(b => String(b.id) === String(convidado.id));
      let subObj = null;
      if (inBenchIdx > -1) {
        subObj = newBench[inBenchIdx];
        newBench.splice(inBenchIdx, 1);
        ps.bench = ps.bench.filter(b => String(b.id) !== String(convidado.id));
      } else {
        const inPausadosIdx = newPausados.findIndex(j => String(j.id) === String(convidado.id));
        if (inPausadosIdx > -1) {
          subObj = newPausados[inPausadosIdx];
          newPausados.splice(inPausadosIdx, 1);
        }
      }

      // Fallback
      if (!subObj) {
        const aObj = atletas.find(x => String(x.id) === String(convidado.id));
        if (aObj) {
          subObj = { id: aObj.id, nome: aObj.nome, name: aObj.nome, habilidade: aObj.habilidade, skill: aObj.habilidade, goleiro: aObj.goleiro, isGoalkeeper: aObj.goleiro, isConvidado: true, convidadoDe: Number(playerId) };
        }
      }

      if (subObj) {
        const psTeam = ps.teams.find(t => t.name === teamName);
        if (psTeam && !psTeam.players.some(p => String(p.id) === String(convidado.id))) {
          psTeam.players.push(subObj);
        }
        const dtTeam = newDrawnTeams.find(t => t.name === teamName);
        if (dtTeam && !dtTeam.players.some(p => String(p.id) === String(convidado.id))) {
          dtTeam.players.push(subObj);
        }
      }
    } else if (sairSubstitutoId) {
      const subInBench = benchState.find(b => String(b.id) === String(sairSubstitutoId));
      ps.bench = ps.bench.filter(b => String(b.id) !== String(sairSubstitutoId));
      newBench = newBench.filter(b => String(b.id) !== String(sairSubstitutoId));
      if (subInBench) {
        const psTeam = ps.teams.find(t => t.name === teamName);
        if (psTeam) psTeam.players.push(subInBench);
        const dtTeam = newDrawnTeams.find(t => t.name === teamName);
        if (dtTeam) dtTeam.players.push(subInBench);
      }
    }

    // Passo 4: Destino conforme motivo
    const adicionarAoPausados = (obj) => {
      if (obj && !newPausados.some(j => String(j.id) === String(obj.id))) {
        newPausados.push(obj);
      }
      // Garante que não fica no bench do ps
      if (obj) ps.bench = ps.bench.filter(b => String(b.id) !== String(obj.id));
    };
    const removerCompletamente = (obj, pid) => {
      if (obj) ps.bench = ps.bench.filter(b => String(b.id) !== String(pid));
      newBench = newBench.filter(b => String(b.id) !== String(pid));
      newPausados = newPausados.filter(j => String(j.id) !== String(pid));
    };

    if (sairMotivo === "lesao") {
      removerCompletamente(playerObj, playerId);
      if (convidadoObj) removerCompletamente(convidadoObj, convidadoObj.id);
    } else {
      // Cansaço / Outro: vai para 'Descansando' (pode retornar depois)
      adicionarAoPausados(playerObj);
      if (convidadoObj) adicionarAoPausados(convidadoObj);
    }

    setJogadoresPausados(newPausados);
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);
    setPeladaStateLocal(ps);
    saveDateState({ drawnTeams: newDrawnTeams, initialBench: newBench, peladaState: ps, jogadoresPausados: newPausados });
    setSairModal(null);
    setSairSubstitutoId("");
    setSairComConvidado(false);
  }

  function retornarJogador(playerId, retornarComVinculo) {
    const player = jogadoresPausados.find(j => String(j.id) === String(playerId));
    if (!player) return;

    let newPausados = jogadoresPausados.filter(j => String(j.id) !== String(playerId));
    let newBench = [...benchState];
    let ps = peladaState ? deepClone(peladaState) : null;
    let newDrawnTeams = drawnTeams ? deepClone(drawnTeams) : [];

    if (ps && ps.currentMatch) {
      newDrawnTeams = removerEmprestadosTemporarios(newDrawnTeams, ps.currentMatch);
      ps.teams = removerEmprestadosTemporarios(ps.teams, ps.currentMatch);
    }

    if (retornarComVinculo) {
      // Procura o convidado deste anfitrião
      const guest = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(playerId));
      if (guest) {
        // Função auxiliar para reestabelecer o vínculo de revezamento no jogador mapeado
        const updatePlayerVinculo = (p) => {
          if (String(p.id) === String(guest.id)) {
            return { ...p, isConvidado: true, convidadoDe: Number(playerId) };
          }
          if (String(p.id) === String(playerId)) {
            return { ...p, isConvidado: false, convidadoDe: undefined };
          }
          return p;
        };

        const hostPlayerObj = { ...player, isConvidado: false, convidadoDe: undefined };

        // Onde o convidado está atualmente na escalação ativa?
        let inTeamName = null;
        newDrawnTeams.forEach(t => {
          if (t.players.some(p => String(p.id) === String(guest.id))) {
            inTeamName = t.name;
          }
        });

        let inPsTeamName = null;
        if (ps) {
          ps.teams.forEach(t => {
            if (t.players.some(p => String(p.id) === String(guest.id))) {
              inPsTeamName = t.name;
            }
          });
        }

        const isGuestInBench = newBench.some(b => String(b.id) === String(guest.id));
        const isGuestInPsBench = ps?.bench?.some(b => String(b.id) === String(guest.id));
        const isGuestInPausados = newPausados.some(j => String(j.id) === String(guest.id));

        if (inTeamName) {
          // Coloca o anfitrião no mesmo time do convidado
          newDrawnTeams = newDrawnTeams.map(t => {
            if (t.name === inTeamName) {
              return { ...t, players: [...t.players.map(updatePlayerVinculo), hostPlayerObj] };
            }
            return { ...t, players: t.players.map(updatePlayerVinculo) };
          });
          if (ps && inPsTeamName) {
            ps.teams = ps.teams.map(t => {
              if (t.name === inPsTeamName) {
                return { ...t, players: [...t.players.map(updatePlayerVinculo), hostPlayerObj] };
              }
              return { ...t, players: t.players.map(updatePlayerVinculo) };
            });
          }
          // Atualiza as outras abas/banco
          newBench = newBench.map(updatePlayerVinculo);
          if (ps) ps.bench = ps.bench.map(updatePlayerVinculo);
        } else if (isGuestInBench || isGuestInPsBench) {
          // Ambos vão para o banco de reservas
          newBench = newBench.map(updatePlayerVinculo);
          newBench.push(hostPlayerObj);
          if (ps) {
            ps.bench = ps.bench.map(updatePlayerVinculo);
            if (!ps.bench.some(b => String(b.id) === String(playerId))) {
              ps.bench.push(hostPlayerObj);
            }
          }
          newDrawnTeams = newDrawnTeams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          if (ps) {
            ps.teams = ps.teams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          }
        } else if (isGuestInPausados) {
          // O convidado também estava descansando. Remove o convidado de pausados e coloca ambos no banco!
          newPausados = newPausados.filter(j => String(j.id) !== String(guest.id));
          const guestPlayerObj = { ...guest, isConvidado: true, convidadoDe: Number(playerId) };

          newBench.push(hostPlayerObj, guestPlayerObj);
          if (ps) {
            if (!ps.bench.some(b => String(b.id) === String(playerId))) ps.bench.push(hostPlayerObj);
            if (!ps.bench.some(b => String(b.id) === String(guest.id))) ps.bench.push(guestPlayerObj);
          }
          newDrawnTeams = newDrawnTeams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          if (ps) {
            ps.teams = ps.teams.map(t => ({ ...t, players: t.players.map(updatePlayerVinculo) }));
          }
        } else {
          // Fallback: banco
          newBench.push(player);
          if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
            ps.bench.push(player);
          }
        }
      } else {
        // Convidado não cadastrado / não ativo
        newBench.push(player);
        if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
          ps.bench.push(player);
        }
      }
    } else {
      // Retornar sem vínculo
      newBench.push(player);
      if (ps && !ps.bench.some(b => String(b.id) === String(playerId))) {
        ps.bench.push(player);
      }
    }

    if (ps) {
      ps = sincronizarBasesDosTimes(ps);
      newDrawnTeams = ps.teams;
    }

    setJogadoresPausados(newPausados);
    setBenchState(newBench);
    setDrawnTeams(newDrawnTeams);

    setPeladaStateLocal(ps);
    saveDateState({
      drawnTeams: newDrawnTeams,
      initialBench: newBench,
      peladaState: ps,
      jogadoresPausados: newPausados
    });
  }
  function peladaStandings(){
    const stateParaCalcular = String(selDataSorteio) === "todas" ? consolidatedPeladaState : peladaState;
    if(!stateParaCalcular?.teams)return[];
    const st=stateParaCalcular.teams.map(t=>({name:t.name,j:0,v:0,e:0,d:0,gp:0,gc:0,sg:0,pts:0}));
    (stateParaCalcular.matchLog||[]).filter(m => String(selDataSorteio) === "todas" || String(m.dataRealizacaoId) === String(selDataSorteio)).forEach(m=>{
      const h=st.find(x=>x.name===m.teamA),a=st.find(x=>x.name===m.teamB);if(!h||!a)return;
      const hs=parseInt(m.scoreA),as2=parseInt(m.scoreB);
      h.j++;a.j++;h.gp+=hs;h.gc+=as2;a.gp+=as2;a.gc+=hs;h.sg=h.gp-h.gc;a.sg=a.gp-a.gc;
      if(hs>as2){h.v++;h.pts+=3;a.d++;}else if(hs===as2){h.e++;h.pts++;a.e++;a.pts++;}else{a.v++;a.pts+=3;h.d++;}
    });
    return st.sort((a,b)=>b.pts-a.pts||b.sg-a.sg||b.gp-a.gp);
  }
  const colorOfTeam=n=>{const i=(peladaState?.teams||[]).findIndex(x=>x.name===n);return COLORS[i%COLORS.length]||"#888";};
  const maxTeams=20;

  const selectedDateObj = datas.find(d => String(d.id) === String(selDataSorteio));
  const isRealizada = selectedDateObj?.status === "realizado";

  useEffect(() => {
    if (!peladaState || isRealizada) return;
    const ps = { ...peladaState };
    const M = ps.minAtletasNovoTime || 4;
    const bench = ps.bench || [];
    const N = bench.length;
    const isFixo = ps.modoRodizioFixo || false;
    let changed = false;

    if (!isFixo) {
      if (N >= M) {
        let maxNum = 0;
        const teams = ps.teams || [];
        teams.forEach(tm => {
          const m = tm.name.match(/Time\s+(\d+)/i);
          if (m) {
            const num = parseInt(m[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        const nextNum = maxNum > 0 ? maxNum + 1 : teams.length + 1;
        const novoTimeNome = `Time ${nextNum}`;
        const novoTimeObj = {
          name: novoTimeNome,
          players: [...bench]
        };
        
        ps.teams = [...teams, novoTimeObj];
        ps.bench = [];
        if (ps.queue) {
          ps.queue.push(novoTimeNome);
        } else {
          ps.queue = [novoTimeNome];
        }
        if (!ps.teamBases) ps.teamBases = {};
        ps.teamBases[novoTimeNome] = bench.map(p => p.id || p.atleta_id || p.idAtleta);
        
        ps.modoRodizio = "misto";
        changed = true;
        
        alert(`O banco atingiu ${N} atletas (mínimo de ${M}). Um novo time (${novoTimeNome}) foi criado automaticamente e o modo de rodízio foi definido como Automático.`);
      }
    }

    if (changed) {
      setDrawnTeams(ps.teams);
      setPeladaStateLocal(ps);
      saveDateState({ peladaState: ps, drawnTeams: ps.teams });
    }
  }, [peladaState?.bench?.length, peladaState?.minAtletasNovoTime, peladaState?.modoRodizioFixo, isRealizada]);

  const consolidatedPeladaState = React.useMemo(() => {
    const allMatches = [];
    const allTeamsMap = new Map();
    datas.forEach(d => {
      const isCurrentActiveDate = String(d.id) === String(selDataSorteio);
      const activeState = isCurrentActiveDate ? peladaState : (d.peladaState || null);

      const matchLog = activeState?.matchLog || d.confrontos || [];
      if (Array.isArray(matchLog)) {
        matchLog.forEach((m, idx) => {
          const mappedMatch = {
            ...m,
            id: m.id || `${d.id}_match_${idx}`,
            dataRealizacaoId: m.dataRealizacaoId || d.id
          };
          if (!allMatches.some(am => am.id === mappedMatch.id)) {
            allMatches.push(mappedMatch);
          }
        });
      }
      const teams = activeState?.teams || d.drawnTeams || d.formacoes || [];
      if (Array.isArray(teams)) {
        teams.forEach(tm => {
          allTeamsMap.set(tm.name, tm);
        });
      }
    });
    if (pelada.peladaState) {
      if (Array.isArray(pelada.peladaState.matchLog)) {
        pelada.peladaState.matchLog.forEach((m, idx) => {
          const mappedMatch = {
            ...m,
            id: m.id || `${selDataSorteio}_match_${idx}`,
            dataRealizacaoId: m.dataRealizacaoId || selDataSorteio
          };
          if (!allMatches.some(am => am.id === mappedMatch.id)) {
            allMatches.push(mappedMatch);
          }
        });
      }
      if (Array.isArray(pelada.peladaState.teams)) {
        pelada.peladaState.teams.forEach(tm => {
          if (!allTeamsMap.has(tm.name)) {
            allTeamsMap.set(tm.name, tm);
          }
        });
      }
    }
    return {
      teams: Array.from(allTeamsMap.values()),
      matchLog: allMatches
    };
  }, [datas, pelada.peladaState, selDataSorteio, peladaState]);

  return(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
          <button 
            onClick={() => {
              if (hasUnsavedChangesAtletas) {
                setModalConfirmacaoNavegacao({ type: "voltar" });
              } else {
                onBack();
              }
            }} 
            style={S.btnSm()}
          >
            ← Voltar
          </button>
          <div style={{minWidth:0}}><h2 style={{fontSize:17,fontWeight:800,margin:0,color:t.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pelada.nome}</h2><div style={{fontSize:11,color:t.textSec}}>{vinculados.length} atletas · {datas.length} datas</div></div>
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          {!pelada.ativo&&<Tag label="Inativa" color="#E24B4A"/>}
          <button onClick={()=>onRemovePelada(pelada.id)} style={S.btnSm("#E24B4A22","#E24B4A")}><IconTrash size={12} /></button>
        </div>
      </div>

      {/* Filtros Globais de Data */}
      {datas.length > 0 && (
        <div style={{
          ...S.card,
          display: "flex",
          gap: 12,
          padding: "12px 16px",
          marginBottom: 16,
          alignItems: "center",
          flexWrap: "wrap",
          border: `1px solid ${t.tabBorder}`,
          background: t.card
        }}>
          <div style={{fontSize: 13, fontWeight: 700, color: t.textSec, display: "flex", alignItems: "center", gap: 6}}>
            Data Ativa:
          </div>
          <div style={{display: "flex", gap: 8, flex: 1, minWidth: 280, flexWrap: "wrap"}}>
            <div style={{flex: 1, minWidth: 90}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>ANO</label>
              <select 
                value={filtroAno} 
                onChange={e => setFiltroAno(e.target.value)} 
                style={{...S.select, padding: "8px 12px"}}
              >
                {anosDisponiveis.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div style={{flex: 1.2, minWidth: 110}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>MÊS</label>
              <select 
                value={filtroMes} 
                onChange={e => setFiltroMes(e.target.value)} 
                style={{...S.select, padding: "8px 12px"}}
              >
                {mesesDisponiveis.map(mes => (
                  <option key={mes} value={mes}>{NOMES_MESES[mes] || mes}</option>
                ))}
              </select>
            </div>
            <div style={{flex: 1.8, minWidth: 150}}>
              <label style={{fontSize: 10, color: t.textSec, display: "block", marginBottom: 4, fontWeight: 600}}>DIA DA PELADA</label>
              <select 
                value={selDataSorteio} 
                onChange={e => {
                  if (hasUnsavedChangesAtletas) {
                    setModalConfirmacaoNavegacao({ type: "data", target: e.target.value });
                  } else {
                    setSelDataSorteio(e.target.value);
                  }
                }} 
                style={{...S.select, padding: "8px 12px", border: `1px solid ${t.accent || "#7F77DD"}`}}
              >
                <option value="todas">Todas as Datas</option>
                {diasDisponiveis.map(d => (
                  <option key={d.id} value={d.id}>{formatarData(d.data)}{d.local ? ` (${d.local})` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Abas principais */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${t.tabBorder}`,overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:20}}>
        {ABAS.map(tb=>(
          <button 
            key={tb} 
            onClick={() => {
              if (hasUnsavedChangesAtletas) {
                setModalConfirmacaoNavegacao({ type: "aba", target: tb });
              } else {
                currentSetAba(tb);
              }
            }} 
            style={S.tab(currentAba===tb)}
          >
            {tb === "placar" ? "Classificao" : tb === "configuracoes" ? "Configurações" : tb === "participaes" ? "Participações" : tb.charAt(0).toUpperCase()+tb.slice(1)}
          </button>
        ))}
      </div>

      {currentAba==="datas"&&(
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap: 16}}>
          {/* Lado Esquerdo: Info da pelada e CriarPelada */}
          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            <div style={S.card}>
              <div style={{fontWeight:600,fontSize:13,color:t.text,marginBottom:16}}>Informações da Pelada</div>
              <div style={{fontSize:13,color:t.textSec,lineHeight:2}}><b style={{color:t.text}}>Nome:</b> {pelada.nome}<br/><b style={{color:t.text}}>Criada em:</b> {formatarData(pelada.data_criacao)}<br/><b style={{color:t.text}}>Status:</b> {pelada.ativo ? <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:"#10B981"}} /> Ativa</span> : <span style={{display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:"50%",background:"#EF4444"}} /> Inativa</span>}</div>
            </div>
            <CriarPelada onSave={(d)=>onUpdatePelada(pelada.id,d)} initial={pelada} t={t}/>
          </div>
          {/* Lado Direito: Gerenciamento de Datas */}
          <AbaDatas peladaId={pelada.id} datasRealizacao={datasRealizacao} onAdd={onAddData} onUpdate={onUpdateData} onRemove={onRemoveData} t={t} quadras={quadras}/>
        </div>
      )}
      {currentAba==="atletas"&& (
        <AbaAtletasPelada pelada={pelada} atletas={atletas} participacoes={participacoes} onSavePartsLote={onSavePartsLote} onAddFinanceiro={onAddFinanceiro} onAddAtleta={onAddAtleta} t={t} isRealizada={isRealizada} selDataSorteio={selDataSorteio} onUnsavedChangesChange={setHasUnsavedChangesAtletas} triggerSaveRef={triggerSaveRef} onAddPart={onAddPart} onUpdate={onUpdatePart} onUpdateAtleta={onUpdateAtleta}/>
      )}
      {currentAba==="participações"&& (
        String(selDataSorteio) === "todas" ? (
          <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
            Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar as participações (presenças e pagamentos).
          </div>
        ) : (
          <AbaParticipacoes pelada={pelada} atletas={atletas} participacoes={participacoes} datasRealizacao={datasRealizacao} onAdd={onAddPart} onUpdate={onUpdatePart} onRemove={onRemovePart} onUpdateAtleta={onUpdateAtleta} onAddFinanceiro={onAddFinanceiro} t={t} selDataSorteio={selDataSorteio} onUnsavedChangesChange={setHasUnsavedChangesAtletas} triggerSaveRef={triggerSaveRef} onSavePartsLote={onSavePartsLote}/>
        )
      )}
      {currentAba==="colaboradores"&&isDonoOuAdmin&&(
        <AbaColaboradoresItem 
          collaborators={pelada.collaborators || []} 
          onSaveCollaborators={(novosColaboradores)=>onUpdatePelada(pelada.id, { collaborators: novosColaboradores })} 
          auth={auth} 
          managers={managers} 
          assegurarManagerColaborador={assegurarManagerColaborador} 
          t={t} 
          scope="pelada"
        />
      )}
      
      {currentAba==="configuracoes"&&((() => {
        try {
          if (String(selDataSorteio) === "todas") {
            return (
              <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
                Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar as configurações.
              </div>
            );
          }
          return (
            <div>
              <div style={{display:"flex", flexDirection:"column", gap: 20}}>
                {/* ACOMPANHAMENTO DOS ATLETAS */}
            {<>
            {/* Compartilhar Acompanhamento Público */}
            <div style={{...S.card, marginBottom: 16, padding: "14px 18px", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12}}>
              <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12}}>
                <div>
                  <h4 style={{fontSize: 13, fontWeight: 800, margin: 0, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                    <span>📱 Acompanhamento dos Atletas</span>
                    <span style={{fontSize: 9, background: "#1D9E7522", color: "#1D9E75", padding: "1px 6px", borderRadius: 4, fontWeight: 700}}>Tempo Real</span>
                  </h4>
                  <p style={{fontSize: 10, color: t.textSec, margin: "4px 0 0 0"}}>
                    Permita que os jogadores vejam o jogo atual, próximos times e fila de espera no celular.
                  </p>
                </div>
                
                <div style={{display: "flex", gap: 8}}>
                  <button 
                    onClick={() => {
                      const link = window.location.origin + window.location.pathname + `?p=${pelada.id}&data=${selDataSorteio}`;
                      navigator.clipboard.writeText(link);
                      alert("Link copiado com sucesso! Compartilhe com os atletas.");
                    }}
                    style={S.btnSm("#7F77DD22", "#7F77DD")}
                  >
                    🔗 Copiar Link
                  </button>
                  
                  <button 
                    onClick={() => {
                      const link = window.location.origin + window.location.pathname + `?p=${pelada.id}&data=${selDataSorteio}`;
                      setQrCodeModalUrl(link);
                    }}
                    style={S.btnSm("#1D9E7522", "#1D9E75")}
                  >
                    📷 Mostrar QR Code
                  </button>
                </div>
              </div>
            </div>

            </>}
                {/* CONFIGURAÇÕES DA RODADA */}
            {<>
            {/* Seletor de Modo de Rodízio e Ajustes de Regra Unificado */}
            <div style={{...S.card, marginBottom: 16, padding: "14px 18px", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12}}>
              <div 
                onClick={() => setShowConfigRodada(!showConfigRodada)}
                style={{
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center", 
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <div style={{fontWeight: 700, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                  <span>Configurações e Regras da Rodada</span>
                  {!peladaState?.modoRodizioFixo && (
                    <span style={{fontSize: 10, background: "#7F77DD22", color: "#7F77DD", padding: "2px 6px", borderRadius: 4, fontWeight: 600}}>
                      Modo Inteligente Ativo
                    </span>
                  )}
                </div>
                <span style={{fontSize: 11, fontWeight: 700, color: "#7F77DD"}}>{showConfigRodada ? "▲ Recolher Ajustes" : "▼ Expandir Ajustes"}</span>
              </div>

              {showConfigRodada && (
                <div style={{display: "flex", flexDirection: "column", gap: 14, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.cardBorder}`}}>
                  
                  {/* 1. Modo de Funcionamento da Rodada */}
                  <div style={{display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 12}}>
                    <div>
                      <div style={{fontWeight: 700, fontSize: 12, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                        <span>Automático Modo de Funcionamento da Rodada</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isRealizada) return;
                            const ps = { ...peladaState, modoRodizioFixo: !(peladaState?.modoRodizioFixo) };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          disabled={isRealizada}
                          title={peladaState?.modoRodizioFixo ? "Cadeado Fechado: Modo fixado manualmente pelo gestor" : "Cadeado Aberto: Modo ajustado automaticamente pelas regras do banco"}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: isRealizada ? "default" : "pointer",
                            fontSize: 16,
                            padding: "2px 6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "transform 0.2s ease",
                          }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        >
                          {peladaState?.modoRodizioFixo ? "<IconLock size={12} />" : "<IconLock size={12} style={{opacity: 0.5}} />"}
                        </button>
                      </div>
                      <div style={{fontSize: 10, color: t.textSec, marginTop: 2}}>
                        Defina o comportamento do revezamento. Ative o cadeado para fixar o modo manualmente.
                      </div>
                    </div>
                    
                    <div style={{display: "flex", alignItems: "center", gap: 8}}>
                      <div style={{display: "flex", background: t.inputBg, padding: 3, borderRadius: 12, border: `1px solid ${t.inputBorder}`, width: isMobile ? "100%" : "auto"}}>
                        {[
                          { key: "misto", label: "Automático", icon: "Automático", title: "Fila de times e rodízio de banco automáticos com empréstimo pontual de desfalques" },
                          { key: "manual", label: "Manual", icon: "Manual", title: "Gestão livre: selecione quem joga e monte os times manualmente" }
                        ].map(opt => {
                          const isSelected = (peladaState?.modoRodizio || "misto") === opt.key;
                          return (
                            <button
                              key={opt.key}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isRealizada) return;
                                const ps = { ...peladaState, modoRodizio: opt.key, modoRodizioFixo: true };
                                setPeladaStateLocal(ps);
                                saveDateState({ peladaState: ps });
                              }}
                              disabled={isRealizada}
                              title={opt.title}
                              style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                                padding: "6px 12px",
                                borderRadius: 18,
                                border: "none",
                                fontSize: 11,
                                fontWeight: isSelected ? 700 : 500,
                                cursor: isRealizada ? "default" : "pointer",
                                background: isSelected ? "#7F77DD" : "transparent",
                                color: isSelected ? "#FFFFFF" : t.textSec,
                                transition: "all 0.2s ease"
                              }}
                            >
                              <span>{opt.icon}</span>
                              {!isMobile && <span>{opt.label}</span>}
                              {isMobile && isSelected && <span>{opt.label}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div style={{height: 1, background: t.cardBorder}}/>
                  
                  {/* 2. Seletor do Critério de Empate */}
                  <div style={{display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: 12}}>
                    <div>
                      <div style={{fontWeight: 700, fontSize: 12, color: t.text}}>Critério de Empate</div>
                      <div style={{fontSize: 10, color: t.textSec, marginTop: 2}}>
                        Defina a regra para resolver empates ocorridos durante as partidas da rodada.
                      </div>
                    </div>
                    <select
                      value={peladaState?.regraEmpate || (peladaState?.empateAmbosSaem ? "ambosSaem" : "campeaoFica")}
                      onChange={e => {
                        if (isRealizada) return;
                        const val = e.target.value;
                        const ps = { 
                          ...peladaState, 
                          regraEmpate: val,
                          empateAmbosSaem: val === "ambosSaem"
                        };
                        setPeladaStateLocal(ps);
                        saveDateState({ peladaState: ps });
                      }}
                      disabled={isRealizada}
                      style={{...S.select, width: isMobile ? "100%" : "220px", height: 32, fontSize: 12, fontWeight: 600}}
                    >
                      <option value="campeaoFica">Campeão Fica (Time Defensor)</option>
                      <option value="desafianteFica">Desafiante Fica</option>
                      <option value="ambosSaem">Ambos Saem (Voltam para a fila)</option>
                      <option value="manual">Escolha Manual na Rodada</option>
                    </select>
                  </div>

                  <div style={{height: 1, background: t.cardBorder}}/>

                  {/* 3. Regra de Empate (Ambos Saem Toggle Switch) */}
                  {!isRealizada && (
                    <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                      <div>
                        <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>No empate, saem os dois times</div>
                        <div style={{fontSize: 10, color: t.textSec}}>Os dois times voltam para o final da fila e pontuam 1 no ranking.</div>
                      </div>
                      <label style={{position: 'relative', display: 'inline-block', width: 44, height: 22}}>
                        <input 
                          type="checkbox" 
                          checked={peladaState?.empateAmbosSaem === true} 
                          onChange={e => {
                            const ps = { ...peladaState, empateAmbosSaem: e.target.checked };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          style={{opacity: 0, width: 0, height: 0}}
                        />
                        <span style={{
                          position: 'absolute', cursor: 'pointer', inset: 0,
                          background: peladaState?.empateAmbosSaem ? '#1D9E75' : '#ccc',
                          borderRadius: 22, transition: '0.3s',
                          display: 'flex', alignItems: 'center', padding: '0 4px'
                        }}>
                          <span style={{
                            width: 16, height: 16, background: '#fff', borderRadius: '50%',
                            transition: '0.3s',
                            transform: peladaState?.empateAmbosSaem ? 'translateX(20px)' : 'translateX(0px)'
                          }}/>
                        </span>
                      </label>
                    </div>
                  )}

                  <div style={{height: 1, background: t.cardBorder}}/>

                  {/* 4. Limite de Vitórias Seguidas (Permanência) */}
                  <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                    <div>
                      <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>Limite de vitórias seguidas (permanência)</div>
                      <div style={{fontSize: 10, color: t.textSec}}>O time que atingir o limite sai da quadra na próxima rodada.</div>
                    </div>
                    <select
                      value={peladaState?.limiteVitorias || 0}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        const ps = { ...peladaState, limiteVitorias: val };
                        setPeladaStateLocal(ps);
                        saveDateState({ peladaState: ps });
                      }}
                      style={{...S.select, width: "auto", fontSize: 11, padding: "4px 8px", height: 26}}
                    >
                      <option value={0}>Sem limite (padrão)</option>
                      <option value={2}>2 vitórias seguidas</option>
                      <option value={3}>3 vitórias seguidas</option>
                      <option value={4}>4 vitórias seguidas</option>
                      <option value={5}>5 vitórias seguidas</option>
                    </select>
                  </div>

                  {/* Destino ao atingir o limite */}
                  {(peladaState?.limiteVitorias || 0) > 0 && (
                    <>
                      <div style={{height: 1, background: t.cardBorder}}/>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8}}>
                        <div>
                          <div style={{fontWeight: 600, fontSize: 12, color: t.text}}>Ação ao atingir o limite de vitórias</div>
                          <div style={{fontSize: 10, color: t.textSec}}>Escolha para onde o time vencedor vai ao atingir o limite.</div>
                        </div>
                        <select
                          value={peladaState?.destinoVencedorLimite || "finalFila"}
                          onChange={e => {
                            const ps = { ...peladaState, destinoVencedorLimite: e.target.value };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          style={{...S.select, width: "auto", fontSize: 11, padding: "4px 8px", height: 26}}
                        >
                          <option value="finalFila">Ir para o final da fila de espera</option>
                          <option value="esperarUmJogo">Esperar 1 jogo fora e voltar logo em seguida</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div style={{height: 1, background: t.cardBorder}}/>

                  {/* 5. Reverter times originais */}
                  {peladaState?.teamBases && !isRealizada && (
                    <div style={{display: "flex", justifyContent: "flex-end"}}>
                      <button
                        onClick={reverterTimesOriginais}
                        style={S.btnSm("#E24B4A22", "#E24B4A")}
                        title="Devolve todos os jogadores às escalações originais de sorteio e restaura o banco"
                      >
                        Voltar jogadores originais
                      </button>
                    </div>
                  )}

                  <div style={{height: 1, background: t.cardBorder, marginTop: 4}}/>

                  {/* 6. Botão para Salvar Configuração Explicitamente */}
                  <div style={{display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6}}>
                    <button
                      onClick={() => {
                        if (isRealizada) return;
                        saveDateState({ peladaState });
                        alert("Configuração da rodada gravada com sucesso para esta data!");
                      }}
                      disabled={isRealizada}
                      style={{
                        background: "#1D9E75",
                        color: "#FFFFFF",
                        border: "none",
                        cursor: isRealizada ? "default" : "pointer",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 12,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "0 2px 6px rgba(29, 158, 117, 0.3)",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={e => { if (!isRealizada) e.currentTarget.style.background = "#188762"; }}
                      onMouseLeave={e => { if (!isRealizada) e.currentTarget.style.background = "#1D9E75"; }}
                    >
                      💾 Gravar Configuração para esta Data
                    </button>
                  </div>

                </div>
              )}
            </div>

            {isRealizada && !drawnTeams && (
              <div style={{...S.card, marginBottom: 16, background: "#1D9E7512", border: "1px solid #1D9E7533", color: "#1D9E75", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 8}}>
                <span><IconLock size={12} /></span>
                <span style={{fontSize: 13, fontWeight: 700}}>Esta rodada foi realizada e as formações de times estão congeladas (sem alterações).</span>
              </div>
            )}

            </>}
                {/* PAINEL DE SORTEIO */}
            {(!isRealizada || !drawnTeams) && (
              <div style={{
                ...S.card, 
                marginBottom: 16, 
                background: t.inputBg, 
                border: `1px solid ${t.cardBorder}`, 
                padding: drawnTeams ? "12px 16px" : "16px"
              }}>
                {drawnTeams ? (
                  <button 
                    onClick={() => setShowSorteioConfig(!showSorteioConfig)} 
                    style={{
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center", 
                      cursor: "pointer",
                      width: "100%",
                      background: "none",
                      border: "none",
                      padding: 0,
                      fontFamily: "inherit",
                      textAlign: "left"
                    }}
                  >
                    <div style={{fontWeight: 700, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 6}}>
                      <span>Painel de Sorteio</span>
                      <span style={{fontSize: 10, background: "#1D9E7522", color: "#1D9E75", padding: "2px 6px", borderRadius: 4, fontWeight: 700}}>Sorteado</span>
                    </div>
                    <span style={{fontSize: 11, color: t.textSec, fontWeight: 700}}>{showSorteioConfig ? "▲ Recolher Ajustes" : "▼ Ajustes de Sorteio"}</span>
                  </button>
                ) : null}

                {(!drawnTeams || showSorteioConfig) && (
                  <div style={drawnTeams ? {marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.cardBorder}`} : {}}>
                    <div style={{display:"flex",gap:10,marginBottom:16,borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:14}}>
                      <button onClick={()=>setModoSorteio("auto")} style={{flex:1,padding:"24px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="auto"?"#7F77DD":"transparent",color:modoSorteio==="auto"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="auto"?"#7F77DD":t.cardBorder}`,cursor:"pointer"}}>Sorteio Automático</button>
                      <button onClick={()=>setModoSorteio("manual")} style={{flex:1,padding:"24px",borderRadius:8,fontWeight:600,fontSize:13,background:modoSorteio==="manual"?"#22b7d9":"transparent",color:modoSorteio==="manual"?"#fff":t.textSec,border:`1px solid ${modoSorteio==="manual"?"#22b7d9":t.cardBorder}`,cursor:"pointer"}}>Formação Manual</button>
                    </div>
                    
                    <div style={{marginBottom: 16, fontSize: 13, color: t.textSec}}>
                      <b>Jogadores Presentes ({presentes.length}):</b> {presentes.map(p => getPlayerName(p)).join(", ") || "Nenhum jogador marcado como presente nesta data."}
                    </div>

                    <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <label style={{...S.label,margin:0}}>Jogadores/time:</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={pptInput} 
                          onChange={e=>{
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            setPptInput(cleanVal);
                            if (cleanVal !== "") {
                              const val = Math.max(5, Math.min(15, Number(cleanVal)));
                              setPpt(val);
                              saveDateState({playersPerTeam:val});
                            }
                          }}
                          onBlur={() => {
                            const val = Math.max(5, Math.min(15, Number(pptInput) || 7));
                            setPpt(val);
                            setPptInput(String(val));
                            saveDateState({playersPerTeam:val});
                          }}
                          style={{...S.input,width:60}}
                        />
                      </div>
                      <div style={{display:"flex",gap:6,alignItems:"center"}}>
                        <label style={{...S.label,margin:0}}>Times (máx {maxTeams}):</label>
                        <input 
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={numTeamsInput} 
                          onChange={e=>{
                            const cleanVal = e.target.value.replace(/\D/g, "");
                            setNumTeamsInput(cleanVal);
                            if (cleanVal !== "") {
                              const val = Math.max(2, Math.min(maxTeams, Number(cleanVal)));
                              setNumTeams(val);
                              saveDateState({numTeams:val});
                            }
                          }}
                          onBlur={() => {
                            const val = Math.max(2, Math.min(maxTeams, Number(numTeamsInput) || 2));
                            setNumTeams(val);
                            setNumTeamsInput(String(val));
                            saveDateState({numTeams:val});
                          }}
                          style={{...S.input,width:56}}
                        />
                      </div>
                    </div>

                    {/* Metodo de Formacao de Times */}
                    <div style={{marginBottom: 16, display: "flex", flexDirection: "column", gap: 6}}>
                      <label style={{...S.label, margin: 0}}>Método de Formação dos Times:</label>
                      <div style={{display: "flex", gap: 8}}>
                        <button
                          onClick={() => {
                            setMetodoFormacao("igual");
                            saveDateState({ metodoFormacao: "igual" });
                          }}
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: metodoFormacao === "igual" ? "#7F77DD" : "transparent",
                            color: metodoFormacao === "igual" ? "#fff" : t.textSec,
                            border: `1.5px solid ${metodoFormacao === "igual" ? "#7F77DD" : t.cardBorder}`
                          }}
                        >
                          ⚖️ Distribuir Igual (Equilibrado)
                        </button>
                        <button
                          onClick={() => {
                            setMetodoFormacao("completo");
                            saveDateState({ metodoFormacao: "completo" });
                          }}
                          style={{
                            flex: 1,
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            background: metodoFormacao === "completo" ? "#7F77DD" : "transparent",
                            color: metodoFormacao === "completo" ? "#fff" : t.textSec,
                            border: `1.5px solid ${metodoFormacao === "completo" ? "#7F77DD" : t.cardBorder}`
                          }}
                        >
                          Completar Times (Empilhado)
                        </button>
                      </div>
                    </div>

                    {modoSorteio==="auto" && (
                      <button onClick={doDraw} style={S.btn("#7F77DD")}>Sortear Times Automaticamente</button>
                    )}
                    
                    {modoSorteio==="manual" && (
                      <div>
                        <div style={{display:"flex",gap:10,marginBottom:20}}>
                          <button onClick={randomFillManual} style={{...S.btn(t.card,t.text),border:`1px solid ${t.cardBorder}`,flex:1,justifyContent:"center"}}>Preencher Aleatório</button>
                          <button onClick={confirmManualFormation} style={{...S.btn("#22b7d9"),flex:1,justifyContent:"center"}}>Iniciar Pelada</button>
                        </div>
                        
                        <div style={{marginBottom:16}}>
                          <div style={{fontWeight:700,fontSize:12,color:t.textSec,marginBottom:16}}>Sem Time ({presentes.filter(p=>!manualAssignments[p.id]||manualAssignments[p.id]==="none").length})</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                            {presentes.filter(p=>!manualAssignments[p.id]||manualAssignments[p.id]==="none").map(p=>(
                               <button key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,border:`1px solid ${t.cardBorder}`,background:t.card,color:t.text,cursor:"pointer"}}><PlayerAvatar atleta={p} size={18}/> {getPlayerName(p)}</button>
                            ))}
                          </div>
                        </div>

                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:10}}>
                          {Array.from({length:numTeams}).map((_,i)=>{
                            const tId = `t${i+1}`;
                            const pInTeam = presentes.filter(p=>manualAssignments[p.id]===tId);
                            return(
                              <div key={tId} style={{...S.card,padding:10,borderColor:COLORS[i%COLORS.length]+"55"}}>
                                <div style={{fontWeight:700,fontSize:13,color:COLORS[i%COLORS.length],marginBottom:16}}>Time {i+1} ({pInTeam.length})</div>
                                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                  {pInTeam.map(p=>(
                                     <div key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",padding:"4px",borderRadius:4,background:t.inputBg}}><PlayerAvatar atleta={p} size={16}/> {getPlayerName(p)}</div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                          <div style={{...S.card,padding:10,borderColor:"#BA751755"}}>
                            <div style={{fontWeight:700,fontSize:13,color:"#BA7517",marginBottom:16}}>Banco ({presentes.filter(p=>manualAssignments[p.id]==="bench").length})</div>
                            <div style={{display:"flex",flexDirection:"column",gap:6}}>
                              {presentes.filter(p=>manualAssignments[p.id]==="bench").map(p=>(
                                 <div key={p.id} onClick={()=>setAssignModal(p.id)} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,cursor:"pointer",padding:"4px",borderRadius:4,background:t.inputBg}}><PlayerAvatar atleta={p} size={16}/> {getPlayerName(p)}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
                {/* EQUIPES FORMADAS */}
                {/* GESTÃO GERAL DAS EQUIPES E REFAZER SORTEIO */}
                {drawnTeams && (
                  <div style={{...S.card, marginBottom: 16, padding: "14px 18px", background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: 12}}>
                    <div 
                      onClick={() => setShowEquipesFormadas(!showEquipesFormadas)}
                      style={{
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        cursor: "pointer",
                        userSelect: "none"
                      }}
                    >
                      <div style={{fontWeight: 700, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 8}}>
                        <span>Equipes Formadas</span>
                      </div>
                      <span style={{fontSize: 11, color: "#7F77DD", fontWeight: 700}}>{showEquipesFormadas ? "▲ Recolher Lista" : "▼ Expandir Lista"}</span>
                    </div>

                    {showEquipesFormadas && (
                      <div style={{marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.cardBorder}`}}>
                        {!isRealizada && (
                          <div style={{display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 16}}>
                            <button 
                              onClick={handleCriarNovaEquipe} 
                              style={S.btnSm("#22b7d922","#22b7d9")}
                            >
                              Nova Equipe
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm("Tem certeza que deseja refazer o sorteio desta data? Isso apagará as partidas e pontuações do dia!")) {
                                  setDrawnTeams(null);
                                  setBenchState([]);
                                  setPeladaStateLocal(null);
                                  saveDateState({
                                    drawnTeams: null,
                                    initialBench: [],
                                    peladaState: null,
                                    manualAssignments: {}
                                  });
                                }
                              }} 
                              style={S.btnSm("#E24B4A22","#E24B4A")}
                            >
                              Refazer Sorteio
                            </button>
                          </div>
                        )}

                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                          {drawnTeams.map((tm,ti)=>(
                            <div key={ti} style={{...S.card,borderColor:COLORS[ti%COLORS.length]+"55",padding:12}}>
                              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:6,marginBottom:16}}>
                                <div style={{display:"flex",alignItems:"center",gap:6}}>
                                  <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[ti%COLORS.length]}}/>
                                  <span style={{fontWeight:700,fontSize:13,color:t.text}}>{tm.name}</span>
                                  {/* Cadeado removido pois a logica de emprestimos foi simplificada */}
                                </div>
                                {!isRealizada && (
                                   <div style={{display: "flex", gap: 8, alignItems: "center"}}>
                                     <button 
                                       onClick={() => {
                                         const novoNome = prompt(`Editar nome do time "${tm.name}":`, tm.name);
                                         if (novoNome) renomearEquipe(tm.name, novoNome);
                                       }}
                                       style={{border:"none",background:"transparent",color:t.textSec,cursor:"pointer",padding:0,fontSize:11}}
                                       title="Editar nome do time"
                                     >
                                       <IconEdit size={12} />
                                     </button>
                                     <button 
                                       onClick={() => excluirEquipe(tm.name)}
                                       style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,fontSize:11}}
                                       title="Excluir time"
                                     >
                                       <IconTrash size={12} />️
                                     </button>
                                   </div>
                                 )}
                              </div>
                              
                              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                                {tm.players.map((p,pi)=>{
                                  const pIsRev = p.isConvidado && p.convidadoDe;
                                  const pAnfNome = pIsRev ? (atletas.find(x=>x.id===p.convidadoDe)?.apelido||atletas.find(x=>x.id===p.convidadoDe)?.nome||"?") : null;
                                  return(
                                    <div key={pi} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,padding:"3px 0",borderBottom:`1px solid ${t.cardBorder}`,background: pIsRev ? "#7F77DD08" : "transparent",borderRadius: pIsRev ? 4 : 0,paddingLeft: pIsRev ? 4 : 0}}>
                                      <PlayerAvatar atleta={p} size={18}/>
                                      <span>{(p.goleiro||p.isGoalkeeper) ? <IconGoalkeeper size={14} /> : <IconSoccer size={14} />}</span>
                                      <span style={{flex:1,fontWeight:500,color: pIsRev ? "#7F77DD" : t.text}}>{getPlayerName(p)}{getLoanTagForEquipes(p)}</span>
                                      {pIsRev && <span style={{fontSize:9,color:"#7F77DD",opacity:0.8}} title={`Reveza com ${pAnfNome}`}>🔄</span>}
                                      {!isRealizada && pIsRev && (
                                        <button
                                          onClick={()=>{
                                            if(confirm(`Promover "${getPlayerName(p)}" a jogador independente?`)){
                                              onUpdateAtleta(p.id, { isConvidado: false, convidadoDe: null });
                                              let newBenchLocal = benchState.map(x=>String(x.id)===String(p.id)?{...x,isConvidado:false,convidadoDe:undefined}:x);
                                              let newDTLocal = drawnTeams.map(team=>({...team,players:team.players.map(pl=>String(pl.id)===String(p.id)?{...pl,isConvidado:false,convidadoDe:undefined}:pl)}));
                                              let psLocal = peladaState ? {...peladaState,bench:peladaState.bench.map(x=>String(x.id)===String(p.id)?{...x,isConvidado:false,convidadoDe:undefined}:x),teams:peladaState.teams.map(team=>({...team,players:team.players.map(pl=>String(pl.id)===String(p.id)?{...pl,isConvidado:false,convidadoDe:undefined}:pl)}))} : null;
                                              setBenchState(newBenchLocal); setDrawnTeams(newDTLocal); setPeladaStateLocal(psLocal);
                                              saveDateState({drawnTeams:newDTLocal,initialBench:newBenchLocal,peladaState:psLocal});
                                            }
                                          }}
                                          style={{border:"none",background:"transparent",color:"#1D9E75",cursor:"pointer",padding:"0 2px",fontSize:10,fontWeight:800}}
                                          title="Promover a titular independente"
                                        >⬆</button>
                                      )}
                                      {!isRealizada && (
                                        <>
                                          <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:11,fontWeight:700}} title="Substituir / Mover"><IconRefresh size={12} /></button>
                                          <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:p.id,playerName:getPlayerName(p),teamName:tm.name});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"0 2px",fontSize:11}} title="Sair do jogo"><IconX size={10} color="#E24B4A" /></button>
                                          <button onClick={()=>removeFromRotation(p.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,fontSize:12,fontWeight:700}}>×</button>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              {!isRealizada && (
                                <div style={{marginTop: 8, borderTop: `1px dashed ${t.cardBorder}`, paddingTop: 6}}>
                                  <select 
                                    style={{...S.select, width: "100%", fontSize: 10, padding: "2px 4px", height: 24}} 
                                    value="" 
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val) {
                                        adicionarAtrasadoDiretoAoTime(val, tm.name);
                                      }
                                    }}
                                  >
                                    <option value="">+ Atrasado...</option>
                                    {vinculados
                                      .filter(a => !benchState.some(b => String(b.id) === String(a.id)) && !drawnTeams.some(team => team.players.some(p => String(p.id) === String(a.id))))
                                      .map(a => <option key={a.id} value={a.id}>{a.nome}</option>)
                                    }
                                  </select>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        } catch (err) {
          console.error("Erro na aba Configurações:", err);
          return (
            <div style={{padding: 24, background: "#FFF5F5", border: "1px solid #E24B4A", borderRadius: 8, color: "#E24B4A", margin: "20px 0"}}>
              <h3>⚠️ Ocorreu um erro ao carregar a aba Configurações</h3>
              <p style={{fontWeight: 700}}>{err.message}</p>
              <pre style={{fontSize: 11, overflow: "auto", background: "#FFEBEB", padding: 10, borderRadius: 4}}>{err.stack}</pre>
            </div>
          );
        }
      })())}
{currentAba==="jogos"&&((() => {
        try {
          if (String(selDataSorteio) === "todas") {
            return (
              <div style={{textAlign:"center",padding:40,color:t.textSec,background:t.card,borderRadius:8,border:`1px solid ${t.tabBorder}`}}>
                Selecione uma data específica no seletor global "DIA DA PELADA" para gerenciar e registrar as partidas.
              </div>
            );
          }
          return (
            <div>
              {/* BOTÃO DESFAZER ÚLTIMA AÇÃO */}
                {/* BOTÃO DESFAZER ÚLTIMA AÇÃO */}
                {historicoEstados.length > 0 && !isRealizada && (
                  <div style={{display: "flex", justifyContent: "flex-end", marginBottom: 16}}>
                    <button
                      onClick={() => {
                        const estadoAnterior = historicoEstados[historicoEstados.length - 1];
                        setHistoricoEstados(prev => prev.slice(0, -1));
                        setPeladaStateLocalReal(estadoAnterior);
                        setBenchState(estadoAnterior.bench || []);
                        saveDateState({
                          peladaState: estadoAnterior,
                          initialBench: estadoAnterior.bench || []
                        });
                      }}
                      style={{
                        ...S.btnSm("#BA751722", "#BA7517"),
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 700
                      }}
                    >
                      ↩️ Desfazer Última Ação
                    </button>
                  </div>
                )}

              {peladaState?.currentMatch&&!peladaState.currentMatch.played&&String(peladaState.currentMatch.dataRealizacaoId)===String(selDataSorteio)&&(
                  <div style={{...S.card,border:`2px solid ${isRealizada ? t.cardBorder : "#1D9E7555"}`,marginBottom:20}}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16}}>
                      <div style={{fontSize:11,fontWeight:700,color:isRealizada ? t.textSec : "#1D9E75",textTransform:"uppercase",letterSpacing:1}}>
                        ⚽ Jogo {(peladaState.matchLog?.filter(m=>String(m.dataRealizacaoId)===String(selDataSorteio)).length||0)+1} {isRealizada && "(Congelado - Rodada Realizada)"}
                      </div>
                      {!isRealizada && (
                        <button
                          onClick={inverterTimesAtivos}
                          style={{
                            ...S.btnSm("#1D9E7515", "#1D9E75"),
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 700,
                            padding: "4px 8px"
                          }}
                          title="Inverter os dois times ativos da quadra"
                        >
                          🔃 Inverter Lados
                        </button>
                      )}
                    </div>
                    
                    {!isRealizada && (
                      <MatchTimer 
                        key={timerResetKey}
                        t={t} 
                        defaultMinutes={10} 
                        timerKey={`pelada_${pelada.id}`} 
                        onTimerUpdate={(timerData) => {
                          if (peladaState && peladaState.currentMatch) {
                            const ps = {
                              ...peladaState,
                              currentMatch: {
                                ...peladaState.currentMatch,
                                ...timerData
                              }
                            };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }
                        }}
                      />
                    )}

                    <div style={{
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 20, 
                      background: "#0D0E12", 
                      padding: "16px 24px", 
                      borderRadius: 16, 
                      border: "1px solid #1E293B",
                      boxShadow: `0 0 20px ${t.accent}25, inset 0 0 12px ${t.accent}10`,
                      marginBottom: 20,
                      flexWrap: "wrap"
                    }}>
                      {/* Time A (Esquerda) */}
                      <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        <div style={{width: 10, height: 10, borderRadius: "50%", background: colorOfTeam(peladaState.currentMatch.teamA)}}/>
                        <span style={{fontWeight: 800, fontSize: 14, color: "#F8FAFC"}}>{peladaState.currentMatch.teamA}</span>
                        
                        {!isRealizada && (
                          <div style={{display: "flex", gap: 6}}>
                            <button 
                              onClick={() => { setModalGol('A'); setAutorGolId(""); setAutorAssistenciaId(""); }}
                              style={{
                                background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
                                border: "none",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 10,
                                padding: "4px 10px",
                                borderRadius: 20,
                                cursor: "pointer",
                                boxShadow: `0 0 10px ${t.accent}50`,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "transform 0.15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                              <IconSoccer size={10} color="#fff" /> + GOL
                            </button>
                            <button 
                              onClick={() => { setModalGerenciarTime('A'); }}
                              style={{
                                background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
                                border: "none",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 10,
                                padding: "4px 10px",
                                borderRadius: 20,
                                cursor: "pointer",
                                boxShadow: `0 0 10px ${t.accent}50`,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "transform 0.15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                              <IconSettings size={10} color="#fff" /> TIME
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Placar Centralizado Neon */}
                      <div style={{
                        display: "flex", 
                        alignItems: "center", 
                        gap: 14, 
                        background: "#1E293B33", 
                        padding: "8px 20px", 
                        borderRadius: 12,
                        border: "1px solid #334155"
                      }}>
                        <span style={{
                          fontSize: 32, 
                          fontWeight: 900, 
                          color: t.accent,
                          fontFamily: "monospace",
                          textShadow: `0 0 10px ${t.accent}`
                        }}>
                          {scoreA || "0"}
                        </span>
                        <span style={{fontSize: 16, color: "#64748B", fontWeight: 700}}>×</span>
                        <span style={{
                          fontSize: 32, 
                          fontWeight: 900, 
                          color: t.accent,
                          fontFamily: "monospace",
                          textShadow: `0 0 10px ${t.accent}`
                        }}>
                          {scoreB || "0"}
                        </span>
                      </div>

                      {/* Time B (Direita) */}
                      <div style={{display: "flex", alignItems: "center", gap: 10}}>
                        {!isRealizada && (
                          <div style={{display: "flex", gap: 6}}>
                            <button 
                              onClick={() => { setModalGerenciarTime('B'); }}
                              style={{
                                background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
                                border: "none",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 10,
                                padding: "4px 10px",
                                borderRadius: 20,
                                cursor: "pointer",
                                boxShadow: `0 0 10px ${t.accent}50`,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "transform 0.15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                              <IconSettings size={10} color="#fff" /> TIME
                            </button>
                            <button 
                              onClick={() => { setModalGol('B'); setAutorGolId(""); setAutorAssistenciaId(""); }}
                              style={{
                                background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
                                border: "none",
                                color: "#fff",
                                fontWeight: 800,
                                fontSize: 10,
                                padding: "4px 10px",
                                borderRadius: 20,
                                cursor: "pointer",
                                boxShadow: `0 0 10px ${t.accent}50`,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                transition: "transform 0.15s"
                              }}
                              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                            >
                              <IconSoccer size={10} color="#fff" /> + GOL
                            </button>
                          </div>
                        )}
                        <span style={{fontWeight: 800, fontSize: 14, color: "#F8FAFC"}}>{peladaState.currentMatch.teamB}</span>
                        <div style={{width: 10, height: 10, borderRadius: "50%", background: colorOfTeam(peladaState.currentMatch.teamB)}}/>
                      </div>
                    </div>


                    {/* Seletor do vencedor em caso de empate na regra manual */}
                    {!isRealizada && (scoreA !== "" && scoreB !== "" && parseInt(scoreA) === parseInt(scoreB)) && peladaState?.regraEmpate === "manual" && (
                      <div style={{
                        background: t.inputBg,
                        border: `1px solid ${t.cardBorder}`,
                        borderRadius: 8,
                        padding: "24px",
                        marginBottom: 16,
                        textAlign: "center"
                      }}>
                        <div style={{fontWeight: 700, fontSize: 12, color: t.text, marginBottom: 16}}>
                          Escolha quem permanece na quadra (Empate)
                        </div>
                        <div style={{display: "flex", gap: 8, justifyContent: "center"}}>
                          <button
                            onClick={() => setEmpateVencedorManual("teamA")}
                            style={{
                              ...S.btnSm(
                                empateVencedorManual === "teamA" ? "#7F77DD22" : "transparent",
                                empateVencedorManual === "teamA" ? "#7F77DD" : t.textSec
                              ),
                              padding: "6px 12px",
                              fontWeight: empateVencedorManual === "teamA" ? 700 : 500,
                              border: `1px solid ${empateVencedorManual === "teamA" ? "#7F77DD" : t.cardBorder}`,
                              borderRadius: 6,
                              cursor: "pointer"
                            }}
                          >
                            • {peladaState.currentMatch.teamA} (Campeão/Defensor)
                          </button>
                          <button
                            onClick={() => setEmpateVencedorManual("teamB")}
                            style={{
                              ...S.btnSm(
                                empateVencedorManual === "teamB" ? "#7F77DD22" : "transparent",
                                empateVencedorManual === "teamB" ? "#7F77DD" : t.textSec
                              ),
                              padding: "6px 12px",
                              fontWeight: empateVencedorManual === "teamB" ? 700 : 500,
                              border: `1px solid ${empateVencedorManual === "teamB" ? "#7F77DD" : t.cardBorder}`,
                              borderRadius: 6,
                              cursor: "pointer"
                            }}
                          >
                            • {peladaState.currentMatch.teamB} (Desafiante)
                          </button>
                        </div>
                      </div>
                    )}
                    {!isRealizada && <button onClick={saveMatchLocal} style={{...S.btn(),width:"100%",justifyContent:"center"}}>✓ Registrar</button>}
                  </div>
                )}

                {!peladaState?.currentMatch&&peladaState?.queue?.length>=2&&(
                  <div style={{...S.card,textAlign:"center",marginBottom:16,border:`2px solid ${isRealizada ? t.cardBorder : "#7F77DD55"}`}}>
                    <div style={{fontWeight:600,color:t.text,marginBottom:16}}>Próximo Jogo {isRealizada && "(Congelado)"}</div>
                    
                    {(peladaState?.modoRodizio || "auto") === "manual" && !isRealizada ? (
                      <div>
                        {/* SELEÇÃO MANUAL DE TIMES */}
                        <div style={{display: "flex", gap: 12, justifyContent: "center", alignItems: "center", marginBottom: 16, flexWrap: "wrap"}}>
                          <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 140, textAlign: "left"}}>
                            <label style={{...S.label, margin: 0, fontSize: 11}}>Time A:</label>
                            <select 
                              value={proxTimeA} 
                              onChange={e => {
                                const val = e.target.value;
                                setProxTimeA(val);
                                if (val === proxTimeB) {
                                  const other = peladaState.queue.find(t => t !== val);
                                  if (other) setProxTimeB(other);
                                }
                              }} 
                              style={S.select}
                            >
                              {peladaState.queue.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                          <span style={{fontWeight: 700, color: t.textSec, fontSize: 16, marginTop: 14}}>vs</span>
                          <div style={{display: "flex", flexDirection: "column", gap: 4, minWidth: 140, textAlign: "left"}}>
                            <label style={{...S.label, margin: 0, fontSize: 11}}>Time B:</label>
                            <select 
                              value={proxTimeB} 
                              onChange={e => {
                                const val = e.target.value;
                                setProxTimeB(val);
                                if (val === proxTimeA) {
                                  const other = peladaState.queue.find(t => t !== val);
                                  if (other) setProxTimeA(other);
                                }
                              }} 
                              style={S.select}
                            >
                              {peladaState.queue.map(name => (
                                <option key={name} value={name}>{name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* LISTA DE JOGADORES DO TIMES SELECIONADOS NO MODO MANUAL */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                          <div style={{background:"#22b7d911",padding:10,borderRadius:12}}>
                            <b style={{color:"#22b7d9",display:"block",marginBottom:16}}>{proxTimeA}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===proxTimeA)?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, proxTimeA)} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir"><IconRefresh size={12} /></button>}
                              </div>)}
                            </div>
                          </div>
                          <div style={{background:"#22b7d911",padding:10,borderRadius:12}}>
                            <b style={{color:"#22b7d9",display:"block",marginBottom:16}}>{proxTimeB}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===proxTimeB)?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, proxTimeB)} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir"><IconRefresh size={12} /></button>}
                              </div>)}
                            </div>
                          </div>
                        </div>

                        <button onClick={iniciarPartidaManual} style={S.btn("#22b7d9")}>▶ Iniciar Próximo Jogo</button>
                      </div>
                    ) : (
                      <>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
                          <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#7F77DD",display:"block",marginBottom:16}}>{peladaState.queue[0]}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===peladaState.queue[0])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, peladaState.queue[0])} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir"><IconRefresh size={12} /></button>}
                              </div>)}
                            </div>
                          </div>
                          <div style={{background:"#7F77DD11",padding:10,borderRadius:12}}>
                            <b style={{color:"#7F77DD",display:"block",marginBottom:16}}>{peladaState.queue[1]}</b>
                            <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"center"}}>
                              {peladaState.teams?.find(tm=>tm.name===peladaState.queue[1])?.players.map((p,pi)=><div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                                <PlayerAvatar atleta={p} size={20}/>{getPlayerName(p)}{getLoanTag(p, peladaState.queue[1])} {!isRealizada && <button onClick={()=>setSubModal(p.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:"0 4px",fontSize:10}} title="Substituir"><IconRefresh size={12} /></button>}
                              </div>)}
                            </div>
                          </div>
                        </div>
                        {(proxParaA.length > 0 || proxParaB.length > 0) && (
                          <div style={{
                            marginBottom: 16,
                            padding: 12,
                            background: "#1D9E7512",
                            border: "1px dashed #1D9E7588",
                            borderRadius: 10,
                            fontSize: 11,
                            color: t.text,
                            textAlign: "left"
                          }}>
                            <div style={{fontWeight: 700, color: "#1D9E75", marginBottom: 6, display: "flex", alignItems: "center", gap: 6}}>
                              <span>🤝 Empréstimos Estimados para Completar a Partida</span>
                            </div>
                            {proxParaA.length > 0 && (
                              <div style={{marginBottom: 4}}>
                                <b>Para {peladaState.queue[0]}:</b> {proxParaA.map(p => getPlayerName(p)).join(", ")}
                              </div>
                            )}
                            {proxParaB.length > 0 && (
                              <div>
                                <b>Para {peladaState.queue[1]}:</b> {proxParaB.map(p => getPlayerName(p)).join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                        {!isRealizada && <button onClick={()=>{const ps=startNextMatch(peladaState, selDataSorteio, ppt);setPeladaStateLocal(ps);saveDateState({peladaState:ps});}} style={S.btn("#7F77DD")}>▶ Iniciar Próximo Jogo na data selecionada</button>}
                      </>
                    )}
                  </div>
                )}

                {(!peladaState || (!peladaState.currentMatch && (!peladaState.queue || peladaState.queue.length < 2))) && (
                  <div style={{textAlign:"center",padding:40,color:t.textSec}}>
                    {isRealizada ? "Todos os jogos desta data foram concluídos e registrados." : "Faça o sorteio primeiro para a data selecionada."}
                  </div>
                )}

                {/* FILA DE ESPERA COMPLETA COM SEUS ATLETAS E AÇÕES */}
                {peladaState?.queue?.length > 2 && (
                  <div style={{marginTop:16, paddingTop:16, borderTop:`1px dashed ${t.cardBorder}`, marginBottom: 20}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
                      <div style={{fontSize:13, fontWeight:800, color:t.textSec}}>📋 Fila de Espera</div>
                      {!isRealizada && peladaState.queue.length > 3 && (
                        <button
                          onClick={embaralharFilaEspera}
                          style={{
                            ...S.btnSm("#7F77DD15", "#7F77DD"),
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontWeight: 700,
                            padding: "4px 8px"
                          }}
                          title="Embaralhar a fila de espera aleatoriamente"
                        >
                          Embaralhar Fila
                        </button>
                      )}
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:14}}>
                      {peladaState.queue.slice(2).map((teamName, qIdx) => {
                        const teamData = peladaState.teams?.find(tm => tm.name === teamName);
                        let playersToRender = teamData ? [...teamData.players] : [];
                        const isProxEntrando = (qIdx === 0);
                        const emAndamento = peladaState.currentMatch && !peladaState.currentMatch.played;
                        
                        if (isProxEntrando && emAndamento && proxParaA && proxParaA.length > 0) {
                          // Adiciona os jogadores estimados de empréstimo para completar a visualização
                          proxParaA.forEach(p => {
                            const pIdStr = String(p.id || p.atleta_id || p.idAtleta);
                            if (!playersToRender.some(orig => String(orig.id || orig.atleta_id || orig.idAtleta) === pIdStr)) {
                              playersToRender.push({
                                ...p,
                                isEstimadoEmprestimo: true
                              });
                            }
                          });
                        }

                        const realIdx = qIdx + 2;
                        return (
                          <div key={teamName} style={{background: t.inputBg, borderRadius: 10, padding: 10, border: `1px solid ${t.cardBorder}`}}>
                            <div style={{fontSize:12, fontWeight:700, color:"#7F77DD", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", gap:6}}>
                              <div style={{display:"flex", alignItems:"center", gap:6}}>
                                <div style={{width:8, height:8, borderRadius:"50%", background:colorOfTeam(teamName)}}/>
                                <span>{qIdx === 0 ? "Próximo a entrar" : `${qIdx + 1}º na Fila`}: {teamName}</span>
                                {!isRealizada && (
                                  <button 
                                    onClick={() => setModalGerenciarTime(teamName)}
                                    style={{
                                      background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
                                      border: "none",
                                      color: "#fff",
                                      fontWeight: 800,
                                      fontSize: 10,
                                      padding: "2px 8px",
                                      borderRadius: 20,
                                      cursor: "pointer",
                                      boxShadow: `0 0 10px ${t.accent}50`,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 4,
                                      marginLeft: 8,
                                      transition: "transform 0.15s"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                                  >
                                    <IconSettings size={10} color="#fff" /> TIME
                                  </button>
                                )}
                              </div>
                              {!isRealizada && (
                                <div style={{display:"flex", gap:4}}>
                                  {realIdx > 2 && (
                                    <button 
                                      onClick={() => moverTimeFila(realIdx, -1)}
                                      style={{border:"none", background:t.inputBg, color:t.text, cursor:"pointer", padding:"2px 6px", fontSize:11, borderRadius:4, border:`1px solid ${t.cardBorder}`}}
                                      title="Subir na fila"
                                    >
                                      ⬆️
                                    </button>
                                  )}
                                  {realIdx < peladaState.queue.length - 1 && (
                                    <button 
                                      onClick={() => moverTimeFila(realIdx, 1)}
                                      style={{border:"none", background:t.inputBg, color:t.text, cursor:"pointer", padding:"2px 6px", fontSize:11, borderRadius:4, border:`1px solid ${t.cardBorder}`}}
                                      title="Descer na fila"
                                    >
                                      ⬇️
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
                              {playersToRender.map((p, pi) => {
                                const pIsRev = p.isConvidado && p.convidadoDe;
                                const pAnfNome = pIsRev ? (atletas.find(x=>x.id===p.convidadoDe)?.apelido||atletas.find(x=>x.id===p.convidadoDe)?.nome||"?") : null;
                                const athleteId = String(p.id || p.atleta_id || p.idAtleta);
                                
                                if (p.isEstimadoEmprestimo) {
                                  const origTeam = getOrigemTeamName(athleteId);
                                  const matches = origTeam.match(/\d+/);
                                  const sigla = matches ? `T${matches[0]}` : origTeam.substring(0, 3).toUpperCase();
                                  return (
                                    <div 
                                      key={`est-${pi}`}
                                      title={`Empréstimo estimado vindo de: ${origTeam}`}
                                      style={{
                                        display:"inline-flex", 
                                        alignItems:"center", 
                                        gap:4, 
                                        fontSize:11, 
                                        background: "#1D9E7518", 
                                        padding:"4px 8px", 
                                        borderRadius:12, 
                                        border: "1.5px dashed #1D9E75",
                                        boxShadow: "0 0 4px rgba(29, 158, 117, 0.2)"
                                      }}
                                    >
                                      <PlayerAvatar atleta={p} size={16}/>
                                      <span style={{fontWeight:600, color: "#1D9E75"}}>{getPlayerName(p)} <IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>
                                    </div>
                                  );
                                }

                                const isCandidatoEmprestimo = proxCandidatosEmprestimoIds.includes(athleteId);
                                const isEmprestadoAtivo = peladaState.currentMatch && !peladaState.currentMatch.played && (
                                  (peladaState.currentMatch.teamAEmprestados || []).map(String).includes(athleteId) ||
                                  (peladaState.currentMatch.teamBEmprestados || []).map(String).includes(athleteId)
                                );
                                let destTeamName = "";
                                let destSigla = "";
                                if (isEmprestadoAtivo) {
                                  if ((peladaState.currentMatch.teamAEmprestados || []).map(String).includes(athleteId)) {
                                    destTeamName = peladaState.currentMatch.teamA;
                                  } else {
                                    destTeamName = peladaState.currentMatch.teamB;
                                  }
                                  const matches = destTeamName.match(/\d+/);
                                  destSigla = matches ? `T${matches[0]}` : destTeamName.substring(0, 3).toUpperCase();
                                }
                                
                                return (
                                  <div 
                                    key={pi} 
                                    title={
                                      isEmprestadoAtivo 
                                        ? `Emprestado ao ${destTeamName} na partida atual` 
                                        : (isCandidatoEmprestimo ? "Selecionado para empréstimo no próximo jogo" : undefined)
                                    }
                                    style={{
                                      display:"inline-flex", 
                                      alignItems:"center", 
                                      gap:4, 
                                      fontSize:11, 
                                      background: isEmprestadoAtivo 
                                        ? "#FFA72615" 
                                        : (isCandidatoEmprestimo ? "#1D9E7515" : t.card), 
                                      padding:"4px 8px", 
                                      borderRadius:12, 
                                      border: isEmprestadoAtivo 
                                        ? "1.5px solid #FFA726" 
                                        : (isCandidatoEmprestimo ? "1.5px solid #1D9E75" : `1px solid ${t.inputBorder}`),
                                      boxShadow: isEmprestadoAtivo 
                                        ? "0 0 6px rgba(255, 167, 38, 0.3)" 
                                        : (isCandidatoEmprestimo ? "0 0 6px rgba(29, 158, 117, 0.3)" : "none"),
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <PlayerAvatar atleta={p} size={16}/>
                                    <span style={{
                                      fontWeight: (isEmprestadoAtivo || isCandidatoEmprestimo) ? 600 : 500, 
                                      color: isEmprestadoAtivo 
                                        ? "#E67E22" 
                                        : (pIsRev ? "#7F77DD" : t.text)
                                    }}>
                                      {getPlayerName(p)}
                                      {isEmprestadoAtivo && ` 🤝 (${destSigla})`}
                                      {!isEmprestadoAtivo && isCandidatoEmprestimo && " 🤝"}
                                    </span>
                                    {pIsRev && <span style={{fontSize:9, color:"#7F77DD", opacity:0.8}} title={`Reveza com ${pAnfNome}`}>🔄</span>}
                                    {/* Botões removidos para gestão centralizada no modal TIME */}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* BANCO DE RESERVAS E RETARDATÁRIOS */}
                {drawnTeams && (
                  <div style={{marginBottom: 20}}>

                    {currentBench.length>0&& (
                      <div style={{...S.card,border:"1px solid #BA751733",background:"#BA751710",marginBottom:16}}>
                        <div style={{fontWeight:700,color:"#BA7517",marginBottom:6}}>🪑 Banco ({currentBench.length})</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {currentBench.map((b,i)=>{
                            const isRev = b.isConvidado && b.convidadoDe;
                            const anfitriaoNome = isRev ? (atletas.find(x=>x.id===b.convidadoDe)?.apelido || atletas.find(x=>x.id===b.convidadoDe)?.nome || "?") : null;
                            const athleteId = String(b.id || b.atleta_id || b.idAtleta);
                            const isCandidatoEmprestimo = proxCandidatosEmprestimoIds.includes(athleteId);
                            return (
                              <span 
                                key={i} 
                                title={isCandidatoEmprestimo ? "Selecionado para empréstimo no próximo jogo" : undefined}
                                style={{
                                  display:"inline-flex",
                                  alignItems:"center",
                                  gap:4,
                                  fontSize:12,
                                  padding:"3px 10px",
                                  borderRadius:16,
                                  background: isCandidatoEmprestimo ? "#1D9E7515" : (isRev ? "#7F77DD22" : "#BA751722"),
                                  color: isCandidatoEmprestimo ? "#1D9E75" : (isRev ? "#7F77DD" : "#BA7517"),
                                  fontWeight:600,
                                  border: isCandidatoEmprestimo ? "1.5px solid #1D9E75" : (isRev ? "1px solid #7F77DD44" : "none"),
                                  boxShadow: isCandidatoEmprestimo ? "0 0 6px rgba(29, 158, 117, 0.3)" : "none",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                <PlayerAvatar atleta={b} size={16}/>
                                b.goleiro ? <IconGoalkeeper size={14} /> : <IconSoccer size={14} /> {getPlayerName(b)}{isCandidatoEmprestimo && " 🤝"}
                                {isRev && <span title={`Reveza com ${anfitriaoNome}`} style={{fontSize:9,opacity:0.85}}>🔄{anfitriaoNome}</span>}
                                {!isRealizada && isRev && (
                                  <button
                                    onClick={()=>{
                                      if(confirm(`Promover "${getPlayerName(b)}" a jogador independente? Ele deixará de revezar com o anfitrião.`)){
                                        onUpdateAtleta(b.id, { isConvidado: false, convidadoDe: null });
                                        let newBenchLocal = benchState.map(x => String(x.id)===String(b.id) ? {...x,isConvidado:false,convidadoDe:undefined} : x);
                                        let newDTLocal = drawnTeams ? drawnTeams.map(tm => ({...tm,players:tm.players.map(p=>String(p.id)===String(b.id)?{...p,isConvidado:false,convidadoDe:undefined}:p)})) : drawnTeams;
                                        let psLocal = peladaState ? {...peladaState, bench: peladaState.bench.map(x=>String(x.id)===String(b.id)?{...x,isConvidado:false,convidadoDe:undefined}:x), teams: peladaState.teams.map(tm=>({...tm,players:tm.players.map(p=>String(p.id)===String(b.id)?{...p,isConvidado:false,convidadoDe:undefined}:p)}))} : null;
                                        setBenchState(newBenchLocal); setDrawnTeams(newDTLocal); setPeladaStateLocal(psLocal);
                                        saveDateState({drawnTeams:newDTLocal,initialBench:newBenchLocal,peladaState:psLocal});
                                      }
                                    }}
                                    style={{border:"none",background:"transparent",color:"#1D9E75",cursor:"pointer",padding:"0 2px",fontSize:10,fontWeight:800}}
                                    title="Promover a titular independente"
                                  >⬆</button>
                                )}
                                {!isRealizada && (
                                  <>
                                    <button onClick={()=>setSubModal(b.id)} style={{border:"none",background:"transparent",color:"#0095F6",cursor:"pointer",padding:0,marginLeft:2,marginRight:2,fontSize:10,fontWeight:800}} title="Substituir / Mover">↔</button>
                                    <button onClick={()=>{setSairMotivo("cansaco");setSairSubstitutoId("");setSairModal({playerId:b.id,playerName:getPlayerName(b),teamName:"bench"});}} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,marginLeft:2,marginRight:2,fontSize:10,fontWeight:800}} title="Sair do jogo"><IconX size={10} color="#E24B4A" /></button>
                                    <button onClick={()=>removeFromRotation(b.id)} style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:0,marginLeft:2,fontWeight:800}}>×</button>
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ATLETAS QUE SAÍRAM / DESCANSANDO */}
                {jogadoresPausados.length > 0 && (
                  <div style={{...S.card, border: `1px solid ${t.cardBorder}`, marginBottom: 20}}>
                    <div style={{fontSize:12, fontWeight:700, color:t.text, marginBottom:16, display:"flex", alignItems:"center", gap:6}}>
                      <span><IconX size={10} color="#E24B4A" /> Atletas que Saíram / Descansando ({jogadoresPausados.length})</span>
                    </div>
                    <div style={{display:"flex", flexDirection:"column", gap:8}}>
                      {jogadoresPausados.map((p) => {
                        const guest = atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(p.id));
                        const isGuestActive = guest && (
                          benchState.some(b => String(b.id) === String(guest.id)) ||
                          (drawnTeams && drawnTeams.some(t => t.players.some(pl => String(pl.id) === String(guest.id)))) ||
                          jogadoresPausados.some(j => String(j.id) === String(guest.id))
                        );
                        return (
                          <div key={p.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:t.inputBg, borderRadius:10, border:`1px solid ${t.inputBorder}`}}>
                            <div style={{display:"flex", alignItems:"center", gap:8}}>
                              <PlayerAvatar atleta={p} size={24}/>
                              <div>
                                <div style={{fontWeight:600, fontSize:13, color:t.text}}>{getPlayerName(p)}</div>
                                {guest && isGuestActive && (
                                  <div style={{fontSize:11, color:"#7F77DD", marginTop:2, display:"flex", alignItems:"center", gap:4}}>
                                    <input 
                                      type="checkbox" 
                                      id={`retornar-vinculo-${p.id}`}
                                      defaultChecked={true}
                                      style={{width:14, height:14, accentColor:"#7F77DD"}}
                                    />
                                    <label htmlFor={`retornar-vinculo-${p.id}`} style={{cursor:"pointer", fontSize: 11}}>Retornar com vínculo com {getPlayerName(guest)}</label>
                                  </div>
                                )}
                              </div>
                            </div>
                            {!isRealizada && (
                              <button 
                                onClick={() => {
                                  const chk = document.getElementById(`retornar-vinculo-${p.id}`);
                                  const retornarComVinculo = chk ? chk.checked : false;
                                  retornarJogador(p.id, retornarComVinculo);
                                }} 
                                style={S.btn("#1D9E75")}
                              >
                                Retornar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


            </div>
          );
        } catch (err) {
          console.error("Erro na aba Jogos:", err);
          return (
            <div style={{padding: 24, background: "#FFF5F5", border: "1px solid #E24B4A", borderRadius: 8, color: "#E24B4A", margin: "20px 0"}}>
              <h3>⚠️ Ocorreu um erro ao carregar a aba Jogos</h3>
              <p style={{fontWeight: 700}}>{err.message}</p>
              <pre style={{fontSize: 11, overflow: "auto", background: "#FFEBEB", padding: 10, borderRadius: 4}}>{err.stack}</pre>
            </div>
          );
        }
      })())}
{currentAba==="placar"&&(
        <div>
          <StandingsTable standings={peladaStandings()} teams={(String(selDataSorteio) === "todas" ? (consolidatedPeladaState?.teams || []) : (peladaState?.teams || [])).map(x=>x.name)} colorOf={colorOfTeam} accent="#22b7d9" t={t}/>
          
          <div style={{marginTop: 30}}>
            {/* HISTÓRICO DA DATA */}
                {(peladaState?.matchLog||[]).filter(m => String(m.dataRealizacaoId) === String(selDataSorteio)).length>0&&(
                  <div style={{marginTop:20}}>
                    <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 10px 0",color:t.text}}><IconClipboard size={14} style={{marginRight: 4}} /> Histórico da Data</h3>
                    <div style={{display:"flex",flexDirection:"column",gap:8}}>
                      {(peladaState?.matchLog||[]).map((m, originalIndex) => ({m, originalIndex})).filter(({m}) => String(m.dataRealizacaoId) === String(selDataSorteio)).reverse().map(({m, originalIndex})=>(
                        <div key={originalIndex} style={{...S.card,padding:"10px 12px",position:"relative"}}>
                            <button 
                              onClick={() => {
                                setEditMatchId(originalIndex);
                                setEditScoreA(m.scoreA);
                                setEditScoreB(m.scoreB);
                                setEditSumula(m.sumula || {});
                                setEditGoleiroA(m.goleiroA || "");
                                setEditGoleiroB(m.goleiroB || "");
                                setEditGoleiroAInteiro(m.goleiroAInteiro !== false);
                                setEditGoleiroBInteiro(m.goleiroBInteiro !== false);
                                setEditPlayersA(m.playersA || []);
                                setEditPlayersB(m.playersB || []);
                              }}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 12,
                                padding: 2
                              }}
                              title="Editar Partida e Súmula"
                            >
                              <IconEdit size={12} />
                            </button>
                          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:16}}>
                            <span style={{fontWeight:800,fontSize:15,color:"#22b7d9"}}>{m.scoreA} × {m.scoreB}</span>
                            <div style={{marginTop:2,textAlign:"center"}}>
                              <span style={{fontSize:10,color:"#1D9E75",fontWeight:600,display:"block"}}>🏆 {m.winner}</span>
                              {m.tempoJogadoSecs > 0 && (
                                <span style={{fontSize:9,color:t.textSec,display:"block",marginTop:1}}>
                                  ⏱ {Math.floor(m.tempoJogadoSecs/60)}:{String(m.tempoJogadoSecs%60).padStart(2,"0")} jogados
                                </span>
                              )}
                              {m.dataRealizacaoId && datas.find(d=>String(d.id)===String(m.dataRealizacaoId)) && (
                                <span style={{fontSize:9,color:t.textSec,display:"block",marginTop:2}}>
                                  📅 {formatarData(datas.find(d=>String(d.id)===String(m.dataRealizacaoId)).data)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                            <div style={{flex:1,textAlign:"left",minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:m.winner===m.teamA?700:500,color:m.winner===m.teamA?"#1D9E75":t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.teamA}</div>
                              <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>
                                {(m.playersA||[]).map((p,pi)=>{
                                  const gols = m.sumula?.[p.id] ? ` ⚽(${m.sumula[p.id]})` : "";
                                  return <div key={pi} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(p)}{gols}</div>;
                                })}
                              </div>
                            </div>
                            <div style={{flex:1,textAlign:"right",minWidth:0}}>
                              <div style={{fontSize:13,fontWeight:m.winner===m.teamB?700:500,color:m.winner===m.teamB?"#1D9E75":t.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{m.teamB}</div>
                              <div style={{fontSize:10,color:t.textSec,marginTop:2,display:"flex",flexDirection:"column",gap:2}}>
                                {(m.playersB||[]).map((p,pi)=>{
                                  const gols = m.sumula?.[p.id] ? ` (${m.sumula[p.id]})⚽` : "";
                                  return <div key={pi} style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{getPlayerName(p)}{gols}</div>;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
          </div>
        </div>
      )}
      {currentAba==="ranking"&&<AbaRelatorioPelada peladaState={consolidatedPeladaState} datas={datas} atletas={atletas} selDataSorteio={selDataSorteio} repSortBy={repSortBy} setRepSortBy={setRepSortBy} formatarData={formatarData} t={t} />}

      {subModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:300}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:16}}>Mover / Substituir Jogador para:</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {drawnTeams.map((tm,i)=>(
                <button key={i} onClick={()=>movePlayerInRotation(subModal, `t${i+1}`)} style={{...S.btn(COLORS[i%COLORS.length]+"22",COLORS[i%COLORS.length]),justifyContent:"center",fontWeight:700}}>{tm.name}</button>
              ))}
              <button onClick={()=>movePlayerInRotation(subModal, "bench")} style={{...S.btn("#BA751722","#BA7517"),justifyContent:"center",fontWeight:700}}>Banco (Espera)</button>
              <button onClick={()=>setSubModal(null)} style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:`1px solid ${t.cardBorder}`}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {sobrasModalData && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:16}}>⚠️ Jogadores sem Time de Origem</div>
            <div style={{fontSize:12,color:t.textSec,marginBottom:16}}>
              Os seguintes atletas foram adicionados após o sorteio ou não faziam parte das equipes/banco originais:
            </div>
            
            <div style={{maxHeight:120,overflowY:"auto",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:8,marginBottom:16,display:"flex",flexDirection:"column",gap:4,textAlign:"left"}}>
              {sobrasModalData.sobressalentes.map((p,pi)=>(
                <div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                  <PlayerAvatar atleta={p} size={18}/><span>{getPlayerName(p)}</span>
                </div>
              ))}
            </div>

            <div style={{fontSize:12,fontWeight:600,color:t.text,marginBottom:16}}>O que deseja fazer com estes jogadores?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "bench")} 
                style={{...S.btn("#1D9E7522","#1D9E75"),justifyContent:"center",fontWeight:700}}
              >
                📥 Enviar todos para o Banco de Espera
              </button>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "newTeam")} 
                style={{...S.btn("#22b7d922","#22b7d9"),justifyContent:"center",fontWeight:700}}
              >
                ➕ Criar um novo Time com eles
              </button>
              <button 
                onClick={() => setSobrasModalData(null)} 
                style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:`1px solid ${t.cardBorder}`}}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {sobrasModalData && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:16}}>⚠️ Jogadores sem Time de Origem</div>
            <div style={{fontSize:12,color:t.textSec,marginBottom:16}}>
              Os seguintes atletas foram adicionados após o sorteio ou não faziam parte das equipes/banco originais:
            </div>
            
            <div style={{maxHeight:120,overflowY:"auto",background:t.inputBg,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:8,marginBottom:16,display:"flex",flexDirection:"column",gap:4,textAlign:"left"}}>
              {sobrasModalData.sobressalentes.map((p,pi)=>(
                <div key={pi} style={{fontSize:12,color:t.text,display:"flex",alignItems:"center",gap:6}}>
                  <PlayerAvatar atleta={p} size={18}/><span>{getPlayerName(p)}</span>
                </div>
              ))}
            </div>

            <div style={{fontSize:12,fontWeight:600,color:t.text,marginBottom:16}}>O que deseja fazer com estes jogadores?</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "bench")} 
                style={{...S.btn("#1D9E7522","#1D9E75"),justifyContent:"center",fontWeight:700}}
              >
                📥 Enviar todos para o Banco de Espera
              </button>
              <button 
                onClick={() => executarReversaoDirect(sobrasModalData.uniquePlayers, sobrasModalData.sobressalentes, "newTeam")} 
                style={{...S.btn("#22b7d922","#22b7d9"),justifyContent:"center",fontWeight:700}}
              >
                ➕ Criar um novo Time com eles
              </button>
              <button 
                onClick={() => setSobrasModalData(null)} 
                style={{...S.btn(t.card,t.textSec),justifyContent:"center",marginTop:8,border:`1px solid ${t.cardBorder}`}}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Sair do Jogo */}
      {sairModal && (()=>{
        // Detecta se o jogador que vai sair é anfitrião com convidado ativo
        const sairPlayerObj = atletas.find(x => String(x.id) === String(sairModal.playerId));
        const isHostLeaving = sairPlayerObj && !sairPlayerObj.isConvidado;
        const convidadoDoSaindo = isHostLeaving
          ? atletas.find(x => x.isConvidado && String(x.convidadoDe) === String(sairModal.playerId))
          : null;
        const convidadoEstaAtivo = convidadoDoSaindo && (
          peladaState?.teams?.some(t => t.players.some(p => String(p.id) === String(convidadoDoSaindo.id))) ||
          benchState.some(b => String(b.id) === String(convidadoDoSaindo.id)) ||
          jogadoresPausados.some(j => String(j.id) === String(convidadoDoSaindo.id))
        );
        // Substitutos disponíveis = banco normal (excluindo o próprio convidado, se for sair junto)
        const substitutosDisponiveis = benchState.filter(b =>
          !sairComConvidado || !convidadoDoSaindo || String(b.id) !== String(convidadoDoSaindo.id)
        );
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001,padding:16}}>
            <div style={{...S.card,width:"100%",maxWidth:360,maxHeight:"92vh",overflowY:"auto"}}>
              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${t.cardBorder}`}}>
                <span style={{fontSize:22}}><IconX size={10} color="#E24B4A" /></span>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:t.text}}>{sairModal.playerName}</div>
                  <div style={{fontSize:11,color:t.textSec}}>está saindo antes do fim do jogo</div>
                </div>
              </div>

              {/* Motivo */}
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:t.textSec,textTransform:"uppercase",letterSpacing:0.8,marginBottom:16}}>Motivo</div>
                <div style={{display:"flex",gap:6}}>
                  {[
                    {id:"cansaco", label:" Cansaço", color:"#BA7517"},
                    {id:"lesao",   label:"🤕 Lesão",   color:"#E24B4A"},
                    {id:"outro",   label:"📱 Outro",   color:"#6B7280"},
                  ].map(m=>(
                    <button
                      key={m.id}
                      onClick={()=>setSairMotivo(m.id)}
                      style={{
                        flex:1,padding:"8px 4px",borderRadius:10,fontSize:11,fontWeight:700,cursor:"pointer",
                        border:`2px solid ${sairMotivo===m.id ? m.color : t.cardBorder}`,
                        background: sairMotivo===m.id ? m.color+"22" : "transparent",
                        color: sairMotivo===m.id ? m.color : t.textSec,
                        transition:"all 0.15s"
                      }}
                    >{m.label}</button>
                  ))}
                </div>
                {sairMotivo==="lesao" && (
                  <div style={{fontSize:11,color:"#E24B4A",marginTop:8,background:"#E24B4A10",padding:"6px 10px",borderRadius:8}}>
                    ⚠️ Lesão remove o atleta da rotação. Ele não poderá retornar.
                  </div>
                )}
                {sairMotivo!=="lesao" && (
                  <div style={{fontSize:11,color:"#1D9E75",marginTop:8,background:"#1D9E7510",padding:"6px 10px",borderRadius:8}}>
                    ⏸️ Irá para a seção "Descansando" — pode retornar ao banco quando quiser.
                  </div>
                )}
              </div>

              {/* Convidado de carona — só aparece se o anfitrião tiver convidado ativo */}
              {convidadoEstaAtivo && (
                <div style={{marginBottom:16,padding:"10px 12px",borderRadius:10,background:"#7F77DD10",border:"1px solid #7F77DD33"}}>
                  <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={sairComConvidado}
                      onChange={e=>{
                        setSairComConvidado(e.target.checked);
                        if (e.target.checked) setSubstituirPorConvidado(false);
                      }}
                      style={{marginTop:2,width:16,height:16,accentColor:"#7F77DD",flexShrink:0}}
                    />
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#7F77DD"}}>🚗 Convidado também sai</div>
                      <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                        <b>{convidadoDoSaindo.apelido||convidadoDoSaindo.nome}</b> (convidado de carona) também vai embora junto.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Opção: Substituir pelo Convidado */}
              {sairModal.teamName !== "bench" && convidadoEstaAtivo && !sairComConvidado && (
                <div style={{marginBottom:16,padding:"10px 12px",borderRadius:10,background:"#1D9E7510",border:"1px solid #1D9E7533"}}>
                  <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer"}}>
                    <input
                      type="checkbox"
                      checked={substituirPorConvidado}
                      onChange={e=>setSubstituirPorConvidado(e.target.checked)}
                      style={{marginTop:2,width:16,height:16,accentColor:"#1D9E75",flexShrink:0}}
                    />
                    <div>
                      <div style={{fontWeight:700,fontSize:13,color:"#1D9E75"}}>🔄 Substituir pelo convidado</div>
                      <div style={{fontSize:11,color:t.textSec,marginTop:2}}>
                        <b>{convidadoDoSaindo.apelido||convidadoDoSaindo.nome}</b> entrará automaticamente no jogo no lugar de {sairModal.playerName}.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Substituto do banco */}
              {sairModal.teamName !== "bench" && (
                <>
                  {!substituirPorConvidado && substitutosDisponiveis.length > 0 && (
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,fontWeight:700,color:t.textSec,textTransform:"uppercase",letterSpacing:0.8,marginBottom:16}}>Substituir por (opcional)</div>
                      <select
                        value={sairSubstitutoId}
                        onChange={e=>setSairSubstitutoId(e.target.value)}
                        style={{...S.select,fontSize:13}}
                      >
                        <option value="">— Nenhum (sai sem substituto) —</option>
                        {substitutosDisponiveis.map(b=>(
                          <option key={b.id} value={b.id}>{getPlayerName(b)}{b.goleiro ? " 🧤" : ""}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {!substituirPorConvidado && substitutosDisponiveis.length === 0 && (
                    <div style={{fontSize:12,color:t.textSec,marginBottom:16,background:t.inputBg,padding:"8px 12px",borderRadius:8}}>Banco vazio — o time jogará com um a menos.</div>
                  )}
                </>
              )}

              {/* Ações */}
              <div style={{display:"flex",gap:8}}>
                <button
                  onClick={handleSairJogo}
                  style={{...S.btn(sairMotivo==="lesao" ? "#E24B4A" : "#BA7517"),flex:1,justifyContent:"center"}}
                >
                  {sairMotivo==="lesao" ? "🤕 Confirmar Saída (Lesão)" : "⏸️ Confirmar Saída"}
                </button>
                <button
                  onClick={()=>{setSairModal(null);setSairComConvidado(false);setSubstituirPorConvidado(false);}}
                  style={{...S.btn(t.card,t.textSec),border:`1px solid ${t.cardBorder}`,justifyContent:"center"}}
                >Cancelar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {editMatchId !== null && peladaState?.matchLog[editMatchId] && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:350,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:700,fontSize:15,color:t.text,marginBottom:16,textAlign:"center"}}>Editar Partida & Súmula</div>
            
            {/* Placar */}
            <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"center",marginBottom:16}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:650,color:t.textSec,marginBottom:4}}>{peladaState.matchLog[editMatchId].teamA}</div>
                <input 
                  type="number" 
                  min={0} 
                  value={editScoreA} 
                  onChange={e=>setEditScoreA(e.target.value)} 
                  style={{...S.input,width:60,textAlign:"center",fontSize:18,fontWeight:800}}
                />
              </div>
              <span style={{fontWeight:700,color:t.textSec,fontSize:20,marginTop:16}}>×</span>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:11,fontWeight:650,color:t.textSec,marginBottom:4}}>{peladaState.matchLog[editMatchId].teamB}</div>
                <input 
                  type="number" 
                  min={0} 
                  value={editScoreB} 
                  onChange={e=>setEditScoreB(e.target.value)} 
                  style={{...S.input,width:60,textAlign:"center",fontSize:18,fontWeight:800}}
                />
              </div>
            </div>

            {/* Marcadores de Gols */}
            <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
              {/* Marcadores Time A */}
              <div style={{borderBottom:`1px solid ${t.cardBorder}`,paddingBottom:10}}>
                <div style={{fontWeight:700,color:colorOfTeam(peladaState.matchLog[editMatchId].teamA),fontSize:12,marginBottom:6}}>{peladaState.matchLog[editMatchId].teamA} (Marcadores)</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(editPlayersA || []).map(p => (
                    <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button 
                          onClick={() => {
                            setEditPlayersA(prev => prev.filter(x => String(x.id) !== String(p.id)));
                            setEditSumula(prev => {
                              const next = { ...prev };
                              delete next[p.id];
                              return next;
                            });
                          }}
                          style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"2px 4px"}}
                          title="Remover Jogador da Partida"
                        >❌</button>
                        <span style={{color:t.text}}>{getPlayerName(p)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={editSumula[p.id] || ""} 
                          onChange={e => updateEditSumulaAndScore(p.id, e.target.value, 'A')}
                          style={{...S.input,width:40,padding:"3px 6px",fontSize:11,textAlign:"center"}}
                        />
                        <span><IconSoccer size={14} /></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Adicionar Jogador Time A */}
                <div style={{marginTop: 8, display: "flex", gap: 6, alignItems: "center"}}>
                  <select 
                    id="add-player-a-select"
                    style={{...S.select, padding: "3px 6px", fontSize: 11, flex: 1}}
                    defaultValue=""
                  >
                    <option value="">+ Adicionar ao {peladaState.matchLog[editMatchId].teamA}...</option>
                    {atletas.filter(a => ![...editPlayersA, ...editPlayersB].map(x => String(x.id)).includes(String(a.id))).map(a => (
                      <option key={a.id} value={a.id}>{getPlayerName(a)}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const select = document.getElementById("add-player-a-select");
                      if (select && select.value) {
                        const atleta = atletas.find(x => String(x.id) === String(select.value));
                        if (atleta) {
                          setEditPlayersA(prev => [...prev, { id: atleta.id, nome: atleta.nome, apelido: atleta.apelido, goleiro: atleta.goleiro }]);
                        }
                        select.value = "";
                      }
                    }}
                    style={{...S.btnSm("#1D9E7522","#1D9E75"), padding: "4px 8px"}}
                  >Add</button>
                </div>
              </div>

              {/* Marcadores Time B */}
              <div>
                <div style={{fontWeight:700,color:colorOfTeam(peladaState.matchLog[editMatchId].teamB),fontSize:12,marginBottom:6}}>{peladaState.matchLog[editMatchId].teamB} (Marcadores)</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {(editPlayersB || []).map(p => (
                    <div key={p.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <button 
                          onClick={() => {
                            setEditPlayersB(prev => prev.filter(x => String(x.id) !== String(p.id)));
                            setEditSumula(prev => {
                              const next = { ...prev };
                              delete next[p.id];
                              return next;
                            });
                          }}
                          style={{border:"none",background:"transparent",color:"#E24B4A",cursor:"pointer",padding:"2px 4px"}}
                          title="Remover Jogador da Partida"
                        >❌</button>
                        <span style={{color:t.text}}>{getPlayerName(p)}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:4}}>
                        <input 
                          type="number" 
                          min={0} 
                          placeholder="0"
                          value={editSumula[p.id] || ""} 
                          onChange={e => updateEditSumulaAndScore(p.id, e.target.value, 'B')}
                          style={{...S.input,width:40,padding:"3px 6px",fontSize:11,textAlign:"center"}}
                        />
                        <span><IconSoccer size={14} /></span>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Adicionar Jogador Time B */}
                <div style={{marginTop: 8, display: "flex", gap: 6, alignItems: "center"}}>
                  <select 
                    id="add-player-b-select"
                    style={{...S.select, padding: "3px 6px", fontSize: 11, flex: 1}}
                    defaultValue=""
                  >
                    <option value="">+ Adicionar ao {peladaState.matchLog[editMatchId].teamB}...</option>
                    {atletas.filter(a => ![...editPlayersA, ...editPlayersB].map(x => String(x.id)).includes(String(a.id))).map(a => (
                      <option key={a.id} value={a.id}>{getPlayerName(a)}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      const select = document.getElementById("add-player-b-select");
                      if (select && select.value) {
                        const atleta = atletas.find(x => String(x.id) === String(select.value));
                        if (atleta) {
                          setEditPlayersB(prev => [...prev, { id: atleta.id, nome: atleta.nome, apelido: atleta.apelido, goleiro: atleta.goleiro }]);
                        }
                        select.value = "";
                      }
                    }}
                    style={{...S.btnSm("#1D9E7522","#1D9E75"), padding: "4px 8px"}}
                  >Add</button>
                </div>
              </div>
            </div>

            {/* Goleiros das Equipes */}
            <div style={{borderTop:`1px solid ${t.cardBorder}`,paddingTop:10,marginBottom:16,display:"flex",flexDirection:"column",gap:10}}>
              <div style={{fontWeight:700,fontSize:12,color:t.text}}>🧤 Goleiros da Partida</div>
              
              {/* Goleiro Time A */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:11,fontWeight:600,color:colorOfTeam(peladaState.matchLog[editMatchId].teamA)}}>{peladaState.matchLog[editMatchId].teamA}:</div>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
                  <select 
                    value={editGoleiroA} 
                    onChange={e => setEditGoleiroA(e.target.value)}
                    style={{...S.select,padding:"3px 6px",fontSize:11,width:"60%"}}
                  >
                    <option value="">Nenhum</option>
                    {(editPlayersA || []).map(p => (
                      <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                    ))}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:t.textSec,cursor:"pointer"}}>
                    <input 
                      type="checkbox" 
                      checked={editGoleiroAInteiro} 
                      onChange={e => setEditGoleiroAInteiro(e.target.checked)}
                      style={{width:12,height:12,margin:0}}
                    />
                    Todo o jogo
                  </label>
                </div>
              </div>

              {/* Goleiro Time B */}
              <div style={{display:"flex",flexDirection:"column",gap:4}}>
                <div style={{fontSize:11,fontWeight:600,color:colorOfTeam(peladaState.matchLog[editMatchId].teamB)}}>{peladaState.matchLog[editMatchId].teamB}:</div>
                <div style={{display:"flex",alignItems:"center",gap:6,justifyContent:"space-between"}}>
                  <select 
                    value={editGoleiroB} 
                    onChange={e => setEditGoleiroB(e.target.value)}
                    style={{...S.select,padding:"3px 6px",fontSize:11,width:"60%"}}
                  >
                    <option value="">Nenhum</option>
                    {(editPlayersB || []).map(p => (
                      <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                    ))}
                  </select>
                  <label style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:t.textSec,cursor:"pointer"}}>
                    <input 
                      type="checkbox" 
                      checked={editGoleiroBInteiro} 
                      onChange={e => setEditGoleiroBInteiro(e.target.checked)}
                      style={{width:12,height:12,margin:0}}
                    />
                    Todo o jogo
                  </label>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={saveEditedMatch} style={{...S.btn("#1D9E75"),flex:1,justifyContent:"center"}}>✓ Salvar</button>
              <button onClick={()=>setEditMatchId(null)} style={{...S.btn(t.card,t.textSec),flex:1,justifyContent:"center",border:`1px solid ${t.cardBorder}`}}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalGol && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}>
          <div style={{...S.card, width:"100%", maxWidth:320, background: "#1E293B", border: `1px solid ${t.accent}33`, boxShadow: `0 0 20px ${t.accent}20`}}>
            <div style={{fontWeight:800, fontSize:15, color:"#F8FAFC", marginBottom:16, display: "flex", alignItems: "center", gap: 6}}>
              <IconSoccer size={16} color={t.accent} /> Registrar Gol: {modalGol === 'A' ? peladaState.currentMatch.teamA : peladaState.currentMatch.teamB}
            </div>
            
            <div style={{display:"flex", flexDirection:"column", gap:12, marginBottom:20}}>
              {/* Autor do Gol */}
              <div>
                <label style={{display:"block", fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:4}}>Autor do Gol</label>
                <select 
                  value={autorGolId} 
                  onChange={e => setAutorGolId(e.target.value)} 
                  style={{...S.select, width: "100%", background: "#0F172A", color: "#F8FAFC", border: "1px solid #334155", outline: "none"}}
                >
                  <option value="">Selecione o jogador...</option>
                  {getJogadoresEmCampo(modalGol).map(p => (
                    <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                  ))}
                </select>
              </div>

              {/* Assistência */}
              <div>
                <label style={{display:"block", fontSize:11, fontWeight:700, color:"#94A3B8", marginBottom:4}}>Assistência (Opcional)</label>
                <select 
                  value={autorAssistenciaId} 
                  onChange={e => setAutorAssistenciaId(e.target.value)} 
                  style={{...S.select, width: "100%", background: "#0F172A", color: "#F8FAFC", border: "1px solid #334155", outline: "none"}}
                >
                  <option value="">Sem assistência</option>
                  {getJogadoresEmCampo(modalGol).filter(p => String(p.id) !== String(autorGolId)).map(p => (
                    <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{display:"flex", gap:8}}>
              <button 
                onClick={confirmarGolAssist}
                disabled={!autorGolId}
                style={{
                  ...S.btn("#10B98122", "#10B981"), 
                  flex: 1, 
                  justifyContent: "center", 
                  fontWeight: 700, 
                  opacity: autorGolId ? 1 : 0.5,
                  cursor: autorGolId ? "pointer" : "default"
                }}
              >
                Confirmar
              </button>
              <button 
                onClick={() => setModalGol(null)} 
                style={{...S.btn("#334155", "#94A3B8"), flex: 1, justifyContent: "center", fontWeight: 700}}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalGerenciarTime && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}>
          <div style={{...S.card, width:"100%", maxWidth:400, background: "#1E293B", border: `1px solid ${t.accent}33`, boxShadow: `0 0 20px ${t.accent}20`}}>
            {(() => {
              const match = peladaState?.currentMatch;
              const currentModalTeamName = modalGerenciarTime === 'A' ? match?.teamA : modalGerenciarTime === 'B' ? match?.teamB : modalGerenciarTime;
              const isAtivo = match && (currentModalTeamName === match.teamA || currentModalTeamName === match.teamB);
              const isTeamA = currentModalTeamName === match?.teamA;
              
              return (
                <>
                  <div style={{fontWeight:800, fontSize:15, color:"#F8FAFC", marginBottom:16, display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    <span style={{display: "flex", alignItems: "center", gap: 6}}>
                      <IconUser size={16} color={t.accent} /> Gerenciar: {currentModalTeamName}
                    </span>
                    <button onClick={() => setModalGerenciarTime(null)} style={{background: "none", border: "none", color: "#94A3B8", cursor: "pointer", display: "inline-flex", alignItems: "center"}}>
                      <IconX size={16} color="#94A3B8" />
                    </button>
                  </div>

                  <div style={{display:"flex", flexDirection:"column", gap:10, maxHeight: "250px", overflowY: "auto", marginBottom: 16}}>
                    {getJogadoresEmCampo(modalGerenciarTime).map((p, idx) => (
                      <div key={idx} style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#0F172A", borderRadius: 8, border: "1px solid #1E293B", gap: 8}}>
                        <span style={{fontSize: 12, fontWeight: 600, color: "#F8FAFC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1}}>{getPlayerName(p)}</span>
                        
                        <div style={{display: "flex", gap: 4, flexShrink: 0}}>
                          {/* Mover (Trocar de Time) - apenas se for time ativo */}
                          {isAtivo && (
                            <button 
                              onClick={() => trocarTimeAtleta(p.id, currentModalTeamName)}
                              style={{
                                background: "transparent", 
                                border: "1px solid #22b7d944", 
                                color: "#22b7d9", 
                                borderRadius: 6, 
                                padding: "3px 6px", 
                                fontSize: 9, 
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2
                              }}
                              title="Mover para o time adversário"
                            >
                              <IconRefresh size={10} color="#22b7d9" /> Mover
                            </button>
                          )}

                          {/* Substituir */}
                          <button 
                            onClick={() => {
                              setSubModal(p.id);
                              setModalGerenciarTime(null);
                            }}
                            style={{
                              background: "transparent", 
                              border: "1px solid #10B98144", 
                              color: "#10B981", 
                              borderRadius: 6, 
                              padding: "3px 6px", 
                              fontSize: 9, 
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 2
                            }}
                            title="Substituir por atleta do banco"
                          >
                            <IconRefresh size={10} color="#10B981" /> Substituir
                          </button>

                          {/* Sair do jogo */}
                          <button 
                            onClick={() => {
                              setSairMotivo("cansaco");
                              setSairSubstitutoId("");
                              setSairModal({
                                playerId: p.id,
                                playerName: getPlayerName(p),
                                teamName: currentModalTeamName
                              });
                              setModalGerenciarTime(null);
                            }}
                            style={{
                              background: "transparent", 
                              border: "1px solid #E24B4A44", 
                              color: "#E24B4A", 
                              borderRadius: 6, 
                              padding: "3px 6px", 
                              fontSize: 9, 
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 2
                            }}
                            title="Retirar do jogo para o banco"
                          >
                            <IconX size={10} color="#E24B4A" /> Sair
                          </button>

                          {/* Remover do Rodízio - apenas se for time na fila */}
                          {!isAtivo && (
                            <button 
                              onClick={() => {
                                removeFromRotation(p.id);
                                setModalGerenciarTime(null);
                              }}
                              style={{
                                background: "transparent", 
                                border: "1px solid #E24B4A44", 
                                color: "#E24B4A", 
                                borderRadius: 6, 
                                padding: "3px 6px", 
                                fontSize: 9, 
                                fontWeight: 700,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: 2
                              }}
                              title="Remover do Rodízio (presença)"
                            >
                              <IconX size={10} color="#E24B4A" /> Remover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Configuração de Goleiro Integrada no Modal (apenas time ativo) */}
                  {isAtivo && (
                    <div style={{marginTop: 12, borderTop: "1px dashed #334155", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8}}>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <span style={{fontSize: 11, fontWeight: 700, color: "#94A3B8", display: "flex", alignItems: "center", gap: 4}}>
                          <IconGoalkeeper size={12} color="#94A3B8" /> Goleiro:
                        </span>
                        <select 
                          value={isTeamA ? (peladaState.currentMatch.goleiroA || "") : (peladaState.currentMatch.goleiroB || "")} 
                          onChange={e => {
                            const value = e.target.value;
                            const ps = {
                              ...peladaState,
                              currentMatch: { 
                                ...peladaState.currentMatch, 
                                [isTeamA ? 'goleiroA' : 'goleiroB']: value 
                              }
                            };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          style={{...S.select, padding: "2px 6px", fontSize: 11, background: "#0F172A", color: "#F8FAFC", border: "1px solid #334155", outline: "none", width: "160px", height: "26px"}}
                        >
                          <option value="">Nenhum</option>
                          {getJogadoresEmCampo(modalGerenciarTime).map(p => (
                            <option key={p.id} value={p.id}>{getPlayerName(p)}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <span style={{fontSize: 11, fontWeight: 700, color: "#94A3B8"}}>Jogou todo o jogo:</span>
                        <input 
                          type="checkbox" 
                          checked={isTeamA ? (peladaState.currentMatch.goleiroAInteiro !== false) : (peladaState.currentMatch.goleiroBInteiro !== false)} 
                          onChange={e => {
                            const checked = e.target.checked;
                            const ps = {
                              ...peladaState,
                              currentMatch: { 
                                ...peladaState.currentMatch, 
                                [isTeamA ? 'goleiroAInteiro' : 'goleiroBInteiro']: checked 
                              }
                            };
                            setPeladaStateLocal(ps);
                            saveDateState({ peladaState: ps });
                          }}
                          style={{width: 14, height: 14, cursor: "pointer"}}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{marginTop: 16, display: "flex", justifyContent: "flex-end"}}>
                    <button 
                      onClick={() => setModalGerenciarTime(null)} 
                      style={{...S.btn("#334155", "#94A3B8"), padding: "6px 16px", fontWeight: 700, fontSize: 11}}
                    >
                      Fechar
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {modalConfirmacaoNavegacao && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:16}}>
          <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:16}}>⚠️</div>
            <div style={{fontWeight:700,fontSize:16,color:t.text,marginBottom:16}}>Alterações Não Salvas!</div>
            <p style={{fontSize:13,color:t.textSec,marginBottom:20}}>Você tem modificações na lista de atletas vinculados desta rodada. Deseja salvar antes de prosseguir?</p>
            
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button 
                onClick={async () => {
                  if (triggerSaveRef.current) {
                    await triggerSaveRef.current();
                  }
                  setHasUnsavedChangesAtletas(false);
                  const dest = modalConfirmacaoNavegacao;
                  setModalConfirmacaoNavegacao(null);
                  executarNavegacaoDestino(dest);
                }} 
                style={S.btn("#1D9E75")}
              >
                💾 Salvar e Continuar
              </button>
              <button 
                onClick={() => {
                  setHasUnsavedChangesAtletas(false);
                  const dest = modalConfirmacaoNavegacao;
                  setModalConfirmacaoNavegacao(null);
                  executarNavegacaoDestino(dest);
                }} 
                style={S.btn("#E24B4A")}
              >
                <IconTrash size={12} />️ Descartar Alterações
              </button>
              <button 
                onClick={() => setModalConfirmacaoNavegacao(null)} 
                style={S.btn(t.card, t.textSec)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {qrCodeModalUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 99999,
          padding: 16
        }}>
          <div style={{
            ...S.card,
            maxWidth: 320,
            width: "100%",
            textAlign: "center",
            padding: 24,
            background: t.card,
            border: `1px solid ${t.cardBorder}`,
            borderRadius: 12,
            boxShadow: "0 10px 25px rgba(0,0,0,0.3)"
          }}>
            <h3 style={{fontSize: 16, fontWeight: 800, margin: "0 0 8px 0", color: t.text}}>📱 QR Code do Acompanhamento</h3>
            <p style={{fontSize: 11, color: t.textSec, marginBottom: 16}}>
              Aponte a câmera do celular para abrir o painel de jogos e fila em tempo real.
            </p>
            
            <div style={{
              background: "#FFFFFF",
              padding: 12,
              borderRadius: 12,
              display: "inline-block",
              marginBottom: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeModalUrl)}`} 
                alt="QR Code"
                style={{display: "block", width: 200, height: 200}}
              />
            </div>
            
            <div style={{display: "flex", flexDirection: "column", gap: 8}}>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(qrCodeModalUrl);
                  alert("Link copiado com sucesso!");
                }}
                style={{...S.btn("#7F77DD"), padding: "8px", fontSize: 12, justifyContent: "center"}}
              >
                🔗 Copiar Link de Acesso
              </button>
              
              <button 
                onClick={() => setQrCodeModalUrl(null)}
                style={{...S.btn(t.inputBg, t.textSec), padding: "8px", fontSize: 12, border: `1px solid ${t.cardBorder}`, justifyContent: "center"}}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─────────────────────────── ABA COLABORADORES ITEM ───────────────── */
export default function App(){
  const{dark,setDark,t:themeBase}=useTheme();
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 1024 : false);

  const getLoanTag = (atleta, currentTeamName) => {
    if (!atleta || !peladaState || !peladaState.teamBases || !currentTeamName) return null;
    const athleteId = String(atleta.id || atleta.atleta_id || atleta.idAtleta);
    const baseIds = peladaState.teamBases[currentTeamName] || [];
    if (baseIds.some(id => String(id) === athleteId)) return null;
    for (const teamName of Object.keys(peladaState.teamBases)) {
      const ids = peladaState.teamBases[teamName] || [];
      if (ids.some(id => String(id) === athleteId)) {
        const matches = teamName.match(/\d+/);
        const sigla = matches ? `T${matches[0]}` : teamName.substring(0, 3).toUpperCase();
        return <span style={{marginLeft: 4, color: "#FFA726", fontSize: 10, fontWeight: "bold"}} title={`Emprestado do ${teamName}`}><IconHandshake size={10} style={{marginLeft: 2}} /> ({sigla})</span>;
      }
    }
    return null;
  };


  
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("app_font_scale");
      return saved !== null ? parseFloat(saved) : 1.0;
    }
    return 1.0;
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.body.classList.remove("scale-115", "scale-130", "scale-145");
      if (fontScale === 1.15) document.body.classList.add("scale-115");
      else if (fontScale === 1.30) document.body.classList.add("scale-130");
      else if (fontScale === 1.45) document.body.classList.add("scale-145");
    }
  }, [fontScale]);

  const toggleFontScale = () => {
    setFontScale(prev => {
      let next = 1.0;
      if (prev === 1.0) next = 1.15;
      else if (prev === 1.15) next = 1.30;
      else if (prev === 1.30) next = 1.45;
      else next = 1.0;
      
      localStorage.setItem("app_font_scale", String(next));
      return next;
    });
  };
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("system_accent") || "#22b7d9";
  });
  const changeAccentColor = (color) => {
    setAccentColor(color);
    localStorage.setItem("system_accent", color);
  };
  const t = { ...themeBase, accent: accentColor, changeAccentColor };
  const S=makeStyles(t);

  // ── ESTADOS E COMPONENTES DO MENU GLOBAL (LAYOUT SIMPLIFICADO) ─
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeChampTab, setActiveChampTab] = useState("jogos");
  const [activePeladaTab, setActivePeladaTab] = useState("info");
  const [expandMenuHome, setExpandMenuHome] = useState(false);
  const [selectedFinanceChamp, setSelectedFinanceChamp] = useState("geral");

  const GEHeader = () => {
    let subBarTitle = "Minhas Peladas";
    let links = [];
    const isGlobalScreen = ["home", "atletas", "quadras", "financeiro", "backup", "managerRegistry", "novoChamp", "novaPelada"].includes(screen);
    if (isGlobalScreen) {
      subBarTitle = "Painel Geral";
      links = [
        { label: "Início", active: screen === "home", onClick: () => setScreen("home") },
        { label: "Atletas", active: screen === "atletas", onClick: () => setScreen("atletas") },
        { label: "Quadras", active: screen === "quadras", onClick: () => setScreen("quadras") },
        { label: "Financeiro", active: screen === "financeiro", onClick: () => setScreen("financeiro") },
        { label: "Backup", active: screen === "backup", onClick: () => setScreen("backup") },
      ];
      if (auth.role === "adm") {
        links.push({ label: "Gestores", active: screen === "managerRegistry", onClick: () => setScreen("managerRegistry") });
      }

    } else if (screen === "gerenciarPelada" && current) {
      const p = peladas.find(x => x.id === current.id) || current;
      subBarTitle = p.nome;
      const pelAbas = [
        { id: "info", label: "Sorteio" },
        { id: "datas", label: "Datas" },
        { id: "atletas", label: "Atletas" },
        { id: "participações", label: "Presenças" }
      ];
      links = [
        { label: "← Voltar", active: false, onClick: () => setScreen("home"), style: { color: "#E24B4A", fontWeight: "900" } },
        ...pelAbas.map(ab => ({
          label: ab.label,
          active: activePeladaTab === ab.id,
          onClick: () => setActivePeladaTab(ab.id)
        }))
      ];
    }
    return (
      <div style={{width: "100%", zIndex: 1000, display: "flex", flexDirection: "column"}}>
        {/* Barra Superior Principal */}
        <div style={{
          backgroundColor: t.accent,
          height: 48,
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          position: "relative",
          zIndex: 1002
        }}>
          <div style={{
            width: "100%",
            maxWidth: "1200px",
            height: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            boxSizing: "border-box"
          }}>
            <div style={{display: "flex", alignItems: "center", gap: 14}}>
              <button 
                onClick={() => setMenuOpen(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  borderRadius: 4,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: "800",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                <span style={{fontSize: 16}}>☰</span>
                <span style={{display: isMobile ? "none" : "inline"}}>MENU</span>
              </button>
              <div style={{height: 20, width: 1, backgroundColor: "rgba(255,255,255,0.2)"}} />
              <div 
                onClick={() => setScreen("home")}
                style={{
                  fontSize: 18,
                  fontWeight: "900",
                  color: "#fff",
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                Thorneios
              </div>
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 12}}>
              {!isMobile && (
                <span style={{fontSize: 12, color: "#fff", opacity: 0.9, fontFamily: "'Inter', sans-serif"}}>
                  Olá, <strong>{auth.name || "Gestor"}</strong>
                </span>
              )}
              <FontScaleBtn />
              <DarkBtn />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const GEDrawer = () => {
    if (!menuOpen) return null;
    return (
      <div style={{position: "fixed", inset: 0, zIndex: 10000}}>
        <div 
          onClick={() => setMenuOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            transition: "opacity 0.3s ease"
          }} 
        />
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: 280,
          backgroundColor: t.card,
          borderRight: "1px solid " + t.cardBorder,
          boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{
            height: 48,
            backgroundColor: t.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            color: "#fff"
          }}>
            <div style={{fontSize: 20, fontWeight: "900", letterSpacing: "0.5px"}}>
              Thorneios
            </div>
            <button 
              onClick={() => setMenuOpen(false)}
              style={{background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 4}}
            >
              ✕
            </button>
          </div>
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}>
            <div>
              <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, padding: "0 20px 8px 20px", textTransform: "uppercase", letterSpacing: "1px"}}>Painel Administrativo</div>
              <div style={{display: "flex", flexDirection: "column"}}>
                {[
                  { label: "Início / Home", icon: <IconHome size={16} />, active: screen === "home", onClick: () => { setScreen("home"); setMenuOpen(false); } },
                  { label: "Atletas / Mensalistas", icon: <IconUsers size={16} />, active: screen === "atletas", onClick: () => { setScreen("atletas"); setMenuOpen(false); } },
                  { label: "Quadras / Campos", icon: <IconGoalNet size={16} />, active: screen === "quadras", onClick: () => { setScreen("quadras"); setMenuOpen(false); } },
                  { label: "Caixa Financeiro", icon: <IconWallet size={16} />, active: screen === "financeiro", onClick: () => { setScreen("financeiro"); setMenuOpen(false); } },
                  { label: "Importar / Exportar (Backup)", icon: <IconDatabase size={16} />, active: screen === "backup", onClick: () => { setScreen("backup"); setMenuOpen(false); } },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.onClick}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 20px",
                      width: "100%",
                      textAlign: "left",
                      background: item.active ? `${t.accent}12` : "transparent",
                      border: "none",
                      borderLeft: `4px solid ${item.active ? t.accent : "transparent"}`,
                      color: item.active ? t.accent : t.text,
                      fontWeight: item.active ? "800" : "600",
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    <span style={{display: "flex", alignItems: "center", justifyContent: "center", color: item.active ? t.accent : t.textSec}}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, padding: "0 20px 8px 20px", textTransform: "uppercase", letterSpacing: "1px", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                <span>Minhas Peladas ({peladas.length})</span>
                <button onClick={() => { setScreen("novaPelada"); setMenuOpen(false); }} style={{background: "none", border: "none", color: "#10b981", fontWeight: "900", cursor: "pointer", fontSize: 11, padding: 0}}>+ Nova</button>
              </div>
              <div style={{display: "flex", flexDirection: "column", maxHeight: 150, overflowY: "auto"}}>
                {peladas.map(p => {
                  const isCur = screen === "gerenciarPelada" && current?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setCurrent(p); setScreen("gerenciarPelada"); setMenuOpen(false); }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "8px 20px",
                        width: "100%",
                        textAlign: "left",
                        background: isCur ? "rgba(34, 183, 217, 0.08)" : "transparent",
                        border: "none",
                        borderLeft: `4px solid ${isCur ? "#22b7d9" : "transparent"}`,
                        color: isCur ? "#22b7d9" : t.text,
                        fontWeight: isCur ? "800" : "550",
                        fontSize: 12.5,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <span style={{display: "flex", alignItems: "center", justifyContent: "center", color: isCur ? "#22b7d9" : t.textSec}}><IconSoccer size={13} /></span>
                      <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{p.nome}</span>
                    </button>
                  );
                })}
                {peladas.length === 0 && <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 20px"}}>Nenhuma pelada.</div>}
              </div>
            </div>
          </div>
          <div style={{
            borderTop: "1px solid " + t.cardBorder,
            padding: "12px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: t.bg
          }}>
            {auth.role === "adm" && (
              <button onClick={() => { setScreen("managerRegistry"); setMenuOpen(false); }} style={{...S.btnSm(t.card, t.text), justifyContent: "center", fontSize: 12, fontWeight: "700"}}>Gestores da Liga</button>
            )}
            <div style={{display: "flex", gap: 6}}>
              <button onClick={() => { setModalPassword(true); setMenuOpen(false); }} style={{...S.btnSm(t.card, t.text), flex: 1, justifyContent: "center", fontSize: 11.5, fontWeight: "700"}}>Alterar Senha</button>
              <button onClick={() => { handleLogout(); setMenuOpen(false); }} style={{...S.btnSm("#E24B4A22", "#E24B4A"), flex: 1, justifyContent: "center", fontSize: 11.5, fontWeight: "800"}}>Sair</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── SIDEBAR PERMANENTE (Desktop) ──────────────────────────────── */
  const PermanentSidebar = () => {
    if (isMobile) return null;
    const navItems = [
      { label: "Início", icon: <IconHome size={16} />, screen: "home" },
      { label: "Atletas", icon: <IconUsers size={16} />, screen: "atletas" },
      { label: "Quadras / Campos", icon: <IconGoalNet size={16} />, screen: "quadras" },
      { label: "Financeiro", icon: <IconWallet size={16} />, screen: "financeiro" },
      { label: "Backup", icon: <IconDatabase size={16} />, screen: "backup" },
      ...(auth.role === "adm" ? [{ label: "Gestores", icon: <IconSettings size={16} />, screen: "managerRegistry" }] : []),
    ];

    const avatarLetter = (auth.name || "U")[0].toUpperCase();

    return (
      <div style={{
        width: 240,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid " + t.cardBorder,
        backgroundColor: t.card,
        height: "100%",
        overflowY: "auto",
        fontFamily: "'Inter', sans-serif",
        gap: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 88px)",
      }}>
        {/* Perfil do usuário */}
        <div style={{
          padding: "16px 14px",
          borderBottom: "1px solid " + t.cardBorder,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${t.accent}, #22b7d9)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 18,
            color: "#fff",
            flexShrink: 0,
            boxShadow: `0 2px 8px ${t.accent}40`
          }}>
            {avatarLetter}
          </div>
          <div style={{minWidth: 0, flex: 1}}>
            <div style={{fontSize: 13, fontWeight: 800, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
              {auth.name || "Gestor"}
            </div>
            <div style={{fontSize: 10, color: t.textSec, marginTop: 1, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 700}}>
              {auth.role === "adm" ? "Administrador" : "Gestor"}
            </div>
          </div>
        </div>

        {/* Navegação Principal */}
        <div style={{padding: "10px 0"}}>
          <div style={{fontSize: 9, fontWeight: 900, color: t.textSec, padding: "0 14px 6px 14px", textTransform: "uppercase", letterSpacing: 1.2}}>
            Menu
          </div>
          {navItems.map((item) => {
            const isActive = screen === item.screen;
            return (
              <button
                key={item.screen}
                onClick={() => setScreen(item.screen)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px",
                  width: "100%",
                  textAlign: "left",
                  background: isActive ? `${t.accent}12` : "transparent",
                  border: "none",
                  borderLeft: `3px solid ${isActive ? t.accent : "transparent"}`,
                  color: isActive ? t.accent : t.text,
                  fontWeight: isActive ? 800 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = t.inputBg; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; } }}
              >
                <span style={{display: "flex", alignItems: "center", justifyContent: "center", color: isActive ? t.accent : t.textSec, flexShrink: 0}}>{item.icon}</span>
                <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{item.label}</span>
              </button>
            );
          })}
        </div>

        

        {/* Peladas */}
        <div style={{padding: "0 0 8px 0", borderTop: "1px solid " + t.cardBorder}}>
          <div style={{
            fontSize: 9, fontWeight: 900, color: t.textSec,
            padding: "10px 14px 6px 14px", textTransform: "uppercase", letterSpacing: 1.2,
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>Peladas ({peladas.length})</span>
            <button onClick={() => setScreen("novaPelada")} style={{background: "none", border: "none", color: "#22b7d9", fontWeight: 900, cursor: "pointer", fontSize: 11, padding: 0, fontFamily: "'Inter', sans-serif"}}>
              + Nova
            </button>
          </div>
          <div style={{maxHeight: 140, overflowY: "auto"}}>
            {peladas.map(p2 => {
              const isCur = screen === "gerenciarPelada" && current?.id === p2.id;
              return (
                <button
                  key={p2.id}
                  onClick={() => { setCurrent(p2); setScreen("gerenciarPelada"); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "7px 14px",
                    width: "100%", textAlign: "left",
                    background: isCur ? "#22b7d912" : "transparent",
                    border: "none",
                    borderLeft: `3px solid ${isCur ? "#22b7d9" : "transparent"}`,
                    color: isCur ? "#22b7d9" : t.text,
                    fontWeight: isCur ? 800 : 500,
                    fontSize: 12, cursor: "pointer",
                    fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { if (!isCur) e.currentTarget.style.background = t.inputBg; }}
                  onMouseLeave={e => { if (!isCur) e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{fontSize: 12, flexShrink: 0}}>👟</span>
                  <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1}}>{p2.nome}</span>
                </button>
              );
            })}
            {peladas.length === 0 && (
              <div style={{fontSize: 11, color: t.textSec, fontStyle: "italic", padding: "4px 14px"}}>Nenhuma pelada.</div>
            )}
          </div>
        </div>

        {/* Rodapé da Sidebar */}
        <div style={{marginTop: "auto", borderTop: "1px solid " + t.cardBorder, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 6}}>
          <button onClick={() => setModalPassword(true)} style={{...S.btnSm(t.inputBg, t.textSec), justifyContent: "center", fontSize: 11.5, width: "100%"}}>
            Alterar Senha
          </button>
          <button onClick={handleLogout} style={{...S.btnSm("#E24B4A22", "#E24B4A"), justifyContent: "center", fontSize: 11.5, width: "100%", fontWeight: 800}}>
            Sair
          </button>
        </div>
      </div>
    );
  };

  const RightPanel = () => {
    const isDark = dark;
    const ac = t.accent || "#22D9C8";
    
    // -------------------------------------------------------------
    // CALCULO DO CAIXA DE PELADAS
    // -------------------------------------------------------------
    const allEntries = financeiroFiltered?.entries || [];
    const visiblePeladas = peladas;
    const visiblePeladaIds = peladas.map(p => String(p.id));
    const activeDatasIds = datasRealizacao.map(d => String(d.id));

    const peladaEntries = allEntries.filter(e => {
      if (sidebarPeladaId === "all") {
        return e.pelada_id && String(e.pelada_id) !== "null" && String(e.pelada_id) !== "";
      } else {
        return String(e.pelada_id) === String(sidebarPeladaId) || String(e.pelada_id) === "pelada:" + sidebarPeladaId;
      }
    });

    const peladaDespesas = peladaEntries.filter(e => e.type === "despesa").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const peladaReceitasManuais = peladaEntries.filter(e => e.type === "receita").reduce((sum, e) => sum + Number(e.amount || 0), 0);

    let peladaAutoIncome = 0;
    if (sidebarPeladaId === "all") {
      const participacoesVisiveis = participacoes.filter(p => visiblePeladaIds.includes(String(p.pelada_id)));
      peladaAutoIncome = participacoesVisiveis.filter(p => {
        if (!p.pagou || p.usou_saldo) return false;
        if (p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
        if (!activeDatasIds.includes(String(p.data_realizacao_id))) return false;
        return true;
      }).reduce((sum, p) => sum + Number(p.valor || 0), 0);
    } else {
      const activeDatasPeladaIds = datasRealizacao.filter(d => String(d.pelada_id) === String(sidebarPeladaId)).map(d => String(d.id));
      peladaAutoIncome = participacoes.filter(p => {
        if (!p.pagou || String(p.pelada_id) !== String(sidebarPeladaId)) return false;
        if (p.data_realizacao_id === null || p.data_realizacao_id === undefined || String(p.data_realizacao_id) === "null" || String(p.data_realizacao_id) === "") return false;
        if (!activeDatasPeladaIds.includes(String(p.data_realizacao_id))) return false;
        return true;
      }).reduce((sum, p) => sum + Number(p.valor || 0), 0);
    }

    const peladaReceitas = peladaReceitasManuais + peladaAutoIncome;
    const peladaSaldo = peladaReceitas - peladaDespesas;

    const accentOptions = [
      { name: "Ciano", color: "#22D9C8" },
      { name: "Verde", color: "#20E278" },
      { name: "Azul", color: "#22b7d9" },
      { name: "Roxo", color: "#7F77DD" },
      { name: "Laranja", color: "#D85A30" }
    ];

    const handleSetFontScale = (scale) => {
      setFontScale(scale);
      localStorage.setItem("app_font_scale", String(scale));
    };

    return (
      <div style={{
        width: isMobile ? "100%" : 270,
        flexShrink: 0,
        display: "flex",
        flexDirection: isMobile ? "row" : "column",
        flexWrap: isMobile ? "wrap" : "nowrap",
        borderLeft: isMobile ? "none" : `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}`,
        borderTop: isMobile ? `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)"}` : "none",
        background: isDark ? "#000000" : "#F8FAFC",
        height: isMobile ? "auto" : "100%",
        overflowY: isMobile ? "visible" : "auto",
        fontFamily: "'Inter', sans-serif",
        position: isMobile ? "static" : "sticky",
        top: 0,
        alignSelf: "flex-start",
        maxHeight: isMobile ? "none" : "calc(100vh - 52px)",
        padding: isMobile ? "24px" : "14px 12px",
        boxSizing: "border-box",
        gap: 16
      }}>
        {/* Bloco 1: Aparência */}
        <div style={{...S.card, flex: isMobile ? "1 1 240px" : "none"}}>
          <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 16}}>
            Configurações Rápidas
          </div>
          
          {/* Cor de Destaque */}
          <div style={{marginBottom: 16}}>
            <label style={{...S.label, marginBottom: 6}}>Cor de Destaque</label>
            <div style={{display: "flex", gap: 6, flexWrap: "wrap"}}>
              {accentOptions.map(opt => (
                <button
                  key={opt.color}
                  onClick={() => changeAccentColor(opt.color)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    backgroundColor: opt.color,
                    border: t.accent === opt.color ? `2px solid ${t.text}` : "2px solid transparent",
                    cursor: "pointer",
                    padding: 0,
                    boxShadow: t.accent === opt.color ? `0 0 8px ${opt.color}` : "none",
                    transition: "transform 0.1s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1.0)"}
                  title={opt.name}
                />
              ))}
            </div>
          </div>

          {/* Tamanho da Fonte */}
          <div style={{marginBottom: 16}}>
            <label style={{...S.label, marginBottom: 6}}>Tamanho do Texto</label>
            <div style={{display: "flex", gap: 4}}>
              {[
                { scale: 1.0, label: "Normal" },
                { scale: 1.15, label: "Grande" },
                { scale: 1.30, label: "Extra" }
              ].map(opt => (
                <button
                  key={opt.scale}
                  onClick={() => handleSetFontScale(opt.scale)}
                  style={{
                    flex: 1,
                    padding: "5px 6px",
                    borderRadius: 6,
                    border: fontScale === opt.scale ? `1.5px solid ${ac}` : `1px solid ${t.cardBorder}`,
                    background: fontScale === opt.scale ? `${ac}15` : t.inputBg,
                    color: fontScale === opt.scale ? ac : t.textSec,
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tema Dark/Light */}
          <div>
            <label style={{...S.label, marginBottom: 6}}>Tema Visual</label>
            <div style={{display: "flex", gap: 4}}>
              {[
                { val: false, label: "Claro", icon: <IconSun size={12} /> },
                { val: true, label: "Escuro", icon: <IconMoon size={12} /> }
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setDark(opt.val)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: dark === opt.val ? `1.5px solid ${ac}` : `1px solid ${t.cardBorder}`,
                    background: dark === opt.val ? `${ac}15` : t.inputBg,
                    color: dark === opt.val ? ac : t.textSec,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bloco 2: Status do Servidor */}
        <div style={{...S.card, flex: isMobile ? "1 1 240px" : "none"}}>
          <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 16}}>
            Status da Conexão
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: t.text}}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: isFirebaseConfigured ? "#10B981" : "#F59E0B",
              display: "inline-block",
              boxShadow: isFirebaseConfigured ? "0 0 6px #10B981" : "0 0 6px #F59E0B"
            }} />
            <div style={{fontWeight: 700}}>
              {isFirebaseConfigured ? "Firebase Cloud Ativo" : "Armazenamento Local"}
            </div>
          </div>
          <div style={{fontSize: 10, color: t.textSec, marginTop: 4, lineHeight: 1.4}}>
            {isFirebaseConfigured
              ? "Seus dados estão sincronizados em tempo real."
              : "Os dados estão salvos apenas no navegador."}
          </div>
        </div>

        {/* Bloco 4: Resumo Financeiro - Peladas */}
        <div style={{...S.card, flex: isMobile ? "1 1 240px" : "none"}}>
          <div style={{fontSize: 10, fontWeight: "900", color: t.textSec, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: 16}}>
            Caixa - Peladas
          </div>
          <div style={{marginBottom: 16}}>
            <select
              value={sidebarPeladaId}
              onChange={e => setSidebarPeladaId(e.target.value)}
              style={{
                width: "100%",
                padding: "5px 8px",
                borderRadius: 6,
                border: `1px solid ${t.cardBorder}`,
                background: t.inputBg,
                color: t.text,
                fontSize: 11,
                fontWeight: 600,
                outline: "none",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <option value="all">Todas as Peladas</option>
              {visiblePeladas.map(p => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
          <div style={{display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5}}>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              <span style={{color: t.textSec}}>Arrecadado:</span>
              <span style={{fontWeight: 700, color: "#10B981"}}>{fmtCur(peladaReceitas)}</span>
            </div>
            <div style={{display: "flex", justifyContent: "space-between"}}>
              <span style={{color: t.textSec}}>Despesas:</span>
              <span style={{fontWeight: 700, color: "#EF4444"}}>{fmtCur(peladaDespesas)}</span>
            </div>
            <div style={{height: 1, background: t.cardBorder, margin: "2px 0"}} />
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <span style={{fontWeight: 800, color: t.text}}>Saldo:</span>
              <span style={{fontWeight: 900, color: peladaSaldo >= 0 ? ac : "#EF4444", fontSize: 13}}>{fmtCur(peladaSaldo)}</span>
            </div>
          </div>
          <button
            onClick={() => setScreen("financeiro")}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "6px 8px",
              borderRadius: 6,
              border: `1px solid ${ac}33`,
              background: `${ac}10`,
              color: ac,
              fontSize: 10.5,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${ac}20`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${ac}10`; }}
          >
            Ver Caixa Completo
          </button>
        </div>
      </div>
    );
  };

  const renderComLayout = (conteudo) => {
    const layout = isMobile ? (
      <div style={{display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: t.bg}}>
        <GEHeader />
        <GEDrawer />
        <div style={{flex: 1, padding: "24px", boxSizing: "border-box"}}>
          {conteudo}
        </div>
        <RightPanel />
      </div>
    ) : (
      <div style={{display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: t.bg}}>
        <GEHeader />
        <GEDrawer />
        <div style={{flex: 1, display: "flex", maxWidth: "1400px", width: "100%", margin: "0 auto", boxSizing: "border-box", alignItems: "flex-start", gap: 0}}>
          <PermanentSidebar />
          <div style={{flex: 1, minWidth: 0, padding: "16px 20px", overflowX: "hidden"}}>
            {conteudo}
          </div>
          <RightPanel />
        </div>
      </div>
    );

    return (
      <>
        {layout}
        {cloudConflict && (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16}}>
            <div style={{...S.card,width:"100%",maxWidth:400,textAlign:"center"}}>
              <div style={{fontSize:45,marginBottom:16}}>⚠️</div>
              <h3 style={{fontSize:16,fontWeight:800,color:t.text,margin:"0 0 8px 0"}}>Conflito de Dados Detectado!</h3>
              <p style={{fontSize:13,color:t.textSec,lineHeight:1.5,marginBottom:20}}>
                Outro aparelho atualizou os dados na nuvem em um horário mais recente do que a última sincronização deste dispositivo.
                <br/><br/>
                <b>Nuvem:</b> Atualizado em {new Date(cloudConflict.nuvemTime).toLocaleString("pt-BR")} por <b>{cloudConflict.updatedBy}</b>.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button 
                  onClick={async () => {
                    isRestoringNuvemRef.current = true;
                    setAppState(cloudConflict.payload);
                    localStorage.setItem("last_sync_time", String(new Date(cloudConflict.nuvemTime).getTime()));
                    setCloudConflict(null);
                    alert("Dados da nuvem carregados com sucesso! 🚀");
                    setTimeout(() => {
                      isRestoringNuvemRef.current = false;
                    }, 5000);
                  }}
                  style={S.btn("#1D9E75")}
                >
                  📥 Carregar Dados da Nuvem (Recomendado)
                </button>
                <button 
                  onClick={async () => {
                    if (confirm("Atenção: Isso irá apagar a versão mais recente que está na nuvem e salvar os dados locais por cima. Tem certeza?")) {
                      try {
                        setCloudLoading(true);
                        const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
                        const { payload } = await prepararPayloadParaNuvem(appState, auth.name || "Sem Nome");
                        await setDoc(doc(db, "sistema", docKey), payload);
                        localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
                        setCloudConflict(null);
                        alert("Dados locais salvos na nuvem com sucesso! 🚀");
                      } catch (err) {
                        alert("Erro ao salvar dados locais na nuvem: " + err.message);
                      } finally {
                        setCloudLoading(false);
                      }
                    }
                  }}
                  style={S.btnSm("#E24B4A22", "#E24B4A")}
                >
                  🚀 Sobrescrever Nuvem com meus Dados Locais
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };


  // ── Estado Global (Salvo em localStorage) ─────────────────────
  const initialAppState = {
    peladas: [],
    datasRealizacao: [],
    atletas: [],
    quadras: [],
    participacoes: [],
    financeiro: { entries: [] },
    managers: [],
    adminPassword: "1204110411",
  };
  
  const [appState, setAppState, loading] = useLocalStorage(initialAppState);
  const isRestoringNuvemRef = useRef(false);

  // Getters com Fallback (Segurança extra contra tela branca)
  const allPeladas = Array.isArray(appState?.peladas) ? appState.peladas : [];
  const datasRealizacao = Array.isArray(appState?.datasRealizacao) ? appState.datasRealizacao : [];
  const allAtletas = Array.isArray(appState?.atletas) ? appState.atletas : [];
  const allAtletasRef = useRef(allAtletas);
  useEffect(() => {
    allAtletasRef.current = allAtletas;
  }, [allAtletas]);
  const allQuadras = Array.isArray(appState?.quadras) ? appState.quadras : [];
  const allQuadrasRef = useRef(allQuadras);
  useEffect(() => {
    allQuadrasRef.current = allQuadras;
  }, [allQuadras]);
  const participacoesRaw = Array.isArray(appState?.participacoes) ? appState.participacoes : [];
  const participacoes = React.useMemo(() => {
    const ids = new Set(allAtletas.map(a => a.id));
    return participacoesRaw.filter(p => ids.has(p.atleta_id));
  }, [allAtletas, participacoesRaw]);
  const financeiro = appState?.financeiro && typeof appState.financeiro === 'object' ? appState.financeiro : { entries: [] };
  const managers = Array.isArray(appState?.managers) ? appState.managers : [];
  const managersRef = useRef(managers);
  useEffect(() => {
    managersRef.current = managers;
  }, [managers]);
  const adminPassword = appState?.adminPassword || "1204110411";

  // Efeito para limpar automaticamente participações órfãs (atletas excluídos)
  useEffect(() => {
    if (loading) return;
    if (Array.isArray(appState?.participacoes) && Array.isArray(appState?.atletas)) {
      const atletaIds = new Set(appState.atletas.map(a => a.id));
      const temOrfas = appState.participacoes.some(p => !atletaIds.has(p.atleta_id));
      if (temOrfas) {
        const limpas = appState.participacoes.filter(p => atletaIds.has(p.atleta_id));
        setAppState(prev => ({ ...prev, participacoes: limpas }));
        console.log("[AUTO-LIMPEZA] Removidas participações órfãs de atletas deletados.");
      }
    }
  }, [loading, appState?.participacoes, appState?.atletas, setAppState]);



  const [auth, setAuth] = useState({ role:"", name:"", manager_id: null, scope: "geral", email: "" });
  const [authLoading, setAuthLoading] = useState(true);

  const [dashboardSelectedId, setDashboardSelectedId] = useState("");
  const [dashboardSelectedDataId, setDashboardSelectedDataId] = useState("");
  const [sidebarPeladaId, setSidebarPeladaId] = useState("all");

  // Sincroniza dinamicamente o escopo do manager com base nos seus vínculos reais de colaboração
  useEffect(() => {
    if (auth.role !== "manager" || !auth.email) return;

    const emailLogado = String(auth.email || "").toLowerCase().trim();
    const pels = Array.isArray(appState?.peladas) ? appState.peladas : [];

    const isColabPel = pels.some(p => Array.isArray(p.collaborators) && p.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado));

    let computedScope = "pelada";
    
    // Busca se existe no managers global para ver se há escopo pré-definido
    const managerDef = (appState?.managers || []).find(m => String(m.email || "").toLowerCase().trim() === emailLogado);
    if (managerDef && managerDef.scope) {
      computedScope = managerDef.scope;
    }

    if (isColabPel) {
      computedScope = "pelada";
    }

    if (auth.scope !== computedScope) {
      setAuth(prev => ({ ...prev, scope: computedScope }));
    }
  }, [appState?.peladas, appState?.managers, auth.email, auth.role, auth.scope]);
  const lastAuthUserEmail = useRef("");
  const [screen, setScreen] = useState("selection");
  const [cloudConflict, setCloudConflict] = useState(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [publicCloudChamp, setPublicCloudChamp] = useState(null);
  const [publicPeladaData, setPublicPeladaData] = useState(null);

  const refreshPublicPelada = async () => {
    if (!publicPeladaData) return;
    try {
      if (!isFirebaseConfigured) return;
      const docRef = doc(db, COLLECTION_CAMPEONATOS, "pelada_" + publicPeladaData.docKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const publicData = docSnap.data();
        setPublicPeladaData(prev => ({
          ...prev,
          pelada: publicData
        }));
        console.log("Pelada pública atualizada!");
      }
    } catch (e) {
      console.error("Erro ao atualizar pelada pública:", e);
    }
  };

  // Listener em tempo real para o painel público de acompanhamento dos atletas
  useEffect(() => {
    if (!isFirebaseConfigured || screen !== "publicPelada" || !publicPeladaData?.docKey) return;

    const docRef = doc(db, COLLECTION_CAMPEONATOS, "pelada_" + publicPeladaData.docKey);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const publicData = docSnap.data();
        setPublicPeladaData(prev => {
          if (!prev) return null;
          // Evita loops infinitos de re-render caso os dados sejam semanticamente idênticos
          if (JSON.stringify(prev.pelada) === JSON.stringify(publicData)) return prev;
          return {
            ...prev,
            pelada: publicData
          };
        });
        console.log("Pelada pública sincronizada em tempo real via onSnapshot!");
      }
    }, (err) => {
      console.error("Erro no listener em tempo real da pelada pública:", err);
    });

    return () => unsubscribe();
  }, [screen, publicPeladaData?.docKey, isFirebaseConfigured]);

  // Monitora alterações de autenticação no Firebase Auth
  useEffect(() => {
    console.log("[DEBUG AUTH] useEffect onAuthStateChanged registrado! isFirebaseConfigured:", isFirebaseConfigured);
    if (!isFirebaseConfigured || !firebaseAuth) {
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      console.log("[DEBUG AUTH] onAuthStateChanged disparado! Usuário:", user ? user.email : "null");
      if (user) {
        // Mantém a autenticação reativa nativa sem dependência restritiva de sessionStorage de nova aba
        const trimmedEmail = String(user.email || "").toLowerCase().trim();
        const isNewLogin = lastAuthUserEmail.current !== trimmedEmail;
        console.log("[DEBUG AUTH] trimmedEmail:", trimmedEmail, "lastAuthUserEmail.current:", lastAuthUserEmail.current, "isNewLogin:", isNewLogin);
        
        // Verifica se é o Administrador padrão
        if (trimmedEmail === "lucas7s7@gmail.com") {
          setAuth({ role: "adm", name: "Lucas", manager_id: null, scope: "geral", email: trimmedEmail });
          setScreen(prev => (prev === "login" || prev === "selection") ? "home" : prev);
          if (isNewLogin) {
            console.log("[DEBUG AUTH] Novo login admin detectado! Chamando autoRestaurarDaNuvem");
            lastAuthUserEmail.current = trimmedEmail;
            await autoRestaurarDaNuvem("adm", null);
          }
        } else {
          // Verifica se é um Manager cadastrado localmente
          let manager = (managersRef.current || []).find(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
          console.log("[DEBUG AUTH] Buscando manager local para email:", trimmedEmail, "Encontrado:", manager ? manager.name : "Não");
          
          // Se não encontrou na lista local (por exemplo, primeiro login num dispositivo novo com localStorage limpo),
          // busca no documento global "admin_data" no Firestore que contém o appState de administrador com a lista de todos os managers.
          if (!manager) {
            try {
              console.log("[DEBUG AUTH] Manager não encontrado localmente. Buscando lista global no Firestore (admin_data)...");
              const adminSnap = await getDoc(doc(db, "sistema", "admin_data"));
              if (adminSnap.exists()) {
                const adminData = adminSnap.data();
                const fullState = await extrairAppStateDeDocumento(adminData);
                const cloudManagers = fullState?.managers || [];
                manager = cloudManagers.find(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
                if (manager) {
                  console.log("[DEBUG AUTH] Manager encontrado no Firestore:", manager.name);
                }
              }
            } catch (err) {
              console.error("[DEBUG AUTH] Erro ao buscar managers de admin_data:", err);
            }
          }

          if (manager) {
            setAuth({ role: "manager", name: manager.name || "Manager", manager_id: manager.id, scope: manager.scope || "pelada", email: trimmedEmail });
            setScreen(prev => (prev === "login" || prev === "selection") ? "home" : prev);
            if (isNewLogin) {
              console.log("[DEBUG AUTH] Novo login manager detectado! Chamando autoRestaurarDaNuvem");
              lastAuthUserEmail.current = trimmedEmail;
              await autoRestaurarDaNuvem("manager", manager.id);
            }
          } else {
            // Se for outro usuário (por exemplo, um novo usuário básico)
            console.log("[DEBUG AUTH] Usuário público logado");
            setAuth({ role: "public", name: user.displayName || trimmedEmail.split("@")[0], manager_id: null, scope: "leitura", email: trimmedEmail });
            setScreen(prev => (prev === "login" || prev === "selection") ? "public" : prev);
          }
        }
      } else {
        // Usuário deslogado
        console.log("[DEBUG AUTH] Usuário deslogado. Limpando email em lastAuthUserEmail");
        setAuth({ role: "", name: "", manager_id: null, scope: "geral", email: "" });
        lastAuthUserEmail.current = "";
      }
      setAuthLoading(false);
    });

    return () => {
      console.log("[DEBUG AUTH] Cancelando inscrição do onAuthStateChanged!");
      unsubscribe();
    };
  }, [isFirebaseConfigured]);

  // Proteção de Rotas Internas Reativa
  const publicScreens = ["selection", "login", "public", "publicCloud", "publicPelada"];
  const isInternalScreen = !publicScreens.includes(screen);
  const isAuthenticated = auth.role === "adm" || auth.role === "manager";

  useEffect(() => {
    if (!loading && !authLoading && isInternalScreen && !isAuthenticated) {
      setScreen("selection");
    }
  }, [screen, auth, loading, authLoading, isInternalScreen, isAuthenticated]);

  useEffect(() => {
    // Só processa os parâmetros da URL após a inicialização da sessão de autenticação do Firebase
    if (authLoading) return;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("c") || params.get("pelada");
      const pCode = params.get("p");
      const urlDataId = params.get("data");

      if (code) {
        setCloudLoading(true);
        const loadFromFirestore = async () => {
          try {
            if (!isFirebaseConfigured) {
              throw new Error("O Firebase Firestore não está configurado.");
            }
            
            const docRef = doc(db, COLLECTION_CAMPEONATOS, code);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              setPublicCloudChamp(docSnap.data());
              setScreen("publicCloud");
            } else {
              const q = query(collection(db, COLLECTION_CAMPEONATOS), where("customSlug", "==", code.toLowerCase()));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const champData = querySnapshot.docs[0].data();
                setPublicCloudChamp(champData);
                setScreen("publicCloud");
              } else {
                throw new Error("Pelada não encontrada.");
              }
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao conectar com a nuvem: " + err.message);
          } finally {
            setCloudLoading(false);
          }
        };

        loadFromFirestore();
      } else if (pCode) {
        setCloudLoading(true);
        const loadPeladaFromFirestore = async () => {
          try {
            if (!isFirebaseConfigured) {
              throw new Error("O Firebase Firestore não está configurado.");
            }
            
            const docRef = doc(db, COLLECTION_CAMPEONATOS, "pelada_" + pCode);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
              const publicData = docSnap.data();
              setPublicPeladaData({
                pelada: publicData,
                selDataId: urlDataId || "",
                docKey: pCode
              });
              setScreen("publicPelada");
            } else {
              throw new Error("Pelada pública não encontrada ou ainda não sincronizada pelo gestor.");
            }
          } catch (err) {
            console.error(err);
            alert("Erro ao carregar pelada pública: " + err.message);
          } finally {
            setCloudLoading(false);
          }
        };

        loadPeladaFromFirestore();
      }
    }
  }, [authLoading, isFirebaseConfigured]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      if (window.scrollTo) {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      }
    }
  }, [screen, loading]);

  // Novos estados para alteração de senha
  const [modalPassword, setModalPassword] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [pwdError, setPwdError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);



  const autoRestaurarDaNuvem = async (role, managerId) => {
    if (!isFirebaseConfigured) return;
    try {
      const docKey = (role === "adm" || role === "manager") ? "admin_data" : `manager_${managerId || "unknown"}`;
      const docSnap = await getDoc(doc(db, "sistema", docKey));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const state = await extrairAppStateDeDocumento(data);
        if (state) {
          isRestoringNuvemRef.current = true;
          setAppState(state);
          const syncTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now();
          localStorage.setItem("last_sync_time", String(syncTime));
          console.log("Dados sincronizados automaticamente da nuvem no login!");
          setTimeout(() => {
            isRestoringNuvemRef.current = false;
          }, 5000);
        }
      }
    } catch (e) {
      console.error("Erro ao sincronizar login da nuvem:", e);
    }
  };

  // Auto-salvamento na Nuvem em background com controle de concorrência
  useEffect(() => {
    if (!isFirebaseConfigured || loading || cloudConflict || isRestoringNuvemRef.current) return;
    if (auth.role !== "adm" && auth.role !== "manager") return;

    const timer = setTimeout(async () => {
      try {
        const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
        
        // 1. Antes de salvar, busca na nuvem para verificar concorrência e integridade
        const docSnap = await getDoc(doc(db, "sistema", docKey));
        if (docSnap.exists()) {
          const dataNuvem = docSnap.data();
          const stateNuvem = await extrairAppStateDeDocumento(dataNuvem);
          
          // Guardião contra sobrescrever dados cheios na nuvem com dados vazios locais
          if (stateNuvem) {
            const atletasNuvem = Array.isArray(stateNuvem.atletas) ? stateNuvem.atletas.length : 0;
            const atletasLocal = Array.isArray(appState?.atletas) ? appState.atletas.length : 0;
            
            if (atletasNuvem > 0 && atletasLocal === 0) {
              console.warn("[GUARD] Abortando auto-salvamento: Estado local está vazio ou incompleto em relação à nuvem.");
              return;
            }
          }

          if (dataNuvem.lastUpdated) {
            const timeNuvem = new Date(dataNuvem.lastUpdated).getTime();
            const timeLocalSync = localStorage.getItem("last_sync_time") ? Number(localStorage.getItem("last_sync_time")) : 0;
            
            // Margem de segurança de 2 segundos para evitar falsos conflitos causados por pequenos delays
            if (timeNuvem > timeLocalSync + 2000) {
              console.warn("Conflito de dados detectado! A nuvem tem dados mais recentes.");
              if (stateNuvem) {
                setCloudConflict({
                  nuvemTime: dataNuvem.lastUpdated,
                  updatedBy: dataNuvem.updatedBy || "Outro Aparelho",
                  payload: stateNuvem
                });
              }
              return; // Bloqueia o auto-salvamento
            }
          }
        }

        const { payload } = await prepararPayloadParaNuvem(appState, auth.name || "Sem Nome");
        await setDoc(doc(db, "sistema", docKey), payload);

        // Publica as peladas na coleção pública de forma segura contra permissões restritas
        if (appState && Array.isArray(appState.peladas)) {
          for (const pel of appState.peladas) {
            try {
              const datasPel = (appState.datasRealizacao || [])
                .filter(d => d.pelada_id === pel.id)
                .map(d => {
                  const partsDia = (appState.participacoes || [])
                    .filter(p => String(p.pelada_id) === String(pel.id) && String(p.data_realizacao_id) === String(d.id))
                    .map(p => ({
                      id: p.id,
                      atleta_id: p.atleta_id,
                      pagou: Boolean(p.pagou),
                      compareceu: Boolean(p.compareceu),
                      valor: Number(p.valor || 0)
                    }));
                  return {
                    id: d.id,
                    dateStr: d.dateStr || d.data || "",
                    data: d.data || "",
                    local: d.local || "",
                    valor: d.valor || "",
                    status: d.status || "",
                    participacoes: partsDia,
                    peladaState: d.peladaState ? {
                      currentMatch: d.peladaState.currentMatch || null,
                      queue: d.peladaState.queue || [],
                      bench: d.peladaState.bench || [],
                      matchLog: d.peladaState.matchLog || [],
                      teams: d.peladaState.teams || [],
                      regraEmpate: d.peladaState.regraEmpate || null,
                      empateAmbosSaem: d.peladaState.empateAmbosSaem || false,
                      modoRodizio: d.peladaState.modoRodizio || "misto",
                      teamBases: d.peladaState.teamBases || null,
                      loanLocks: d.peladaState.loanLocks || {},
                      historicoEmprestimos: d.peladaState.historicoEmprestimos || {},
                      limiteVitorias: d.peladaState.limiteVitorias || 0,
                      minAtletasNovoTime: d.peladaState.minAtletasNovoTime || null
                    } : null
                  };
                });

              const atletasSimplificados = (appState.atletas || [])
                .filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + String(pel.id)))
                .map(a => ({
                  id: a.id,
                  nome: a.nome,
                  apelido: a.apelido || "",
                  fotoUrl: a.fotoUrl || ""
                }));

              const publicPayload = {
                id: pel.id,
                name: pel.name,
                datasRealizacao: datasPel,
                atletas: atletasSimplificados,
                isPublicPelada: true,
                lastUpdated: new Date().toISOString()
              };

              const cleanPublicPayload = JSON.parse(JSON.stringify(publicPayload));
              await setDoc(doc(db, COLLECTION_CAMPEONATOS, "pelada_" + String(pel.id)), cleanPublicPayload);
              console.log(`Pelada pública ${pel.name} sincronizada com sucesso!`);
            } catch (errPublic) {
              console.error(`Erro ao publicar pelada ${pel.name} na nuvem:`, errPublic);
            }
          }
        }
        
        // Atualiza a hora do último sincronismo bem sucedido
        localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
        console.log("Banco de dados sincronizado automaticamente na Nuvem!");
      } catch (e) {
        console.error("Erro no auto-salvamento na nuvem:", e);
      }
    }, 2000); // 2 segundos de debounce para evitar excesso de requisições ao Firestore

    return () => clearTimeout(timer);
  }, [appState, auth, loading, cloudConflict]);

  // Escuta pagamentos Pix em tempo real para marcar a presença automaticamente
  useEffect(() => {
    if (!isFirebaseConfigured || loading) return;
    if (auth.role !== "adm" && auth.role !== "manager") return;

    const q = query(
      collection(db, "pagamentos_pix"),
      where("status", "==", "approved"),
      where("processed", "==", false)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) return;

      let updatedAtletas = [...(appState?.atletas || [])];
      let updatedParts = [...(appState?.participacoes || [])];
      let updatedFinanceiro = { 
        entries: [...(appState?.financeiro?.entries || [])] 
      };
      let stateChanged = false;

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const paymentId = docSnap.id;
        const { atleta_id, pelada_id, data_realizacao_id, nome, email, cpf, valor } = data;

        let atletaIdReal = atleta_id;
        
        // 1. Caso seja um novo cadastro provisório
        if (String(atleta_id) === "novo_atleta") {
          const novoId = Date.now() + Math.floor(Math.random() * 1000);
          const novoAtleta = {
            id: novoId,
            nome: nome,
            email: email,
            cpf: cpf,
            ativo: true,
            isProvisorio: true,
            vinculos: ["pelada_" + String(pelada_id)]
          };
          updatedAtletas.push(novoAtleta);
          atletaIdReal = novoId;
          stateChanged = true;
        } else {
          // Atleta existente - garantir que tem o vínculo da pelada
          const atletaExistente = updatedAtletas.find(a => String(a.id) === String(atleta_id));
          if (atletaExistente) {
            const vStr = "pelada_" + String(pelada_id);
            if (!Array.isArray(atletaExistente.vinculos)) {
              atletaExistente.vinculos = [vStr];
              stateChanged = true;
            } else if (!atletaExistente.vinculos.includes(vStr)) {
              atletaExistente.vinculos.push(vStr);
              stateChanged = true;
            }
          }
        }

        // 2. Adicionar o vínculo geral (data_realizacao_id: null) na coleção de participações se não existir
        const vinculoGeral = updatedParts.find(p => 
          String(p.atleta_id) === String(atletaIdReal) && 
          String(p.pelada_id) === String(pelada_id) && 
          !p.data_realizacao_id
        );
        if (!vinculoGeral) {
          updatedParts.push({
            id: "part_g_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            atleta_id: Number(atletaIdReal),
            pelada_id: Number(pelada_id),
            data_realizacao_id: null,
            pagou: false,
            compareceu: false,
            tipo_pagamento: "diarista",
            valor_padrao: Number(valor),
            saldo: 0
          });
          stateChanged = true;
        }

        // 3. Adicionar ou atualizar a participação para o dia da pelada correspondente
        const partDia = updatedParts.find(p => 
          String(p.atleta_id) === String(atletaIdReal) && 
          String(p.pelada_id) === String(pelada_id) && 
          String(p.data_realizacao_id) === String(data_realizacao_id)
        );
        if (partDia) {
          partDia.compareceu = false; // Fica ausente inicialmente, o gestor marca presente quando chegar
          partDia.pagou = true;
          partDia.valor = Number(valor);
          partDia.usou_saldo = false;
          stateChanged = true;
        } else {
          updatedParts.push({
            id: "part_d_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            atleta_id: Number(atletaIdReal),
            pelada_id: Number(pelada_id),
            data_realizacao_id: Number(data_realizacao_id),
            pagou: true,
            compareceu: false, // Fica ausente inicialmente, o gestor marca presente quando chegar
            tipo_pagamento: "diarista",
            valor: Number(valor),
            usou_saldo: false
          });
          stateChanged = true;
        }

        // 4. Registrar a receita no caixa financeiro se não estiver duplicada
        const descRef = `Pix Diária - ${nome} (Aprovado)`;
        const lancamentoExistente = updatedFinanceiro.entries.find(e => 
          e.desc === descRef && 
          String(e.pelada_id) === String(pelada_id) && 
          String(e.data_id) === String(data_realizacao_id)
        );
        if (!lancamentoExistente) {
          updatedFinanceiro.entries.push({
            id: "fin_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            desc: descRef,
            amount: Number(valor),
            type: "receita",
            category: "diária",
            date: todayStr(),
            pelada_id: Number(pelada_id),
            data_id: Number(data_realizacao_id)
          });
          stateChanged = true;
        }

        // 5. Marcar o pagamento como processado no Firestore
        try {
          await updateDoc(doc(db, "pagamentos_pix", paymentId), { processed: true });
        } catch (err) {
          console.error("Erro ao marcar pagamento como processado:", err);
        }
      }

      if (stateChanged) {
        setAppState(prev => ({
          ...prev,
          atletas: updatedAtletas,
          participacoes: updatedParts,
          financeiro: updatedFinanceiro
        }));
      }
    }, (error) => {
      console.error("Erro no listener de pagamentos Pix:", error);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured, loading, appState, setAppState, auth]);

  const handleLogin = async ({email, password}) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed||!password) return "Informe e-mail e senha.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }
      await setPersistence(firebaseAuth, browserLocalPersistence);
      sessionStorage.setItem("active_session", "true");
      await signInWithEmailAndPassword(firebaseAuth, trimmed, password);
      return "";
    } catch (error) {
      console.error("Erro no login Firebase Auth:", error);
      
      // MIGRACAO AUTOMATICA se o usuário não for encontrado no Firebase mas for admin/manager local
      if (error.code === "auth/user-not-found" || error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        if (trimmed === "lucas7s7@gmail.com" && password === adminPassword) {
          try {
            sessionStorage.setItem("active_session", "true");
            await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
            return "";
          } catch (createErr) {
            console.error("Erro ao migrar admin local:", createErr);
            return "Erro ao migrar sua conta admin padrão: " + createErr.message;
          }
        }
        
        const manager = managers.find(m => String(m.email||"").toLowerCase() === trimmed && m.password === password);
        if (manager) {
          try {
            sessionStorage.setItem("active_session", "true");
            await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
            return "";
          } catch (createErr) {
            console.error("Erro ao migrar manager local:", createErr);
            return "Erro ao migrar sua conta de manager: " + createErr.message;
          }
        }
      }

      switch (error.code) {
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/user-disabled":
          return "Esta conta de usuário foi desativada.";
        case "auth/user-not-found":
        case "auth/invalid-credential":
        case "auth/wrong-password":
          return "Credenciais inválidas. Verifique seu e-mail e senha.";
        case "auth/too-many-requests":
          return "Muitas tentativas malsucedidas de login. Tente novamente mais tarde.";
        default:
          return error.message || "Erro ao fazer login.";
      }
    }
  };

  const handleRegister = async ({email, password, name}) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed || !password || !name?.trim()) return "Preencha todos os campos.";
    if(password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }

      await createUserWithEmailAndPassword(firebaseAuth, trimmed, password);
      return "";
    } catch (error) {
      console.error("Erro ao registrar conta:", error);
      switch (error.code) {
        case "auth/email-already-in-use":
          return "Este endereço de e-mail já está em uso.";
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/weak-password":
          return "A senha é muito fraca (mínimo 6 caracteres).";
        default:
          return error.message || "Erro ao registrar usuário.";
      }
    }
  };

  const handleForgotPassword = async (email) => {
    const trimmed = String(email||"").trim().toLowerCase();
    if(!trimmed) return "Por favor, informe seu e-mail.";

    try {
      if (!isFirebaseConfigured || !firebaseAuth) {
        throw new Error("O Firebase Auth não está configurado.");
      }
      await sendPasswordResetEmail(firebaseAuth, trimmed);
      return "";
    } catch (error) {
      console.error("Erro ao solicitar redefinição:", error);
      switch (error.code) {
        case "auth/invalid-email":
          return "O endereço de e-mail é inválido.";
        case "auth/user-not-found":
          return "Não encontramos um usuário cadastrado com este e-mail.";
        default:
          return error.message || "Erro ao enviar e-mail de recuperação.";
      }
    }
  };

  const handlePublicAccess = () => {
    setAuth({ role:"public", name:"Público" });
    setCurrent(null);
    setScreen("public");
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("active_session");
    if (isFirebaseConfigured && firebaseAuth) {
      try {
        await signOut(firebaseAuth);
      } catch (e) {
        console.error("Erro ao deslogar do Firebase Auth:", e);
      }
    }
    setAuth({ role:"", name:"", manager_id: null, scope: "geral" });
    setCurrent(null);
    setScreen("selection");
  };

  const handleUpdatePassword = () => {
    setPwdError("");
    const { current: curPwd, newPwd, confirm } = pwdForm;
    if (!curPwd || !newPwd || !confirm) {
      setPwdError("Por favor, preencha todos os campos.");
      return;
    }
    if (newPwd !== confirm) {
      setPwdError("A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPwd.length < 4) {
      setPwdError("A nova senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (auth.role === "adm") {
      if (curPwd !== adminPassword) {
        setPwdError("Senha atual incorreta.");
        return;
      }
      setAdminPassword(newPwd);
      alert("Senha de Administrador alterada com sucesso!");
    } else if (auth.role === "manager") {
      const mIdx = managers.findIndex(m => m.id === auth.manager_id);
      if (mIdx === -1) {
        setPwdError("Gestor não encontrado no sistema.");
        return;
      }
      if (managers[mIdx].password !== curPwd) {
        setPwdError("Senha atual incorreta.");
        return;
      }
      atualizarManager(auth.manager_id, { password: newPwd });
      alert("Senha de Gestor alterada com sucesso!");
    } else {
      setPwdError("Usuários não autenticados não podem alterar senhas.");
      return;
    }

    setPwdForm({ current: "", newPwd: "", confirm: "" });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setModalPassword(false);
  };
  
  // Filtro por manager e scope
  const filterByManager = (items) => {
    if (auth.role === "adm") return items;
    if (auth.role === "manager") {
      const emailLogado = String(auth.email || "").toLowerCase().trim();
      return items.filter(item => {
        const isOwner = item.manager_id === auth.manager_id;
        const isCollaborator = Array.isArray(item.collaborators) && item.collaborators.some(
          colab => String(colab.email || "").toLowerCase().trim() === emailLogado
        );
        return isOwner || isCollaborator;
      });
    }
    return [];
  };

  const peladas = filterByManager(allPeladas).filter(p => {
    const isCollaborator = Array.isArray(p.collaborators) && p.collaborators.some(
      colab => String(colab.email || "").toLowerCase().trim() === String(auth.email || "").toLowerCase().trim()
    );
    return auth.role === "adm" || auth.scope === "geral" || auth.scope === "pelada" || isCollaborator;
  });
  const atletas = (() => {
    if (auth.role === "adm") return allAtletas;
    if (auth.role === "manager") {
      const emailLogado = String(auth.email || "").toLowerCase().trim();
      
      // Obtém as peladas permitidas
      const peladasPermitidasIds = allPeladas.filter(p => 
        p.manager_id === auth.manager_id || 
        (Array.isArray(p.collaborators) && p.collaborators.some(col => String(col.email || "").toLowerCase().trim() === emailLogado))
      ).map(p => "pelada_" + p.id);

      const vinculosPermitidos = [...peladasPermitidasIds];

      return allAtletas.filter(atleta => {
        const isOwner = atleta.manager_id === auth.manager_id;
        const belongsToPermittedModalidade = Array.isArray(atleta.vinculos) && atleta.vinculos.some(v => vinculosPermitidos.includes(v));
        // Se o atleta não tem vínculo com nada, mas é de propriedade do admin ou do manager
        const isOrphanAndOwned = (!Array.isArray(atleta.vinculos) || atleta.vinculos.length === 0) && (atleta.manager_id === auth.manager_id || !atleta.manager_id);
        
        return isOwner || belongsToPermittedModalidade || isOrphanAndOwned;
      });
    }
    return [];
  })();


  
  const quadras = (() => {
    if (auth.role === "adm") return allQuadras;
    if (auth.role === "manager") {
      // Retorna as quadras criadas pelo admin (manager_id === null) ou pelo próprio manager
      return allQuadras.filter(q => q.manager_id === auth.manager_id || !q.manager_id);
    }
    return [];
  })();

  const escapeHtml = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const downloadAtletasTemplate = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","grupo","customFields"];
    const sample = {
      id: "",
      nome: "João Silva",
      apelido: "João",
      foto: "",
      habilidade: "3",
      goleiro: "false",
      ativo: "true",
      documento: "12345678900",
      dataNascimento: "1990-01-01",
      numeroCamisa: "10",
      grupo: "Sábado",
      customFields: "{}"
    };
    const _csvLines = [headers.map(h => { const s = String(sample[h] ?? ''); return (s.includes(',') || s.includes('"')) ? '"' + s.replace(/"/g,'""') + '"' : s; }).join(',')];
    const csv = '\uFEFF' + [headers.map(h => h).join(','), ..._csvLines].join('\r\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `modelo-atletas.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const exportAtletas = () => {
    const headers = ["id","nome","apelido","foto","habilidade","goleiro","ativo","documento","dataNascimento","numeroCamisa","grupo","customFields"];
    const esc = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = atletas.map(a => headers.map(h => esc(h === "customFields" ? JSON.stringify(a.customFields || {}) : a[h])).join(','));
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `atletas-${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const parseValue = (text) => {
    if (text === null || text === undefined) return "";
    const trimmed = String(text).trim();
    if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === "true";
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    return trimmed;
  };

  const importAtletas = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let rows;
      if (file.name.endsWith('.csv') || text.trimStart().startsWith('id,') || text.trimStart().startsWith('\uFEFFid,')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const table = doc.querySelector('table');
        if (!table) throw new Error('Arquivo não contém tabela válida. Use o modelo CSV.');
        rows = Array.from(table.querySelectorAll('tr')).map(row => Array.from(row.querySelectorAll('th,td')).map(cell => cell.textContent || ''));
      }
      if (rows.length < 2) throw new Error('O arquivo não contém dados de atletas.');
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ''));
      const normalized = dataRows.map(cells => {
        const item = {};
        cells.forEach((value, index) => {
          const key = headers[index];
          if (!key) return;
          if (key === "customFields") {
            try {
              item.customFields = JSON.parse(value || "{}");
            } catch {
              item.customFields = {};
            }
            return;
          }
          if (key === "habilidade") {
            item.habilidade = Number(value) || 3;
            return;
          }
          if (key === "goleiro" || key === "ativo") {
            item[key] = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          item[key] = value;
        });
        return {
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 100000),
          habilidade: Number(item.habilidade) || 3,
          ativo: item.ativo !== false,
          goleiro: item.goleiro === true,
          manager_id: auth.role === "manager" ? auth.manager_id : item.manager_id,
          customFields: item.customFields && typeof item.customFields === "object" ? item.customFields : {},
        };
      });
            if (!window.confirm("Importar atletas substituirá a lista atual de atletas. Deseja continuar?")) return;
      setAtletas(normalized);
      alert(`Importação concluída com ${normalized.length} atletas.`);
    } catch (error) {
      console.error("Importar atletas falhou:", error);
      alert("Erro ao importar atletas: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

    const exportQuadras = () => {
    const headers = ["id", "nome", "endereco", "ativa"];
    const esc = (v) => { const s = String(v == null ? '' : v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? '"' + s.replace(/"/g,'""') + '"' : s; };
    const rows = quadras.map(q => headers.map(h => esc(q[h])).join(','));
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `quadras-${todayStr()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const importQuadras = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      // Suporta CSV (novo formato) e HTML-XLS (formato legado)
      let rows;
      if (file.name.endsWith('.csv') || text.trimStart().startsWith('id,') || text.trimStart().startsWith('\uFEFFid,')) {
        // Parsing CSV
        const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(l => l.trim());
        rows = lines.map(line => line.split(',').map(cell => cell.startsWith('"') && cell.endsWith('"') ? cell.slice(1,-1).replace(/""/g,'"') : cell));
      } else {
        // Parsing HTML-XLS legado
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");
        const table = doc.querySelector("table");
        if (!table) throw new Error("O arquivo não contém uma tabela válida. Use o modelo CSV.");
        rows = Array.from(table.querySelectorAll("tr")).map(row => Array.from(row.querySelectorAll("th,td")).map(cell => cell.textContent || ""));
      }
      if (rows.length < 2) throw new Error("A tabela de quadras não contém dados.");
      const headers = rows[0].map(h => String(h).trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => String(cell).trim() !== ""));
      const normalized = dataRows.map(cells => {
        const item = {};
        cells.forEach((value, index) => {
          const key = headers[index];
          if (!key) return;
          if (key === "ativa") {
            item.ativa = String(value).trim().toLowerCase() === "true";
            return;
          }
          if (key === "id") {
            item.id = value ? Number(value) : undefined;
            return;
          }
          item[key] = value;
        });
        return {
          ...item,
          id: item.id || Date.now() + Math.floor(Math.random() * 1000),
          ativa: item.ativa !== false,
          manager_id: auth.role === "manager" ? auth.manager_id : item.manager_id,
        };
      });
      if (!window.confirm("Importar quadras substituirá a lista atual de quadras. Deseja continuar?")) return;
      setQuadras(normalized);
      alert(`Importação concluída com ${normalized.length} quadras.`);
    } catch (error) {
      console.error("Importar quadras falhou:", error);
      alert("Erro ao importar quadras: " + (error.message || error));
    } finally {
      if (event.target) event.target.value = "";
    }
  };

  const financeiroFiltered = auth.role === "adm" ? financeiro : (auth.role === "manager" ? {
    entries: (financeiro.entries || []).filter(e => {
      if (String(e.manager_id) !== String(auth.manager_id)) return false;
      if (auth.scope === "pelada") return e.pelada_id;
      if (auth.scope === "pelada") return !e.champ_id;
      return true;
    })
  } : { entries: [] });
  const setFinanceiroWrapped = d => setFinanceiro(s => {
    const next = typeof d === 'function' ? d(s) : d;
    if (auth.role === "adm") return next;
    if (auth.role === "manager") {
      const nextEntries = next.entries?.map(e => ({ ...e, manager_id: auth.manager_id })) || [];
      const preservedEntries = (s.entries || []).filter(e => String(e.manager_id) !== String(auth.manager_id));
      return { ...s, ...next, entries: [...preservedEntries, ...nextEntries] };
    }
    return next;
  });

  const sincronizarPeladaImediatamente = async (peladaId, customAppState = null) => {
    if (!isFirebaseConfigured) return;
    try {
      const activeState = customAppState || appState;
      const pel = activeState.peladas?.find(p => String(p.id) === String(peladaId));
      if (!pel) return;

      const datasPel = (activeState.datasRealizacao || [])
        .filter(d => d.pelada_id === pel.id)
        .map(d => {
          const partsDia = (activeState.participacoes || [])
            .filter(p => String(p.pelada_id) === String(pel.id) && String(p.data_realizacao_id) === String(d.id))
            .map(p => ({
              id: p.id,
              atleta_id: p.atleta_id,
              pagou: Boolean(p.pagou),
              compareceu: Boolean(p.compareceu),
              valor: Number(p.valor || 0)
            }));
          return {
            id: d.id,
            dateStr: d.dateStr || d.data || "",
            data: d.data || "",
            local: d.local || "",
            valor: d.valor || "",
            status: d.status || "",
            playersPerTeam: d.playersPerTeam || 4,
            numTeams: d.numTeams || 2,
            participacoes: partsDia,
            peladaState: d.peladaState ? {
              currentMatch: d.peladaState.currentMatch ? {
                ...d.peladaState.currentMatch,
                timerRunning: Boolean(d.peladaState.currentMatch.timerRunning),
                timerSecondsAtStart: Number(d.peladaState.currentMatch.timerSecondsAtStart) || 600,
                timerStartTimestamp: (
                  d.peladaState.currentMatch.timerStartTimestamp !== null &&
                  d.peladaState.currentMatch.timerStartTimestamp !== undefined
                ) ? Number(d.peladaState.currentMatch.timerStartTimestamp) : null
              } : null,
              queue: d.peladaState.queue || [],
              bench: d.peladaState.bench || [],
              matchLog: d.peladaState.matchLog || [],
              teams: d.peladaState.teams || [],
              regraEmpate: d.peladaState.regraEmpate || null,
              empateAmbosSaem: d.peladaState.empateAmbosSaem || false,
              modoRodizio: d.peladaState.modoRodizio || "misto",
              teamBases: d.peladaState.teamBases || null,
              loanLocks: d.peladaState.loanLocks || {},
              historicoEmprestimos: d.peladaState.historicoEmprestimos || {},
              limiteVitorias: d.peladaState.limiteVitorias || 0,
              minAtletasNovoTime: d.peladaState.minAtletasNovoTime || null
            } : null
          };
        });

      const atletasSimplificados = (activeState.atletas || [])
        .filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + String(pel.id)))
        .map(a => ({
          id: a.id,
          nome: a.nome,
          apelido: a.apelido || "",
          fotoUrl: a.fotoUrl || ""
        }));

      const publicPayload = {
        id: pel.id,
        name: pel.name,
        datasRealizacao: datasPel,
        atletas: atletasSimplificados,
        isPublicPelada: true,
        lastUpdated: new Date().toISOString()
      };

      const cleanPublicPayload = JSON.parse(JSON.stringify(publicPayload));
      await setDoc(doc(db, COLLECTION_CAMPEONATOS, "pelada_" + String(pel.id)), cleanPublicPayload);
      console.log(`[REALTIME] Pelada ${pel.name} sincronizada publicamente em tempo real no Firestore!`);
    } catch (e) {
      console.error("Erro na sincronização instantânea pública da pelada:", e);
    }
  };

  // Setters que atualizam o appState
  const setPeladas = d => setAppState(s => ({ ...s, peladas: typeof d === 'function' ? d(Array.isArray(s.peladas) ? s.peladas : []) : d }));
  const setDatasRealizacao = d => setAppState(s => {
    const nextDatas = typeof d === 'function' ? d(Array.isArray(s.datasRealizacao) ? s.datasRealizacao : []) : d;
    const newState = { ...s, datasRealizacao: nextDatas };
    const activePeladaId = current?.id || dashboardSelectedId || null;
    if (activePeladaId) {
      sincronizarPeladaImediatamente(activePeladaId, newState);
    }
    return newState;
  });
    const setAtletas = d => setAppState(s => ({ ...s, atletas: typeof d === 'function' ? d(Array.isArray(s.atletas) ? s.atletas : []) : d }));
  const setQuadras = d => setAppState(s => ({ ...s, quadras: typeof d === 'function' ? d(Array.isArray(s.quadras) ? s.quadras : []) : d }));
  const setParticipacoes = d => setAppState(s => ({ ...s, participacoes: typeof d === 'function' ? d(Array.isArray(s.participacoes) ? s.participacoes : []) : d }));
  const setFinanceiro = d => setAppState(s => ({ ...s, financeiro: typeof d === 'function' ? d(s.financeiro && typeof s.financeiro === 'object' ? s.financeiro : { entries: [] }) : d }));
  const setManagers = d => setAppState(s => ({ ...s, managers: typeof d === 'function' ? d(Array.isArray(s.managers) ? s.managers : []) : d }));
  const setAdminPassword = d => setAppState(s => ({ ...s, adminPassword: typeof d === 'function' ? d(s.adminPassword || "1204110411") : d }));
  const adicionarManager = d => setManagers(p => [...p, { ...d, id: Date.now() }]);
  const atualizarManager = (id, d) => setManagers(p => p.map(m => m.id === id ? { ...m, ...d } : m));
  const removerManager = id => setManagers(p => p.filter(m => m.id !== id));
  const assegurarManagerColaborador = (name, email, password, targetScope = "pelada") => {
    const trimmedEmail = String(email || "").toLowerCase().trim();
    const list = Array.isArray(appState?.managers) ? appState.managers : [];
    const index = list.findIndex(m => String(m.email || "").toLowerCase().trim() === trimmedEmail);
    if (index === -1) {
      adicionarManager({
        name: name.trim(),
        email: trimmedEmail,
        password: password,
        scope: targetScope
      });
    } else {
      const existingManager = list[index];
      const currentScope = existingManager.scope || "pelada";
      let newScope = currentScope;
      if (currentScope !== "geral" && currentScope !== targetScope) {
        newScope = "geral";
      }
      atualizarManager(existingManager.id, {
        password: password || existingManager.password,
        scope: newScope
      });
    }
  };


  const[current,setCurrent]=useState(null);

  useEffect(() => {
    if (screen === "gerenciarPelada" && current?.id) {
      setSidebarPeladaId(String(current.id));
    } else if (screen === "home") {
      if (dashboardSelectedId !== "") {
        setSidebarPeladaId(String(dashboardSelectedId));
      }
    }
  }, [screen, current, dashboardSelectedId]);

  const [storageSize, setStorageSize] = useState(0);

  useEffect(() => {
    if (screen === "backup") {
      getLocalStorageSize().then(setStorageSize);
    }
  }, [screen]);

      // ── CRUD Atletas ───────────────────────────────────────────────
  const adicionarAtleta  =d=>setAtletas(p=>[...p,{...d,id:d.id || Date.now() + Math.floor(Math.random() * 100000), manager_id: auth.role === "manager" ? auth.manager_id : null}]);
  const atualizarAtleta  =(id,d)=>setAtletas(p=>p.map(a=>a.id===id?{...a,...d}:a));
  const removerAtleta    =id=>{
    setAtletas(p=>p.filter(a=>a.id!==id));
    setParticipacoes(prev=>prev.filter(part=>part.atleta_id!==id));
  };


  // ── CRUD Quadras ───────────────────────────────────────────────
  const adicionarQuadra = d => setQuadras(p => [...p, { ...d, id: d.id || Date.now(), manager_id: auth.role === "manager" ? auth.manager_id : null }]);
  const atualizarQuadra = (id, d) => setQuadras(p => p.map(q => q.id === id ? { ...q, ...d } : q));
  const removerQuadra = id => setQuadras(p => p.filter(q => q.id !== id));

  // ── CRUD Datas Realização ──────────────────────────────────────
  const adicionarData=(d)=>setDatasRealizacao(p=>[...p,{...d,id:Date.now()}]);
  const atualizarData = (id, d) => {
    setDatasRealizacao(prev => prev.map(x => {
      if (String(x.id) === String(id)) {
        const dataAtualizada = { ...x, ...d };
        const presenca = dataAtualizada.presenca || x.presenca || [];
        const formacoes = dataAtualizada.drawnTeams || dataAtualizada.formacoes || x.formacoes || x.drawnTeams || null;
        const matchLog = dataAtualizada.peladaState?.matchLog || dataAtualizada.confrontos || x.confrontos || (x.peladaState?.matchLog) || [];
        const confrontos = matchLog;
        const estatisticas = calcularEstatisticasData(matchLog);
        const classificacao = calcularClassificacaoData(dataAtualizada.drawnTeams || x.drawnTeams || formacoes, matchLog);
        
        return {
          ...dataAtualizada,
          presenca,
          formacoes,
          confrontos,
          estatisticas,
          classificacao,
          drawnTeams: formacoes
        };
      }
      return x;
    }));
  };
  const removerData = id => {
    setDatasRealizacao(p => p.filter(x => String(x.id) !== String(id)));
    setParticipacoes(p => p.filter(x => String(x.data_realizacao_id) !== String(id)));
    setFinanceiro(f => ({
      ...f,
      entries: (f.entries || []).filter(e => String(e.data_id) !== String(id))
    }));
  };

  // ── CRUD Participações ─────────────────────────────────────────
  const adicionarPart=(d)=>{
    setParticipacoes(p=>{
      const next = [...p,{...d,id:Date.now()}];
      if (d.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(d.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(d.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  const atualizarPart=(id,d)=>{
    setParticipacoes(p=>{
      const next = p.map(x=>x.id===id?{...x,...d}:x);
      const part = p.find(x=>x.id===id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };
  const removerPart  =id=>{
    setParticipacoes(p=>{
      const part = p.find(x=>x.id===id);
      const next = p.filter(x=>x.id!==id);
      if (part && part.data_realizacao_id) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(part.data_realizacao_id) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(part.data_realizacao_id, { presenca: presentesIds }), 0);
      }
      return next;
    });
  };

  const salvarParticipacoesLote = (peladaId, dataRealizacaoId, novasParts) => {
    setParticipacoes(prev => {
      const filtered = prev.filter(p => !(p.pelada_id === peladaId && String(p.data_realizacao_id) === String(dataRealizacaoId)));
      const cleanNew = novasParts.map(p => {
        const cleaned = { ...p };
        if (String(cleaned.id).startsWith("temp_")) {
          cleaned.id = Date.now() + Math.floor(Math.random() * 10000);
        }
        return cleaned;
      });
      const next = [...filtered, ...cleanNew];
      if (dataRealizacaoId !== null) {
        const presentesIds = next.filter(x => String(x.data_realizacao_id) === String(dataRealizacaoId) && x.compareceu).map(x => x.atleta_id);
        setTimeout(() => atualizarData(dataRealizacaoId, { presenca: presentesIds }), 0);
      }
      return next;
    });

    if (dataRealizacaoId === null) {
      const atletasIdsNovos = novasParts.map(p => p.atleta_id);
      setAtletas(prev => prev.map(a => {
        const vinculos = Array.isArray(a.vinculos) ? [...a.vinculos] : [];
        const vinculoId = "pelada_" + peladaId;
        const temVinculo = vinculos.includes(vinculoId);
        const deveTerVinculo = atletasIdsNovos.includes(a.id);
        
        if (deveTerVinculo && !temVinculo) {
          return { ...a, vinculos: [...vinculos, vinculoId] };
        } else if (!deveTerVinculo && temVinculo) {
          return { ...a, vinculos: vinculos.filter(v => v !== vinculoId) };
        }
        return a;
      }));
    }
  };

  // ── CRUD Peladas ───────────────────────────────────────────────
  const adicionarPelada=d=>setPeladas(p=>[...p,{id:Date.now(),nome:d.nome,data_criacao:d.data_criacao||todayStr(),ativo:d.ativo!==false, manager_id: auth.role === "manager" ? auth.manager_id : null}]);
  const atualizarPelada=(id,d)=>setPeladas(p=>p.map(x=>x.id===id?{...x,...d}:x));
  const removerPelada  =id=>{setPeladas(p=>p.filter(x=>x.id!==id));setDatasRealizacao(p=>p.filter(x=>x.pelada_id!==id));setParticipacoes(p=>p.filter(x=>x.pelada_id!==id));};


  // ── BACKUP / RESTAURAR ─────────────────────────────────────────
  async function exportJSON(){
    const data = {peladas,datasRealizacao,atletas,quadras,participacoes,financeiro,managers};
    const fileName = `futebol_manager_backup_${todayStr()}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonStr,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Exportar Backup JSON',
          text: 'Arquivo de backup do Futebol Manager',
          url: result.uri,
          dialogTitle: 'Compartilhar Backup',
        });
        return;
      } catch (e) {
        console.error('Erro ao exportar JSON nativo:', e);
      }
    }

    const blob = new Blob([jsonStr], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportTXT(){
    let txt = `BACKUP FUTEBOL MANAGER - ${formatarData(todayStr())}\n\n`;
    txt += `--- ATLETAS (${atletas.length}) ---\n`;
    atletas.forEach(a => txt += `${a.nome} - Habilidade: ${a.habilidade} - ${a.goleiro?"Goleiro":"Linha"} - ${a.ativo?"Ativo":"Inativo"}\n`);
    txt += `\n--- PELADAS (${peladas.length}) ---\n`;
    peladas.forEach(p => {
      txt += `\n[${p.nome}] - Criada em ${formatarData(p.data_criacao)} - ${p.ativo?"Ativa":"Inativa"}\n`;
      const ds = datasRealizacao.filter(d=>d.pelada_id===p.id);
      txt += `  Datas: ${ds.length}\n`;
      ds.forEach(d => txt += `  - ${formatarData(d.data)} (${d.status}) - ${d.local||"Sem local"}\n`);
    });


    const fileName = `futebol_manager_backup_${todayStr()}.txt`;
    const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const result = await Filesystem.writeFile({
          path: fileName,
          data: txt,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Exportar Relatório TXT',
          text: 'Relatório do Futebol Manager',
          url: result.uri,
          dialogTitle: 'Compartilhar Relatório',
        });
        return;
      } catch (e) {
        console.error('Erro ao exportar TXT nativo:', e);
      }
    }

    const blob = new Blob([txt], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName;
    a.click(); URL.revokeObjectURL(url);
  }
  function importJSON(e){
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if(Array.isArray(data.atletas)) setAtletas(data.atletas);
        if(Array.isArray(data.quadras)) setQuadras(data.quadras);
        if(Array.isArray(data.peladas)) setPeladas(data.peladas);
        if(Array.isArray(data.datasRealizacao)) setDatasRealizacao(data.datasRealizacao);
        if(Array.isArray(data.participacoes)) setParticipacoes(data.participacoes);
        if(data.financeiro && typeof data.financeiro === 'object') setFinanceiro(data.financeiro);
        if(Array.isArray(data.managers)) setManagers(data.managers);
        alert("Backup restaurado com sucesso!");
        setScreen("home");
      } catch(err) {
        alert("Erro ao ler arquivo de backup.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const salvarBackupNuvem = async () => {
    if (!isFirebaseConfigured) {
      alert("O Firebase não está configurado. Verifique o arquivo src/firebase.js.");
      return;
    }
    setCloudLoading(true);
    try {
      const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
      const { payload, otimizado } = await prepararPayloadParaNuvem(appState, auth.name || "Sem Nome");
      
      await setDoc(doc(db, "sistema", docKey), payload);
      setAppState(otimizado);
      localStorage.setItem("last_sync_time", String(new Date(payload.lastUpdated).getTime()));
      alert("Banco de dados completo otimizado e salvo na Nuvem com sucesso! 🚀");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar na nuvem: " + e.message);
    } finally {
      setCloudLoading(false);
    }
  };

  const restaurarBackupNuvem = async () => {
    if (!isFirebaseConfigured) {
      alert("O Firebase não está configurado. Verifique o arquivo src/firebase.js.");
      return;
    }
    if (!window.confirm("Atenção: Isso irá substituir TODOS os seus dados atuais (atletas, peladas e financeiro) pelos dados salvos na nuvem. Deseja continuar?")) {
      return;
    }
    setCloudLoading(true);
    try {
      const docKey = (auth.role === "adm" || auth.role === "manager") ? "admin_data" : `manager_${auth.manager_id || "unknown"}`;
      const docSnap = await getDoc(doc(db, "sistema", docKey));
      if (!docSnap.exists()) {
        alert("Nenhum backup encontrado na nuvem para a sua conta.");
        return;
      }
      const data = docSnap.data();
      const state = await extrairAppStateDeDocumento(data);
      if (state) {
        isRestoringNuvemRef.current = true;
        setAppState(state);
        const syncTime = data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now();
        localStorage.setItem("last_sync_time", String(syncTime));
        alert(`Dados restaurados com sucesso a partir da nuvem! 🚀\nAtualizado em: ${new Date(data.lastUpdated).toLocaleString("pt-BR")} por ${data.updatedBy}`);
        setScreen("home");
        setTimeout(() => {
          isRestoringNuvemRef.current = false;
        }, 5000);
      } else {
        alert("O documento de backup na nuvem está inválido.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao restaurar da nuvem: " + e.message);
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(()=>{document.body.style.background=t.bg;document.body.style.color=t.text;},[t]);

  if (loading || authLoading) {
    return (
      <div style={{...S.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", animation: "bounce 2s infinite", color: t.accent}}><IconSoccer size={48} /></div>
        <div style={{fontWeight:700, color:t.textSec}}>Carregando dados...</div>
        <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }`}</style>
      </div>
    );
  }

  if (cloudLoading) {
    return (
      <div style={{...S.page, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"center", animation: "spin 2s linear infinite", color: t.accent}}><IconGlobe size={48} /></div>
        <div style={{fontWeight:700, color:t.textSec}}>Conectando à nuvem...</div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const FontScaleBtn = () => {
    let text = "A";
    let title = "Tamanho do Texto: Normal";
    if (fontScale === 1.15) { text = "A+"; title = "Tamanho do Texto: Grande"; }
    else if (fontScale === 1.30) { text = "A++"; title = "Tamanho do Texto: Extra Grande"; }
    else if (fontScale === 1.45) { text = "A+++"; title = "Tamanho do Texto: Gigante"; }
    
    return (
      <button 
        onClick={toggleFontScale} 
        style={{
          ...S.btnSm(t.card, t.text),
          padding: "8px 12px",
          fontSize: 14,
          fontWeight: 800,
          border: `1px solid ${t.cardBorder}`,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          gap: 4
        }}
        title={title}
      >
        {text}
      </button>
    );
  };

  const DarkBtn=()=><button onClick={()=>setDark(d=>!d)} style={{...S.btnSm(t.card,t.text),padding:"8px 12px",fontSize:15,border:`1px solid ${t.cardBorder}`,borderRadius:12}}>{dark ? <IconSun size={15} /> : <IconMoon size={15} />}</button>;

  if(screen==="selection"){
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} onBack={() => {}} t={t} />;
  }

  if(screen==="managerRegistry"){
    if(auth.role !== "adm"){
      return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} onBack={() => {}} t={t} />;
    }
    return <ManagerRegistry managers={managers} onAdd={adicionarManager} onUpdate={atualizarManager} onRemove={removerManager} onBack={()=>setScreen("home")} t={t} />;
  }

  if(screen==="login"){
    return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} onBack={() => setScreen("selection")} t={t} />;
  }

  

  if(screen==="publicPelada" && publicPeladaData){
    return <CloudPublicPeladaScreen peladaData={publicPeladaData} onRefresh={refreshPublicPelada} onBack={()=>{setPublicPeladaData(null);setScreen("selection");}} t={t} />;
  }

  /* ── HOME ────────────────────────────────────────────────────── */
  if(screen==="home"){
    // Cálculo financeiro
    let entries = [];
    if (dashboardSelectedId !== "") {
      const selectedIdNum = Number(dashboardSelectedId);
      entries = (financeiroFiltered?.entries || []).filter(e => String(e.pelada_id) === String(selectedIdNum));
    }
    const totalReceita = entries.filter(e => e.type === "receita").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalDespesa = entries.filter(e => e.type === "despesa").reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const saldoFinal = totalReceita - totalDespesa;

    const comunicadosRecentes = [];

    // 1. Cálculo de atletas e presença para o Card 1
    let card1Label = "Atletas / Presença";
    let card1Value = `${atletas.length}`;
    
    if (dashboardSelectedId !== "") {
      const peladaIdSel = Number(dashboardSelectedId);
      const atletasVinc = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + peladaIdSel));
      
      if (dashboardSelectedDataId !== "" && dashboardSelectedDataId !== "todas") {
        const dataIdSel = Number(dashboardSelectedDataId);
        // Filtrar participações daquela pelada e rodada
        const partsData = participacoes.filter(p => p.pelada_id === peladaIdSel && String(p.data_realizacao_id) === String(dataIdSel));
        
        let cadastrados = partsData.length;
        if (cadastrados === 0) {
          cadastrados = atletasVinc.length; // Fallback se as participações não tiverem sido salvas/inicializadas
        }
        const presentesCount = partsData.filter(p => p.compareceu).length;
        card1Value = `${cadastrados} / ${presentesCount}`;
      } else {
        // Todas as datas da pelada
        const datasPel = datasRealizacao.filter(d => d.pelada_id === peladaIdSel && d.status === "realizado");
        
        let totalCadastrados = 0;
        let totalComparecidos = 0;
        datasPel.forEach(d => {
          const partsData = participacoes.filter(p => p.pelada_id === peladaIdSel && String(p.data_realizacao_id) === String(d.id));
          totalCadastrados += partsData.length > 0 ? partsData.length : atletasVinc.length;
          totalComparecidos += partsData.filter(p => p.compareceu).length;
        });
        
        const mediaCadastrados = datasPel.length > 0 ? (totalCadastrados / datasPel.length) : atletasVinc.length;
        const mediaComparecidos = datasPel.length > 0 ? (totalComparecidos / datasPel.length) : 0;
        
        card1Value = `${mediaCadastrados.toFixed(0)} / ${mediaComparecidos.toFixed(0)}`;
      }
    } else {
      // Caso global das peladas
      const totalAtletasPeladas = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.some(v => v.startsWith("pelada_"))).length;
      const datasRealizadasTotal = datasRealizacao.filter(d => d.status === "realizado");
      
      let totalCadastradosGeral = 0;
      let totalComparecidosGeral = 0;
      datasRealizadasTotal.forEach(d => {
        const partsData = participacoes.filter(p => p.pelada_id === d.pelada_id && String(p.data_realizacao_id) === String(d.id));
        if (partsData.length > 0) {
          totalCadastradosGeral += partsData.length;
          totalComparecidosGeral += partsData.filter(p => p.compareceu).length;
        } else {
          const atletasVinc = atletas.filter(a => Array.isArray(a.vinculos) && a.vinculos.includes("pelada_" + d.pelada_id));
          totalCadastradosGeral += atletasVinc.length;
        }
      });
      
      const mediaCadastradosGeral = datasRealizadasTotal.length > 0 ? (totalCadastradosGeral / datasRealizadasTotal.length) : totalAtletasPeladas;
      const mediaComparecidosGeral = datasRealizadasTotal.length > 0 ? (totalComparecidosGeral / datasRealizadasTotal.length) : 0;
      
      card1Value = `${mediaCadastradosGeral.toFixed(0)} / ${mediaComparecidosGeral.toFixed(0)}`;
    }

    // 2. Ajuste do Card 2 (Peladas)
    let card2Label = "Peladas";
    let card2Value = peladas.length;
    let card2Icon = <IconSoccer size={18} />;
    let card2Color = "#22b7d9";

    const statCards = [
      { label: card1Label, value: card1Value, icon: <IconUsers size={18} />, color: "#8e44ad" },
      { label: card2Label, value: card2Value, icon: card2Icon, color: card2Color },
      { label: "Saldo Caixa", value: fmtCur(saldoFinal), icon: <IconWallet size={18} />, color: saldoFinal >= 0 ? "#20E278" : "#E24B4A" },
    ];

    // Computa o Painel Dinâmico (Artilharia / Info / Ações Rápidas)
    const renderPainelDinamico = () => {
      // 1. Caso Peladas e Selecionado uma Pelada
      if (dashboardTab === "peladas" && dashboardSelectedId !== "") {
        const peladaIdSel = Number(dashboardSelectedId);
        const peladaObj = peladas.find(p => p.id === peladaIdSel);
        
        // Coleta e calcula a artilharia
        const golsAcumulados = {};
        const datasArt = datasRealizacao.filter(d => {
          if (d.pelada_id !== peladaIdSel) return false;
          if (dashboardSelectedDataId !== "" && dashboardSelectedDataId !== "todas") {
            return d.id === Number(dashboardSelectedDataId);
          }
          return true; // Todas as datas
        });

        datasArt.forEach(d => {
          const ps = d.peladaState;
          if (ps && Array.isArray(ps.matchLog)) {
            ps.matchLog.forEach(m => {
              if (m && m.played && m.sumula) {
                Object.keys(m.sumula).forEach(atletaId => {
                  const gols = Number(m.sumula[atletaId]) || 0;
                  if (gols > 0) {
                    golsAcumulados[atletaId] = (golsAcumulados[atletaId] || 0) + gols;
                  }
                });
              }
            });
          }
        });

        const rankArtilharia = Object.keys(golsAcumulados)
          .map(atletaId => {
            const atletaObj = allAtletas.find(a => String(a.id) === String(atletaId));
            return {
              atletaId,
              atleta: atletaObj,
              gols: golsAcumulados[atletaId]
            };
          })
          .filter(x => x.gols > 0)
          .sort((a, b) => b.gols - a.gols);

        if (rankArtilharia.length > 0) {
          // Exibe Artilharia Top 10
          return (
            <div style={S.card}>
              <div style={{fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8}}>
                <span><IconSoccer size={14} /></span>
                Artilharia - Top 10 ({peladaObj?.nome || "Pelada"})
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 0}}>
                {rankArtilharia.slice(0, 10).map((x, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "24px",
                    borderBottom: i !== Math.min(rankArtilharia.length, 10) - 1 ? `1px solid ${t.cardBorder}` : "none",
                    background: i % 2 === 0 ? t.inputBg + "44" : "transparent",
                    borderRadius: 8
                  }}>
                    <div style={{display: "flex", alignItems: "center", gap: 10}}>
                      <span style={{
                        fontWeight: 900,
                        color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : t.textSec,
                        width: 24, fontSize: 13
                      }}>
                        {i === 0 ? <span style={{color:"#BA7517",fontWeight:800}}>1º</span> : i === 1 ? <span style={{color:"#8E929E",fontWeight:800}}>2º</span> : i === 2 ? <span style={{color:"#CD7F32",fontWeight:800}}>3º</span> : `${i + 1}º`}
                      </span>
                      <PlayerAvatar atleta={x.atleta} size={28} />
                      <span style={{fontSize: 13, fontWeight: 700, color: t.text}}>
                        {x.atleta ? getPlayerName(x.atleta) : "Atleta Deletado"}
                      </span>
                    </div>
                    <div style={{fontWeight: 800, color: "#22b7d9", fontSize: 14, display: "flex", alignItems: "center", gap: 4}}>
                      {x.gols} <span style={{fontSize: 10, color: t.textSec}}>gols</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        } else {
          // Informações da Pelada
          const datasDessaPelada = datasRealizacao.filter(d => d.pelada_id === peladaIdSel);
          const realizadas = datasDessaPelada.filter(d => d.status === "realizado").length;
          const agendadas = datasDessaPelada.filter(d => d.status === "agendado").length;
          const proximaData = datasDessaPelada.find(d => d.status === "agendado");
          
          return (
            <div style={S.card}>
              <div style={{fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8}}>
                <span>👟</span>
                Informações da Pelada: {peladaObj?.nome}
              </div>
              <div style={{display: "flex", flexDirection: "column", gap: 10, fontSize: 13, color: t.textSec, lineHeight: 1.6, marginBottom: 16}}>
                <div><b>Data de Criação:</b> {formatarData(peladaObj?.data_criacao)}</div>
                <div style={{display: "flex", gap: 12, flexWrap: "wrap", marginTop: 4}}>
                  <div style={{background: "#22b7d915", padding: "4px 10px", borderRadius: 8, color: "#22b7d9", fontWeight: 700}}>
                    {datasDessaPelada.length} Total
                  </div>
                  <div style={{background: "#1D9E7515", padding: "4px 10px", borderRadius: 8, color: "#1D9E75", fontWeight: 700}}>
                    ✅ {realizadas} Realizadas
                  </div>
                  <div style={{background: "#E24B4A15", padding: "4px 10px", borderRadius: 8, color: "#E24B4A", fontWeight: 700}}>
                    ⏳ {agendadas} Agendadas
                  </div>
                </div>
                {proximaData && (
                  <div style={{marginTop: 6, padding: "8px 12px", background: t.inputBg, borderRadius: 8, border: `1px solid ${t.cardBorder}`}}>
                    <b>Próximo Encontro Agendado:</b><br/>
                    {formatarData(proximaData.data)} {proximaData.local ? `em ${proximaData.local}` : ""}
                  </div>
                )}
                {Array.isArray(peladaObj?.collaborators) && peladaObj.collaborators.length > 0 && (
                  <div style={{marginTop: 4}}>
                    <b>Colaboradores ({peladaObj.collaborators.length}):</b><br/>
                    <div style={{display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4}}>
                      {peladaObj.collaborators.map(c => (
                        <span key={c.id} style={{fontSize: 11, background: t.cardBorder + "55", padding: "2px 8px", borderRadius: 6, color: t.text}}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => { setCurrent(peladaObj); setScreen("gerenciarPelada"); }}
                style={{...S.btn("#22b7d9"), width: "100%", fontWeight: 700}}
              >
                Gerenciar Pelada
              </button>
            </div>
          );
        }
      }

      // 3. Caso Geral (sem nada selecionado): Renderiza as Ações Rápidas Originais
      return (
        <div>
          <div style={{fontSize: 11, fontWeight: 800, color: t.textSec, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8}}>Ações Rápidas</div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
            {[
              {icon: <IconSoccer size={28} />, label: "Nova Pelada", sub: "Sorteador de times rápidos", action: () => setScreen("novaPelada"), color: "#10b981", scope: "pelada"},
            ].filter(b => auth.role === "adm" || auth.scope === "geral" || auth.scope === b.scope).map(b => (
              <button key={b.label} onClick={b.action}
                style={{
                  ...S.card,
                  textAlign: "center",
                  cursor: "pointer",
                  border: "1.5px solid " + b.color + "22",
                  display: "block",
                  width: "100%",
                  padding: 16,
                  background: t.card,
                  boxSizing: "border-box",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = b.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = b.color + "22"; e.currentTarget.style.transform = "none"; }}
              >
                <div style={{fontSize: 28, marginBottom: 6}}>{b.icon}</div>
                <div style={{fontWeight: 800, fontSize: 14, color: b.color}}>{b.label}</div>
                <div style={{fontSize: 11, color: t.textSec, marginTop: 4, lineHeight: 1.4}}>{b.sub}</div>
              </button>
            ))}
          </div>
        </div>
      );
    };

    return renderComLayout(
      <div style={{display: "flex", flexDirection: "column", gap: 20, paddingTop: 4}}>

        {/* Banner de Sincronização */}
        <div style={{...S.card, background: isFirebaseConfigured ? "#20E27808" : "#22b7d908", borderColor: isFirebaseConfigured ? "#20E27830" : "#22b7d930", padding: "12px 16px"}}>
          <div style={{display: "flex", alignItems: "center", gap: 10}}>
            <div style={{fontSize: 18}}>{isFirebaseConfigured ? <IconCloud size={18} color="#20E278" /> : <IconDatabase size={18} color="#22b7d9" />}</div>
            <div style={{flex: 1}}>
              <div style={{fontSize: 13, fontWeight: 800, color: isFirebaseConfigured ? "#20E278" : "#22b7d9", marginBottom: 2}}>
                {isFirebaseConfigured ? "Conectado ao Firebase Cloud Sync" : "Armazenamento Local Ativo"}
              </div>
              <div style={{fontSize: 11, color: t.textSec}}>
                {isFirebaseConfigured
                  ? "Seus dados são salvos online automaticamente."
                  : "Dados salvos de forma segura neste dispositivo."}
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Elegantes do Dashboard */}
        <div style={{...S.card, padding: 24, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center"}}>
          <div style={{fontSize: 12, fontWeight: 800, color: t.textSec, textTransform: "uppercase", letterSpacing: 0.5}}>Filtro de Peladas:</div>
          <select 
            value={dashboardSelectedId} 
            onChange={e => { setDashboardSelectedId(e.target.value); setDashboardSelectedDataId(""); }} 
            style={{...S.select, flex: 1, minWidth: 200}}
          >
            <option value="">Todas as Peladas</option>
            {peladas.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          
          {dashboardSelectedId !== "" && (
            <select 
              value={dashboardSelectedDataId} 
              onChange={e => setDashboardSelectedDataId(e.target.value)} 
              style={{...S.select, flex: 1, minWidth: 180}}
            >
              <option value="todas">Todas as Datas</option>
              {datasRealizacao.filter(d => d.pelada_id === Number(dashboardSelectedId)).map(d => (
                <option key={d.id} value={d.id}>{formatarData(d.data)} {d.local ? `(${d.local})` : ""}</option>
              ))}
            </select>
          )}
        </div>
        {/* Cards de Estatísticas */}
        <div style={{display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(180px, 1fr))", gap: 12}}>
          {statCards.map((sc, i) => (
            <div key={i} style={{
              ...S.card,
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              borderLeft: `4px solid ${sc.color}`,
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                <span style={{fontSize: 11, fontWeight: 800, color: t.textSec, textTransform: "uppercase", letterSpacing: 0.5}}>{sc.label}</span>
                <span style={{display: "flex", alignItems: "center", justifyContent: "center", color: sc.color}}>{sc.icon}</span>
              </div>
              <div style={{fontSize: 22, fontWeight: 900, color: sc.color, fontFamily: "'Inter', sans-serif"}}>{sc.value}</div>
            </div>
          ))}
        </div>

        <div style={{display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 320px", gap: 16, alignItems: "flex-start"}}>
          {/* COLUNA PRINCIPAL */}
          <div style={{display: "flex", flexDirection: "column", gap: 16}}>

            {/* Painel Dinâmico */}
            {renderPainelDinamico()}

            {/* Feed de Partidas Recentes removido */}

                  {/* Lista Mobile de peladas */}
      {isMobile && (
        <>
          {peladas.length > 0 && (
                  <div>
                    <h3 style={{fontSize: 14, fontWeight: 700, margin: "8px 0 16px 0", color: t.text}}><IconSoccer size={14} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Peladas</h3>
                    <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                      {peladas.map(p => (
                        <div key={p.id} style={{...S.card, padding: "24px", cursor: "pointer"}} onClick={() => {setCurrent(p); setScreen("gerenciarPelada");}}>
                          <div style={{fontWeight: 700, fontSize: 14, color: t.text}}>{p.nome}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COLUNA DIREITA: Financeiro + Comunicados */}
          <div style={{display: "flex", flexDirection: "column", gap: 14}}>
            {/* Resumo Financeiro */}
            <div style={S.card}>
              <div style={{fontSize: 11, fontWeight: 800, color: t.textSec, marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.8}}><IconWallet size={12} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Caixa da Liga</div>
              <div style={{display: "flex", flexDirection: "column", gap: 8}}>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 12, color: t.textSec}}>Arrecadado:</span>
                  <span style={{fontSize: 13, fontWeight: 700, color: "#20E278"}}>{fmtCur(totalReceita)}</span>
                </div>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 12, color: t.textSec}}>Despesas:</span>
                  <span style={{fontSize: 13, fontWeight: 700, color: "#E24B4A"}}>{fmtCur(totalDespesa)}</span>
                </div>
                <div style={{borderBottom: "1px solid " + t.cardBorder, margin: "2px 0"}}/>
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
                  <span style={{fontSize: 13, fontWeight: 800, color: t.text}}>Saldo:</span>
                  <span style={{fontSize: 15, fontWeight: 900, color: saldoFinal >= 0 ? t.accent : "#E24B4A"}}>{fmtCur(saldoFinal)}</span>
                </div>
                <button onClick={() => setScreen("financeiro")} style={{...S.btnSm(), width: "100%", justifyContent: "center", marginTop: 4}}>
                  Ver Caixa Completo →
                </button>
              </div>
            </div>

            {/* Comunicados Recentes removido */}
          </div>
        </div>
      </div>
    );
  }





  /* ── FINANCEIRO ────────────────────────────────────────────────── */
  if(screen==="financeiro"){
    return renderComLayout(<FinanceiroScreen financeiro={financeiroFiltered} setFinanceiro={setFinanceiroWrapped} participacoes={participacoes} peladas={peladas} datasRealizacao={datasRealizacao} setScreen={setScreen} DarkBtn={DarkBtn} FontScaleBtn={FontScaleBtn} t={t} atletas={atletas} auth={auth} />);
  }

  /* ── BACKUP ────────────────────────────────────────────────────── */
  if(screen==="backup")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}><IconDatabase size={18} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Backup e Importação/Exportação</h2>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {isFirebaseConfigured && (
          <div style={{...S.card, borderColor:"#22b7d955", background:"#22b7d908"}}>
            <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#22b7d9"}}><IconCloud size={15} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Sincronização e Backup Online (Firebase)</h3>
            <p style={{fontSize:13,color:t.textSec,marginBottom:16}}>
              <b>Sincronização Ativa:</b> Suas alterações locais são salvas na nuvem automaticamente.
            </p>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button onClick={salvarBackupNuvem} style={S.btn("#22b7d9")}><IconUpload size={14} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Salvar Banco na Nuvem</button>
              <button onClick={restaurarBackupNuvem} style={S.btn("#1D9E75")}><IconDownload size={14} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Restaurar da Nuvem</button>
            </div>
          </div>
        )}

        <div style={{...S.card,borderColor:"#1D9E7555",background:"#1D9E7508"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#1D9E75"}}>{isFirebaseConfigured ? <span style={{display: "inline-flex", alignItems: "center", gap: 6}}><IconCheck size={15} /> Armazenamento Local</span> : <span style={{display: "inline-flex", alignItems: "center", gap: 6}}><IconCheck size={15} /> Armazenamento Automático</span>}</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:16}}>Seus dados são salvos automaticamente no navegador.</p>
          <div style={{fontSize:12,color:t.textSec,background:t.inputBg,padding:"24px",borderRadius:8,marginBottom:16}}>
            <b>Tamanho dos dados salvos:</b> {(storageSize / 1024).toFixed(2)} KB
          </div>
        </div>

        <div style={S.card}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:t.text}}><IconDownload size={15} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Exportar Dados</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:16}}>Faça o download de todos os dados do sistema.</p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={exportJSON} style={S.btn("#1D9E75")}><IconFile size={14} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Exportar JSON</button>
            <button onClick={exportTXT} style={S.btn("#22b7d9")}><IconFile size={14} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Exportar TXT</button>
          </div>
        </div>
        <div style={{...S.card,borderColor:"#E24B4A55"}}>
          <h3 style={{fontSize:15,fontWeight:700,margin:"0 0 10px 0",color:"#E24B4A"}}><IconUpload size={15} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Importar Dados (Restaurar)</h3>
          <p style={{fontSize:13,color:t.textSec,marginBottom:16}}>Restaure os dados a partir de um arquivo JSON.</p>
          <label style={{...S.btn("#E24B4A"),display:"inline-flex",cursor:"pointer"}}>
            <IconFile size={14} style={{marginRight: 4, display: "inline-block", verticalAlign: "middle"}} /> Selecionar Arquivo JSON
            <input type="file" accept=".json" style={{display:"none"}} onChange={importJSON} />
          </label>
        </div>
      </div>
    </div>
  );

  /* ── QUADRAS ──────────────────────────────────────────────────── */
  if(screen==="quadras")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}><IconGoalNet size={18} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Gerenciamento de Quadras / Campos</h2>
      </div>
      <CRUDQuadras 
        quadras={quadras} 
        onAdd={adicionarQuadra} 
        onUpdate={atualizarQuadra} 
        onRemove={removerQuadra} 
        onExport={exportQuadras} 
        onImport={importQuadras} 
        onDownloadTemplate={downloadQuadrasTemplate} 
        t={t}
      />
    </div>
  );

  /* ── ATLETAS ──────────────────────────────────────────────────── */
  if(screen==="atletas")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}><IconUsers size={18} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Gerenciamento Geral de Atletas</h2>
      </div>
      <CRUDAtletas 
        atletas={atletas} 
        onAdd={adicionarAtleta} 
        onUpdate={atualizarAtleta} 
        onRemove={removerAtleta} 
        onExport={exportAtletas} 
        onImport={importAtletas} 
        onDownloadTemplate={downloadAtletasTemplate} 
         
        
        peladas={peladas}
        t={t}
      />
    </div>
  );

  /* ── NOVA PELADA ──────────────────────────────────────────────── */
  if(screen==="novaPelada")return renderComLayout(
    <div style={S.page}>
      <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
        <h2 style={{fontSize:18,fontWeight:800,margin:0,color:t.text}}><IconSoccer size={18} style={{marginRight: 6, display: "inline-block", verticalAlign: "middle"}} /> Criar Nova Pelada / Sorteador</h2>
      </div>
      <CriarPelada onSave={d=>{adicionarPelada(d);setScreen("home");}} t={t}/>
    </div>
  );

  /* ── GERENCIAR PELADA ─────────────────────────────────────────── */
  if(screen==="gerenciarPelada"&&current){
    const pelAtual=peladas.find(p=>p.id===current.id)||current;
    return renderComLayout(
      <GerenciarPelada
        pelada={pelAtual}
        atletas={atletas}
        participacoes={participacoes}
        datasRealizacao={datasRealizacao}
        onUpdatePelada={atualizarPelada}
        onRemovePelada={id=>{removerPelada(id);setScreen("home");}}
        onAddData={adicionarData}
        onUpdateData={atualizarData}
        onRemoveData={removerData}
        onAddPart={adicionarPart}
        onUpdatePart={atualizarPart}
        onRemovePart={removerPart}
        onSavePartsLote={salvarParticipacoesLote}
        onUpdateAtleta={atualizarAtleta}
        onAddFinanceiro={(desc, amount)=>{setFinanceiroWrapped(f=>({entries:[...f.entries,{id:Date.now(),desc,amount,type:"receita",date:todayStr(),category:"Mensalidade",pelada_id:pelAtual.id,manager_id:auth.role==="manager"?auth.manager_id:null}]}))}}
        onAddAtleta={adicionarAtleta}
        onBack={()=>setScreen("home")}
        t={t}
        aba={activePeladaTab}
        setAba={setActivePeladaTab}
        auth={auth}
        managers={managers}
        assegurarManagerColaborador={assegurarManagerColaborador}
        quadras={quadras}
      />
    );
  }

  if(screen==="managerRegistry"){
    if(auth.role !== "adm"){
      return <LoginScreen onLogin={handleLogin} onRegister={handleRegister} onForgotPassword={handleForgotPassword} onBack={() => {}} t={t} />;
    }
    return renderComLayout(<ManagerRegistry managers={managers} onAdd={adicionarManager} onUpdate={atualizarManager} onRemove={removerManager} onBack={()=>setScreen("home")} t={t} />);
  }

  return null;
}
