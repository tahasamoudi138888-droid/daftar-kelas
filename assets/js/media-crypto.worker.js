"use strict";
importScripts("./crypto-core.js");
self.onmessage = async (event) => {
  const { id, operation, bytes, key, aad } = event.data;
  try {
    const result =
      operation === "encrypt"
        ? await DKCrypto.encryptBytes(bytes, key, aad)
        : await DKCrypto.decryptBytes(bytes, key, aad);
    self.postMessage({ id, bytes: result }, [result.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error.name || "crypto_failed" });
  }
};
