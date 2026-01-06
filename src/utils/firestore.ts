// Firestore utilities for flashcard data management
// Handles CRUD operations for flashcards and user progress with optimistic updates

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type QuerySnapshot,
  type WriteBatch,
} from 'firebase/firestore';
import {
  firestore,
  isFirebaseError,
  getFirebaseErrorMessage,
} from './firebase';
import { getCurrentUser } from './auth';
import { firestoreCounter } from './simpleFirestoreCounter';
import type { CardSetProgress } from '../types/flashcard';

// Firestore operation result type
export interface FirestoreResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  CARD_SETS: 'cardSets',
  CARDS: 'cards',
} as const;

// Helper function to get user's cards collection reference for a specific card set
const getUserCardSetCardsCollection = (userId: string, cardSetId: string) => {
  const path = `${COLLECTIONS.USERS}/${userId}/${COLLECTIONS.CARD_SETS}/${cardSetId}/${COLLECTIONS.CARDS}`;
  console.log(`Firestore: Accessing collection path: ${path}`);

  return collection(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS,
    cardSetId,
    COLLECTIONS.CARDS
  );
};

// Helper function to get user's card sets collection reference
const getUserCardSetsCollection = (userId: string) => {
  return collection(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS
  );
};

// Helper function to get user document reference
const getUserDocRef = (userId: string) => {
  return doc(firestore, COLLECTIONS.USERS, userId);
};

// Helper function to get card set document reference
const getCardSetDocRef = (userId: string, cardSetId: string) => {
  return doc(
    firestore,
    COLLECTIONS.USERS,
    userId,
    COLLECTIONS.CARD_SETS,
    cardSetId
  );
};

// ========================================
// 🚀 SINGLE DOCUMENT PATTERN METHODS
// ========================================

/**
 * Get card set document with all cards in single array
 * This replaces the subcollection pattern: 1 READ instead of N reads
 * @param userId - User identifier
 * @param cardSetId - Card set identifier
 * @returns Single document with cards array or null if doesn't exist
 */
export const getCardSetDocument = async (
  userId: string,
  cardSetId: string
): Promise<FirestoreResult<{ cards: any[]; totalCards: number } | null>> => {
  try {
    const cardSetDocRef = getCardSetDocRef(userId, cardSetId);

    console.log(`📖 Single Document READ for ${userId}/${cardSetId}`);
    firestoreCounter.countRead(`Single document load: ${cardSetId}`);
    const cardSetDoc = await getDoc(cardSetDocRef);

    if (!cardSetDoc.exists()) {
      console.log(`Card set document does not exist: ${cardSetId}`);
      return { success: true, data: null };
    }

    const data = cardSetDoc.data();
    const cards = (data.cards || []).map((card: any) => ({
      ...card,
      // Convert Firestore timestamps to Date objects
      createdAt: card.createdAt?.toDate() || new Date(),
      updatedAt: card.updatedAt?.toDate() || new Date(),
      nextReviewDate: card.nextReviewDate?.toDate() || new Date(),
      lastReviewDate:
        card.lastReviewDate?.toDate() ||
        (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday;
        })(),
    }));

    console.log(`✅ Loaded ${cards.length} cards from single document`);
    return {
      success: true,
      data: {
        cards,
        totalCards: data.totalCards || cards.length,
      },
    };
  } catch (error) {
    console.error('Error getting card set document:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return { success: false, error: 'Failed to get card set document.' };
  }
};

/**
 * Save all cards to single document: 1 write instead of N writes
 * This implements the load→merge→save pattern for progress updates
 *
 * 🚨 FIREBASE LIMITATION: serverTimestamp() cannot be used inside arrays
 * We use regular timestamps for array items and serverTimestamp() only for document-level fields
 *
 * @param userId - User identifier
 * @param cardSetId - Card set identifier
 * @param cards - Array of all cards to save
 * @returns Success result
 */
