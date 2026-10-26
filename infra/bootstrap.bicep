// One-time, run locally with your own az login (see README, "Eerste keer"):
//   az deployment sub create -l westeurope -f infra/bootstrap.bicep
// Creates the resource group and a managed identity that GitHub Actions can use via OIDC
// (no password) to deploy, with Contributor on that resource group only.
targetScope = 'subscription'

param location string = 'westeurope'
param resourceGroupName string = 'rg-marekerk-website'

@description('owner/repo on GitHub')
param githubRepo string = 'marekerk/website-marekerk'

@description('Only workflows on this branch get access.')
param branch string = 'main'

resource rg 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module deployIdentity 'modules/deploy-identity.bicep' = {
  scope: rg
  params: {
    location: location
    githubRepo: githubRepo
    branch: branch
  }
}

// These three become GitHub secrets for the workflow
output AZURE_CLIENT_ID string = deployIdentity.outputs.clientId
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_SUBSCRIPTION_ID string = subscription().subscriptionId
output resourceGroup string = rg.name
