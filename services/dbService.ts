import { db, auth } from './firebaseConfig';
import { collection, doc, setDoc, getDoc, onSnapshot, query, where, updateDoc, addDoc, orderBy, limit, getDocs } from 'firebase/firestore';
import { Bot, Lead, Conversation, User, UserRole, PlanType } from '../types';

export const dbService = {
  // --- BOTS ---
  subscribeToBots: (userId: string, callback: (bots: Bot[]) => void, onError?: (error: Error) => void) => {
    try {
      // Multi-tenant: Filter by owner
      const q = query(
        collection(db, 'bots'),
        where('ownerId', '==', userId)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const bots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bot));
          callback(bots);
        },
        (error) => {
          console.error('Error subscribing to bots:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error setting up bots subscription:', error);
      if (onError) onError(error as Error);
      return () => {}; // Return empty unsubscribe function
    }
  },

  saveBot: async (bot: Bot): Promise<void> => {
    try {
      const botRef = doc(collection(db, 'bots'), bot.id);
      await setDoc(botRef, bot, { merge: true });
    } catch (error) {
      console.error('Error saving bot:', error);
      throw new Error('Failed to save bot. Please try again.');
    }
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    try {
      const docRef = doc(db, 'bots', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Bot;
      }
      return undefined;
    } catch (error) {
      console.error('Error getting bot by ID:', error);
      throw new Error('Failed to retrieve bot.');
    }
  },

  // --- LEADS ---
  subscribeToLeads: (userId: string, callback: (leads: Lead[]) => void, onError?: (error: Error) => void) => {
    try {
      // Multi-tenant: Filter by owner or bot owner
      const q = query(
        collection(db, 'leads'),
        where('botOwnerId', '==', userId)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
          callback(leads);
        },
        (error) => {
          console.error('Error subscribing to leads:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error setting up leads subscription:', error);
      if (onError) onError(error as Error);
      return () => {};
    }
  },

  saveLead: async (lead: Lead): Promise<void> => {
    try {
      const leadRef = doc(collection(db, 'leads'), lead.id);
      await setDoc(leadRef, lead, { merge: true });
    } catch (error) {
      console.error('Error saving lead:', error);
      throw new Error('Failed to save lead.');
    }
  },

  updateLeadStatus: async (leadId: string, status: string): Promise<void> => {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, { status, updatedAt: Date.now() });
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw new Error('Failed to update lead status.');
    }
  },

  // --- CONVERSATIONS ---
  saveConversation: async (conversation: Conversation): Promise<void> => {
    try {
      const convRef = doc(collection(db, 'conversations'), conversation.id);
      await setDoc(convRef, conversation, { merge: true });
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw new Error('Failed to save conversation.');
    }
  },

  getConversations: async (botId: string, limitCount: number = 50): Promise<Conversation[]> => {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('botId', '==', botId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw new Error('Failed to retrieve conversations.');
    }
  },

  subscribeToConversations: (
    botId: string,
    callback: (conversations: Conversation[]) => void,
    onError?: (error: Error) => void
  ) => {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('botId', '==', botId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const conversations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
          callback(conversations);
        },
        (error) => {
          console.error('Error subscribing to conversations:', error);
          if (onError) onError(error);
        }
      );
    } catch (error) {
      console.error('Error setting up conversations subscription:', error);
      if (onError) onError(error as Error);
      return () => {};
    }
  },

  // --- USER ---
  getUserProfile: async (userId: string): Promise<User | null> => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw new Error('Failed to retrieve user profile.');
    }
  },

  createUserProfile: async (user: User): Promise<void> => {
    try {
      const userRef = doc(db, 'users', user.id);
      await setDoc(userRef, user, { merge: true });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw new Error('Failed to create user profile.');
    }
  }
};