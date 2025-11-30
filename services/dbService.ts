import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Bot, Lead, Conversation, User, PlanType } from '../types';
import { PLANS } from '../constants';

const COLLECTIONS = {
  BOTS: 'bots',
  LEADS: 'leads',
  USERS: 'users',
  CONVERSATIONS: 'conversations'
};

export const dbService = {
  // --- BOTS ---
  
  // Real-time listener for bots
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const q = query(collection(db, COLLECTIONS.BOTS));
    return onSnapshot(q, (snapshot) => {
      const bots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bot));
      onUpdate(bots);
    });
  },

  saveBot: async (bot: Bot) => {
    const botRef = doc(collection(db, COLLECTIONS.BOTS), bot.id);
    await setDoc(botRef, bot, { merge: true });
    return bot;
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    const docRef = doc(db, COLLECTIONS.BOTS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Bot;
    }
    return undefined;
  },

  // --- LEADS ---

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const q = query(collection(db, COLLECTIONS.LEADS), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      onUpdate(leads);
    });
  },

  saveLead: async (lead: Lead) => {
    // Check for duplicate by email to avoid spamming DB
    const q = query(collection(db, COLLECTIONS.LEADS), where("email", "==", lead.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      // Update existing lead
      const existingDoc = querySnapshot.docs[0];
      await updateDoc(doc(db, COLLECTIONS.LEADS, existingDoc.id), { ...lead, id: existingDoc.id });
      return { ...lead, id: existingDoc.id };
    }

    // Create new
    const docRef = await addDoc(collection(db, COLLECTIONS.LEADS), lead);
    return { ...lead, id: docRef.id };
  },

  // --- USER & BILLING ---

  getUserProfile: async (uid: string): Promise<User | null> => {
    const docRef = doc(db, COLLECTIONS.USERS, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  },

  saveUserProfile: async (user: User) => {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    const now = new Date().toISOString();
    
    const userData = {
        ...user,
        status: user.status || 'Active',
        createdAt: user.createdAt || now
    };
    
    await setDoc(userRef, userData, { merge: true });
  },

  updateUserPlan: async (uid: string, plan: PlanType) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { plan: plan });
  },

  // --- RESELLER ---

  // Listen to users who were referred by this reseller code
  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    const q = query(collection(db, COLLECTIONS.USERS), where("referredBy", "==", resellerCode));
    return onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      onUpdate(users);
    });
  },

  // --- ADMIN FUNCTIONS ---
  
  // Get ALL users for the Admin Dashboard
  getAllUsers: async (): Promise<User[]> => {
    const q = query(collection(db, COLLECTIONS.USERS));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended') => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { status });
  },

  approvePartner: async (uid: string) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await updateDoc(userRef, { 
        status: 'Active'
        // Logic to trigger approval email would go here via cloud function
    });
  }
};