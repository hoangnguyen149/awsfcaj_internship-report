---
title: "Secrets Management"
date: 2026-07-13
weight: 9
chapter: false
pre: " <b> 5.9 </b> "
---

#### Introduction

This chapter configures AWS Secrets Manager to protect the system's sensitive information, including the RDS password, the Redis connection string, and third-party API keys (e.g., a payment gateway), instead of storing them directly in the source code or in static environment variables.

#### Objectives

- Confirm that the RDS password secret is being managed automatically by Secrets Manager.
- Create additional secrets for the Redis endpoint and the third-party API key.
- Update the Backend (EC2) and Lambda to read secrets at runtime instead of hardcoding them.
- Configure Automatic Rotation for the RDS secret.

#### Knowledge Gained

- Understand the difference between Secrets Manager and Systems Manager Parameter Store.
- Understand how Automatic Rotation reduces the risk of long-lived credential leaks.
- Understand how an IAM Role controls secret-read permissions following the least-privilege principle.

#### Architecture

```
EC2 Backend / Lambda (IAM Role with secretsmanager:GetSecretValue permission)
        │
        ▼
AWS Secrets Manager
   ├── officems/rds        (RDS password - auto-created when manage-master-user-password is enabled)
   ├── officems/redis      (Redis endpoint)
   └── officems/payment-api-key  (Third-party payment gateway API key)
```

**Illustration**

`[Placeholder: secrets-manager-list.png - List of secrets in the Secrets Manager console]`

#### Steps

**Step 1 - Confirm the RDS secret**

Since `--manage-master-user-password` was enabled when creating RDS in Chapter 5.7, Secrets Manager already created the secret automatically. Check it:

```bash
aws rds describe-db-instances --db-instance-identifier officems-mysql \
  --query 'DBInstances[0].MasterUserSecret'
```

Note the returned `SecretArn`.

**Step 2 - Create the Redis endpoint secret**

```bash
aws secretsmanager create-secret \
  --name officems/redis \
  --description "Redis connection info" \
  --secret-string '{"host":"<redis-endpoint>","port":"6379"}'
```

**Step 3 - Create the third-party API key secret**

```bash
aws secretsmanager create-secret \
  --name officems/payment-api-key \
  --description "Payment gateway API key" \
  --secret-string '{"apiKey":"<your-payment-gateway-key>"}'
```

**Step 4 - Grant secret-read permission to the IAM Role**

Instead of using the overly broad `SecretsManagerReadWrite` policy temporarily attached in Chapter 5.4, create a custom policy scoped to only the required secrets:

```bash
aws iam put-role-policy \
  --role-name officems-ec2-role \
  --policy-name officems-secrets-read \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": [
        "arn:aws:secretsmanager:ap-southeast-1:<account-id>:secret:officems/rds*",
        "arn:aws:secretsmanager:ap-southeast-1:<account-id>:secret:officems/redis*"
      ]
    }]
  }'

aws iam detach-role-policy \
  --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite
```

Do the same for `officems-lambda-role` with the `officems/payment-api-key` secret.

**Step 5 - Read the secret in the Node.js application**

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const client = new SecretsManagerClient({ region: "ap-southeast-1" });

async function getSecret(secretId) {
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  return JSON.parse(response.SecretString);
}

// Used when the application starts
const dbSecret = await getSecret("officems/rds");
const dbConfig = {
  host: "<rds-endpoint>",
  user: dbSecret.username,
  password: dbSecret.password,
  database: "officems"
};
```

**Step 6 - Configure Automatic Rotation for the RDS secret**

```bash
aws secretsmanager rotate-secret \
  --secret-id officems/rds \
  --rotation-rules AutomaticallyAfterDays=30
```

{{% notice tip %}}
For secrets managed automatically by RDS (`manage-master-user-password`), AWS provides a ready-made, pre-configured Rotation Lambda function, so you don't need to write a custom rotation Lambda yourself.
{{% /notice %}}

**Illustration**

`[Placeholder: secret-rotation-config.png - 30-day Automatic Rotation configuration for the RDS secret]`

#### Verify the Result

```bash
aws secretsmanager get-secret-value --secret-id officems/redis --query SecretString --output text
```

Expected result: returns the correct JSON containing the Redis host/port.

Restart the Backend application and check the logs to confirm no password is still hardcoded in environment variables or configuration files:

```bash
grep -r "password" officems-backend/.env 2>/dev/null
```

Expected result: no actual password value is found hardcoded anywhere.

#### Best Practices

- Never commit a secret to Git, including in a `.env.example` file with confusing placeholder-like real values.
- Always scope IAM policies for reading secrets to the specific ARN, avoiding the `secretsmanager:*` wildcard.
- Enable Automatic Rotation for any long-lived secret, especially database passwords.
- Cache secret values in the application's memory (don't call the API on every request) to reduce cost and latency, refreshing only when needed.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Lambda/EC2 returns `AccessDeniedException` when reading a secret | The IAM Role lacks `secretsmanager:GetSecretValue` for the correct ARN | Check `put-role-policy` again and make sure the Resource ARN matches |
| Secret rotation fails | The VPC endpoint or NAT Gateway doesn't allow the Rotation Lambda to call RDS | Check that the RDS Security Group allows the Rotation Lambda to connect |
| The application is slow to start | Calling Secrets Manager more times than necessary | Add an in-memory secret cache in the application |

#### Next Step

Continue to [Chapter 5.10 - Monitoring](../5.10-Monitoring/) to set up comprehensive monitoring with CloudWatch and SNS.
