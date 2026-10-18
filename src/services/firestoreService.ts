import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  query, 
  orderBy, 
  onSnapshot,
  runTransaction
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { 
  UserProfile, 
  Product, 
  StockPurchase, 
  Invoice, 
  Expense, 
  OperationType, 
  FirestoreErrorInfo,
  CartItem 
} from '../types';

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ======================== USER PROFILE ========================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ======================== PRODUCTS ========================

export function subscribeToProducts(userId: string, onUpdate: (products: Product[]) => void, onError?: (err: Error) => void) {
  const path = `users/${userId}/products`;
  const q = query(collection(db, 'users', userId, 'products'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push(doc.data() as Product);
    });
    onUpdate(products);
  }, (error) => {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e: any) {
      if (onError) onError(e);
    }
  });
}

export async function getProducts(userId: string): Promise<Product[]> {
  const path = `users/${userId}/products`;
  try {
    const q = query(collection(db, 'users', userId, 'products'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    const products: Product[] = [];
    snapshot.forEach((doc) => {
      products.push(doc.data() as Product);
    });
    return products;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addProduct(userId: string, productData: Omit<Product, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Product> {
  const productsRef = collection(db, 'users', userId, 'products');
  const newDocRef = doc(productsRef);
  const now = new Date().toISOString();

  const product: Product = {
    id: newDocRef.id,
    userId,
    name: productData.name.trim(),
    sku: productData.sku.trim(),
    category: productData.category.trim() || 'General',
    purchaseCost: Number(productData.purchaseCost),
    sellingPrice: Number(productData.sellingPrice),
    currentStock: Number(productData.currentStock),
    lowStockThreshold: Number(productData.lowStockThreshold) || 5,
    description: productData.description?.trim() || '',
    createdAt: now,
    updatedAt: now,
  };

  const path = `users/${userId}/products/${product.id}`;
  try {
    await setDoc(newDocRef, product);

    // If initial stock was entered, also log a stock purchase record
    if (product.currentStock > 0) {
      const purchaseRef = doc(collection(db, 'users', userId, 'stock_purchases'));
      const purchaseLog: StockPurchase = {
        id: purchaseRef.id,
        userId,
        productId: product.id,
        productName: product.name,
        quantity: product.currentStock,
        purchaseCostPerUnit: product.purchaseCost,
        totalCost: product.currentStock * product.purchaseCost,
        date: now.split('T')[0],
        notes: 'Initial inventory stock upon product creation',
        createdAt: now,
      };
      await setDoc(purchaseRef, purchaseLog);
    }

    return product;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateProduct(
  userId: string, 
  productId: string, 
  updates: Partial<Omit<Product, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const path = `users/${userId}/products/${productId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', userId, 'products', productId), {
      ...updates,
      updatedAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteProduct(userId: string, productId: string): Promise<void> {
  const path = `users/${userId}/products/${productId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function restockProduct(
  userId: string,
  productId: string,
  quantityReceived: number,
  purchaseCostPerUnit: number,
  notes?: string
): Promise<void> {
  const productDocRef = doc(db, 'users', userId, 'products', productId);
  const purchaseDocRef = doc(collection(db, 'users', userId, 'stock_purchases'));
  const now = new Date().toISOString();

  try {
    await runTransaction(db, async (transaction) => {
      const productSnap = await transaction.get(productDocRef);
      if (!productSnap.exists()) {
        throw new Error('Product not found.');
      }
      const existingProduct = productSnap.data() as Product;
      const newStock = existingProduct.currentStock + quantityReceived;

      // Update product current stock and latest purchase cost
      transaction.update(productDocRef, {
        currentStock: newStock,
        purchaseCost: purchaseCostPerUnit,
        updatedAt: now,
      });

      // Log stock purchase history
      const purchaseLog: StockPurchase = {
        id: purchaseDocRef.id,
        userId,
        productId,
        productName: existingProduct.name,
        quantity: quantityReceived,
        purchaseCostPerUnit,
        totalCost: quantityReceived * purchaseCostPerUnit,
        date: now.split('T')[0],
        notes: notes?.trim() || 'Inventory restock',
        createdAt: now,
      };
      transaction.set(purchaseDocRef, purchaseLog);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/products/${productId}`);
  }
}

// ======================== STOCK PURCHASES ========================

export function subscribeToStockPurchases(userId: string, onUpdate: (purchases: StockPurchase[]) => void, onError?: (err: Error) => void) {
  const path = `users/${userId}/stock_purchases`;
  const q = query(collection(db, 'users', userId, 'stock_purchases'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: StockPurchase[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as StockPurchase);
    });
    onUpdate(list);
  }, (error) => {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e: any) {
      if (onError) onError(e);
    }
  });
}

// ======================== BILLING / INVOICES ========================

export function subscribeToInvoices(userId: string, onUpdate: (invoices: Invoice[]) => void, onError?: (err: Error) => void) {
  const path = `users/${userId}/invoices`;
  const q = query(collection(db, 'users', userId, 'invoices'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Invoice[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Invoice);
    });
    onUpdate(list);
  }, (error) => {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e: any) {
      if (onError) onError(e);
    }
  });
}

export async function completeRetailSale(
  userId: string,
  cartItems: CartItem[],
  customerInfo: { name?: string; phone?: string; paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Other'; notes?: string; discount: number }
): Promise<Invoice> {
  if (cartItems.length === 0) {
    throw new Error('Cart is empty. Add at least one product to generate a bill.');
  }

  const invoiceRef = doc(collection(db, 'users', userId, 'invoices'));
  const now = new Date();
  const dateStr = now.toISOString();
  
  // Format readable Invoice Number: INV-YYYYMMDD-XXXX
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${datePart}-${randomPart}`;

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Fetch latest product states to verify stock levels in transaction
      const productDocs: { ref: any; data: Product; requestedQty: number; unitSellingPrice: number }[] = [];

      for (const item of cartItems) {
        const prodRef = doc(db, 'users', userId, 'products', item.product.id);
        const prodSnap = await transaction.get(prodRef);
        if (!prodSnap.exists()) {
          throw new Error(`Product "${item.product.name}" does not exist in inventory.`);
        }
        const prodData = prodSnap.data() as Product;
        if (prodData.currentStock < item.quantity) {
          throw new Error(
            `Insufficient stock for "${prodData.name}". Available: ${prodData.currentStock}, requested: ${item.quantity}.`
          );
        }
        productDocs.push({
          ref: prodRef,
          data: prodData,
          requestedQty: item.quantity,
          unitSellingPrice: item.unitSellingPrice,
        });
      }

      // 2. Build invoice line items with cost and selling price snapshots
      let subtotal = 0;
      let totalUnits = 0;
      let totalCOGS = 0;

      const lineItems = productDocs.map(({ data, requestedQty, unitSellingPrice }) => {
        const lineTotal = requestedQty * unitSellingPrice;
        const lineCost = requestedQty * data.purchaseCost;
        subtotal += lineTotal;
        totalUnits += requestedQty;
        totalCOGS += lineCost;

        return {
          productId: data.id,
          productName: data.name,
          sku: data.sku,
          quantity: requestedQty,
          unitSellingPrice,
          unitPurchaseCost: data.purchaseCost, // Snapshot
          lineTotal,
        };
      });

      const discount = Math.min(Math.max(0, Number(customerInfo.discount) || 0), subtotal);
      const totalAmount = Math.max(0, subtotal - discount);
      const grossProfit = totalAmount - totalCOGS;

      const invoice: Invoice = {
        id: invoiceRef.id,
        userId,
        invoiceNumber,
        customerName: customerInfo.name?.trim() || 'Walk-in Customer',
        customerPhone: customerInfo.phone?.trim() || '',
        items: lineItems,
        totalUnits,
        subtotal,
        discount,
        totalAmount,
        totalCOGS,
        grossProfit,
        paymentMethod: customerInfo.paymentMethod,
        status: 'completed',
        notes: customerInfo.notes?.trim() || '',
        date: dateStr.split('T')[0],
        createdAt: dateStr,
        updatedAt: dateStr,
      };

      // 3. Deduct stock for all items
      for (const { ref, data, requestedQty } of productDocs) {
        const newStock = data.currentStock - requestedQty;
        transaction.update(ref, {
          currentStock: newStock,
          updatedAt: dateStr,
        });
      }

      // 4. Save invoice
      transaction.set(invoiceRef, invoice);

      return invoice;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/invoices/${invoiceRef.id}`);
  }
}

export async function cancelOrRefundInvoice(
  userId: string, 
  invoice: Invoice, 
  reason: 'cancelled' | 'refunded'
): Promise<void> {
  if (invoice.status !== 'completed') {
    throw new Error(`Invoice is already ${invoice.status}.`);
  }

  const now = new Date().toISOString();
  const invoiceRef = doc(db, 'users', userId, 'invoices', invoice.id);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Restore product stock back to inventory
      for (const item of invoice.items) {
        const prodRef = doc(db, 'users', userId, 'products', item.productId);
        const prodSnap = await transaction.get(prodRef);
        if (prodSnap.exists()) {
          const currentProd = prodSnap.data() as Product;
          transaction.update(prodRef, {
            currentStock: currentProd.currentStock + item.quantity,
            updatedAt: now,
          });
        }
      }

      // 2. Mark invoice status
      transaction.update(invoiceRef, {
        status: reason,
        updatedAt: now,
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/invoices/${invoice.id}`);
  }
}

// ======================== EXPENSES ========================

export function subscribeToExpenses(userId: string, onUpdate: (expenses: Expense[]) => void, onError?: (err: Error) => void) {
  const path = `users/${userId}/expenses`;
  const q = query(collection(db, 'users', userId, 'expenses'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: Expense[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Expense);
    });
    onUpdate(list);
  }, (error) => {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e: any) {
      if (onError) onError(e);
    }
  });
}

export async function addExpense(
  userId: string, 
  expenseData: Omit<Expense, 'id' | 'userId' | 'createdAt'>
): Promise<Expense> {
  const expenseRef = doc(collection(db, 'users', userId, 'expenses'));
  const now = new Date().toISOString();

  const expense: Expense = {
    id: expenseRef.id,
    userId,
    title: expenseData.title.trim(),
    category: expenseData.category,
    amount: Number(expenseData.amount),
    date: expenseData.date || now.split('T')[0],
    description: expenseData.description?.trim() || '',
    createdAt: now,
  };

  const path = `users/${userId}/expenses/${expense.id}`;
  try {
    await setDoc(expenseRef, expense);
    return expense;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  const path = `users/${userId}/expenses/${expenseId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'expenses', expenseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
