export default async function starRoute(req, env, ctx) {
  const url = new URL(req.url);
  const veriToken = url.searchParams.get("veriToken");
  const authToken = url.searchParams.get("authToken");
  const sessionID = url.searchParams.get("sessionID");
  const status = url.searchParams.get("status");
  const bid = url.searchParams.get("bid"); // bid refers to board id
  const pid = url.searchParams.get("pid"); // pid refers to post id

  if (!veriToken || !authToken || !sessionID || !pid || !bid || !status)
    return new Response("Missing parameters", { status: 400 });

  const postData = `status=${
    status === "true" ? 1 : 0
  }&boardId=${bid}&topicid=${pid}`;
  const response = await fetch("https://iemb.hci.edu.sg/Board/ProcessFav", {
    method: "POST",
    headers: {
      host: "iemb.hci.edu.sg",
      "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Mobile Safari/537.36",
      referer: `https://iemb.hci.edu.sg/Board/content/${pid}?board=${pid}&isArchived=False`,
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      cookie: `__RequestVerificationToken=${veriToken};ASP.NET_SessionId=${sessionID}; AuthenticationToken=${authToken}`,
    },
    redirect: "manual",
    body: postData,
  });

  switch (response.status) {
    case 302:
      return new Response("Needs to refresh token", { status: 401 });
    case 200:
      if ((await response.json()).IsSuccess) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `Succesfully ${
              !!status ? "starred" : "unstarred"
            } message`,
          })
        );
      }
    default:
      return new Response("An error occured while processing your request", {
        status: 500,
      });
  }
}
