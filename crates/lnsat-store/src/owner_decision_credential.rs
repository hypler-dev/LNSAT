//! Private current-owner credential component for later exact decisions.
//!
//! A successful password check supplies no session, challenge, configuration,
//! installation, resource, human-presence, or action authority. The future
//! decision caller owns its immediate transaction and every other live check.

use super::{
    Connection, Digest, LocalIdentityRecordV1, LocalIdentityRoleV1, LocalIdentityStatusV1,
    LocalIdentityStoreErrorV1, Sha256, SqliteStore, StoredLocalPasswordCredentialRow,
    is_local_human_identity_ref_v1, select_local_identity_v1, select_local_password_credentials_v1,
    validate_stored_local_password_credentials_v1, verify_local_password_v1,
};
use rusqlite::Transaction;
use std::{marker::PhantomData, rc::Rc, sync::Arc};
use subtle::ConstantTimeEq as _;

/// Transient provenance of one store instance, never durable custody evidence.
pub(super) struct OwnerDecisionCredentialScopeV1(Arc<()>);

impl OwnerDecisionCredentialScopeV1 {
    pub(super) fn new() -> Self {
        Self(Arc::new(()))
    }
}

/// Only actual verification constructs this value. It cannot escape the store
/// crate or retain a password/PHC verifier, and is not a reusable step-up permit.
pub(super) struct VerifiedCurrentOwnerCredentialV1 {
    scope: Arc<()>,
    identity: LocalIdentityRecordV1,
    credential_id: String,
    credential_version: i64,
    verifier_profile: String,
    created_at: String,
    verifier_fingerprint: [u8; 32],
}

/// Owned current-row capture; it carries no SQL owner or execution authority.
/// The thread marker keeps this transient credential material in its caller.
pub(super) struct CapturedCurrentOwnerCredentialV1 {
    material: CapturedOwnerCredentialMaterialV1,
    _caller_thread: PhantomData<Rc<()>>,
}

enum CapturedOwnerCredentialMaterialV1 {
    Unknown(String),
    Known {
        scope: Arc<()>,
        identity: LocalIdentityRecordV1,
        credential: StoredLocalPasswordCredentialRow,
    },
}

pub(super) fn capture_current_owner_credential_v1(
    store: &SqliteStore,
    identity_ref: &str,
) -> Result<CapturedCurrentOwnerCredentialV1, LocalIdentityStoreErrorV1> {
    // Reject even a deferred caller transaction before any identity work.
    if !store.connection.is_autocommit() {
        return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
    }
    if !is_local_human_identity_ref_v1(identity_ref) {
        return Ok(CapturedCurrentOwnerCredentialV1 {
            material: CapturedOwnerCredentialMaterialV1::Unknown(
                store.authentication_dummy_verifier.clone(),
            ),
            _caller_thread: PhantomData,
        });
    }
    store
        .verify_schema()
        .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
    let transaction = store
        .connection
        .unchecked_transaction()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    let captured = select_current_active_credential_v1(&transaction, identity_ref)?;
    transaction
        .rollback()
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    let material = match captured {
        Some((identity, credential)) => CapturedOwnerCredentialMaterialV1::Known {
            scope: Arc::clone(&store.owner_decision_credential_scope.0),
            identity,
            credential,
        },
        None => {
            CapturedOwnerCredentialMaterialV1::Unknown(store.authentication_dummy_verifier.clone())
        }
    };
    Ok(CapturedCurrentOwnerCredentialV1 {
        material,
        _caller_thread: PhantomData,
    })
}

pub(super) fn compute_current_owner_credential_v1(
    captured: CapturedCurrentOwnerCredentialV1,
    password: &str,
) -> Result<Option<VerifiedCurrentOwnerCredentialV1>, LocalIdentityStoreErrorV1> {
    let (scope, identity, credential) = match captured.material {
        CapturedOwnerCredentialMaterialV1::Unknown(fallback) => {
            verify_local_password_v1(password, &fallback)
                .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
            return Ok(None);
        }
        CapturedOwnerCredentialMaterialV1::Known {
            scope,
            identity,
            credential,
        } => (scope, identity, credential),
    };
    // No SQL owner reaches computation; the existing PHC guard owns disposal.
    let verified = verify_local_password_v1(password, &credential.password_verifier)
        .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if !verified || identity.role != LocalIdentityRoleV1::Owner {
        return Ok(None);
    }
    let verifier_fingerprint = fingerprint(&credential.password_verifier);
    Ok(Some(VerifiedCurrentOwnerCredentialV1 {
        scope,
        identity,
        credential_id: credential.credential_id,
        credential_version: credential.credential_version,
        verifier_profile: credential.verifier_profile,
        created_at: credential.created_at,
        verifier_fingerprint,
    }))
}

pub(super) fn prepare_current_owner_credential_v1(
    store: &SqliteStore,
    identity_ref: &str,
    password: &str,
) -> Result<Option<VerifiedCurrentOwnerCredentialV1>, LocalIdentityStoreErrorV1> {
    compute_current_owner_credential_v1(
        capture_current_owner_credential_v1(store, identity_ref)?,
        password,
    )
}

pub(super) fn recheck_current_owner_credential_v1(
    store: &SqliteStore,
    transaction: &Transaction<'_>,
    snapshot: &VerifiedCurrentOwnerCredentialV1,
) -> Result<(), LocalIdentityStoreErrorV1> {
    // Derive both bindings from the receiver. The same marker accompanied by
    // another connection's transaction cannot authenticate matching row bytes.
    if !Arc::ptr_eq(&store.owner_decision_credential_scope.0, &snapshot.scope)
        || !std::ptr::eq(
            std::ptr::from_ref(&**transaction),
            std::ptr::from_ref(&store.connection),
        )
        || store.connection.is_autocommit()
    {
        return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
    }
    let Some((identity, credential)) =
        select_current_active_credential_v1(transaction, &snapshot.identity.identity_ref)?
    else {
        return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
    };
    if identity != snapshot.identity
        || identity.role != LocalIdentityRoleV1::Owner
        || credential.credential_id != snapshot.credential_id
        || credential.credential_version != snapshot.credential_version
        || credential.verifier_profile != snapshot.verifier_profile
        || credential.created_at != snapshot.created_at
        || !bool::from(
            fingerprint(&credential.password_verifier).ct_eq(&snapshot.verifier_fingerprint),
        )
    {
        return Err(LocalIdentityStoreErrorV1::AuthorizationRejected);
    }
    Ok(())
}

fn select_current_active_credential_v1(
    connection: &Connection,
    identity_ref: &str,
) -> Result<
    Option<(LocalIdentityRecordV1, StoredLocalPasswordCredentialRow)>,
    LocalIdentityStoreErrorV1,
> {
    let Some(identity) = select_local_identity_v1(connection, identity_ref)? else {
        return Ok(None);
    };
    if identity.status != LocalIdentityStatusV1::Active {
        return Ok(None);
    }
    let mut credentials = select_local_password_credentials_v1(connection, identity_ref)?;
    validate_stored_local_password_credentials_v1(&identity, &credentials)?;
    let credential = credentials
        .pop()
        .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    Ok(Some((identity, credential)))
}

fn fingerprint(verifier: &str) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(b"lnsat.owner_decision.credential_verifier.v1\n");
    hash.update(verifier.as_bytes());
    hash.finalize().into()
}
