const { parse } = require("node-html-parser");

export default async function getBoardArchivedRoute(req, env, ctx) {
  const url = new URL(req.url);
  const veriToken = url.searchParams.get("veriToken");
  const authToken = url.searchParams.get("authToken");
  const sessionID = url.searchParams.get("sessionID");
  const boardID = url.searchParams.get("boardID");
  const page = url.searchParams.get("page") ?? 1;
  const sender = url.searchParams.get("sender") ?? "";
  const subject = url.searchParams.get("subject") ?? "";
  const content = url.searchParams.get("content") ?? "";

  if (!veriToken || !authToken || !sessionID || !boardID)
    return new Response("Missing parameters", { status: 400 });

  const postData = `id=${boardID}&page=${page}&postBy=${sender}&title=${subject}&content=${content}`;
  const response = await fetch(`https://iemb.hci.edu.sg/Board/ArchiveList`, {
    method: "POST",
    headers: {
      host: "iemb.hci.edu.sg",
      referer: "https://iemb.hci.edu.sg/",
      origin: "https://iemb.hci.edu.sg",
      "content-type": "application/x-www-form-urlencoded",
      "content-length": postData.length,
      "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Mobile Safari/537.36",
      cookie: `__RequestVerificationToken=${veriToken};.Mozilla%2f4.0+(compatible%3b+MSIE+6.1%3b+Windows+XP);ASP.NET_SessionId=${sessionID}; AuthenticationToken=${authToken};`,
    },
    body: postData,
  }).catch((err) => {
    return new Response("An error occured while processing your request", {
      status: 500,
    });
  });

  if (response.status != 200) {
    const iembHTML = parse(await response.text());

    // check if we are stuck on the sign in page (i.e. needs a token refresh)
    const needsTokenRefresh = iembHTML.querySelector(".login-page");
    if (needsTokenRefresh) {
      return new Response("Needs to refresh token", { status: 401 });
    } else {
      return new Response("An error occured while processing your request", {
        status: 500,
      });
    }
  }

  const data = await response.json();

  const parsedData = data.data.map((item) => {
    return {
      date: item.posttime,
      sender: item.postby,
      username: null,
      subject: item.title,
      url: `/Board/Content/${item.id}?board=${item.boardId}&isArchived=${item.isArchived}`,
      boardID: parseInt(item.boardId),
      pid: parseInt(item.id),
      urgency: null,
      recipient: item.groupName,
      viewCount: parseInt(item.viewerCount),
      replyCount: parseInt(item.responseCount),
      read: null,
    };
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: "Successfully fetched messages",
      messages: parsedData,
      totalPages: data.paging.TotalPage,
      currentPage: data.paging.CurrentPage,
    })
  );
}
