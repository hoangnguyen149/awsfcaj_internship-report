---
title: "Proposal"
date: 2026-07-13
weight: 2
chapter: false
pre: " <b> 2. </b> "
---

# Cloud Office Rental Management System
## A Unified AWS Serverless & 3-Tier Solution for Real-Time Property Management

### 1. Executive Summary
The Cloud Office Rental Management System is designed to enhance office leasing operations for multi-building property managers. It supports operations for up to 50 buildings and 2,000 offices, with potential scalability for larger portfolios, utilizing a web-based platform to manage tenants, contracts, and maintenance. The platform leverages AWS Cloud services to deliver real-time monitoring, automated billing, and cost efficiency, with access restricted across four distinct user roles via Amazon Cognito.

### 2. Problem Statement
### What’s the Problem?
Current property management requires manual data collection using spreadsheets and paper trails, becoming unmanageable with multiple buildings. There is no centralized system for real-time occupancy data, automated billing, or tenant maintenance requests.

### The Solution
The platform uses Amazon EC2 with an Auto Scaling Group for the application tier, an Application Load Balancer for traffic distribution, and Amazon RDS (MySQL Multi-AZ) for transactional data. AWS Lambda and API Gateway handle asynchronous tasks like payment processing and notifications, while Amazon S3 stores contracts and frontend assets. Amazon CloudFront serves the ReactJS web interface, and Amazon Cognito ensures secure access. Similar to existing property management software, users can register and manage leases, though this platform operates entirely on a cloud-native, highly available architecture. Key features include real-time dashboards, automated invoicing, and low operational costs.

### Benefits and Return on Investment
The solution establishes a foundational centralized platform for property managers and tenants, serving as a highly available operational hub. It reduces manual reporting and contract management via a centralized platform, simplifying administration and improving data reliability. Monthly costs are estimated at $168 - $223 USD based on the AWS Pricing Calculator. The break-even period is achieved rapidly through significant time savings from reduced manual administrative work and optimized serverless cloud resource usage.

### 3. Solution Architecture
The platform employs a 3-tier and serverless AWS architecture to manage data from 50 buildings, scalable to thousands of users. Data is processed by EC2 instances, stored in RDS and S3, and asynchronous tasks are handled by Lambda. S3 with CloudFront hosts the dashboard, secured by Cognito. The architecture is detailed below:

![Cloud Office Rental Architecture](/images/2-Proposal/architecture.jpeg)



![IoT Weather Station Architecture](/images/2-Proposal/edge_architecture.jpeg)

![IoT Weather Platform Architecture](/images/2-Proposal/platform_architecture.jpeg)

### AWS Services Used
- **Amazon EC2 & Auto Scaling**: Processes backend application logic (Node.js) dynamically based on load.
- **AWS Lambda**: Processes serverless events like payments and email/SMS notifications.
- **Amazon API Gateway**: Facilitates serverless API communication.
- **Amazon S3**: Stores raw contract PDFs, images, and hosts static frontend files.
- **Amazon RDS & DynamoDB**: Stores transactional data (MySQL) and audit logs (NoSQL).
- **Application Load Balancer**: Facilitates web app traffic distribution.
- **Amazon CloudFront**: Hosts and secures the ReactJS web interface globally.
- **Amazon Cognito**: Secures access for Admin, Building Manager, Tenant, and Technician users.

### Component Design
- **Frontend Interface**: ReactJS application hosted on S3 and delivered via CloudFront CDN.
- **Application Tier**: Node.js backend hosted on EC2 instances within an Auto Scaling Group in private subnets.
- **Data Storage**: Relational data stored in Multi-AZ RDS; logs stored in DynamoDB; files stored in S3.
- **Event Processing**: AWS Lambda triggered by API Gateway and EventBridge for scheduled notifications.
- **User Management**: Amazon Cognito manages user access, allowing distinct role-based permissions.

