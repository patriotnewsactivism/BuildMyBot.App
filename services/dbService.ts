import { db, auth } from './firebaseConfig';
import { collection, doc, setDoc, getDoc, onSnapshot, query, where, updateDoc } from 'firebase/firestore';
import { Bot, Lead, Conversation, User, UserRole, PlanType } from '../types';

export const dbService = {
  // --- BOTS ---
  subscribeToBots: (callback: (bots: Bot[]) => void) => {
    // In a real multi-tenant app, you would filter by ownerId: where('ownerId', '==', auth.currentUser.uid)
    // For this demo, we'll just listen to the 'bots' collection
    const q = query(collection(db, 'bots'));
    return onSnapshot(q, (snapshot) => {
      const bots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bot));
      callback(bots);
    });
  },

  saveBot: async (bot: Bot) => {
    const botRef = doc(collection(db, 'bots'), bot.id);
    await setDoc(botRef, bot, { merge: true });
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    const docRef = doc(db, 'bots', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Bot;
    }
    return undefined;
  },

  // --- LEADS ---
  subscribeToLeads: (callback: (leads: Lead[]) => void) => {
    const q = query(collection(db, 'leads'));
    return onSnapshot(q, (snapshot) => {
      const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
      callback(leads);
    });
  },

  saveLead: async (lead: Lead) => {
    const leadRef = doc(collection(db, 'leads'), lead.id);
    await setDoc(leadRef, lead, { merge: true });
  },

  // --- USER ---
  getUserProfile: async (userId: string): Promise<User | null> => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
  },

  createUserProfile: async (user: User) => {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, user, { merge: true });
  }
};