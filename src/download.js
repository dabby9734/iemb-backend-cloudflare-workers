const { parse } = require("node-html-parser");

export default async function downloadRoute(req, env, ctx) {
  if (req.method !== "POST")
    return new Response("Please use POST method", { status: 400 });

  const { veriTokenCookie, authToken, sessionID, attachment } = { ...req.body };

  if (!veriTokenCookie || !authToken || !sessionID || !attachment)
    return new Response("Missing parameters", { status: 400 });

  const response = await fetch(`https://iemb.hci.edu.sg/${attachment.url}`, {
    method: "GET",
    mode: "no-cors",
    headers: {
      host: "iemb.hci.edu.sg",
      referer: `https://iemb.hci.edu.sg/Board/content/${attachment.fileID}?board=${attachment.boardID}&isArchived=False`,
      "user-agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/97.0.4692.71 Mobile Safari/537.36",
      cookie: `__RequestVerificationToken=${veriTokenCookie};.Mozilla%2f4.0+(compatible%3b+MSIE+6.1%3b+Windows+XP);ASP.NET_SessionId=${sessionID}; AuthenticationToken=${authToken};`,
    },
  });

  if (response.status != 200 || !response.headers.get("content-disposition")) {
    // parse the html
    const iembHTML = parse(await response.text());

    // check if we are stuck on the sign in page (i.e. needs a token refresh)
    const needsTokenRefresh = iembHTML.querySelector(".login-page");
    if (needsTokenRefresh) {
      return new Response("Needs to refresh token", { status: 401 });
    } else {
      return new Response("Failed to download file", { status: 500 });
    }
  }

  const blob = await response.blob();
  // https://developer.mozilla.org/en-US/docs/Web/API/Blob/arrayBuffer
  const blobArrayBuffer = await blob.arrayBuffer();
  const fileBuffer = Buffer.from(blobArrayBuffer);

  // https://stackoverflow.com/questions/56430526/best-way-to-send-zip-file-as-response-in-azure-functions-using-node
  return new Response(fileBuffer, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Disposition": response.headers.get("content-disposition"),
      "Content-Type": response.headers.get("content-type"),
    },
  });
}
