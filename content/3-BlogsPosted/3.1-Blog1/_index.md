---
title: "Blog 1"
date: 2026-07-13
weight: 1
chapter: false
pre: " <b> 3.1. </b> "
---
## AWS Infrastructure Cost Optimization: Practical Strategies and Lessons Learned

### Why Is Infrastructure Cost Optimization Important?

When deploying an application to the cloud, our biggest concern is often not software bugs, but the risk of an unexpectedly high AWS bill at the end of the month. In the **Cloud-based Office Rental Management System** project, cost optimization was not simply about choosing the cheapest AWS services—it required a well-planned architecture from the very beginning.

The primary objective was to select the right infrastructure sizing (**Right-sizing**) that delivers the required performance while automatically eliminating unused resources to avoid unnecessary expenses.

### Key Optimization Strategies

#### 1. Hybrid Compute (EC2 + Serverless)

Instead of keeping Amazon EC2 instances running 24/7 to process every workload, the system uses **Amazon EC2 Auto Scaling Group (t3.small instances)** only for core business APIs.

Less frequent tasks—such as daily expired contract scans and invoice payment processing—are handled by **AWS Lambda** through **Amazon API Gateway**.

Because Lambda follows a **pay-per-use** pricing model, compute charges occur only when a function is invoked. This significantly reduces the workload on EC2 instances and allows the application to operate with smaller, more cost-effective instances.

#### 2. Data Lifecycle Management with Amazon S3 Lifecycle Policy

The office rental management system continuously generates images and electronic contract PDF files.

To prevent long-term storage costs from increasing, an **Amazon S3 Lifecycle Policy** automatically moves files older than **12 months** from **Amazon S3 Standard** to **Amazon S3 Glacier**.

This strategy reduces storage costs by approximately **three to four times** while still preserving archived data.

#### 3. Cost Monitoring with AWS Budgets and Cost Explorer

To avoid unexpected charges at the end of the billing cycle, the system configures **AWS Budgets** to send Email and SMS notifications (through **Amazon SNS**) whenever actual spending reaches **80% of the allocated budget**.

Combined with **AWS Cost Explorer**, administrators can analyze costs by service, identify unnecessary expenses, and continuously improve cost efficiency.

### Common Misconceptions

- **Serverless is not always the cheapest option.**

  If your application receives continuous, high-volume traffic 24/7, running every workload on AWS Lambda may become more expensive than using reserved Amazon EC2 instances. Therefore, a **hybrid architecture** that clearly separates workloads is often the most cost-effective approach.

- **Amazon S3 Glacier is not designed for frequently accessed data.**

  Although Glacier offers significantly lower storage costs, retrieval requests are both slower and more expensive. Lifecycle Policies should therefore be applied only to long-term archival data, such as expired or completed rental contracts.

- **AWS Cost Explorer does not optimize costs automatically.**

  Cost Explorer is an analytics and monitoring tool. Administrators must still review cost reports and take action manually—for example, deleting unused resources or shutting down idle instances.

### Practical Lessons Learned

Throughout the implementation of this project, several practical lessons became clear:

- Cost optimization should be considered from the very beginning of the project rather than after deployment. AWS Budgets should be configured immediately after creating an AWS account and provisioning resources.
- Take full advantage of AWS Free Tier managed services—such as **Amazon Cognito** and **AWS Lambda**—during the early stages of development to minimize operational costs for small and medium-sized projects.
- Cost optimization is an ongoing process. Regularly cleaning up forgotten resources, such as unattached **Elastic IP addresses** or orphaned **Amazon EBS volumes** left behind after terminating EC2 instances, should become a standard operational practice.

### Conclusion

Optimizing costs on AWS requires a combination of architectural best practices—such as Serverless computing and S3 Lifecycle Policies—and continuous budget monitoring using AWS Budgets and Cost Explorer.

By selecting the appropriate compute and storage models, small and medium-sized web applications can fully leverage the scalability, reliability, and flexibility of AWS Cloud while maintaining predictable and cost-efficient infrastructure spending.

...Image...

![AWS Infrastructure Cost Optimization Architecture](/images/3-BlogsPosted/BLOG1.png)

...Link...
![AWS blog link](https://www.facebook.com/share/p/19HyvGYxkK/)

...Guide...