export const saveAllCardsInSingleWrite = async (
  userId: string,
  cardSetId: string,
  cards: any[]
): Promise<FirestoreResult> => {
  try {
    const cardSetDocRef = getCardSetDocRef(userId, cardSetId);

    // Prepare cards for Firestore (convert dates to timestamps)
    // Note: serverTimestamp() cannot be used inside arrays, so we use regular timestamps
    const now = new Date();
    const cardsForFirestore = cards.map((card) => ({
      ...card,
      cardSetId, // Ensure cardSetId is set
      updatedAt: Timestamp.fromDate(now), // Use regular timestamp in arrays
      createdAt: card.createdAt
        ? card.createdAt instanceof Date
          ? Timestamp.fromDate(card.createdAt)
          : card.createdAt
        : Timestamp.fromDate(now), // Use regular timestamp in arrays
      nextReviewDate: card.nextReviewDate
        ? card.nextReviewDate instanceof Date
          ? Timestamp.fromDate(card.nextReviewDate)
          : card.nextReviewDate
        : Timestamp.fromDate(now), // Use regular timestamp in arrays
      lastReviewDate: card.lastReviewDate
        ? card.lastReviewDate instanceof Date
          ? Timestamp.fromDate(card.lastReviewDate)
          : card.lastReviewDate
        : Timestamp.fromDate(now), // Use regular timestamp in arrays
    }));

    const documentData = {
      cardSetId,
      cards: cardsForFirestore,
      totalCards: cards.length,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // Will only be set on first creation
    };

    console.log(
      `✍️ Single Document WRITE: ${cards.length} cards for ${userId}/${cardSetId}`
    );
    firestoreCounter.countWrite(
      `Single document save: ${cards.length} cards to ${cardSetId}`
    );
    await setDoc(cardSetDocRef, documentData, { merge: true });

    console.log(`✅ Saved ${cards.length} cards in single write operation`);
    return { success: true, data: cards };
  } catch (error) {
    console.error('Error saving cards in single write:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return { success: false, error: 'Failed to save cards in single write.' };
  }
};

/**
 * Replace all cards in single document (for reset operations)
 * Unlike saveAllCardsInSingleWrite, this completely replaces the document
 */
export const replaceAllCardsInSingleWrite = async (
  userId: string,
  cardSetId: string,
  cards: any[]
): Promise<FirestoreResult> => {
  try {
    const cardSetDocRef = getCardSetDocRef(userId, cardSetId);

    // Prepare cards for Firestore (convert dates to timestamps)
    const now = new Date();
    const cardsForFirestore = cards.map((card) => ({
      ...card,
      cardSetId, // Ensure cardSetId is set
      updatedAt: Timestamp.fromDate(now),
      createdAt: card.createdAt
        ? card.createdAt instanceof Date
          ? Timestamp.fromDate(card.createdAt)
          : card.createdAt
        : Timestamp.fromDate(now),
      nextReviewDate: card.nextReviewDate
        ? card.nextReviewDate instanceof Date
          ? Timestamp.fromDate(card.nextReviewDate)
          : card.nextReviewDate
        : Timestamp.fromDate(now),
      lastReviewDate: card.lastReviewDate
        ? card.lastReviewDate instanceof Date
          ? Timestamp.fromDate(card.lastReviewDate)
          : card.lastReviewDate
        : Timestamp.fromDate(now),
    }));

    const documentData = {
      cardSetId,
      cards: cardsForFirestore,
      totalCards: cards.length,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    console.log(
      `✍️ REPLACE Document: ${cards.length} fresh cards for ${userId}/${cardSetId}`
    );
    firestoreCounter.countWrite(
      `Replace document: ${cards.length} fresh cards to ${cardSetId}`
    );

    // Complete replacement (no merge: true) to reset all progress
    await setDoc(cardSetDocRef, documentData);

    console.log(`✅ Replaced ${cards.length} cards completely (reset)`);
    return { success: true, data: cards };
  } catch (error) {
    console.error('Error replacing cards in single write:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return {
      success: false,
      error: 'Failed to replace cards in single write.',
    };
  }
};

/**
 * Delete entire card set collection document
 */
export const deleteCardSetDocument = async (
  userId: string,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const cardSetDocRef = getCardSetDocRef(userId, cardSetId);

    console.log(`🗑️ Deleting card set document: ${userId}/${cardSetId}`);
    firestoreCounter.countWrite(`Delete card set document: ${cardSetId}`);

    await deleteDoc(cardSetDocRef);

    console.log(`✅ Deleted card set document: ${cardSetId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting card set document:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return { success: false, error: 'Failed to delete card set document.' };
  }
};

/**
 * Delete cardSetProgress document (subcollection structure)
 */
export const deleteCardSetProgressDocument = async (
  userId: string,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const progressDocRef = doc(
      firestore,
      'users',
      userId,
      'cardSetProgress',
      cardSetId
    );

    console.log(
      `🗑️ Deleting cardSetProgress: ${userId}/cardSetProgress/${cardSetId}`
    );
    firestoreCounter.countWrite(`Delete cardSetProgress: ${cardSetId}`);

    await deleteDoc(progressDocRef);

    console.log(`✅ Deleted cardSetProgress: ${cardSetId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting cardSetProgress document:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return {
      success: false,
      error: 'Failed to delete cardSetProgress document.',
    };
  }
};

/**
 * Update specific cards in the single document using load→merge→save pattern
 * This is for progress updates during review sessions
 * @param userId - User identifier
 * @param cardSetId - Card set identifier
 * @param updatedCards - Map of cardId to updated card data
 * @returns Success result
 */
export const updateCardsInSingleDocument = async (
  userId: string,
  cardSetId: string,
  updatedCards: Map<string, any>
): Promise<FirestoreResult> => {
  try {
    // Step 1: Load current document
    const loadResult = await getCardSetDocument(userId, cardSetId);

    if (!loadResult.success) {
      return { success: false, error: loadResult.error };
    }

    if (!loadResult.data) {
      return {
        success: false,
        error: 'Card set document does not exist for updates.',
      };
    }

    // Step 2: Merge updated cards with existing cards
    const existingCards = loadResult.data.cards;
    const mergedCards = existingCards.map((card) => {
      const updatedCard = updatedCards.get(card.id);
      return updatedCard ? { ...card, ...updatedCard } : card;
    });

    // Step 3: Save entire document in single write
    const saveResult = await saveAllCardsInSingleWrite(
      userId,
      cardSetId,
      mergedCards
    );

    console.log(
      `✅ Updated ${updatedCards.size} cards using load→merge→save pattern`
    );
    return saveResult;
  } catch (error) {
    console.error('Error updating cards in single document:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return {
      success: false,
      error: 'Failed to update cards in single document.',
    };
  }
};

// Create or update user profile in Firestore
export const createUserProfile = async (
  userId: string,
  profileData: any
): Promise<FirestoreResult> => {
  try {
    const userDocRef = getUserDocRef(userId);

    const userData = {
      ...profileData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    firestoreCounter.countWrite();
    await setDoc(userDocRef, userData, { merge: true });

    console.log('User profile created/updated:', userId);
    return { success: true, data: userData };
  } catch (error) {
    console.error('Error creating user profile:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to create user profile.' };
  }
};

// Get user profile from Firestore
export const getUserProfile = async (
  userId: string
): Promise<FirestoreResult> => {
  try {
    const userDocRef = getUserDocRef(userId);
    firestoreCounter.countRead();
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return { success: true, data: userData };
    } else {
      return { success: false, error: 'User profile not found.' };
    }
  } catch (error) {
    console.error('Error getting user profile:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to get user profile.' };
  }
};

// Save a single flashcard to Firestore for a specific card set
export const saveFlashcard = async (
  cardData: any,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to save cards.',
      };
    }

    // Use card set-specific collection
    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
    const cardDocRef = doc(cardsCollection, cardData.id);

    const cardWithTimestamp = {
      ...cardData,
      cardSetId, // Add cardSetId to the card data
      updatedAt: serverTimestamp(),
      createdAt: cardData.createdAt || serverTimestamp(),
    };

    // ✍️ นับ WRITE operation
    firestoreCounter.countWrite();
    await setDoc(cardDocRef, cardWithTimestamp, { merge: true });

    console.log('Flashcard saved:', cardData.id);
    return { success: true, data: cardWithTimestamp };
  } catch (error) {
    console.error('Error saving flashcard:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to save flashcard.' };
  }
};

