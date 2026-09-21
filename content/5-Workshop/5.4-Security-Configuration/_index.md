---
title: "Configure Security"
date: 2026-07-13
weight: 4
chapter: false
pre: " <b> 5.4 </b> "
---

#### Introduction

This chapter configures the system's security layers: Security Groups and NACLs to protect network resources, IAM Roles to grant scoped permissions to services, Amazon Cognito for user authentication, ACM to issue SSL/TLS certificates, and AWS WAF to protect the edge layer against common attacks.

#### Objectives

- Create separate Security Groups for the ALB, EC2 Backend, RDS, and ElastiCache.
- Configure Network ACLs for the Public/Private Subnets.
- Create IAM Roles for EC2 and Lambda following the least-privilege principle.
- Create an Amazon Cognito User Pool and Identity Pool for Tenant/Admin/Technician.
- Request SSL/TLS certificates using ACM.
- Create an AWS WAF Web ACL to protect CloudFront.

#### Knowledge Gained

- Understand the difference between Security Groups (stateful) and NACLs (stateless).
- Understand how a Cognito User Pool integrates with API Gateway via a Cognito Authorizer.
- Understand how ACM issues and automatically renews certificates for CloudFront/ALB.
- Understand basic WAF rules (Rate-based rule, SQL Injection, XSS).

#### Architecture

```
Internet
   │
  WAF (attached to CloudFront)
   │
CloudFront ── ACM cert (us-east-1)
   │
   ▼
   ALB (Security Group: sg-alb) ── ACM cert (regional)
   │
   ▼
EC2 Backend (Security Group: sg-backend, accepts traffic from sg-alb only)
   │
   ▼
RDS (Security Group: sg-rds, accepts traffic from sg-backend only)
ElastiCache (Security Group: sg-redis, accepts traffic from sg-backend only)

Cognito User Pool ── API Gateway (Cognito Authorizer) ── Lambda
```

**Illustration**

`[Placeholder: security-layers.png - Diagram of the security layers from WAF to Database]`
{{< figure src="/images/5-Workshop/5.4-S3-onprem/security-layers.png" title="Security layers diagram" >}}


#### Steps

**Step 1 - Create Security Groups**

```bash
# SG for the ALB - accepts HTTPS traffic from the Internet
aws ec2 create-security-group --group-name officems-sg-alb \
  --description "ALB Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-alb-id> \
  --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id <sg-alb-id> \
  --protocol tcp --port 80 --cidr 0.0.0.0/0

# SG for the EC2 Backend - accepts traffic from the ALB only, port 3000
aws ec2 create-security-group --group-name officems-sg-backend \
  --description "Backend EC2 Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-backend-id> \
  --protocol tcp --port 3000 --source-group <sg-alb-id>

# SG for RDS - accepts traffic from the Backend only, port 3306
aws ec2 create-security-group --group-name officems-sg-rds \
  --description "RDS Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-rds-id> \
  --protocol tcp --port 3306 --source-group <sg-backend-id>

# SG for ElastiCache Redis - accepts traffic from the Backend only, port 6379
aws ec2 create-security-group --group-name officems-sg-redis \
  --description "Redis Security Group" --vpc-id <vpc-id>
aws ec2 authorize-security-group-ingress --group-id <sg-redis-id> \
  --protocol tcp --port 6379 --source-group <sg-backend-id>
```

**Step 2 - Configure the Network ACL**

```bash
aws ec2 create-network-acl --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=network-acl,Tags=[{Key=Name,Value=officems-nacl-private}]'

# Allow traffic within the VPC
aws ec2 create-network-acl-entry --network-acl-id <nacl-id> \
  --rule-number 100 --protocol -1 --cidr-block 10.0.0.0/16 \
  --rule-action allow --ingress

# Allow return outbound traffic (ephemeral ports) coming back from the NAT Gateway
aws ec2 create-network-acl-entry --network-acl-id <nacl-id> \
  --rule-number 110 --protocol tcp --port-range From=1024,To=65535 \
  --cidr-block 0.0.0.0/0 --rule-action allow --ingress

aws ec2 associate-network-acl \
  --network-acl-id <nacl-id> --subnet-id <private-subnet-1a-id>
aws ec2 associate-network-acl \
  --network-acl-id <nacl-id> --subnet-id <private-subnet-1b-id>
```

**Step 3 - Create IAM Roles for EC2 and Lambda**

Role for the EC2 Backend (read Secrets Manager, write CloudWatch logs):

```bash
aws iam create-role --role-name officems-ec2-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": {"Service": "ec2.amazonaws.com"}, "Action": "sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
aws iam attach-role-policy --role-name officems-ec2-role \
  --policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite

aws iam create-instance-profile --instance-profile-name officems-ec2-profile
aws iam add-role-to-instance-profile \
  --instance-profile-name officems-ec2-profile --role-name officems-ec2-role
```

