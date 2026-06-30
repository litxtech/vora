import 'dotenv/config';

const token = process.env.EXPO_TOKEN;
const q = `
  query {
    app {
      byFullName(fullName: "@voralive/voralive") {
        submissions(limit: 3, offset: 0, filter: { platform: IOS }) {
          id
          status
          createdAt
          updatedAt
          completedAt
          canRetry
          error { errorCode message }
          submittedBuild { id appVersion appBuildVersion status }
          logFiles
        }
      }
    }
  }
`;

const res = await fetch('https://api.expo.dev/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: q }),
});
const json = await res.json();
console.log(JSON.stringify(json, null, 2));

for (const sub of json.data?.app?.byFullName?.submissions ?? []) {
  for (const url of sub.logFiles ?? []) {
    try {
      const logRes = await fetch(url);
      const text = await logRes.text();
      console.log('\n===== LOG', sub.id, '=====\n');
      console.log(text.slice(-4000));
    } catch (e) {
      console.log('log fetch failed', sub.id, e.message);
    }
  }
}