// Save multiple flashcards in a batch operation for a specific card set
export const saveFlashcardsBatch = async (
  cards: any[],
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to save cards.',
      };
    }

    console.log(
      `Firestore: Saving batch of ${cards.length} cards for user ${currentUser.uid} in cardSet ${cardSetId}`
    );

    const batch: WriteBatch = writeBatch(firestore);
    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );

    cards.forEach((cardData) => {
      const cardDocRef = doc(cardsCollection, cardData.id);
      const cardWithTimestamp = {
        ...cardData,
        cardSetId, // Add cardSetId to each card
        updatedAt: serverTimestamp(),
        createdAt: cardData.createdAt || serverTimestamp(),
      };

      batch.set(cardDocRef, cardWithTimestamp, { merge: true });
      // Each document write in a batch is billed individually by Firestore
      firestoreCounter.countWrite();
    });

    await batch.commit();

    console.log(`${cards.length} flashcards saved in batch`);
    return { success: true, data: cards };
  } catch (error) {
    console.error('Error saving flashcards batch:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to save flashcards.' };
  }
};

// Get all flashcards for a specific card set
export const getUserFlashcards = async (
  cardSetId: string
): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to get cards.',
      };
    }

    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
    const cardsQuery = query(cardsCollection, orderBy('createdAt', 'desc'));

    // 📖 นับ READ operation
    firestoreCounter.countRead();
    const querySnapshot: QuerySnapshot<DocumentData> =
      await getDocs(cardsQuery);
    const cards = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to Date objects
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
      // For cards without lastReviewDate, set to a day in the past so they won't count as "reviewed today"
      lastReviewDate:
        doc.data().lastReviewDate?.toDate() ||
        (() => {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          return yesterday;
        })(),
    }));

    console.log(`Retrieved ${cards.length} flashcards`);
    return { success: true, data: cards };
  } catch (error) {
    console.error('Error getting flashcards:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to get flashcards.' };
  }
};

