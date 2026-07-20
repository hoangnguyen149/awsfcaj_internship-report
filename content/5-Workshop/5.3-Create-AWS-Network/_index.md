---
title: "Create AWS Networking"
date: 2026-07-13
weight: 3
chapter: false
pre: " <b> 5.3 </b> "
---

#### Introduction

This chapter builds the networking foundation for the Office Rental Management System: a VPC spanning 2 Availability Zones in ap-southeast-1, with a Public Subnet and a Private Subnet in each AZ, ensuring high availability for the application and database tiers.

#### Objectives

- Create 1 VPC with a dedicated CIDR block.
- Create 2 Public Subnets and 2 Private Subnets spanning `ap-southeast-1a` and `ap-southeast-1b`.
- Create an Internet Gateway and attach it to the VPC.
- Create 2 NAT Gateways (one per AZ) with Elastic IPs.
- Configure Route Tables for the Public and Private Subnets.

#### Knowledge Gained

- Understand the role of Public/Private Subnets in a High Availability architecture.
- Understand how a NAT Gateway allows EC2 instances in a Private Subnet to reach the Internet outbound only.
- Understand how Route Tables direct network traffic.

#### Architecture

The system's network diagram:

```
VPC: 10.0.0.0/16
├── AZ: ap-southeast-1a
│   ├── Public Subnet:  10.0.0.0/24  (ALB, NAT Gateway 1)
│   └── Private Subnet: 10.0.10.0/24 (EC2 Backend, RDS Master)
└── AZ: ap-southeast-1b
    ├── Public Subnet:  10.0.1.0/24  (NAT Gateway 2)
    └── Private Subnet: 10.0.11.0/24 (EC2 Backend, RDS Standby)
```

**Illustration**

`[Placeholder: vpc-architecture.png - VPC diagram with Public/Private Subnets across 2 AZs]`
{{< figure src="/images/5-Workshop/5.3-S3-vpc/vpc-architecture.png" title="VPC architecture diagram" >}}


#### Steps

**Step 1 - Create the VPC**

```bash
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=officems-vpc}]'
```

Note the returned `VpcId`, e.g., `vpc-0123456789abcdef0`.

Enable DNS hostnames for the VPC:

```bash
aws ec2 modify-vpc-attribute --vpc-id <vpc-id> --enable-dns-hostnames
```

**Step 2 - Create Subnets**

```bash
# Public Subnet AZ-1
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.0.0/24 \
  --availability-zone ap-southeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-public-1a}]'

# Public Subnet AZ-2
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.1.0/24 \
  --availability-zone ap-southeast-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-public-1b}]'

# Private Subnet AZ-1
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.10.0/24 \
  --availability-zone ap-southeast-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-private-1a}]'

# Private Subnet AZ-2
aws ec2 create-subnet --vpc-id <vpc-id> --cidr-block 10.0.11.0/24 \
  --availability-zone ap-southeast-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=officems-private-1b}]'
```

For the Public Subnets, enable automatic public IP assignment:

```bash
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-1a-id> --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id <public-subnet-1b-id> --map-public-ip-on-launch
```

**Step 3 - Create and attach the Internet Gateway**

```bash
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=officems-igw}]'

aws ec2 attach-internet-gateway --vpc-id <vpc-id> --internet-gateway-id <igw-id>
```

**Step 4 - Create NAT Gateways**

Allocate an Elastic IP for each NAT Gateway:

```bash
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=officems-eip-nat1}]'
aws ec2 allocate-address --domain vpc --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=officems-eip-nat2}]'
```

Create a NAT Gateway in each Public Subnet:

```bash
aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1a-id> \
  --allocation-id <eip-nat1-allocation-id> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=officems-nat-1a}]'

aws ec2 create-nat-gateway \
  --subnet-id <public-subnet-1b-id> \
  --allocation-id <eip-nat2-allocation-id> \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=officems-nat-1b}]'
```

Wait for the NAT Gateways to reach the `available` state before continuing.

**Step 5 - Configure Route Tables**

Route Table for the Public Subnets (pointing to the Internet Gateway):

```bash
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-public}]'

aws ec2 create-route --route-table-id <rt-public-id> \
  --destination-cidr-block 0.0.0.0/0 --gateway-id <igw-id>

aws ec2 associate-route-table --subnet-id <public-subnet-1a-id> --route-table-id <rt-public-id>
aws ec2 associate-route-table --subnet-id <public-subnet-1b-id> --route-table-id <rt-public-id>
```

A dedicated Route Table for each Private Subnet per AZ (pointing to the matching NAT Gateway, to keep AZ availability independent):

```bash
# Private Route Table AZ-1
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-private-1a}]'
aws ec2 create-route --route-table-id <rt-private-1a-id> \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-1a-id>
aws ec2 associate-route-table --subnet-id <private-subnet-1a-id> --route-table-id <rt-private-1a-id>

# Private Route Table AZ-2
aws ec2 create-route-table --vpc-id <vpc-id> \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=officems-rt-private-1b}]'
aws ec2 create-route --route-table-id <rt-private-1b-id> \
  --destination-cidr-block 0.0.0.0/0 --nat-gateway-id <nat-1b-id>
aws ec2 associate-route-table --subnet-id <private-subnet-1b-id> --route-table-id <rt-private-1b-id>
```

{{% notice tip %}}
Each Private Subnet routes through the NAT Gateway in the same AZ to avoid Cross-AZ Data Transfer charges and to improve fault tolerance if one AZ has an outage.
{{% /notice %}}

#### Verify the Result

In the AWS Console, go to **VPC > Your VPCs** and confirm:

- The `officems-vpc` VPC is in the `Available` state.
- The 4 subnets were created with the correct CIDR blocks and AZs.
- Both NAT Gateways are in the `Available` state.
- The Public Route Table has a route `0.0.0.0/0 -> igw-xxxx`.
- The Private Route Tables have a route `0.0.0.0/0 -> nat-xxxx`.

Verify connectivity by launching a test EC2 instance in a Private Subnet and running `curl https://aws.amazon.com` to confirm outbound Internet access works through the NAT Gateway.

**Illustration**

`[Placeholder: route-table-verify.png - Public/Private Route Tables after configuration]`

#### Best Practices

- Split the CIDR by layer (10.0.0.0/24, 10.0.1.0/24...) to make it easy to add more subnets in the future.
- Always deploy a NAT Gateway per AZ instead of sharing a single NAT Gateway, to avoid a single point of failure.
- Give every network resource a clear `Name` tag so it's easy to audit and clean up later.

#### Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| EC2 in a Private Subnet cannot reach the Internet | The Route Table doesn't point to a NAT Gateway, or the NAT Gateway isn't `Available` yet | Check the Route Table and the NAT Gateway status |
| Cannot create a NAT Gateway | The Elastic IP wasn't allocated, or the EIP quota is exhausted | Check `aws ec2 describe-addresses` and release any unused EIPs |
| A subnet has no public IP despite being a Public Subnet | `map-public-ip-on-launch` was not enabled | Re-run the `modify-subnet-attribute` command |

#### Next Step

Continue to [Chapter 5.4 - Configure Security](../5.4-Security/) to configure Security Groups, NACLs, IAM, Cognito, ACM, and WAF for the system.