Role for Lambda (Payments, Document Processing):

```bash
aws iam create-role --role-name officems-lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]
  }'

aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
aws iam attach-role-policy --role-name officems-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

{{% notice warning %}}
In a production environment, you should not use the `FullAccess` managed policies. Write a custom policy scoped to only the resource ARNs actually needed.
{{% /notice %}}

**Step 4 - Create the Amazon Cognito User Pool**

```bash
aws cognito-idp create-user-pool \
  --pool-name officems-user-pool \
  --auto-verified-attributes email \
  --policies '{"PasswordPolicy":{"MinimumLength":8,"RequireUppercase":true,"RequireNumbers":true,"RequireSymbols":true}}'
```

Create groups for role-based access:

```bash
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Tenant
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Admin
aws cognito-idp create-group --user-pool-id <user-pool-id> --group-name Technician
```

Create an App Client and Identity Pool:

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <user-pool-id> --client-name officems-web-client \
  --no-generate-secret --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH

aws cognito-identity create-identity-pool \
  --identity-pool-name officems_identity_pool \
  --allow-unauthenticated-identities \
  --cognito-identity-providers ProviderName=cognito-idp.ap-southeast-1.amazonaws.com/<user-pool-id>,ClientId=<app-client-id>
```

**Step 5 - Request SSL/TLS certificates with ACM**

```bash
# Certificate for the ALB (regional - ap-southeast-1)
aws acm request-certificate \
  --domain-name api.officems.example.com \
  --validation-method DNS \
  --region ap-southeast-1

# Certificate for CloudFront (must be created in us-east-1)
aws acm request-certificate \
  --domain-name officems.example.com \
  --validation-method DNS \
  --region us-east-1
```

Add the domain validation CNAME record to Route 53 as instructed by the output of `describe-certificate`, then wait for the status to change to `ISSUED`.

**Step 6 - Create the AWS WAF Web ACL**

```bash
aws wafv2 create-web-acl \
  --name officems-waf \
  --scope CLOUDFRONT \
  --region us-east-1 \
  --default-action Allow={} \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=officemsWaf \
  --rules '[
    {
      "Name": "AWS-AWSManagedRulesCommonRuleSet",
      "Priority": 0,
      "OverrideAction": {"None": {}},
      "Statement": {"ManagedRuleGroupStatement": {"VendorName": "AWS", "Name": "AWSManagedRulesCommonRuleSet"}},
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "commonRules"}
    },
    {
      "Name": "RateLimitRule",
      "Priority": 1,
      "Action": {"Block": {}},
      "Statement": {"RateBasedStatement": {"Limit": 2000, "AggregateKeyType": "IP"}},
      "VisibilityConfig": {"SampledRequestsEnabled": true, "CloudWatchMetricsEnabled": true, "MetricName": "rateLimit"}
    }
  ]'
```

**Illustration**

`[Placeholder: cognito-waf-setup.png - Cognito User Pool and WAF Web ACL configuration in the console]`

#### Verify the Result

- In **EC2 > Security Groups**, confirm the 4 Security Groups have the correct inbound rules along the chain ALB → Backend → RDS/Redis.
- In **Cognito > User Pools**, confirm the `officems-user-pool` User Pool has 3 groups: Tenant, Admin, Technician.
- In **ACM**, confirm both certificates have reached the `Issued` state.
- In **WAF & Shield**, confirm the `officems-waf` Web ACL has 2 active rules.

#### Best Practices

- Always reference Security Groups using `source-group` instead of internal CIDR blocks, so rules automatically stay correct as EC2 IPs change.
- Apply the least-privilege principle to every IAM Role, and avoid attaching `FullAccess` policies in production.
- Enforce MFA (`AdminSetUserMFAPreference`) for the Admin group in Cognito.
- Always create the ACM certificate for CloudFront in the `us-east-1` region, regardless of which region your workload runs in.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| ACM certificate stays stuck in `Pending Validation` | The DNS validation CNAME record hasn't been added or hasn't propagated yet | Check Route 53 and use `dig` to confirm the CNAME points correctly |
| EC2 Backend cannot connect to RDS | The RDS Security Group hasn't opened port 3306 for `sg-backend` | Check the inbound rule of `sg-rds` |
| WAF isn't blocking attack traffic | The Web ACL hasn't been associated with the CloudFront distribution | Attach the Web ACL to CloudFront in Chapter 5.5 |

#### Next Step

Continue to [Chapter 5.5 - Deploy Frontend](../5.5-User-Interface-Presentation/) to deploy the React interface on Amazon S3 and distribute it through CloudFront.
