/* V21: independent encrypted chunks, crash journal, cancellation and atomic commits. */
function validNewLocalSecret(value) {
  if(typeof value!=="string")return false;
  if(/^\d{8,12}$/.test(value)){
    if(/^(.)\1+$/.test(value))return false;
    const sequences=['012345678901','123456789012','987654321098','098765432109'];
    return !sequences.some(sequence=>sequence.includes(value));
  }
  if(/^\d+$/.test(value)||value.length<12||value.length>128)return false;
  const compact=value.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]/g,'');
  return compact.length>=10&&!/^(password|qwerty|admin|letmein|رمزعبور|مدیر)/i.test(compact)&&!/^(.{1,4})\1{2,}$/.test(compact);
}
function validUnlockSecret(value) {
  return /^\d{4,12}$/.test(value) || validNewLocalSecret(value);
}
const BACKUP_ARCHIVE_MAX_BYTES = Math.floor(3.7 * 1024 * 1024 * 1024);
const LEGACY_ENCRYPTED_MAX_BYTES = 700 * 1024 * 1024;
const MEDIA_CHUNK_SIZE = 8 * 1024 * 1024;
const MEDIA_MATERIALIZE_MAX_BYTES = 256 * 1024 * 1024;
const SECURITY_MIGRATION_JOURNAL_KEY='dk-security-migration-journal-v1';
let heavyOperationActive = false,
  operationCancelled = false,
  mediaCryptoWorker = null,
  mediaCryptoNextId = 0;
