# AWS STS AssumeRole — Deep Dive

## What It Is

`sts:AssumeRole` lets an **identity** (IAM user, another role, or federated user) request **temporary credentials** to act as a different IAM role.

---

## The Flow (Step by Step)

```
Your IAM User (AKIA...)
    │
    ├─ 1. Calls sts:AssumeRole with RoleArn
    │
    ▼
AWS STS Service
    │
    ├─ 2. Checks: Can this caller assume this role?
    │     ├─ a. Caller's IAM policy: has sts:AssumeRole permission?
    │     ├─ b. Target role's TRUST POLICY: does it trust this caller?
    │     └─ c. (Optional) External ID, MFA, session tags
    │
    ├─ 3. Both checks pass → STS generates temporary credentials
    │
    ▼
Returns:
    ├─ AccessKeyId      (starts with ASIA, not AKIA)
    ├─ SecretAccessKey
    ├─ SessionToken     (required — this is what makes it "temporary")
    └─ Expiration       (default 1hr, max depends on role config)
```

---

## Two Policies Must Agree

**This is the core concept.** Both sides must say "yes":

### A. Caller's IAM Policy (permission to call AssumeRole)
```json
{
  "Effect": "Allow",
  "Action": "sts:AssumeRole",
  "Resource": "arn:aws:iam::123456789012:role/target-role"
}
```

### B. Target Role's Trust Policy (who can assume me)
```json
{
  "Effect": "Allow",
  "Principal": {
    "AWS": "arn:aws:iam::111111111111:user/my-iam-user"
  },
  "Action": "sts:AssumeRole"
}
```

If **either** side denies → request fails with `AccessDenied`.

---

## AKIA vs ASIA — The Key Difference

| | Permanent (direct IAM user) | Temporary (AssumeRole) |
|---|---|---|
| **Key prefix** | `AKIA` | `ASIA` |
| **Session token** | Not needed | **Required** |
| **Expires** | Never (until rotated) | 15 min – 12 hrs |
| **Permissions** | Tied to IAM user | Tied to assumed **role** |
| **Revocation** | Delete/deactivate key | Expires automatically |

---

## What Happens Under the Hood

1. **STS is a global service** (with regional endpoints). Your API call hits `sts.amazonaws.com` or `sts.ap-southeast-1.amazonaws.com`.

2. **STS does NOT create an IAM entity.** It creates a **session** — a short-lived credential set that inherits the role's permissions.

3. **The session token** (`AWS_SESSION_TOKEN`) is a signed blob that tells AWS: "this request is from a temporary session, here's the role ARN, expiry, and session context." Every API call made with temp creds **must** include this token in the request signature.

4. **Permission evaluation** for the temporary credentials:
   ```
   Effective permissions = Role's IAM policies
                         ∩ (Session policy, if provided)
                         ∩ (Permission boundary, if set on role)
   ```
   The **caller's original permissions are irrelevant** once you're using the assumed role's temp creds.

5. **CloudTrail logging**: Two entries —
   - `AssumeRole` event (who assumed what)
   - Subsequent API calls show `assumed-role/role-name/session-name` as the principal

---

## Cross-Account AssumeRole

This is the most common use case:

```
Account A (111111111111)          Account B (222222222222)
┌──────────────────┐             ┌──────────────────────┐
│ IAM User/Role    │──AssumeRole──▶ Target Role          │
│ has permission   │             │ trust policy trusts   │
│ to call          │             │ Account A principal   │
│ sts:AssumeRole   │             │                       │
└──────────────────┘             └──────────────────────┘
```

Trust policy in Account B:
```json
{
  "Principal": {
    "AWS": "arn:aws:iam::111111111111:root"
  }
}
```
This trusts the **entire** Account A — then Account A's IAM policies control which users/roles can actually call AssumeRole.

---

## Why Use AssumeRole Instead of Direct AKIA Keys?

| Risk | AKIA (direct keys) | AssumeRole |
|---|---|---|
| **Key leaked** | Permanent access until rotated | Expires automatically |
| **Blast radius** | Full user permissions | Scoped to role |
| **Audit** | Harder to trace sessions | Session name in CloudTrail |
| **Cross-account** | Need IAM user per account | One user, many roles |
| **Rotation** | Manual or automated | Not needed — creds are ephemeral |

---

## Direct AKIA vs. AssumeRole Setup

**Direct AKIA**: `AKIA` creds → direct AWS API calls with IAM user permissions.

**With AssumeRole**: `AKIA` creds → `sts:AssumeRole` → `ASIA` temp creds → AWS API calls with **role** permissions.

The AKIA keys would still exist in the variable group, but they'd only need one permission: `sts:AssumeRole`. All actual AWS work happens through the assumed role's temporary credentials.
