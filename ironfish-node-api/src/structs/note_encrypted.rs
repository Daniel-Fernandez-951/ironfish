/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

use std::convert::TryInto;

use neon::prelude::*;

use ironfish_rust::sapling_bls12;
use ironfish_rust::MerkleNote;
use super::NativeNote;
  
pub struct NativeNoteEncrypted {
    pub(crate) note: sapling_bls12::MerkleNote,
}

impl Finalize for NativeNoteEncrypted {}
 
impl NativeNoteEncrypted {
    pub fn deserialize(mut cx: FunctionContext) -> JsResult<JsBox<NativeNoteEncrypted>> {
        let bytes = cx.argument::<JsBuffer>(0)?;

        let hasher = sapling_bls12::SAPLING.clone();
        let note = cx.borrow(&bytes, |data| {
            let cursor: std::io::Cursor<&[u8]> = std::io::Cursor::new(data.as_slice());
            MerkleNote::read(cursor, hasher)
        }).or_else(|err| cx.throw_error(err.to_string()))?;

        Ok(cx.boxed(NativeNoteEncrypted { note }))
    }
 
    pub fn serialize(mut cx: FunctionContext) -> JsResult<JsBuffer> {
        // Get the `this` value as a `JsBox<NativeNoteEncrypted>`
        let note = cx.this().downcast_or_throw::<JsBox<NativeNoteEncrypted>, _>(&mut cx)?;

        let mut arr: Vec<u8> = vec![];
        note.note.write(&mut arr).or_else(|err| cx.throw_error(err.to_string()))?;

        let mut bytes = cx.buffer(arr.len().try_into().unwrap())?;

        cx.borrow_mut(&mut bytes, |data| {
            let slice = data.as_mut_slice();
            for i in 0..slice.len() {
                slice[i] = arr[i];
            }
        });

        Ok(bytes)
    }
 
    pub fn equals(mut cx: FunctionContext) -> JsResult<JsBoolean> {
        let note = cx.this().downcast_or_throw::<JsBox<NativeNoteEncrypted>, _>(&mut cx)?;

        let other = cx.argument::<JsBox<NativeNoteEncrypted>>(0)?;

        Ok(cx.boolean(note.note.eq(&other.note)))
    }
 
    pub fn merkle_hash(mut cx: FunctionContext) -> JsResult<JsBuffer> {
        let note = cx.this().downcast_or_throw::<JsBox<NativeNoteEncrypted>, _>(&mut cx)?;

        let mut cursor: Vec<u8> = Vec::with_capacity(32);
        note.note
            .merkle_hash()
            .write(&mut cursor)
            .or_else(|err| cx.throw_error(err.to_string()))?;

        // Copy hash to JsBuffer
        let mut bytes = cx.buffer(32)?;

        cx.borrow_mut(&mut bytes, |data| {
            let slice = data.as_mut_slice();
            for i in 0..slice.len() {
                slice[i] = cursor[i];
            }
        });

        Ok(bytes)
    }
 
    /// Hash two child hashes together to calculate the hash of the
    /// new parent
    pub fn combine_hash(mut cx: FunctionContext) -> JsResult<JsBuffer> {
        let depth = cx.argument::<JsNumber>(0)?.value(&mut cx) as usize;
        let left = cx.argument::<JsBuffer>(1)?;
        let right = cx.argument::<JsBuffer>(2)?;

        let left_hash = cx.borrow(&left, |data| {
            let mut left_hash_reader: std::io::Cursor<&[u8]> = std::io::Cursor::new(data.as_slice());
            sapling_bls12::MerkleNoteHash::read(&mut left_hash_reader)
        }).or_else(|err| cx.throw_error(err.to_string()))?;

        let right_hash = cx.borrow(&right, |data| {
            let mut right_hash_reader: std::io::Cursor<&[u8]> = std::io::Cursor::new(data.as_slice());
            sapling_bls12::MerkleNoteHash::read(&mut right_hash_reader)
        }).or_else(|err| cx.throw_error(err.to_string()))?;
 
        let mut cursor = Vec::with_capacity(32);

        sapling_bls12::MerkleNoteHash::new(sapling_bls12::MerkleNoteHash::combine_hash(
            &sapling_bls12::SAPLING.clone(),
            depth,
            &left_hash.0,
            &right_hash.0,
        ))
        .write(&mut cursor)
        .or_else(|err| cx.throw_error(err.to_string()))?;

        // Copy hash to JsBuffer
        let mut bytes = cx.buffer(32)?;

        cx.borrow_mut(&mut bytes, |data| {
            let slice = data.as_mut_slice();
            for i in 0..slice.len() {
                slice[i] = cursor[i];
            }
        });

        Ok(bytes)
    }
 
