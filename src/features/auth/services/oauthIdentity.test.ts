import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extractOAuthIdentity } from '@/features/auth/services/oauthIdentity';

test('Google ad, soyad ve e-postayı olduğu gibi alır', () => {
  const identity = extractOAuthIdentity({
    email: 'ada@gmail.com',
    user_metadata: {
      email: 'ada@gmail.com',
      given_name: 'Ada',
      family_name: 'Lovelace',
      name: 'Ada Lovelace',
      picture: 'https://lh3.googleusercontent.com/a/ada',
    },
  });

  assert.equal(identity.email, 'ada@gmail.com');
  assert.equal(identity.fullName, 'Ada Lovelace');
  assert.equal(identity.firstName, 'Ada');
  assert.equal(identity.lastName, 'Lovelace');
  assert.equal(identity.avatarUrl, 'https://lh3.googleusercontent.com/a/ada');
});

test('X görünen adını böler ve onaylı e-postayı kullanır', () => {
  const identity = extractOAuthIdentity({
    email: 'ada@x.com',
    user_metadata: {
      name: 'Ada Lovelace',
      full_name: 'Ada Lovelace',
      preferred_username: 'ada',
      avatar_url: 'https://pbs.twimg.com/profile.jpg',
    },
    identities: [
      {
        identity_data: {
          confirmed_email: 'ada@x.com',
          name: 'Ada Lovelace',
        },
      },
    ],
  });

  assert.equal(identity.email, 'ada@x.com');
  assert.equal(identity.firstName, 'Ada');
  assert.equal(identity.lastName, 'Lovelace');
  assert.equal(identity.fullName, 'Ada Lovelace');
});

test('Twitch yalnızca görünen ad verdiyse soyad uydurmaz', () => {
  const identity = extractOAuthIdentity({
    email: 'ninja@example.com',
    user_metadata: {
      name: 'Ninja',
      preferred_username: 'ninja',
      email: 'ninja@example.com',
    },
  });

  assert.equal(identity.fullName, 'Ninja');
  assert.equal(identity.firstName, 'Ninja');
  assert.equal(identity.lastName, null);
  assert.equal(identity.email, 'ninja@example.com');
});

test('sağlayıcıda olmayan e-posta ve adı boş bırakır', () => {
  const identity = extractOAuthIdentity({
    email: null,
    user_metadata: {},
  });

  assert.equal(identity.email, null);
  assert.equal(identity.fullName, null);
  assert.equal(identity.firstName, null);
  assert.equal(identity.lastName, null);
  assert.equal(identity.avatarUrl, null);
});