const mediaCryptoPending = new Map();
async function beginSecurityMigration(targetEncrypted){await idbSet(SECURITY_MIGRATION_JOURNAL_KEY,{targetEncrypted:Boolean(targetEncrypted),oldAutoBackup:await storageGet(AUTO_BACKUP_KEY),changes:[],startedAt:new Date().toISOString()})}
async function recordSecurityMigrationChanges(changes){if(!changes?.length)return;const journal=await idbGet(SECURITY_MIGRATION_JOURNAL_KEY);if(!journal)throw new Error('security_migration_journal_missing');journal.changes.push(...changes.map(({originalKey,original,next})=>({originalKey,original,next})));await idbSet(SECURITY_MIGRATION_JOURNAL_KEY,journal)}
async function finishSecurityMigration(){const journal=await idbGet(SECURITY_MIGRATION_JOURNAL_KEY);for(const change of journal?.changes||[])if(change.original)await discardPreparedMedia(change.original);await idbDelete(SECURITY_MIGRATION_JOURNAL_KEY)}
async function abortSecurityMigration(){const journal=await idbGet(SECURITY_MIGRATION_JOURNAL_KEY);if(!journal)return;for(const change of [...(journal.changes||[])].reverse()){if(change.original)await idbSet(change.originalKey,change.original);else await idbDelete(change.originalKey);if(change.next)await discardPreparedMedia(change.next)}if(journal.oldAutoBackup==null)await storageDelete(AUTO_BACKUP_KEY);else await storageSet(AUTO_BACKUP_KEY,journal.oldAutoBackup);await idbDelete(SECURITY_MIGRATION_JOURNAL_KEY)}
async function recoverInterruptedSecurityMigration(){const journal=await idbGet(SECURITY_MIGRATION_JOURNAL_KEY).catch(()=>null);if(!journal)return false;const raw=await storageGet(STORE_KEY);let encrypted=false;try{encrypted=JSON.parse(raw)?.format==='dk-encrypted-v1'}catch(_){}if(encrypted===journal.targetEncrypted)await finishSecurityMigration();else await abortSecurityMigration();return true}
function beginCancellableOperation() {
  heavyOperationActive = true;
  operationCancelled = false;
  const button = document.getElementById("cancelHeavyOperation");
  if (button) {
    button.hidden = false;
    button.disabled = false;
    button.textContent = tr("btn_cancel");
  }
}
function cancelHeavyOperation() {
  operationCancelled = true;
  const button = document.getElementById("cancelHeavyOperation");
  if (button) {
    button.disabled = true;
    button.textContent = tr("operation_cancelling");
  }
}
function assertOperationActive() {
  if (operationCancelled) throw new Error("operation_cancelled");
}
async function mediaCrypto(operation, bytes, key, aad = "") {
  assertOperationActive();
  if (typeof Worker === "undefined" || location.protocol === "file:") {
    const value = await (operation === "encrypt"
      ? DKCrypto.encryptBytes(bytes, key, aad)
      : DKCrypto.decryptBytes(bytes, key, aad));
    await new Promise((resolve) => setTimeout(resolve, 0));
    return value;
  }
  if (!mediaCryptoWorker) {
    mediaCryptoWorker = new Worker("assets/js/media-crypto.worker.js");
    mediaCryptoWorker.onmessage = (e) => {
      const pending = mediaCryptoPending.get(e.data.id);
      if (!pending) return;
      mediaCryptoPending.delete(e.data.id);
      e.data.error
        ? pending.reject(new Error(e.data.error))
        : pending.resolve(e.data.bytes);
    };
    mediaCryptoWorker.onerror = () => {
      for (const job of mediaCryptoPending.values())
        job.reject(new Error("crypto_worker_failed"));
      mediaCryptoPending.clear();
      mediaCryptoWorker.terminate();
      mediaCryptoWorker = null;
    };
  }
  return new Promise((resolve, reject) => {
    const id = ++mediaCryptoNextId,
      buffer =
        bytes instanceof Uint8Array
          ? bytes.slice()
          : new Uint8Array(bytes).slice();
    mediaCryptoPending.set(id, { resolve, reject });
    mediaCryptoWorker.postMessage({ id, operation, bytes: buffer, key, aad }, [
      buffer.buffer,
    ]);
  });
}
async function prepareMediaRecord(
  blob,
  meta,
  onProgress,
  key = sessionEncryptionKey,
  encrypted = !!(encryptionMeta && encryptionMeta.enabled),
) {
  const record = Object.assign({}, meta, {
    size: blob.size,
    encrypted,
    chunkBytes: MEDIA_CHUNK_SIZE,
  });
  if (encrypted&&!key) throw new Error("PIN required");
  delete record.blob;
  delete record.payload;
  delete record.payloadChunks;
  const group = crypto.randomUUID(),
    chunkKeys = [];
  record.chunkKeys = chunkKeys;
  try {
    for (
      let offset = 0, index = 0;
      offset < blob.size;
      offset += MEDIA_CHUNK_SIZE, index++
    ) {
      assertOperationActive();
      const chunkKey = `dk-media-chunk:${group}:${index}`;
      const part=blob.slice(offset,offset+MEDIA_CHUNK_SIZE);
      const storedPart=encrypted?new Blob([await mediaCrypto('encrypt',await part.arrayBuffer(),key,chunkKey)]):part;
      await idbSet(chunkKey,storedPart);
      chunkKeys.push(chunkKey);
      if (onProgress)
        onProgress(
          Math.min(1, (offset + MEDIA_CHUNK_SIZE) / Math.max(1, blob.size)),
        );
    }
    assertOperationActive();
    return record;
  } catch (error) {
    await discardPreparedMedia(record);
    throw error;
  }
}
async function discardPreparedMedia(record) {
  for (const key of record?.chunkKeys || [])
    await idbDelete(key).catch(() => {});
}
async function* plainMediaChunks(record, key = sessionEncryptionKey) {
  if (record.chunkKeys) {
    for (const chunkKey of record.chunkKeys) {
      assertOperationActive();
      const cipher = await idbGet(chunkKey);
      if (!cipher) throw new Error("missing_media_chunk");
      const bytes=new Uint8Array(await cipher.arrayBuffer());
      yield record.encrypted?await mediaCrypto("decrypt",bytes,key,chunkKey):bytes;
    }
    return;
  }
  if (record.encrypted && record.payloadChunks) {
    for (const cipher of record.payloadChunks) {
      assertOperationActive();
      yield await mediaCrypto("decrypt", cipher, key);
    }
    return;
  }
  const blob = record.encrypted
    ? new Blob([await mediaCrypto("decrypt", record.payload, key)])
    : record.blob;
  if (!(blob instanceof Blob)) throw new Error("missing_media");
  for (let offset = 0; offset < blob.size; offset += MEDIA_CHUNK_SIZE) {
    assertOperationActive();
    yield new Uint8Array(
      await blob.slice(offset, offset + MEDIA_CHUNK_SIZE).arrayBuffer(),
    );
  }
}
async function materializeMediaRecord(record, key) {
  if(!record.encrypted&&record.chunkKeys)return plainChunkBlob(record);
  if (record.size > MEDIA_MATERIALIZE_MAX_BYTES)
    throw new Error("media_requires_streaming");
  const parts = [];
  for await (const part of plainMediaChunks(record, key)) parts.push(part);
  return new Blob(parts, { type: record.type });
}
async function idbAtomicCommit(entries, deletes = [], expectation = null) {
  const db = await idbOpen();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite"),
      store = tx.objectStore(IDB_STORE);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error("restore_commit_failed"));
    tx.onabort = () => reject(tx.error || new Error("restore_commit_aborted"));
    const write = () => {
      try {
        for (const [key, value] of entries) store.put(value, key);
        for (const key of deletes) store.delete(key);
      } catch (error) {
        tx.abort();
        reject(error);
      }
    };
    if (expectation) {
      const read = store.get(expectation.key);
      read.onsuccess = () => {
        if ((read.result ?? null) !== expectation.value) {
          tx.abort();
          reject(new Error("restore_conflict"));
          return;
        }
        write();
      };
      read.onerror = () => {
        tx.abort();
        reject(read.error);
      };
    } else write();
  });
}
function mergedRestoreCandidate(current, parsed) {
  const candidate = JSON.parse(JSON.stringify(current));
  for (const imported of parsed.classes) {
    const index = candidate.classes.findIndex((c) => c.id === imported.id),
      copy = JSON.parse(JSON.stringify(imported));
    if (!parsed.backupMeta?.includesBooks) {
      copy.textbook = index >= 0 ? candidate.classes[index].textbook : null;
      copy.listenings = index >= 0 ? candidate.classes[index].listenings : [];
    }
    if (index < 0) candidate.classes.push(copy);
    else candidate.classes[index] = copy;
  }
  if (parsed.backupMeta?.scope === "full") {
    candidate.profile = Object.assign(
      defaultData().profile,
      parsed.profile || {},
    );
    candidate.settings = Object.assign(
      defaultData().settings,
      parsed.settings || {},
      {
        appRole: current.settings.appRole,
        security: current.settings.security,
      },
    );
  }
  return candidate;
}
async function mediaStreamUrl(storageKey) {
  const record = await idbGet(storageKey);
  if (!record) throw new Error("missing_media");
  if (!navigator.serviceWorker?.controller)
    throw new Error("media_stream_requires_installed_app");
  const token = crypto.randomUUID(),
    channel = new MessageChannel();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("media_stream_unavailable")),
      5000,
    );
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      channel.port1.close();
      e.data.ok ? resolve() : reject(new Error("media_stream_unavailable"));
    };
    navigator.serviceWorker.controller.postMessage(
      { type: "OPEN_LOCAL_MEDIA", token, record, key: sessionEncryptionKey },
      [channel.port2],
    );
  });
  return new URL(`__local_media/${token}`, new URL("./", location.href)).href;
}
async function openMediaStream(storageKey, download = false) {
  try {
    const record = await idbGet(storageKey),
      url = await mediaStreamUrl(storageKey),
      anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    if (download) anchor.download = record.name || "media";
    else anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } catch (error) {
    toast(
      tr(
        error.message === "media_stream_requires_installed_app"
          ? "media_stream_requires_installed_app"
          : "textbook_missing",
      ),
    );
  }
}
async function exportReliableArchive(includeMedia = false, classId = null) {
  const temporary = [],
    entries = [],
    records = [];
  beginCancellableOperation();
  try {
    const single = classId ? getClass(classId) : null,
      payload = includeMedia
        ? JSON.parse(JSON.stringify(data))
        : backupDataWithoutBooks(
            single
              ? Object.assign({}, defaultData(), {
                  classes: [single],
                  settings: data.settings,
                })
              : data,
          );
    payload.backupMeta = {
      version: 7,
      scope: single ? "class" : "full",
      exportedAt: new Date().toISOString(),
      includesBooks: includeMedia,
      includesListenings: includeMedia,
    };
    const json = JSON.stringify(payload);
    if (new TextEncoder().encode(json).length > 20 * 1024 * 1024)
      throw new Error("entry_too_large");
    records.push({
      name: "data.json",
      size: new Blob([json]).size,
      blob: new Blob([json]),
    });
    const books = [],
      listenings = [];
    if (includeMedia)
      for (const cls of data.classes) {
        if (cls.textbook) {
          const raw = await idbGet(textbookStorageKey(cls.id));
          if (!raw) throw new Error("missing_media");
          const path = `media/books/${cls.id}-${safeArchiveName(raw.name, "book.pdf")}`;
          records.push({ name: path, size: raw.size, record: raw });
          books.push({
            classId: cls.id,
            path,
            name: raw.name,
            type: raw.type,
            size: raw.size,
          });
        }
        for (const audio of cls.listenings || []) {
          const raw = await idbGet(listeningStorageKey(cls.id, audio.id));
          if (!raw) throw new Error("missing_media");
          const path = `media/listening/${cls.id}/${audio.id}`;
          records.push({ name: path, size: raw.size, record: raw });
          listenings.push({
            classId: cls.id,
            audioId: audio.id,
            path,
            name: raw.name,
            type: raw.type,
            size: raw.size,
          });
        }
      }
    const total = records.reduce((sum, r) => sum + r.size, 0);
    if (
      total +
        records.length * 1024 +
        Math.ceil(total / MEDIA_CHUNK_SIZE) * 256 >
      BACKUP_ARCHIVE_MAX_BYTES
    )
      throw new Error("archive_too_large");
    const encrypted = !!(encryptionMeta && encryptionMeta.enabled);
    const entryCount=encrypted?records.reduce((n,r)=>n+Math.ceil(r.size/MEDIA_CHUNK_SIZE),2):records.length+1;
    if(entryCount>5000)throw new Error("too many ZIP entries");
    if (encrypted && !sessionEncryptionKey) throw new Error("PIN required");
    if (encrypted && !(await ensureStorageCapacity(total + 1024 * 1024)))
      throw new Error("storage_not_enough");
    let archiveKey = sessionEncryptionKey,
      archiveSalt = encryptionMeta?.salt,
      archiveIterations = encryptionMeta?.iterations || ENCRYPTION_ITERATIONS;
    if (encrypted && encryptionMeta.secretStrength !== "strong") {
      const secret = await requestBackupPin(true);
      if (!validNewLocalSecret(secret))
        throw new Error("strong_secret_required");
      const salt = crypto.getRandomValues(new Uint8Array(16));
      archiveSalt = DKCrypto.bytesToBase64(salt);
      archiveKey = await DKCrypto.deriveKey(secret, salt, archiveIterations);
    }
    const archiveId = crypto.randomUUID(),
      index = [];
    let processed = 0,
      number = 0;
    showOperationProgress(
      tr("progress_backup"),
      0,
      `0 / ${formatBytes(total)}`,
    );
    for (const record of records) {
      assertOperationActive();
      if (!encrypted && !record.record?.encrypted) {
        entries.push({
          name: record.name,
          data: record.blob || (record.record.chunkKeys?await plainChunkBlob(record.record):record.record.blob),
        });
        processed += record.size;
        showOperationProgress(
          tr("progress_backup"),
          Math.floor((processed / total) * 90),
          `${formatBytes(processed)} / ${formatBytes(total)}`,
        );
        continue;
      }
      const chunks = [];
      let actual = 0;
      const source = record.record
        ? plainMediaChunks(record.record)
        : plainMediaChunks({ blob: record.blob, encrypted: false });
      for await (const bytes of source) {
        assertOperationActive();
        const partName = `chunks/${number++}.enc`,
          aad = `dk-v7:${archiveId}:${partName}`;
        const cipher = await mediaCrypto("encrypt", bytes, archiveKey, aad),
          tempKey = `dk-archive-stage:${archiveId}:${partName}`;
        await idbSet(tempKey, new Blob([cipher]));
        temporary.push(tempKey);
        entries.push({ name: partName, data: await idbGet(tempKey) });
        chunks.push({ path: partName, size: bytes.byteLength });
        actual += bytes.byteLength;
        processed += bytes.byteLength;
        showOperationProgress(
          tr("progress_encrypting"),
          Math.floor((processed / total) * 90),
          `${formatBytes(processed)} / ${formatBytes(total)}`,
        );
      }
      if (actual !== record.size) throw new Error("media_size_mismatch");
      index.push({ name: record.name, size: actual, chunks });
    }
    const inner = {
      format: "daftar-kelas-backup-v7",
      archiveId,
      encrypted,
      books,
      listenings,
      index,
      createdAt: new Date().toISOString(),
    };
    if (encrypted) {
      const manifestBytes = new TextEncoder().encode(JSON.stringify(inner));
      if (manifestBytes.length > 2 * 1024 * 1024)
        throw new Error("entry_too_large");
      entries.push({
        name: "manifest.enc",
        data: await mediaCrypto(
          "encrypt",
          manifestBytes,
          archiveKey,
          `dk-v7:${archiveId}:manifest`,
        ),
      });
      entries.unshift({
        name: "manifest.json",
        data: JSON.stringify({
          format: inner.format,
          archiveId,
          encrypted: true,
          salt: archiveSalt,
          iterations: archiveIterations,
        }),
      });
    } else
      entries.unshift({ name: "manifest.json", data: JSON.stringify(inner) });
    assertOperationActive();
    showOperationProgress(tr("progress_saving"), 90, formatBytes(total));
    const zip = await DKZip.makeZipBlob(entries, (done, size) => {
      assertOperationActive();
      showOperationProgress(
        tr("progress_saving"),
        90 + Math.floor((done / Math.max(1, size)) * 10),
        `${formatBytes(done)} / ${formatBytes(size)}`,
      );
    });
    if (zip.size > BACKUP_ARCHIVE_MAX_BYTES)
      throw new Error("archive_too_large");
    assertOperationActive();
    downloadBlob(
      zip,
      `daftar-kelas-${includeMedia ? "media-archive" : "backup"}-${new Date().toISOString().slice(0, 10)}.zip`,
    );
    if (!single) {
      data.settings.lastExportAt = new Date().toISOString();
      await saveData({throwOnError:true});
    }
    toast(tr("toast_export_done"));
  } catch (error) {
    recordLocalError("reliable_archive", error);
    toast(
      tr(
        error.message === "operation_cancelled"
          ? "operation_cancelled"
          : error.message === "storage_not_enough"
            ? "storage_not_enough"
            : error.message === "strong_secret_required"
              ? "strong_secret_required"
              : "full_backup_failed",
      ),
    );
  } finally {
    hideOperationProgress();
    for (const key of temporary) await idbDelete(key).catch(() => {});
  }
}
async function parseV7Archive(files, outer, key) {
  if (!/^[a-f0-9-]{36}$/.test(outer.archiveId))
    throw new Error("invalid manifest");
  if (!outer.encrypted) return { manifest: outer, files };
  const bytes = await mediaCrypto(
    "decrypt",
    await zipEntryBytes(files, "manifest.enc", 2 * 1024 * 1024 + 28),
    key,
    `dk-v7:${outer.archiveId}:manifest`,
  );
  const manifest = JSON.parse(DKCrypto.decodeText(bytes));
  if (
    manifest.format !== outer.format ||
    manifest.archiveId !== outer.archiveId ||
    !Array.isArray(manifest.index) ||
    manifest.index.length > 10000
  )
    throw new Error("invalid manifest");
  const decoded = new Map(),
    used = new Set();
  let total = 0;
  for (const entry of manifest.index) {
    if (
      typeof entry.name !== "string" ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 1 ||
      !Array.isArray(entry.chunks) ||
      decoded.has(entry.name)
    )
      throw new Error("invalid manifest");
    const sum = entry.chunks.reduce((n, part) => {
      if (
        !/^chunks\/[0-9]+\.enc$/.test(part.path) ||
        used.has(part.path) ||
        !Number.isInteger(part.size) ||
        part.size < 1 ||
        part.size > MEDIA_CHUNK_SIZE ||
        !files.has(part.path)
      )
        throw new Error("invalid manifest");
      used.add(part.path);
      return n + part.size;
    }, 0);
    if (sum !== entry.size || (total += sum) > BACKUP_ARCHIVE_MAX_BYTES)
      throw new Error("invalid manifest");
    const source = {
      size: entry.size,
      async *chunks() {
        for (const part of entry.chunks) {
          assertOperationActive();
          const cipher = await zipEntryBytes(
            files,
            part.path,
            MEDIA_CHUNK_SIZE + 28,
          );
          if (cipher.byteLength !== part.size + 28)
            throw new Error("invalid manifest");
          const plain = await mediaCrypto(
            "decrypt",
            cipher,
            key,
            `dk-v7:${outer.archiveId}:${part.path}`,
          );
          if (plain.byteLength !== part.size)
            throw new Error("invalid manifest");
          yield plain;
        }
      },
    };
    decoded.set(entry.name, source);
  }
  return { manifest, files: decoded };
}
async function* restoreSourceChunks(source) {
  if (source?.chunks) {
    yield* source.chunks();
    return;
  }
  const blob = source instanceof Blob ? source : new Blob([source]);
  for (let offset = 0; offset < blob.size; offset += MEDIA_CHUNK_SIZE)
    yield new Uint8Array(
      await blob.slice(offset, offset + MEDIA_CHUNK_SIZE).arrayBuffer(),
    );
}
async function prepareRestoreRecord(source,meta,onProgress,encrypted=!!encryptionMeta?.enabled,key=sessionEncryptionKey){
  const record=Object.assign({},meta,{encrypted,chunkBytes:MEDIA_CHUNK_SIZE,chunkKeys:[]}),group=crypto.randomUUID();let processed=0;
  try{for await(const bytes of restoreSourceChunks(source)){assertOperationActive();const chunkKey=`dk-media-chunk:${group}:${record.chunkKeys.length}`;const part=encrypted?await mediaCrypto('encrypt',bytes,key,chunkKey):bytes;await idbSet(chunkKey,new Blob([part]));record.chunkKeys.push(chunkKey);processed+=bytes.byteLength;if(processed>meta.size)throw new Error('media_size_mismatch');if(onProgress)onProgress(bytes.byteLength)}
    if(processed!==meta.size)throw new Error('media_size_mismatch');assertOperationActive();return record;
  }catch(error){await discardPreparedMedia(record);throw error}
}
async function readRestoreHead(source) {
  const iterator = restoreSourceChunks(source);
  try {
    const first = await iterator.next();
    if (first.done) throw new Error("missing_media");
    return first.value.subarray(0, 16);
  } finally {
    await iterator.return?.();
  }
}

