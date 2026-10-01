//! Private owner preparation and transaction-local persistence for bootstrap.
//!
//! This is an internal composition seam, not initialization or action authority.
//! The caller owns schema verification, the immediate transaction, every later
//! installation/audit write, and commit or rollback.

use super::{
    LOCAL_PASSWORD_PROFILE_V1, LocalIdentityEventKindV1, LocalIdentityRoleV1,
    LocalIdentityStatusV1, LocalIdentityStoreErrorV1, LocalOwnerBootstrapInputV1,
    LocalOwnerBootstrapRecordV1, LocalPasswordErrorV1, create_local_password_verifier_v1,
    insert_local_identity_event_v1, local_password_credential_id_v1,
    select_local_owner_bootstrap_record_v1, validate_local_owner_bootstrap_input_v1,
};
use rusqlite::{Transaction, params};
use zeroize::Zeroizing;

// No Debug, Clone, wire representation, or plaintext-password field. Metadata
// is copied after validation so it cannot be substituted between prepare/insert.
pub(super) struct PreparedLocalOwnerBootstrapV1 {
    identity_ref: String,
    display_name: String,
    created_at: String,
    verifier: Zeroizing<String>,
    credential_id: String,
}

pub(super) fn prepare_local_owner_bootstrap_v1(
    input: &LocalOwnerBootstrapInputV1<'_>,
) -> Result<PreparedLocalOwnerBootstrapV1, LocalIdentityStoreErrorV1> {
    validate_local_owner_bootstrap_input_v1(input)?;
    let verifier = create_local_password_verifier_v1(input.password).map_err(|error| {
        if error == LocalPasswordErrorV1::InvalidPassword {
            LocalIdentityStoreErrorV1::InvalidInput
        } else {
            LocalIdentityStoreErrorV1::PersistenceFailed
        }
    })?;
    let credential_id =
        local_password_credential_id_v1(input.identity_ref, 1, &verifier, input.created_at);
    Ok(PreparedLocalOwnerBootstrapV1 {
        identity_ref: input.identity_ref.to_owned(),
        display_name: input.display_name.to_owned(),
        created_at: input.created_at.to_owned(),
        verifier: Zeroizing::new(verifier),
        credential_id,
    })
}

// Only an existing transaction is accepted; this helper never starts, commits,
// or rolls back one. A caller must abort the whole transaction on any error.
pub(super) fn insert_local_owner_bootstrap_v1(
    transaction: &Transaction<'_>,
    prepared: &PreparedLocalOwnerBootstrapV1,
) -> Result<LocalOwnerBootstrapRecordV1, LocalIdentityStoreErrorV1> {
    let (identity_count, owner_count) = transaction
        .query_row(
            "SELECT count(*),
                    coalesce(sum(CASE WHEN role = 'owner' THEN 1 ELSE 0 END), 0)
             FROM lnsat_local_identities",
            [],
            |row| Ok((row.get::<_, i64>(0)?, row.get::<_, i64>(1)?)),
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    if owner_count > 0 {
        let owner_ref = transaction
            .query_row(
                "SELECT identity_ref
                 FROM lnsat_local_identities
                 WHERE role = 'owner'",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| LocalIdentityStoreErrorV1::EvidenceDrift)?;
        select_local_owner_bootstrap_record_v1(transaction, &owner_ref)?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
        return Err(LocalIdentityStoreErrorV1::OwnerAlreadyBootstrapped);
    }
    if identity_count != 0 {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }

    transaction
        .execute(
            "INSERT INTO lnsat_local_identities (
                identity_ref, display_name, role, owner_singleton,
                status, created_at
             ) VALUES (?1, ?2, 'owner', 1, 'active', ?3)",
            params![
                prepared.identity_ref.as_str(),
                prepared.display_name.as_str(),
                prepared.created_at.as_str()
            ],
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    transaction
        .execute(
            "INSERT INTO lnsat_local_password_credentials (
                credential_id, identity_ref, credential_version,
                verifier_profile, password_verifier, created_at
            ) VALUES (?1, ?2, 1, ?3, ?4, ?5)",
            params![
                prepared.credential_id.as_str(),
                prepared.identity_ref.as_str(),
                LOCAL_PASSWORD_PROFILE_V1,
                prepared.verifier.as_str(),
                prepared.created_at.as_str()
            ],
        )
        .map_err(|_| LocalIdentityStoreErrorV1::PersistenceFailed)?;
    insert_local_identity_event_v1(
        transaction,
        prepared.identity_ref.as_str(),
        LocalIdentityEventKindV1::OwnerBootstrapped,
        None,
        Some(1),
        prepared.credential_id.as_str(),
        prepared.created_at.as_str(),
    )?;

    let record =
        select_local_owner_bootstrap_record_v1(transaction, prepared.identity_ref.as_str())?
            .ok_or(LocalIdentityStoreErrorV1::EvidenceDrift)?;
    if record.identity.display_name != prepared.display_name.as_str()
        || record.identity.created_at != prepared.created_at.as_str()
        || record.identity.role != LocalIdentityRoleV1::Owner
        || record.identity.status != LocalIdentityStatusV1::Active
        || record.credential_profile != LOCAL_PASSWORD_PROFILE_V1
        || record.credential_version != 1
    {
        return Err(LocalIdentityStoreErrorV1::EvidenceDrift);
    }
    Ok(record)
}