// Get flashcards due for review for a specific card set
export const getDueFlashcards = async (
  cardSetId: string
): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to get cards.',
      };
    }

    const cardsCollection = getUserCardSetCardsCollection(
      currentUser.uid,
      cardSetId
    );
    const now = Timestamp.fromDate(new Date());

    const dueCardsQuery = query(
      cardsCollection,
      where('nextReviewDate', '<=', now),
      orderBy('nextReviewDate', 'asc')
    );

    firestoreCounter.countRead();
    const querySnapshot: QuerySnapshot<DocumentData> =
      await getDocs(dueCardsQuery);
    const dueCards = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
    }));

    console.log(`Retrieved ${dueCards.length} due flashcards`);
    return { success: true, data: dueCards };
  } catch (error) {
    console.error('Error getting due flashcards:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to get due flashcards.' };
  }
};

// Update flashcard progress (SM-2 algorithm results) for a specific card set
// Supports lazy creation - creates card if it doesn't exist
export const updateFlashcardProgress = async (
  cardId: string,
  cardSetId: string,
  progressData: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to update progress.',
      };
    }

    const cardDocRef = doc(
      getUserCardSetCardsCollection(currentUser.uid, cardSetId),
      cardId
    );

    // Check if card exists first
    firestoreCounter.countRead();
    const cardDoc = await getDoc(cardDocRef);

    const updateData = {
      ...progressData,
      cardSetId, // Ensure cardSetId is included
      updatedAt: serverTimestamp(),
      // Convert Date objects to Firestore timestamps for storage
      nextReviewDate: progressData.nextReviewDate
        ? Timestamp.fromDate(progressData.nextReviewDate)
        : serverTimestamp(),
      lastReviewDate: progressData.lastReviewDate
        ? Timestamp.fromDate(progressData.lastReviewDate)
        : serverTimestamp(),
    };

    if (!cardDoc.exists()) {
      // Lazy creation: Create card with initial data if it doesn't exist
      console.log(
        `Creating new card in Firestore: ${cardId} (cardSet: ${cardSetId})`
      );

      const newCardData = {
        id: cardId,
        ...updateData,
        createdAt: serverTimestamp(),
        // Add default values for required fields if not provided
        easinessFactor: progressData.easinessFactor || 2.5,
        repetitions: progressData.repetitions || 0,
        interval: progressData.interval || 1,
        totalReviews: progressData.totalReviews || 1,
        correctStreak: progressData.correctStreak || 0,
        averageQuality: progressData.averageQuality || 3.0,
        isNew: progressData.isNew !== undefined ? progressData.isNew : false,
      };

      firestoreCounter.countWrite();
      await setDoc(cardDocRef, newCardData);
      console.log(`Successfully created new card: ${cardId}`);
    } else {
      // Update existing card
      console.log(`Updating existing card: ${cardId} (cardSet: ${cardSetId})`);
      firestoreCounter.countWrite();
      await updateDoc(cardDocRef, updateData);
      console.log(`Successfully updated card: ${cardId}`);
    }

    return { success: true, data: updateData };
  } catch (error) {
    console.error('Error updating flashcard progress:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to update flashcard progress.' };
  }
};

