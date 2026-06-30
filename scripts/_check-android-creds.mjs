import 'dotenv/config';

const token = process.env.EXPO_TOKEN;
const ANDROID_CREDS_ID = 'c878d746-3c3f-44b7-8667-23a90f659986';
const GSA_KEY_ID = '4fdefb4a-0e69-4abe-a0c4-266bc2ceca81';

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

const result = await gql(
  `mutation SetGoogleServiceAccountKeyForSubmissionsMutation($androidAppCredentialsId: ID!, $googleServiceAccountKeyId: ID!) {
    androidAppCredentials {
      setGoogleServiceAccountKeyForSubmissions(
        id: $androidAppCredentialsId
        googleServiceAccountKeyId: $googleServiceAccountKeyId
      ) {
        id
        googleServiceAccountKeyForSubmissions { id }
      }
    }
  }`,
  {
    androidAppCredentialsId: ANDROID_CREDS_ID,
    googleServiceAccountKeyId: GSA_KEY_ID,
  }
);

console.log(JSON.stringify(result, null, 2));
