export default async function loginRoute(req, env, ctx) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");
  const password = url.searchParams.get("password");
  if (!username || !password)
    return new Response("Invalid username or password", { status: 400 });

  const response = await fetch("https://iemb.hci.edu.sg", {
    method: "GET",
  }).catch((err) => {
    return new Response("Failed to fetch iemb.hci.edu.sg", { status: 500 });
  });

  if (response.status != 200)
    return new Response("Failed to fetch iemb.hci.edu.sg", { status: 500 });

  const VERI_TOKEN_COOKIE = response.headers
    .get("set-cookie")
    .match(/__RequestVerificationToken=(.+?);/)[1];

  const bodyText = await response.text();
  const VERI_TOKEN = bodyText.match(
    /<input name=\"__RequestVerificationToken\" .+? value=\"(.+?)\"/
  )[1];

  const encoded_username = encodeURIComponent(username);
  const encoded_password = encodeURIComponent(password);
  const veriToken = encodeURIComponent(VERI_TOKEN);

  const postData = `UserName=${encoded_username}&Password=${encoded_password}&__RequestVerificationToken=${veriToken}&submitbut=Submit`;
  const loginResponse = await fetch("https://iemb.hci.edu.sg/home/logincheck", {
    method: "POST",
    headers: {
      host: "iemb.hci.edu.sg",
      referer: "https://iemb.hci.edu.sg/",
      origin: "https://iemb.hci.edu.sg",
      "content-type": "application/x-www-form-urlencoded",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Mobile Safari/537.36",
      "content-length": postData.length,
      cookie: `__RequestVerificationToken=${VERI_TOKEN_COOKIE};.ASPXBrowserOverride=;`,
    },
    body: postData,
    redirect: "manual",
  }).catch((err) => {
    return new Response("Failed to fetch iemb.hci.edu.sg", { status: 500 });
  });

  if (loginResponse.status != 302)
    return new Response("Failed to login", { status: 500 });

  if (
    !loginResponse.headers
      .get("set-cookie")
      .match(/ASP.NET_SessionId=(.+?);/) ||
    !loginResponse.headers.get("set-cookie").match(/AuthenticationToken=(.+?);/)
  )
    return new Response("Invalid username/password", { status: 500 });

  const SESSION_ID = loginResponse.headers
    .get("set-cookie")
    .match(/ASP.NET_SessionId=(.+?);/)[1];
  const AUTH_TOKEN = loginResponse.headers
    .get("set-cookie")
    .match(/AuthenticationToken=(.+?);/)[1];

  return new Response(
    JSON.stringify({
      success: true,
      VERI_TOKEN_COOKIE,
      SESSION_ID,
      AUTH_TOKEN,
    })
  );
}
