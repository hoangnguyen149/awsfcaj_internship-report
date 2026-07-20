---
title: "Deploy Database"
date: 2026-07-13
weight: 7
chapter: false
pre: " <b> 5.7 </b> "
---

#### Introduction

This chapter deploys the system's data tier: Amazon RDS MySQL configured for Multi-AZ to hold relational data (contracts, tenants, offices), Amazon ElastiCache for Redis for high-speed cache/session storage, and Amazon DynamoDB for audit logs/transactions.

#### Objectives

- Create a DB Subnet Group and an RDS MySQL Multi-AZ instance (Master in AZ-1, Standby in AZ-2).
- Create an ElastiCache for Redis cluster (cache.t3.micro).
- Create a DynamoDB table to store Audit Logs.

#### Knowledge Gained

- Understand the automatic Failover mechanism of RDS Multi-AZ when the Master encounters an issue.
- Understand the role Redis plays in reducing repeated query load and storing session data.
- Understand the DynamoDB NoSQL data model, which is well suited for audit logs with heavy write volume.

#### Architecture

```
EC2 Backend (Private Subnet, 2 AZ)
    │
    ├── RDS MySQL Multi-AZ
    │     ├── Master   (Private Subnet AZ-1)
    │     └── Standby  (Private Subnet AZ-2, synchronous replication)
    │
    ├── ElastiCache for Redis (cache.t3.micro, Private Subnet)
    │
    └── DynamoDB (Audit Logs, Transactions) - does not need to sit inside the VPC
```

**Illustration**

`[Placeholder: database-multiaz.png - RDS Multi-AZ + Redis + DynamoDB diagram]`
{{< figure src="/images/5-Workshop/5.7-Deploy the Backend Services/database-multiaz.png" title="Database Multi-AZ architecture" >}}

#### Steps

**Step 1 - Create the DB Subnet Group**

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name officems-db-subnet-group \
  --db-subnet-group-description "Private subnets for RDS" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>
```

**Step 2 - Create the RDS MySQL Multi-AZ instance**

```bash
aws rds create-db-instance \
  --db-instance-identifier officems-mysql \
  --db-instance-class db.t3.small \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --manage-master-user-password \
  --allocated-storage 20 \
  --storage-type gp3 \
  --multi-az \
  --db-subnet-group-name officems-db-subnet-group \
  --vpc-security-group-ids <sg-rds-id> \
  --backup-retention-period 7 \
  --no-publicly-accessible \
  --db-name officems
```

{{% notice tip %}}
The `--manage-master-user-password` option lets RDS automatically generate and store the master password in AWS Secrets Manager, removing the need to manage the password manually (reused in Chapter 5.9).
{{% /notice %}}

Wait for the instance to reach the `available` state (typically 10-15 minutes with Multi-AZ):

```bash
aws rds wait db-instance-available --db-instance-identifier officems-mysql
```

**Step 3 - Create the ElastiCache for Redis cluster**

```bash
aws elasticache create-cache-subnet-group \
  --cache-subnet-group-name officems-redis-subnet-group \
  --cache-subnet-group-description "Private subnets for Redis" \
  --subnet-ids <private-subnet-1a-id> <private-subnet-1b-id>

aws elasticache create-cache-cluster \
  --cache-cluster-id officems-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --cache-subnet-group-name officems-redis-subnet-group \
  --security-group-ids <sg-redis-id> \
  --engine-version 7.1
```

**Step 4 - Create the DynamoDB table for Audit Logs**

```bash
aws dynamodb create-table \
  --table-name officems-audit-logs \
  --attribute-definitions \
      AttributeName=entityId,AttributeType=S \
      AttributeName=timestamp,AttributeType=N \
  --key-schema \
      AttributeName=entityId,KeyType=HASH \
      AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST
```

`PAY_PER_REQUEST` (On-Demand) is well suited to an uneven volume of log writes, avoiding the need to estimate capacity in advance.

**Step 5 - Initialize the RDS schema**

Connect to RDS via the EC2 Backend (already in the same VPC), or via a Bastion/Session Manager port-forward:

```bash
mysql -h <rds-endpoint> -u admin -p officems < schema.sql
```

Example of a basic schema with the main tables:

```sql
CREATE TABLE offices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  status ENUM('available','rented','maintenance') DEFAULT 'available'
);

CREATE TABLE tenants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  cognito_sub VARCHAR(255) UNIQUE
);

CREATE TABLE contracts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  office_id INT NOT NULL,
  tenant_id INT NOT NULL,
  start_date DATE,
  end_date DATE,
  status ENUM('active','expired','terminated') DEFAULT 'active',
  FOREIGN KEY (office_id) REFERENCES offices(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

**Illustration**

`[Placeholder: rds-console.png - RDS Console showing the Multi-AZ Available status]`

#### Verify the Result

```bash
aws rds describe-db-instances --db-instance-identifier officems-mysql \
  --query 'DBInstances[0].[DBInstanceStatus,MultiAZ,AvailabilityZone,SecondaryAvailabilityZone]'
```

Expected result: `DBInstanceStatus = available`, `MultiAZ = true`, and `AvailabilityZone`/`SecondaryAvailabilityZone` are two different AZs.

```bash
aws elasticache describe-cache-clusters --cache-cluster-id officems-redis \
  --query 'CacheClusters[0].CacheClusterStatus'
```

Expected result: `available`.

Test writing/reading an item in DynamoDB:

```bash
aws dynamodb put-item --table-name officems-audit-logs \
  --item '{"entityId": {"S": "test-1"}, "timestamp": {"N": "1737100000"}, "action": {"S": "CREATE"}}'
aws dynamodb get-item --table-name officems-audit-logs \
  --key '{"entityId": {"S": "test-1"}, "timestamp": {"N": "1737100000"}}'
```

#### Best Practices

- Enable `--manage-master-user-password` so RDS automatically stores and rotates the password through Secrets Manager.
- Enable Automated Backups with a retention period of at least 7 days, and enable Point-in-Time Recovery for DynamoDB on important data.
- Never place RDS/Redis in a Public Subnet; always keep `--no-publicly-accessible`.
- Monitor `FreeableMemory` and `CPUUtilization` for RDS/Redis in CloudWatch to proactively upgrade the instance class.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Backend cannot connect to RDS | Wrong Security Group or wrong endpoint | Check that `sg-rds` allows `sg-backend`, and confirm the correct RDS endpoint |
| Creating an RDS Multi-AZ instance takes a long time | Normal for Multi-AZ, takes 10-15 minutes | Use `aws rds wait db-instance-available` to wait correctly |
| DynamoDB returns `ProvisionedThroughputExceededException` | Using Provisioned billing mode with low capacity | Switch to `PAY_PER_REQUEST` or increase capacity |

#### Next Step

Continue to [Chapter 5.8 - Build Serverless Services](../5.8-Serverless/) to deploy the Lambda and API Gateway microservices.
