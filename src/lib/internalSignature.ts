const databaseName = "enterprisecloud-internal-signing";
const storeName = "keys";

type StoredKey = { scope: string; pair: CryptoKeyPair };

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "scope" });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getStoredKey(scope: string): Promise<CryptoKeyPair | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).get(scope);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as StoredKey | undefined)?.pair ?? null);
  });
}

async function storeKey(scope: string, pair: CryptoKeyPair) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put({ scope, pair } satisfies StoredKey);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

export async function getOrCreateSigningKey(scope: string) {
  const existing = await getStoredKey(scope);
  if (existing) return existing;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]) as CryptoKeyPair;
  await storeKey(scope, pair);
  return pair;
}

export async function exportPublicJwk(pair: CryptoKeyPair) {
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { kty: jwk.kty ?? "", crv: jwk.crv ?? "", x: jwk.x ?? "", y: jwk.y ?? "" };
}

export async function signChallenge(pair: CryptoKeyPair, message: string) {
  const signed = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(message));
  const bytes = new Uint8Array(signed);
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary);
}