// Delete a flashcard from a specific card set
export const deleteFlashcard = async (
  cardId: string,
  cardSetId: string
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to delete cards.',
      };
    }

    const cardDocRef = doc(
      getUserCardSetCardsCollection(currentUser.uid, cardSetId),
      cardId
    );
    firestoreCounter.countWrite();
    await deleteDoc(cardDocRef);

    console.log('Flashcard deleted:', cardId, 'from card set:', cardSetId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting flashcard:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to delete flashcard.' };
  }
};

// Migrate guest data to user account (for sign-up conversion)
export const migrateGuestDataToUser = async (
  guestData: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to migrate data.',
      };
    }

    if (!guestData || !Array.isArray(guestData.cards)) {
      return { success: false, error: 'No valid guest data to migrate.' };
    }

    // Create user profile
    await createUserProfile(currentUser.uid, {
      email: currentUser.email,
      displayName: currentUser.displayName,
      migratedFromGuest: true,
      migrationDate: serverTimestamp(),
    });

    // Migrate flashcards to default card set (chinese_essentials_1)
    const defaultCardSetId = 'chinese_essentials_1';
    const migrationResult = await saveFlashcardsBatch(
      guestData.cards,
      defaultCardSetId
    );

    if (migrationResult.success) {
      console.log(
        `Successfully migrated ${guestData.cards.length} cards from guest mode`
      );
      return { success: true, data: guestData.cards };
    } else {
      return migrationResult;
    }
  } catch (error) {
    console.error('Error migrating guest data:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to migrate guest data.' };
  }
};

// Real-time listener for user's flashcards in a specific card set
export const subscribeToUserFlashcards = (
  cardSetId: string,
  callback: (cards: any[]) => void
): (() => void) => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    console.warn('User must be authenticated to subscribe to flashcards');
    return () => {};
  }

  const cardsCollection = getUserCardSetCardsCollection(
    currentUser.uid,
    cardSetId
  );
  const cardsQuery = query(cardsCollection, orderBy('createdAt', 'desc'));

  return onSnapshot(
    cardsQuery,
    (querySnapshot) => {
      const cards = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        nextReviewDate: doc.data().nextReviewDate?.toDate() || new Date(),
      }));

      callback(cards);
    },
    (error) => {
      console.error('Error in flashcards subscription:', error);
    }
  );
};

