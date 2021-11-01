const native = require('./index.node');

class Note {
  constructor(owner, value, memo) {
    if (arguments.length === 0) {
      return;
    }

    if (typeof value !== 'bigint') {
      throw new TypeError('value must be a bigint');
    }

    this.boxedData = native.noteNew(owner, value.toString(), memo);
  }

  free() {}

  static fromBoxedData(boxedData) {
    const note = new Note();
    note.boxedData = boxedData;
    return note;
  }

  static deserialize(data) {
    const result = native.noteDeserialize(data);
    return Note.fromBoxedData(result);
  }

  serialize() {
    return native.noteSerialize.call(this.boxedData);
  }

  value() {
    return BigInt(native.noteValue.call(this.boxedData));
  }

  memo() {
    return native.noteMemo.call(this.boxedData);
  }

  nullifier(ownerPrivateKey, position) {
    if (typeof position !== 'bigint') {
      throw new TypeError('position must be a bigint');
    }

    return native.noteNullifier.call(this.boxedData, ownerPrivateKey, position.toString());
  }
}

class NoteEncrypted {
  constructor(boxedData) {
      this.boxedData = boxedData;
  }

  free() {}

  static combineHash(depth, left, right) {
    return native.combineHash(depth, left, right)
  }

  static deserialize(data) {
    const result = native.noteEncryptedDeserialize(data);
    return new NoteEncrypted(result);
  }

  serialize() {
    return native.noteEncryptedSerialize.call(this.boxedData);
  }

  equals(noteEncrypted) {
    return native.noteEncryptedEquals.call(this.boxedData, noteEncrypted.boxedData);
  }

  merkleHash() {
    return native.noteEncryptedMerkleHash.call(this.boxedData);
  }

  decryptNoteForOwner(owner_hex_key) {
    const boxedData = native.noteEncryptedDecryptNoteForOwner.call(this.boxedData, owner_hex_key);

    return new Note(boxedData);
  }

  decryptNoteForSpender(spender_hex_key) {
    const boxedData = native.noteEncryptedDecryptNoteForSpender.call(this.boxedData, spender_hex_key);

    return new Note(boxedData);
  }
}

class SimpleTransaction {
  constructor(spenderHexKey, intendedTransactionFee) {
    if (typeof intendedTransactionFee !== 'bigint') {
      throw new TypeError('value must be a bigint');
    }

    this.boxedData = native.simpleTransactionNew(spenderHexKey, intended_transaction_fee.toString());
  }

  free() {}

  spend(note, witness) {
    return native.simpleTransactionSpend.call(this.boxedData, note, witness);
  }

  receive(note) {
    return native.simpleTransactionReceive.call(this.boxedData, note);
  }

  post() {
    return new TransactionPosted(native.simpleTransactionPost.call(this.boxedData));
  }
}

class Transaction {
  constructor() {
    this.boxedData = native.simpleTransactionNew();
  }

  free() {}

  receive(spenderHexKey, note) {
    return native.transactionReceive.call(this.boxedData, spenderHexKey, note);
  }

  spend(spenderHexKey, note, witness) {
    return native.transactionSpend.call(this.boxedData, spenderHexKey, note, witness);
  }

  post_miners_fee() {
    return new TransactionPosted(native.transactionPostMinersFee.call(this.boxedData));
  }

  post(spenderHexKey, changeGoesTo, intendedTransactionFee) {
    if (typeof intendedTransactionFee !== 'bigint') {
      throw new TypeError('value must be a bigint');
    }

    return new TransactionPosted(native.transactionPost.call(this.boxedData, spenderHexKey, changeGoesTo, intendedTransactionFee));
  }
}

class SpendProof {
  constructor(boxedData) {
    this.boxedData = boxedData;
  }

  free() {}

  get nullifier() {
    return native.spendProofNullifier.call(this.boxedData);
  }

  get rootHash() {
    return native.spendProofRootHash.call(this.boxedData);
  }

  get treeSize() {
    return native.spendProofTreeSize.call(this.boxedData);
  }
}

class TransactionPosted {
  constructor(boxedData) {
    this.boxedData = boxedData;
  }

  free() {}

  static deserialize(bytes) {
    const result = native.transactionPostedDeserialize(bytes);
    return new TransactionPosted(result);
  }

  serialize() {
    return native.transactionPostedSerialize.call(this.boxedData);
  }

  verify() {
    return native.transactionPostedVerify.call(this.boxedData);
  }

  getNote(index) {
    return native.transactionPostedGetNote.call(this.boxedData, index);
  }

  getSpend(index) {
    const result = native.transactionPostedGetSpend.call(this.boxedData, index);
    return new SpendProof(result);
  }

  get notesLength() {
    return native.transactionPostedNotesLength.call(this.boxedData);
  }

  get spendsLength() {
    return native.transactionPostedSpendsLength.call(this.boxedData);
  }

  get transactionFee() {
    const result = native.transactionPostedTransactionFee.call(this.boxedData);
    return BigInt(result);
  }

  get transactionHash() {
    return native.transactionPostedTransactionHash.call(this.boxedData);
  }

  get transactionSignature() {
    return native.transactionPostedTransactionSignature.call(this.boxedData);
  }
}

module.exports = {
    generateKey: native.generateKey,
    generateNewPublicAddress: native.generateNewPublicAddress,

    NoteEncrypted: NoteEncrypted,
    Note: Note,
    SimpleTransaction: SimpleTransaction,
    Transaction: Transaction,
    TransactionPosted: TransactionPosted,
}
