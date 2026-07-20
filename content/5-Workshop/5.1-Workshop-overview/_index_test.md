---
title : "Introduction"
date : 2024-01-01 
weight : 1 
chapter : false
pre : " <b> 5.1. </b> "
---

#### VPC endpoints

+ **VPC endpoints** are virtual devices. They are horizontally scaled, redundant, and highly available VPC components. They allow communication between your compute resources and AWS services without imposing availability risks.
+ Compute resources running in VPC can access  **Amazon S3**  using a Gateway endpoint. PrivateLink interface endpoints can be used by compute resources running in VPC or on-premises.

#### Workshop overview

In this workshop, you will use two VPCs. 

+ **"VPC Cloud"** is for cloud resources such as a  **Gateway endpoint** and an EC2 instance to test with. 
+ **"VPC On-Prem"** simulates an on-premises environment such as a factory or corporate datacenter. An EC2 instance running strongSwan VPN software has been deployed in "VPC On-prem" and automatically configured to establish a Site-to-Site VPN tunnel with AWS Transit Gateway. This VPN simulates connectivity from an on-premises location to the AWS cloud. To minimize costs, only one VPN instance is provisioned to support this workshop. When planning VPN connectivity for your production workloads, AWS recommends using multiple VPN devices for high availability.

### Tasks to be carried out this week:

| Day | Task | Start Date | Completion Date | Reference Material |
| --- | --- | ---------- | --------------- | ------------------ |
| 1 | - **Global Edge Services:** <br>&emsp; + Configure Amazon Route 53 for DNS management <br>&emsp; + Request SSL/TLS certificates with AWS Certificate Manager (ACM) <br>&emsp; + Protect the application using AWS WAF <br>&emsp; + Deliver static content through Amazon CloudFront | 24/04/2026 | 24/04/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 2 | - **Frontend & Identity:** <br>&emsp; + Deploy React frontend to Amazon S3 Static Website Hosting <br>&emsp; + Configure Amazon Cognito User Pool and Identity Pool <br>&emsp; + Integrate Cognito authentication with the application | 25/04/2026 | 25/04/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 3 | - **Networking & Load Balancing:** <br>&emsp; + Create VPC, Public and Private Subnets <br>&emsp; + Configure Internet Gateway and NAT Gateway <br>&emsp; + Set up VPC Peering <br>&emsp; + Deploy Application Load Balancer (ALB) | 26/04/2026 | 27/04/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 4 | - **Application & Serverless:** <br>&emsp; + Deploy Node.js/Express backend on Amazon EC2 <br>&emsp; + Configure Auto Scaling Group across two Availability Zones <br>&emsp; + Build Serverless APIs using AWS Lambda and Amazon API Gateway for Payments and Document Processing | 28/04/2026 | 29/04/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 5 | - **Database & Storage:** <br>&emsp; + Deploy Amazon RDS MySQL Multi-AZ <br>&emsp; + Configure Amazon ElastiCache for Redis <br>&emsp; + Store documents in Amazon S3 <br>&emsp; + Save audit logs using Amazon DynamoDB | 30/04/2026 | 30/04/2026 | <https://cloudjourney.awsstudygroup.com/> |
| 6 | - **Operations & DevOps:** <br>&emsp; + Store secrets with AWS Secrets Manager <br>&emsp; + Monitor resources using Amazon CloudWatch <br>&emsp; + Configure notifications with Amazon SNS <br>&emsp; + Build CI/CD pipeline using GitHub, AWS CodePipeline, CodeBuild, and CodeDeploy <br>&emsp; + Implement Blue/Green Deployment strategy | 01/05/2026 | 02/05/2026 | <https://cloudjourney.awsstudygroup.com/> |

![overview](/images/5-Workshop/5.1-Workshop-overview/diagram1.png)