async function replaceStoredMedia(storageKey, record) {
  const old = await idbGet(storageKey);
  try {
    await idbAtomicCommit([[storageKey, record]]);
    return {storageKey,old,next:record};
  } catch (e) {
    await discardPreparedMedia(record);
    throw e;
  }
}
async function finalizeStoredMediaReplacement(change){if(change?.old)await discardPreparedMedia(change.old)}
async function rollbackStoredMediaReplacement(change){if(!change)return;if(change.old)await idbAtomicCommit([[change.storageKey,change.old]]);else await idbAtomicCommit([],[change.storageKey]);await discardPreparedMedia(change.next)}
async function removeStoredMedia(storageKey) {
  const old = await idbGet(storageKey);
  await idbAtomicCommit([], [storageKey, ...(old?.chunkKeys || [])]);
}
async function plainRecordForMigration(stored, key) {
  const source = {
    size: stored.size,
    async *chunks() {
      yield* plainMediaChunks(stored, key);
    },
  };
  const record = await prepareRestoreRecord(
    source,
    {
      name: stored.name,
      type: stored.type,
      size: stored.size,
      updatedAt: stored.updatedAt,
    },
    undefined,
    false,
    key,
  );
  return record;
}

async function plainChunkBlob(record){const parts=[];for(const key of record.chunkKeys){assertOperationActive();const part=await idbGet(key);if(!(part instanceof Blob))throw new Error('missing_media_chunk');parts.push(part)}return new Blob(parts,{type:record.type})}
async function encryptedRecordForMigration(stored,key){const source={size:stored.size,async *chunks(){yield* plainMediaChunks(stored)}};return prepareRestoreRecord(source,{name:stored.name,type:stored.type,size:stored.size,updatedAt:stored.updatedAt},undefined,true,key)}

async function finishMediaMigration(changes){for(const item of changes||[])await discardPreparedMedia(item.original)}
async function rollbackMediaMigration(changes){if(!changes?.length)return;await idbAtomicCommit(changes.map(item=>[item.originalKey,item.original]));for(const item of changes)await discardPreparedMedia(item.next)}
