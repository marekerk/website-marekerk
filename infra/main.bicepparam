using 'main.bicep'

// Sensitive or per environment: read from the workflow environment (GitHub secret/variable)
param icsUrl = readEnvironmentVariable('ICS_URL', '')
param customDomain = readEnvironmentVariable('CUSTOM_DOMAIN', '')
