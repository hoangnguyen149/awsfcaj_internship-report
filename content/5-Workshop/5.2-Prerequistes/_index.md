---
title: "Prerequisites"
date: 2026-07-13
weight: 2
chapter: false
pre: " <b> 5.2 </b> "
---

#### Introduction

Before deploying the Office Rental Management System On Cloud, you need to prepare your AWS account, command-line tools, and the basic configuration information that will be used throughout the workshop.

#### Objectives

- Have a working AWS account with IAM permissions sufficient to create VPC, EC2, RDS, S3, Lambda, CloudFront, IAM, and Cognito resources.
- Install and configure AWS CLI v2.
- Install Node.js, Git, and supporting tools.
- Prepare a domain (optional) to configure Route 53 and ACM.
- Prepare sample Frontend (React) and Backend (Node.js/Express) source code.

#### Knowledge Gained

- How to create an IAM User/Role with appropriate permissions following the least-privilege principle.
- How to configure AWS CLI with credentials and a default region.
- How to organize a GitHub repository to support CI/CD in a later chapter.

#### Steps

**Step 1 - Create an AWS account and IAM User**

1. Sign in to the AWS Management Console with the root account and enable MFA for the root user.
2. Go to **IAM > Users** and create a new user, for example `officems-admin`, with AWS Management Console access.
3. Attach the `AdministratorAccess` policy for the workshop environment (in a production environment, permissions should be scoped down per service).
4. Create an Access Key for this user to use with the AWS CLI.

**Step 2 - Install AWS CLI v2**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
```

Configure the CLI with the Access Key you just created:

```bash
aws configure
AWS Access Key ID: <your-access-key>
AWS Secret Access Key: <your-secret-key>
Default region name: ap-southeast-1
Default output format: json
```

**Step 3 - Install Node.js and Git**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
git --version
```

**Step 4 - Create an EC2 Key Pair**

```bash
aws ec2 create-key-pair \
  --key-name officems-keypair \
  --query 'KeyMaterial' \
  --output text > officems-keypair.pem
chmod 400 officems-keypair.pem
```

**Step 5 - Prepare a domain (optional)**

If you already have a domain (e.g., purchased through Route 53 or another registrar), note it down, for example `officems.example.com`, to use in Chapter 5.4 (ACM) and Chapter 5.5 (CloudFront/Route 53). If you don't have a domain, you can still complete the workshop using the default CloudFront domain (`*.cloudfront.net`).

**Step 6 - Prepare the source code**

Create two repositories on GitHub:

- `officems-frontend`: React source code.
- `officems-backend`: Node.js/Express source code.

```bash
git clone https://github.com/<your-org>/officems-frontend.git
git clone https://github.com/<your-org>/officems-backend.git
```

{{% notice note %}}
If you don't have real source code available yet, you can use a React + Express boilerplate to practice the workshop's deployment flow.
{{% /notice %}}

**Illustration**

`[Placeholder: prerequisites-checklist.png - Checklist of tools and accounts to prepare]`

#### Verify the Result

Run the following commands to confirm your environment is ready:

```bash
aws sts get-caller-identity
node -v && npm -v
git --version
```

Expected result: the `aws sts get-caller-identity` command returns the correct Account ID and User ARN you just created, with no credential errors.

#### Best Practices

- Never use the root account's Access Key for the AWS CLI; always create a dedicated IAM User.
- Enable MFA for all users with console access.
- Store the `.pem` key pair file somewhere safe and never commit it to Git.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `aws sts get-caller-identity` returns `Unable to locate credentials` | `aws configure` hasn't been run, or the wrong profile is active | Re-run `aws configure` and check the `~/.aws/credentials` file |
| Cannot create a key pair due to a name conflict | A key pair with that name already exists | Delete the old key with `aws ec2 delete-key-pair --key-name officems-keypair` or use a new name |
| `node -v` command not found | The NodeSource script did not install correctly | Reinstall following the official instructions at nodejs.org |

#### Next Step

Continue to [Chapter 5.3 - Create AWS Networking](../5.3-Create-AWS-Network/) to build the network infrastructure for the entire system.
