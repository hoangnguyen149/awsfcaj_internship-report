---
title: "Workshop"
date: 2026-07-13
weight: 5
chapter: false
pre: " <b> 5. </b> "
---
## Deploying an Office Rental Management System on AWS Cloud

### Overview

The **Office Rental Management System on AWS Cloud** is a web-based application designed to serve three primary user roles—**Tenant**, **Admin**, and **Technician**. The application is built using a **Multi-tier architecture** combined with **Serverless services** on the AWS Cloud in the **ap-southeast-1 (Singapore)** Region. This workshop provides a step-by-step guide to deploying the complete solution, including networking, security, frontend, backend, databases, serverless components, monitoring, and CI/CD, following the reference architecture designed for the project.

The solution is architected for **High Availability (HA)** across **two Availability Zones (AZs)**. The application layer runs on **Amazon EC2 instances** within an **Auto Scaling Group** behind an **Application Load Balancer (ALB)**. The data layer leverages **Amazon RDS for MySQL** with **Multi-AZ deployment** and **Amazon ElastiCache for Redis** to provide high performance and fault tolerance. Specialized business functions, such as **payment processing** and **document management**, are implemented as independent microservices using **AWS Lambda** and **Amazon API Gateway**, reducing operational costs while improving scalability and processing efficiency.

+ **Security** is implemented using multiple AWS managed services. **Amazon Cognito** provides user authentication and authorization, while **AWS WAF** integrated with **Amazon CloudFront** protects the application at the edge. **AWS Certificate Manager (ACM)** and **Amazon Route 53** manage SSL/TLS certificates and domain names, and **AWS Secrets Manager** securely stores sensitive credentials such as database passwords. All backend workloads are deployed within **Private Subnets**, allowing outbound Internet access only through **NAT Gateways**.

+ **Operations and DevOps** are fully automated through a CI/CD pipeline using **GitHub**, **AWS CodePipeline**, **AWS CodeBuild**, and **AWS CodeDeploy** with a **Blue/Green Deployment** strategy to ensure zero-downtime releases. **Amazon CloudWatch** and **Amazon SNS** provide centralized monitoring and alerting, while **AWS Budgets**, **AWS Cost Explorer**, **Savings Plans**, **Amazon S3 Intelligent-Tiering**, and **VPC Endpoints** are used to optimize monthly operational costs.

By the end of this workshop, you will be able to design and deploy a highly available **three-tier web application** that follows the **AWS Well-Architected Framework**, scales automatically using **Auto Scaling** and **Serverless technologies**, and incorporates a complete CI/CD pipeline, monitoring solution, and cost optimization best practices.

#### Content

1. [Workshop Overview](5.1-Workshop-overview/)
2. [Prerequisites](5.2-Prerequistes/)
3. [Create AWS Networking](5.3-Create-AWS-Network/)
4. [Configure Security](5.4-Security-Configuration/)
5. [Deploy the Frontend](5.5-User-Interface-Presentation/)
6. [Deploy the Application Server](5.6-Deploying-Servers/)
7. [Deploy the Backend Services](5.7-Deploying-Server-Support/)
8. [Deploy the Database](5.8-Data-Declaration-Base/)
9. [Build Serverless Services](5.9-Building-Serverless-Services/)
10. [Manage Secrets](5.10-Secret-Management/)
11. [Monitoring and Logging](5.11-Monitoring/)
12. [Cost Optimization](5.12-Cost-Optimization/)
13. [Clean Up Resources](5.13-Cleanup/)