# Access and identity options for AKS

Managing access to a Kubernetes cluster is an important part of keeping applications secure and reliable. To do this, Kubernetes and Azure Kubernetes Service (AKS) provide multiple ways to confirm who users are and control what actions they are allowed to perform

At the core of Kubernetes security is authentication and authorization. Authentication answers the question “Who are you?”, while authorization answers “What are you allowed to do?”. Together, these mechanisms ensure that only the right people and applications can access the cluster and its resources.

Kubernetes uses Role-Based Access Control (RBAC) to manage permissions within the cluster. With Kubernetes RBAC, administrators define roles that specify allowed actions, such as viewing resources, deploying applications, or managing workloads. These roles are then assigned to users, groups, or service accounts. This approach ensures that users have access only to what they need to do their job, reducing the risk of mistakes or misuse.

Azure Kubernetes Service enhances this model by integrating with Microsoft Entra ID (formerly Azure Active Directory) and Azure RBAC. Microsoft Entra ID handles user identities and authentication, allowing users to sign in using their organizational accounts. Azure RBAC then manages permissions at the Azure level, controlling who can manage the cluster itself and related Azure resources.

When combined, Kubernetes RBAC and AKS security features provide a layered access control model. Azure RBAC governs access to the AKS cluster from the Azure platform, while Kubernetes RBAC controls access to resources inside the cluster. This separation allows organizations to maintain strong security boundaries and apply consistent identity management across their cloud environment.

By using these tools together, teams can follow the principle of least privilege, granting users and applications only the minimum permissions required. This helps protect the cluster from accidental changes, limits the impact of compromised accounts, and improves overall operational security.

This article introduces these core concepts to help you understand how authentication and authorization work in AKS, and how to use them to securely manage access to your Kubernetes clusters.

## Understanding Access Control in AKS

Access control in Azure Kubernetes Service (AKS) is designed to ensure that only the right users and systems can access the cluster and that they can perform only the actions they are permitted to do. This is achieved by combining Kubernetes RBAC, Azure RBAC, and Microsoft Entra ID. Together, these components provide layered security and fine‑grained control over both Azure resources and Kubernetes workloads.

### Kubernetes Role-Based Access Control (RBAC)

Kubernetes RBAC is the native authorization mechanism used inside a Kubernetes cluster. It allows administrators to control exactly what actions users, groups, or service accounts can perform.
With Kubernetes RBAC, permissions are granted, not denied. This means users only receive permissions explicitly assigned to them. Using this system, administrators can allow users to create or modify resources, view application logs, or manage workloads, while preventing unauthorized access.
Permissions can be limited to a single namespace or extended across the entire cluster, helping teams safely share clusters without interfering with each other’s workloads.

#### Roles and ClusterRoles
Before granting access, permissions are defined using Roles or ClusterRoles.

A Role is used when permissions should apply only within a specific namespace. For example, developers working on one application can be restricted to that application’s namespace.

A ClusterRole is used when permissions need to apply across the entire cluster or to cluster‑wide resources, such as nodes or persistent volumes. ClusterRoles are typically used for administrators or platform teams.

#### RoleBindings and ClusterRoleBindings

Once permissions are defined, they are assigned using bindings.

A RoleBinding assigns a Role to a user, group, or service account within a specific namespace. This allows logical separation within a single AKS cluster, ensuring teams only access their own resources.

A ClusterRoleBinding assigns a ClusterRole across the entire cluster. This is commonly used to grant full access to administrators or support engineers.

AKS itself also uses a built‑in role (aks-service) with limited privileges to diagnose and troubleshoot clusters. This role cannot modify permissions and is enabled only temporarily under active support requests.

#### Kubernetes Service Accounts

In addition to human users, Kubernetes supports service accounts, which are identities used by applications and pods. Service account credentials are stored securely as Kubernetes secrets and allow pods to communicate with the Kubernetes API.

While service accounts are primarily used by applications, human users authenticate differently. Kubernetes does not store usernames and passwords for regular users. Instead, AKS integrates with Microsoft Entra ID, which provides centralized identity and authentication for humans accessing the cluster.

## Azure Role-Based Access Control (Azure RBAC)

Azure RBAC controls access at the Azure resource level, not inside Kubernetes itself. It determines who can create, manage, or configure AKS clusters within an Azure subscription.
Using Azure RBAC, permissions can be scoped to:

- A specific AKS cluster
- A resource group
- An entire subscription

For example, one user may be allowed to upgrade or scale the cluster, while another can only download the Kubernetes configuration file (kubeconfig).

## Two Levels of Access in AKS
To fully operate an AKS cluster, users need access at two levels:

1. Azure level access
This controls who can manage the AKS resource, scale nodes, upgrade versions, or retrieve kubeconfig. Azure RBAC is used here.

2. Kubernetes API access
This controls who can create pods, view secrets, or manage workloads inside the cluster. This access is managed by either Kubernetes RBAC or Azure RBAC for Kubernetes authorization.

## Azure RBAC for Kubernetes Authorization
AKS can optionally use Azure RBAC to authorize Kubernetes API access. In this model, Azure role assignments are used instead of traditional Kubernetes RBAC files.
When a request reaches the Kubernetes API:

- If the identity is trusted by Microsoft Entra ID, Azure RBAC determines access
- If the identity is a Kubernetes service account, standard Kubernetes RBAC applies

This integration allows organizations to manage both Azure and Kubernetes access using a single identity and permission model.

## Microsoft Entra ID Integration
Microsoft Entra ID strengthens AKS security by providing centralized authentication and identity management.
When Entra ID integration is enabled:

- Users authenticate using their organizational credentials
- kubectl prompts users to sign in
- Access is granted only according to assigned roles
<img width="417" height="134" alt="image" src="https://github.com/user-attachments/assets/76a444d0-9bd3-4b99-8937-7e33fd07b95c" />

Authentication relies on OpenID Connect and OAuth 2.0, while authorization decisions are enforced by Kubernetes RBAC or Azure RBAC.

## Authentication Flow with the API Server
<img width="414" height="257" alt="image" src="https://github.com/user-attachments/assets/55be208c-8440-4936-810b-2ec15b2acf55" />

When a user runs a Kubernetes command:

- The user signs in using Microsoft Entra ID
- An access token is issued
- kubectl sends the token to the Kubernetes API Server
- The API Server validates the token using an authentication webhook
- Group membership is checked
- Authorization is evaluated using configured RBAC rules
- The request is either allowed or denied

This process ensures secure, audited access to cluster resources.

## AKS Service and Cluster Identities

AKS uses managed identities to create and operate cluster infrastructure such as virtual machines, disks, load balancers, and networking components. These identities require specific permissions to function correctly.

Additional permissions may be needed when using custom networking, private DNS zones, or other advanced configurations.

## Node Access in AKS
By default, direct access to AKS nodes is not required. However, certain features—such as container insights, HTTP application routing, or kubelet access—may require additional permissions to operate correctly.

## Conclusion

AKS security is built on layered access control. Kubernetes RBAC controls access inside the cluster, Azure RBAC controls access to the AKS resource, and Microsoft Entra ID provides centralized authentication. Together, these mechanisms allow organizations to securely manage access, follow the principle of least privilege, and safely operate Kubernetes at scale

