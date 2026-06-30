import 'dotenv/config';

const token = process.env.EXPO_TOKEN;
if (!token) {
  console.error('EXPO_TOKEN missing');
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

const appQuery = `
  query {
    app {
      byFullName(fullName: "@voralive/voralive") {
        id
        iosAppCredentials {
          id
          iosAppBuildCredentialsList {
            id
            iosDistributionType
            distributionCertificate {
              id
              serialNumber
              validityNotAfter
            }
            provisioningProfile {
              id
              status
              expiration
            }
          }
        }
      }
    }
    account {
      byName(accountName: "voralive") {
        id
        appleDistributionCertificates {
          id
          serialNumber
          validityNotAfter
        }
      }
    }
  }
`;

const data = await gql(appQuery);
console.log(JSON.stringify(data, null, 2));
