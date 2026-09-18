import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 20,
  duration: '30s',
};

const emails = Array.from(
  { length: 20 },
  (_, i) => `mirai${i + 1}@gmail.com`
);

export default function () {
  const email = emails[Math.floor(Math.random() * emails.length)];

  const payload = JSON.stringify({
    email,
    password: 'Test1234!'
  });

  const response = http.post(
    'https://h0zvzaw8fa.execute-api.ap-northeast-1.amazonaws.com/dev/auth/login',
    payload,
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'a8f9d3e2b1c0456789abcdef0123456789ab'
      }
    }
  );
  if (response.status !== 200) {
    console.log(
        `FAILED | ${email} | ${response.status} | ${response.body}`
    );
    }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'login returns token': (r) => {
      try {
        const body = r.json();
        return body.accessToken !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}



// import http from 'k6/http';
// import { check } from 'k6';
// import exec from 'k6/execution';

// export const options = {
//   scenarios: {
//     register_users: {
//       executor: 'shared-iterations',
//       vus: 8,
//       iterations: 20,
//       maxDuration: '30s',
//     },
//   },
// };

// const emails = Array.from(
//   { length: 20 },
//   (_, i) => `mirai${i + 1}@gmail.com`
// );

// export default function () {
//   const index = exec.scenario.iterationInTest;
//   const email = emails[index];

//   const payload = JSON.stringify({
//     email,
//     password: 'Test1234!',
//   });

//   const response = http.post(
//     'https://h0zvzaw8fa.execute-api.ap-northeast-1.amazonaws.com/dev/auth/login',
//     payload,
//     {
//       headers: {
//         'Content-Type': 'application/json',
//         'x-api-key': "a8f9d3e2b1c0456789abcdef0123456789ab"
//       },
//     }
//   );
//   if (response.status !== 200) {
//     console.log(
//         `FAILED | ${email} | ${response.status} | ${response.body}`
//     );
//     }
//   check(response, {
//     'registration successful': (r) =>
//       r.status === 200 || r.status === 201,
//   });

//   console.log(`${email} -> ${response.status}`);
// }