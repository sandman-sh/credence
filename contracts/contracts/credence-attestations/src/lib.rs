#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Env, String, Symbol, Vec,
};

#[contract]
pub struct Contract;

#[contracterror]
#[derive(Copy, Clone, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    DuplicatePayment = 1,
    InvalidRating = 2,
    InvalidAmount = 3,
    MissingAttestation = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Attestation {
    pub id: u64,
    pub agent: Address,
    pub buyer: Address,
    pub payment_tx_hash: String,
    pub task_category: Symbol,
    pub amount_paid_microusd: i128,
    pub success: bool,
    pub review_rating: u32,
    pub timestamp: u64,
    pub comment: String,
    pub task_summary: String,
    pub verified_ledger: u32,
    pub horizon_url: String,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Nonce,
    Payment(String),
    AgentIndex(Address),
}

#[contractimpl]
impl Contract {
    pub fn submit_attestation(
        env: Env,
        buyer: Address,
        agent: Address,
        payment_tx_hash: String,
        task_category: Symbol,
        amount_paid_microusd: i128,
        success: bool,
        review_rating: u32,
        timestamp: u64,
        comment: String,
        task_summary: String,
        verified_ledger: u32,
        horizon_url: String,
    ) -> Attestation {
        buyer.require_auth();

        if review_rating < 1 || review_rating > 5 {
            env.panic_with_error(Error::InvalidRating);
        }

        if amount_paid_microusd <= 0 {
            env.panic_with_error(Error::InvalidAmount);
        }

        if env
            .storage()
            .persistent()
            .has(&DataKey::Payment(payment_tx_hash.clone()))
        {
            env.panic_with_error(Error::DuplicatePayment);
        }

        let next_id = env
            .storage()
            .instance()
            .get::<DataKey, u64>(&DataKey::Nonce)
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&DataKey::Nonce, &next_id);

        let attestation = Attestation {
            id: next_id,
            agent: agent.clone(),
            buyer,
            payment_tx_hash: payment_tx_hash.clone(),
            task_category,
            amount_paid_microusd,
            success,
            review_rating,
            timestamp,
            comment,
            task_summary,
            verified_ledger,
            horizon_url,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Payment(payment_tx_hash.clone()), &attestation);

        let agent_key = DataKey::AgentIndex(agent);
        let mut payment_hashes = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<String>>(&agent_key)
            .unwrap_or(Vec::new(&env));
        payment_hashes.push_back(payment_tx_hash);
        env.storage().persistent().set(&agent_key, &payment_hashes);

        attestation
    }

    pub fn has_attestation(env: Env, payment_tx_hash: String) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Payment(payment_tx_hash))
    }

    pub fn get_attestation(env: Env, payment_tx_hash: String) -> Attestation {
        env.storage()
            .persistent()
            .get::<DataKey, Attestation>(&DataKey::Payment(payment_tx_hash))
            .unwrap_or_else(|| env.panic_with_error(Error::MissingAttestation))
    }

    pub fn list_agent_attestations(env: Env, agent: Address) -> Vec<Attestation> {
        let payment_hashes = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<String>>(&DataKey::AgentIndex(agent))
            .unwrap_or(Vec::new(&env));
        let mut attestations = Vec::new(&env);

        for payment_hash in payment_hashes.iter() {
            let attestation = env
                .storage()
                .persistent()
                .get::<DataKey, Attestation>(&DataKey::Payment(payment_hash))
                .unwrap_or_else(|| env.panic_with_error(Error::MissingAttestation));
            attestations.push_back(attestation);
        }

        attestations
    }

    pub fn count_for_agent(env: Env, agent: Address) -> u32 {
        let payment_hashes = env
            .storage()
            .persistent()
            .get::<DataKey, Vec<String>>(&DataKey::AgentIndex(agent))
            .unwrap_or(Vec::new(&env));
        payment_hashes.len()
    }
}

mod test;
