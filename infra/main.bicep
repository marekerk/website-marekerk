// Website infrastructure: one Static Web App with managed functions (api/).
// Deployed on every push to main by .github/workflows/deploy.yml.
// Not linked to the repository here: the workflow builds itself and uploads with the deployment token.

@description('Name of the Static Web App in Azure. Azure picks the *.azurestaticapps.net hostname itself (output defaultHostname).')
param name string = 'swa-marekerk'

@description('Region. Static Web Apps is only available in a few regions; westeurope is one of them.')
param location string = 'westeurope'

@description('Free is enough for a static site with HTTP functions. Standard for a linked Function App, SLA or more staging environments.')
@allowed(['Free', 'Standard'])
param sku string = 'Free'

@description('ICS feed of the church calendar (https:// or webcal://). Empty: /api/agenda returns 500.')
@secure()
param icsUrl string = ''

@description('Custom subdomain, e.g. www.marekerk.nl. Point its CNAME at the azurestaticapps.net hostname first, or validation fails. An apex domain (marekerk.nl) needs validationMethod dns-txt-token.')
param customDomain string = ''

resource site 'Microsoft.Web/staticSites@2024-04-01' = {
  name: name
  location: location
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    // The workflow is the only path to production; no preview environments for PRs
    stagingEnvironmentPolicy: 'Disabled'
    allowConfigFileUpdates: true
  }
}

// Replaces all app settings: everything the functions need is defined here
resource appSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  parent: site
  name: 'appsettings'
  properties: {
    ICS_URL: icsUrl
  }
}

resource domain 'Microsoft.Web/staticSites/customDomains@2024-04-01' = if (!empty(customDomain)) {
  parent: site
  name: empty(customDomain) ? 'none' : customDomain
  properties: {}
}

output name string = site.name
output defaultHostname string = site.properties.defaultHostname