### 4. Technical Implementation
**Implementation Phases**
This project follows 4 phases for infrastructure and application deployment:
- Build Theory and Draw Architecture: Research 3-tier cloud architectures and design the AWS topology including VPC, EC2, and RDS (Weeks 1-3).
- Calculate Price and Check Practicality: Use AWS Pricing Calculator to estimate costs and adjust if needed.
- Fix Architecture for Cost or Solution Fit: Tweak the design (e.g., using Lambda for background tasks) to stay cost-effective.
- Develop, Test, and Deploy: Code the backend (Node.js), frontend (ReactJS), and AWS services using IaC, configure CI/CD (CodePipeline, CodeBuild, CodeDeploy), then test via JMeter and release to production (Weeks 4-12).

**Technical Requirements**
- Application Stack: Frontend built with ReactJS, backend with Node.js/Express.js.
- Cloud Platform: Practical knowledge of AWS EC2, Auto Scaling, RDS (MySQL), S3, CloudFront, API Gateway, Lambda, and Cognito.
- DevOps & Automation: Use AWS CodePipeline, CodeBuild, and CodeDeploy for automated CI/CD and Blue/Green deployments.

### 5. Timeline & Milestones
**Project Timeline**
- Phase 1 (Weeks 1-3): Planning, architecture design, and foundational VPC infrastructure setup.
- Phase 2 (Weeks 4-6): Deploy compute (EC2/ALB) and database (RDS/DynamoDB) tiers.
- Phase 3 (Weeks 7-9): Implement Cognito authentication, serverless functions (Lambda), and frontend deployment.
- Phase 4 (Weeks 10-12): CI/CD automation, load testing, monitoring setup, and documentation handover.

### 6. Budget Estimation
You can find the budget estimation on the AWS Pricing Calculator [AWS Pricing Calculator](https://calculator.aws/#/estimate?id=621f38b12a1ef026842ba2ddfe46ff936ed4ab01)  
or download the [budget estimate file](../attachments/budget_estimation.pdf).  
### Infrastructure Costs
- AWS Services:
    - EC2 (Auto Scaling): ~$30 - $75/month (2-5 x t3.small).
    - Application Load Balancer: ~$18/month (1 ALB).
    - RDS MySQL (Multi-AZ): ~$70/month (db.t3.small, 50GB).
    - ElastiCache Redis: ~$12/month (cache.t3.micro).
    - S3 + CloudFront: ~$20/month (50GB storage + 200GB transfer).
    - Lambda + API Gateway: ~$5/month (~200,000 requests).
    - DynamoDB (On-Demand): ~$5/month.
    - Cognito: ~$0 - $10/month (5,000 MAU).
    - CloudWatch + SNS: ~$8/month (Metrics, Logs, Alarms).

Total: ~$168 - $223/month.

### 7. Risk Assessment
#### Risk Matrix
- Security Intrusions (SQLi, XSS): High impact, Medium probability.
- Cost Overruns: Medium impact, Medium probability.
- Service Disruption / Hardware Failure: Critical impact, Low probability.

#### Mitigation Strategies
- Security: Deploy AWS WAF with CloudFront and strictly configure Security Groups.
- Cost: Set up AWS Budgets and CloudWatch alarms for monitoring usage.
- Disruption: Implement Multi-AZ for RDS and Auto Scaling for EC2 instances.

#### Contingency Plans
- Revert to previous application versions via automated CI/CD rollback (CodeDeploy) if deployment fails.
- Rely on automated RDS failover (45-70 seconds) if the primary database instance goes down.

### 8. Expected Outcomes
#### Technical Improvements: 
- Real-time data and automated analytics replace manual spreadsheet tracking.
- Highly available system scalable to support thousands of concurrent users with sub-300ms response times.
#### Long-term Value
- Solid data foundation for future integration of AI/ML services (e.g., Amazon Personalize for office recommendations).
- Reusable infrastructure as code (IaC) templates for future cloud deployments.