    /// Returns undefined if the note was unable to be decrypted with the given key.
    pub fn decrypt_note_for_owner(mut cx: FunctionContext) -> JsResult<JsBox<NativeNote>> {
        let note = cx.this().downcast_or_throw::<JsBox<NativeNoteEncrypted>, _>(&mut cx)?;
        let owner_hex_key = cx.argument::<JsString>(0)?.value(&mut cx);

        let owner_view_key =
            sapling_bls12::IncomingViewKey::from_hex(sapling_bls12::SAPLING.clone(), &owner_hex_key)
                .or_else(|err| cx.throw_error(err.to_string()))?;
            
        let result = note.note.decrypt_note_for_owner(&owner_view_key).or_else(|_| cx.throw_error("Key is not associated with note"))?;

        Ok(cx.boxed(NativeNote { note: { result } } ))
    }
 
    /// Returns undefined if the note was unable to be decrypted with the given key.
    pub fn decrypt_note_for_spender(mut cx: FunctionContext) -> JsResult<JsBox<NativeNote>> {
        let note = cx.this().downcast_or_throw::<JsBox<NativeNoteEncrypted>, _>(&mut cx)?;
        let spender_hex_key = cx.argument::<JsString>(0)?.value(&mut cx);

        let spender_view_key = sapling_bls12::OutgoingViewKey::from_hex(
            sapling_bls12::SAPLING.clone(),
            &spender_hex_key,
        )
        .or_else(|err| cx.throw_error(err.to_string()))?;
 
        let result = note.note.decrypt_note_for_spender(&spender_view_key).or_else(|_| cx.throw_error("Key is not associated with note"))?;

        Ok(cx.boxed(NativeNote { note: { result } } ))
    }
}
 
#[cfg(test)]
mod tests {
    use rand::{thread_rng, Rng};
    use zcash_primitives::{
        jubjub::{fs::Fs, ToUniform},
        primitives::ValueCommitment,
    };
 
    use super::*;
    use ironfish_rust::merkle_note::MerkleNote;
    use ironfish_rust::note::Memo;
    use ironfish_rust::sapling_bls12::Note;
    use ironfish_rust::SaplingKey;
    use pairing::bls12_381::Bls12;
 
    #[test]
    fn test_merkle_notes_are_equal() {
        let spender_key: SaplingKey<Bls12> =
            SaplingKey::generate_key(sapling_bls12::SAPLING.clone());
        let receiver_key: SaplingKey<Bls12> =
            SaplingKey::generate_key(sapling_bls12::SAPLING.clone());
        let owner = receiver_key.generate_public_address();
        let note = Note::new(
            sapling_bls12::SAPLING.clone(),
            owner.clone(),
            42,
            Memo([0; 32]),
        );
        let diffie_hellman_keys =
            owner.generate_diffie_hellman_keys(&sapling_bls12::SAPLING.jubjub);
 
        let mut buffer = [0u8; 64];
        thread_rng().fill(&mut buffer[..]);

        let value_commitment_randomness: Fs = Fs::to_uniform(&buffer[..]);

        let value_commitment = ValueCommitment::<Bls12> {
            value: note.value(),
            randomness: value_commitment_randomness,
        };

        let merkle_note =
            MerkleNote::new(&spender_key, &note, &value_commitment, &diffie_hellman_keys);

        let mut cursor: std::io::Cursor<Vec<u8>> = std::io::Cursor::new(vec![]);
        merkle_note.write(&mut cursor).unwrap();
 
        let vec = cursor.into_inner();
        let wasm1 = NativeNoteEncrypted::deserialize(&vec).unwrap();
        let wasm2 = NativeNoteEncrypted::deserialize(&vec).unwrap();
        assert!(wasm1.equals(&wasm2))
    }
 
    #[test]
    fn test_can_combine_merkle_note_hashes() {
        let arr: [u8; 32] = Default::default();
        let combined_hash = NativeNoteEncrypted::combine_hash(1, &arr, &arr).unwrap();

        let expected = &[
            78, 74, 99, 96, 68, 196, 78, 82, 234, 152, 143, 34, 78, 141, 112, 9, 118, 118, 97, 40,
            219, 166, 197, 144, 93, 94, 133, 118, 88, 127, 57, 32,
        ];
        assert_eq!(&combined_hash, &expected)
    }
}
 