// Get all card sets for a user (returns basic metadata, not the cards themselves)
export const getUserCardSets = async (): Promise<FirestoreResult<any[]>> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to get card sets.',
      };
    }

    const cardSetsCollection = getUserCardSetsCollection(currentUser.uid);
    const cardSetsQuery = query(
      cardSetsCollection,
      orderBy('lastAccessedAt', 'desc')
    );

    firestoreCounter.countRead();
    const querySnapshot = await getDocs(cardSetsQuery);
    const cardSets = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      lastAccessedAt: doc.data().lastAccessedAt?.toDate() || new Date(),
    }));

    console.log(`Found ${cardSets.length} card sets for user`);
    return { success: true, data: cardSets };
  } catch (error) {
    console.error('Error getting user card sets:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to get card sets.' };
  }
};

// Create or update card set metadata
export const updateCardSetMetadata = async (
  cardSetId: string,
  metadata: any
): Promise<FirestoreResult> => {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'User must be authenticated to update card set metadata.',
      };
    }

    const cardSetDocRef = getCardSetDocRef(currentUser.uid, cardSetId);

    const updateData = {
      ...metadata,
      lastAccessedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdAt: metadata.createdAt || serverTimestamp(),
    };

    firestoreCounter.countWrite();
    await setDoc(cardSetDocRef, updateData, { merge: true });

    console.log('Card set metadata updated:', cardSetId);
    return { success: true };
  } catch (error) {
    console.error('Error updating card set metadata:', error);

    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }

    return { success: false, error: 'Failed to update card set metadata.' };
  }
};

/**
 * Load all card set progress for a user from their profile document
 * This replaces the collection-based approach with single document pattern
 */
export const getAllCardSetProgress = async (
  userId: string
): Promise<FirestoreResult<Record<string, CardSetProgress>>> => {
  try {
    if (!userId) {
      return {
        success: false,
        error: 'User ID is required to load card set progress',
      };
    }

    console.log(`📖 Loading all card set progress for user: ${userId}`);
    const userDocRef = getUserDocRef(userId);

    firestoreCounter.countRead('Load all card set progress');
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.log(
        'User profile document does not exist, returning empty progress'
      );
      return { success: true, data: {} };
    }

    const userData = userDoc.data();
    const cardSetsProgress = userData.cardSetsProgress || {};

    // Process the object structure, converting Firestore timestamps to Date objects
    const progressRecord: Record<string, CardSetProgress> = {};

    Object.entries(cardSetsProgress).forEach(
      ([cardSetId, progress]: [string, any]) => {
        progressRecord[cardSetId] = {
          cardSetId: progress.cardSetId,
          totalCards: progress.totalCards || 0,
          reviewedCards: progress.reviewedCards || 0,
          progressPercentage: progress.progressPercentage || 0,
          masteredCards: progress.masteredCards || 0,
          needPracticeCards: progress.needPracticeCards || 0,
          reviewedToday: progress.reviewedToday || 0,
          createdAt: progress.createdAt?.toDate() || new Date(),
          updatedAt: progress.updatedAt?.toDate() || new Date(),
        };
      }
    );

    console.log(
      `✅ Loaded progress for ${Object.keys(progressRecord).length} card sets from user profile`
    );
    return { success: true, data: progressRecord };
  } catch (error) {
    console.error('Error loading all card set progress:', error);
    if (isFirebaseError(error)) {
      return { success: false, error: getFirebaseErrorMessage(error) };
    }
    return { success: false, error: String(error) };
  }
};

// Export Firestore utilities as default
export default {
  // User profile methods
  createUserProfile,
  getUserProfile,

  // Card set metadata methods
  getUserCardSets,
  updateCardSetMetadata,

  // SINGLE DOCUMENT PATTERN methods (PRIMARY)
  getCardSetDocument,
  saveAllCardsInSingleWrite,
  replaceAllCardsInSingleWrite,
  deleteCardSetDocument,
  deleteCardSetProgressDocument,
  updateCardsInSingleDocument,
  getAllCardSetProgress,

  // Individual card methods (for special cases)
  saveFlashcard,
  deleteFlashcard,
  updateFlashcardProgress,

  // Legacy/compatibility methods (may be removed in future versions)
  saveFlashcardsBatch,
  getUserFlashcards,
  getDueFlashcards,
  subscribeToUserFlashcards,
  migrateGuestDataToUser,
};
