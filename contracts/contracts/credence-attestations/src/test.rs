#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _, symbol_short, Address, Env, String,
};

#[test]
fn submits_and_reads_attestations() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let agent = Address::generate(&env);

    let payment_hash = String::from_str(&env, "tx_hash_001");
    let comment = String::from_str(&env, "Strong work");
    let task_summary = String::from_str(&env, "Delivered structured research");
    let horizon_url = String::from_str(&env, "https://horizon-testnet.stellar.org/tx/1");

    let attestation = client.submit_attestation(
        &buyer,
        &agent,
        &payment_hash,
        &symbol_short!("research"),
        &2_500_000i128,
        &true,
        &5u32,
        &1_712_345_678u64,
        &comment,
        &task_summary,
        &1900746u32,
        &horizon_url,
    );

    assert_eq!(attestation.id, 1);
    assert_eq!(attestation.review_rating, 5);
    assert!(client.has_attestation(&payment_hash));
    assert_eq!(client.count_for_agent(&agent), 1);

    let loaded = client.get_attestation(&payment_hash);
    assert_eq!(loaded.comment, comment);

    let list = client.list_agent_attestations(&agent);
    assert_eq!(list.len(), 1);
    assert_eq!(list.get(0).unwrap().payment_tx_hash, payment_hash);

}

#[test]
#[should_panic]
fn rejects_duplicate_payment_hash() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let buyer = Address::generate(&env);
    let agent = Address::generate(&env);
    let payment_hash = String::from_str(&env, "tx_hash_duplicate");
    let comment = String::from_str(&env, "Looks good");
    let summary = String::from_str(&env, "Delivered result");
    let horizon_url = String::from_str(&env, "https://horizon-testnet.stellar.org/tx/2");

    client.submit_attestation(
        &buyer,
        &agent,
        &payment_hash,
        &symbol_short!("coding"),
        &1_000_000i128,
        &true,
        &5u32,
        &1u64,
        &comment,
        &summary,
        &100u32,
        &horizon_url,
    );

    client.submit_attestation(
        &buyer,
        &agent,
        &payment_hash,
        &symbol_short!("coding"),
        &1_000_000i128,
        &true,
        &5u32,
        &2u64,
        &comment,
        &summary,
        &101u32,
        &horizon_url,
    );
}
