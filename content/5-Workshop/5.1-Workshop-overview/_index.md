---
title: "Workshop Overview"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 5.1 </b> "
---

#### Introduction

The Office Rental Management System On Cloud is a three-tier web application that serves three user groups at the same time:

- **Tenant** - renters who view lease information, make payments, and submit support requests.
- **Admin** - administrators who manage offices, contracts, tenants, and reports.
- **Technician** - staff who handle maintenance and repair requests.

The entire system is deployed on AWS in the **ap-southeast-1 (Singapore)** region, combining a traditional Multi-tier architecture (Frontend - Backend - Database) with a Serverless architecture for specialized workloads such as payments and document processing.

#### Workshop Objectives

By the end of this workshop, you will be able to:

- Design and deploy a VPC network with Public/Private Subnets spanning 2 Availability Zones.
- Configure security layers: Security Group, NACL, IAM, Amazon Cognito, ACM, AWS WAF.
- Deploy a static React Frontend on Amazon S3, distributed through Amazon CloudFront and Route 53.
- Deploy a Node.js/Express Backend running on an EC2 Auto Scaling Group behind an Application Load Balancer.
- Deploy the data tier with Amazon RDS Multi-AZ, ElastiCache for Redis, and Amazon DynamoDB.
- Build Serverless microservices using AWS Lambda and Amazon API Gateway.
- Manage sensitive information with AWS Secrets Manager.
- Set up comprehensive monitoring with Amazon CloudWatch and Amazon SNS.
- Build an automated CI/CD pipeline from GitHub using CodePipeline, CodeBuild, and CodeDeploy with a Blue/Green Deployment strategy.
- Apply cost optimization practices: AWS Budgets, Cost Explorer, Savings Plans, S3 Intelligent-Tiering, VPC Endpoints.

#### Knowledge Gained

- A solid understanding of High Availability architecture design principles on AWS.
- How to combine the Multi-tier and Serverless models within a single system.
- Hands-on practice with security best practices aligned with the AWS Well-Architected Framework.
- Hands-on practice implementing CI/CD with a Blue/Green Deployment strategy.
- Hands-on practice with cost-optimization techniques on AWS.

#### Overall Architecture

The reference architecture of the system consists of the following main layers:

| Layer | Components | Role |
|---|---|---|
| Global Edge | Route 53, ACM, WAF, CloudFront | Domain, certificate, CDN, and web application firewall management |
| Frontend | Amazon S3 (Static Website) | Hosts the static React Frontend |
| Identity | Amazon Cognito (User Pool/Identity Pool) | Authentication, authorization, API protection |
| Load Balancing | Application Load Balancer | Distributes traffic to the Backend |
| Application | EC2 Auto Scaling Group (Private Subnet, 2 AZ) | Runs the Node.js/Express Backend API via PM2 |
| Serverless API | AWS Lambda, Amazon API Gateway | Handles Payments and document processing |
| Database | Amazon RDS MySQL Multi-AZ | Primary relational database |
| Cache | Amazon ElastiCache for Redis | High-speed cache/session store |
| Storage | Amazon S3, Amazon DynamoDB | Unstructured document storage, audit logs |
| Networking | VPC, NAT Gateway, Internet Gateway, VPC Peering | Secure network connectivity |
| Operations | Secrets Manager, CloudWatch, SNS | Secret protection, monitoring, alerting |
| DevOps | GitHub, CodePipeline, CodeBuild, CodeDeploy | Automated CI/CD, Blue/Green Deployment |

**Illustration: Overall system architecture**

`[Placeholder: architecture-overview.png - Overall architecture diagram from Global Edge to Database]`
{{< figure src="/images/5-Workshop/5.1-Workshop-overview/architecture-overview.png" title="Overall system architecture" >}}

#### Workshop Structure

The workshop is organized into 13 chapters, following the actual deployment sequence: from environment preparation, building the network infrastructure, configuring security, deploying each application tier, to monitoring, CI/CD, cost optimization, and resource cleanup. Every chapter includes step-by-step hands-on instructions, result verification, and Best Practice/Troubleshooting notes.

#### Best Practices

- Always name resources (Name tags) using a consistent convention, e.g. `officems-<env>-<resource>`, to make management and later cleanup easier.
- Run the entire workshop in a dedicated sandbox AWS account to avoid affecting any production environment.
- Record the Resource IDs (VPC ID, Subnet ID, Security Group ID, etc.) as you create them, for easy reference in later chapters.

#### Next Step

Continue to [Chapter 5.2 - Prerequisites](../5.2-Prerequisites/) to prepare your AWS account, CLI tools, and the information required before starting the deployment.
