const { parse } = require("node-html-parser");

export default async function replyRoute(req, env, ctx) {
  const url = new URL(req.url);
  const veriToken = url.searchParams.get("veriToken");
  const authToken = url.searchParams.get("authToken");
  const sessionID = url.searchParams.get("sessionID");
  const boardID = url.searchParams.get("boardID");
  const pid = url.searchParams.get("pid");
  const replyContent = url.searchParams.get("replyContent");
  const selection = url.searchParams.get("selection");

  if (!veriToken || !authToken || !sessionID || !boardID || !pid)
    return new Response("Missing parameters", { status: 400 });

  const postData = `boardid=${boardID}&topic=${pid}&replyto=0&isArchived=0&UserRating=${selection}&replyContent=${replyContent}&PostMessage=Post+Reply`;
  const response = await fetch(
    "https://iemb.hci.edu.sg/board/ProcessResponse",
    {
      method: "POST",
      body: postData,
      headers: {
        host: "iemb.hci.edu.sg",
        referer: `https://iemb.hci.edu.sg/Board/content/${pid}?board=${boardID}&isArchived=False`,
        origin: "https://iemb.hci.edu.sg",
        "content-type": "application/x-www-form-urlencoded",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.99 Safari/537.36",
        "content-length": postData.length,
        cookie: `__RequestVerificationToken=${veriToken};ASP.NET_SessionId=${sessionID}; AuthenticationToken=${authToken};`,
      },
    }
  ).catch((err) => {
    return new Response("An error occured while processing your request", {
      status: 500,
    });
  });

  if (response.status != 200)
    return new Response("An error occured while processing your request", {
      status: 500,
    });

  const iembHTML = parse(await response.text());
  //   check if we are stuck on the sign in page (i.e. needs a token refresh)
  const needsTokenRefresh = iembHTML.querySelector(".login-page");
  if (needsTokenRefresh)
    return new Response("Needs to refresh token", { status: 401 });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Successfully replied",
    })
  );
}
