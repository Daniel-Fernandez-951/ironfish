/* tslint:disable */
/* eslint-disable */
/**
* @returns {Key}
*/
export function generateKey(): Key;
/**
* @param {string} private_key
* @returns {Key}
*/
export function generateNewPublicAddress(private_key: string): Key;

interface IWitness {
    verify(myHash: Uint8Array): boolean;
    authPath(): IWitnessNode[];
    treeSize(): number;
    serializeRootHash(): Uint8Array;
}



interface IWitnessNode {
    side(): 'Left' | 'Right';
    hashOfSibling(): Uint8Array;
}


/**
*/
export class Key {
  free(): void;
/**
* @returns {string}
*/
  readonly incoming_view_key: string;
/**
* @returns {string}
*/
  readonly outgoing_view_key: string;
/**
* @returns {string}
*/
  readonly public_address: string;
/**
* @returns {string}
*/
  readonly spending_key: string;
}
/**
*/
export class Note {
  free(): void;
/**
* @param {string} owner
* @param {BigInt} value
* @param {string} memo
*/
  constructor(owner: string, value: BigInt, memo: string);
/**
* @param {Uint8Array} bytes
* @returns {Note}
*/
  static deserialize(bytes: Uint8Array): Note;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* Compute the nullifier for this note, given the private key of its owner.
*
* The nullifier is a series of bytes that is published by the note owner
* only at the time the note is spent. This key is collected in a massive
* 'nullifier set', preventing double-spend.
* @param {string} owner_private_key
* @param {BigInt} position
* @returns {Uint8Array}
*/
  nullifier(owner_private_key: string, position: BigInt): Uint8Array;
/**
* Arbitrary note the spender can supply when constructing a spend so the
* receiver has some record from whence it came.
* Note: While this is encrypted with the output, it is not encoded into
* the proof in any way.
* @returns {string}
*/
  readonly memo: string;
/**
* Value this note represents.
* @returns {BigInt}
*/
  readonly value: BigInt;
}
/**
*/
export class NoteEncrypted {
  free(): void;
/**
* @param {Uint8Array} bytes
* @returns {NoteEncrypted}
*/
  static deserialize(bytes: Uint8Array): NoteEncrypted;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* @param {NoteEncrypted} other
* @returns {boolean}
*/
  equals(other: NoteEncrypted): boolean;
/**
* @returns {Uint8Array}
*/
  merkleHash(): Uint8Array;
/**
* Hash two child hashes together to calculate the hash of the
* new parent
* @param {number} depth
* @param {Uint8Array} left
* @param {Uint8Array} right
* @returns {Uint8Array}
*/
  static combineHash(depth: number, left: Uint8Array, right: Uint8Array): Uint8Array;
/**
* Returns undefined if the note was unable to be decrypted with the given key.
* @param {string} owner_hex_key
* @returns {Note | undefined}
*/
  decryptNoteForOwner(owner_hex_key: string): Note | undefined;
/**
* Returns undefined if the note was unable to be decrypted with the given key.
* @param {string} spender_hex_key
* @returns {Note | undefined}
*/
  decryptNoteForSpender(spender_hex_key: string): Note | undefined;
}
/**
*/
export class SimpleTransaction {
  free(): void;
/**
* @param {string} spender_hex_key
* @param {BigInt} intended_transaction_fee
*/
  constructor(spender_hex_key: string, intended_transaction_fee: BigInt);
/**
* @param {Note} note
* @param {IWitness} witness
* @returns {string}
*/
  spend(note: Note, witness: IWitness): string;
/**
* @param {Note} note
* @returns {string}
*/
  receive(note: Note): string;
/**
* @returns {TransactionPosted}
*/
  post(): TransactionPosted;
}
/**
*/
export class SpendProof {
  free(): void;
/**
* @returns {Uint8Array}
*/
  readonly nullifier: Uint8Array;
/**
* @returns {Uint8Array}
*/
  readonly rootHash: Uint8Array;
/**
* @returns {number}
*/
  readonly treeSize: number;
}
/**
*/
export class Transaction {
  free(): void;
/**
*/
  constructor();
/**
* Create a proof of a new note owned by the recipient in this transaction.
* @param {string} spender_hex_key
* @param {Note} note
* @returns {string}
*/
  receive(spender_hex_key: string, note: Note): string;
/**
* Spend the note owned by spender_hex_key at the given witness location.
* @param {string} spender_hex_key
* @param {Note} note
* @param {IWitness} witness
* @returns {string}
*/
  spend(spender_hex_key: string, note: Note, witness: IWitness): string;
/**
* Special case for posting a miners fee transaction. Miner fee transactions
* are unique in that they generate currency. They do not have any spends
* or change and therefore have a negative transaction fee. In normal use,
* a miner would not accept such a transaction unless it was explicitly set
* as the miners fee.
* @returns {TransactionPosted}
*/
  post_miners_fee(): TransactionPosted;
/**
* Post the transaction. This performs a bit of validation, and signs
* the spends with a signature that proves the spends are part of this
* transaction.
*
* Transaction fee is the amount the spender wants to send to the miner
* for mining this transaction. This has to be non-negative; sane miners
* wouldn't accept a transaction that takes money away from them.
*
* sum(spends) - sum(outputs) - intended_transaction_fee - change = 0
* aka: self.transaction_fee - intended_transaction_fee - change = 0
* @param {string} spender_hex_key
* @param {string | undefined} change_goes_to
* @param {BigInt} intended_transaction_fee
* @returns {TransactionPosted}
*/
  post(spender_hex_key: string, change_goes_to: string | undefined, intended_transaction_fee: BigInt): TransactionPosted;
}
/**
*/
export class TransactionPosted {
  free(): void;
/**
* @param {Uint8Array} bytes
* @returns {TransactionPosted}
*/
  static deserialize(bytes: Uint8Array): TransactionPosted;
/**
* @returns {Uint8Array}
*/
  serialize(): Uint8Array;
/**
* @returns {boolean}
*/
  verify(): boolean;
/**
* @param {number} index
* @returns {Uint8Array}
*/
  getNote(index: number): Uint8Array;
/**
* @param {number} index
* @returns {SpendProof}
*/
  getSpend(index: number): SpendProof;
/**
* @returns {number}
*/
  readonly notesLength: number;
/**
* @returns {number}
*/
  readonly spendsLength: number;
/**
* @returns {BigInt}
*/
  readonly transactionFee: BigInt;
/**
* @returns {Uint8Array}
*/
  readonly transactionHash: Uint8Array;
/**
* @returns {Uint8Array}
*/
  readonly transactionSignature: Uint8Array;
}
