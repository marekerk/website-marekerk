// Managed identity for GitHub Actions (OIDC) with Contributor on the current resource group.

param location string
param githubRepo string
param branch string

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-github-deploy'
  location: location
}

resource githubFederation 'Microsoft.ManagedIdentity/userAssignedIdentities/federatedIdentityCredentials@2023-01-31' = {
  parent: identity
  name: 'github-${branch}'
  properties: {
    issuer: 'https://token.actions.githubusercontent.com'
    // Note: if the workflow job gets an `environment:`, the subject becomes
    // repo:<repo>:environment:<name> and this has to change with it.
    subject: 'repo:${githubRepo}:ref:refs/heads/${branch}'
    audiences: ['api://AzureADTokenExchange']
  }
}

var contributor = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6181-4c3a-90d1-5fb9e5e8a4a5')

resource contributorOnResourceGroup 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, identity.id, contributor)
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: contributor
  }
}

output clientId string = identity.properties.clientId
